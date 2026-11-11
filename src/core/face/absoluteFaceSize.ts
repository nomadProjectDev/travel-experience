import { FACE_FIT_THRESHOLDS } from './thresholds';
import type { FaceFitConfidence, FaceFitResult } from './types';

export const ABSOLUTE_FACE_SIZE_METHOD = 'iris-scale-v1' as const;

export type AbsoluteFaceSizeRejectionReason =
  | 'not-enough-signal'
  | 'invalid-geometry'
  | 'iris-too-small'
  | 'iris-scale-disagreement'
  | 'pose-or-quality-rejected'
  | 'temporal-unstable'
  | 'anthropometric-implausible';

export interface AbsoluteFaceSizeAssumptions {
  horizontalVisibleIrisDiameterMm: {
    minMm: number;
    maxMm: number;
    provenance: string;
  };
  note: string;
}

interface AbsoluteFaceSizeBase {
  schemaVersion: 1;
  method: typeof ABSOLUTE_FACE_SIZE_METHOD;
  confidence: FaceFitConfidence;
  reasons: AbsoluteFaceSizeRejectionReason[];
  assumptions: AbsoluteFaceSizeAssumptions;
}

export interface UsableAbsoluteFaceSizeEstimate extends AbsoluteFaceSizeBase {
  status: 'usable';
  estimatedFaceWidth: { minMm: number; maxMm: number };
  centralEstimateMm: number;
  perEye: {
    subjectLeft: { minMm: number; maxMm: number; centralMm: number };
    subjectRight: { minMm: number; maxMm: number; centralMm: number };
  };
  scaleDisagreement: number;
}

export interface RejectedAbsoluteFaceSizeEstimate extends AbsoluteFaceSizeBase {
  status: 'rejected';
}

export type AbsoluteFaceSizeEstimate =
  | UsableAbsoluteFaceSizeEstimate
  | RejectedAbsoluteFaceSizeEstimate;

export interface AbsoluteFaceSizeSignal {
  faceWidthProxyPx: number | null;
  subjectLeftIrisDiameterPx: number | null;
  subjectRightIrisDiameterPx: number | null;
  temporalState: 'collecting' | 'stabilizing' | 'ready';
  qualityAccepted: boolean;
}

const assumptions = (): AbsoluteFaceSizeAssumptions => ({
  horizontalVisibleIrisDiameterMm: {
    minMm: FACE_FIT_THRESHOLDS.absoluteIrisPriorMinMm,
    maxMm: FACE_FIT_THRESHOLDS.absoluteIrisPriorMaxMm,
    provenance:
      'Population-level horizontal visible iris diameter hypothesis centered on the MediaPipe 11.7 mm prior.',
  },
  note:
    'The individual iris diameter is not known. This range propagates the assumed iris interval and independent per-eye scale estimates.',
});

function rejected(
  reasons: AbsoluteFaceSizeRejectionReason[],
): RejectedAbsoluteFaceSizeEstimate {
  return {
    schemaVersion: 1,
    method: ABSOLUTE_FACE_SIZE_METHOD,
    status: 'rejected',
    confidence: 'low',
    reasons: [...new Set(reasons)],
    assumptions: assumptions(),
  };
}

function isPositiveFinite(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

function eyeRange(faceWidthPx: number, irisDiameterPx: number) {
  const central = (faceWidthPx * 11.7) / irisDiameterPx;
  return {
    minMm: (faceWidthPx * FACE_FIT_THRESHOLDS.absoluteIrisPriorMinMm) / irisDiameterPx,
    maxMm: (faceWidthPx * FACE_FIT_THRESHOLDS.absoluteIrisPriorMaxMm) / irisDiameterPx,
    centralMm: central,
  };
}

/**
 * Experimental monocular scale estimate. Each anatomical eye produces its own
 * scale before the uncertainty envelopes are combined. Constants are
 * hypotheses and must not be product-tuned without held-out calibration data.
 */
export function estimateAbsoluteFaceSize(
  signal: AbsoluteFaceSizeSignal,
): AbsoluteFaceSizeEstimate {
  const reasons: AbsoluteFaceSizeRejectionReason[] = [];
  const { faceWidthProxyPx, subjectLeftIrisDiameterPx, subjectRightIrisDiameterPx } =
    signal;

  if (
    faceWidthProxyPx === null ||
    subjectLeftIrisDiameterPx === null ||
    subjectRightIrisDiameterPx === null
  ) {
    reasons.push('not-enough-signal');
  }
  if (
    !isPositiveFinite(faceWidthProxyPx) ||
    !isPositiveFinite(subjectLeftIrisDiameterPx) ||
    !isPositiveFinite(subjectRightIrisDiameterPx)
  ) {
    return rejected([...reasons, 'invalid-geometry']);
  }

  if (
    subjectLeftIrisDiameterPx < FACE_FIT_THRESHOLDS.minIrisDiameterPx ||
    subjectRightIrisDiameterPx < FACE_FIT_THRESHOLDS.minIrisDiameterPx
  ) {
    reasons.push('iris-too-small');
  }
  if (!signal.qualityAccepted) reasons.push('pose-or-quality-rejected');
  if (signal.temporalState !== 'ready') reasons.push('temporal-unstable');

  const disagreement =
    Math.abs(subjectLeftIrisDiameterPx - subjectRightIrisDiameterPx) /
    Math.max(subjectLeftIrisDiameterPx, subjectRightIrisDiameterPx);
  if (
    !Number.isFinite(disagreement) ||
    disagreement > FACE_FIT_THRESHOLDS.absoluteMaxIrisScaleDisagreement
  ) {
    reasons.push('iris-scale-disagreement');
  }
  if (reasons.length) return rejected(reasons);

  const subjectLeft = eyeRange(faceWidthProxyPx, subjectLeftIrisDiameterPx);
  const subjectRight = eyeRange(faceWidthProxyPx, subjectRightIrisDiameterPx);
  const minMm = Math.floor(Math.min(subjectLeft.minMm, subjectRight.minMm));
  const maxMm = Math.ceil(Math.max(subjectLeft.maxMm, subjectRight.maxMm));
  const centralEstimateMm = Math.round(
    (subjectLeft.centralMm + subjectRight.centralMm) / 2,
  );

  if (
    minMm < FACE_FIT_THRESHOLDS.absoluteMinPlausibleFaceWidthMm ||
    maxMm > FACE_FIT_THRESHOLDS.absoluteMaxPlausibleFaceWidthMm
  ) {
    return rejected(['anthropometric-implausible']);
  }

  const confidence: FaceFitConfidence =
    disagreement <= FACE_FIT_THRESHOLDS.absoluteMediumConfidenceDisagreement &&
    Math.min(subjectLeftIrisDiameterPx, subjectRightIrisDiameterPx) >=
      FACE_FIT_THRESHOLDS.absoluteMediumConfidenceMinIrisPx
      ? 'medium'
      : 'low';

  return {
    schemaVersion: 1,
    method: ABSOLUTE_FACE_SIZE_METHOD,
    status: 'usable',
    confidence,
    reasons: [],
    assumptions: assumptions(),
    estimatedFaceWidth: { minMm, maxMm },
    centralEstimateMm,
    perEye: {
      subjectLeft: {
        minMm: Math.floor(subjectLeft.minMm),
        maxMm: Math.ceil(subjectLeft.maxMm),
        centralMm: Math.round(subjectLeft.centralMm),
      },
      subjectRight: {
        minMm: Math.floor(subjectRight.minMm),
        maxMm: Math.ceil(subjectRight.maxMm),
        centralMm: Math.round(subjectRight.centralMm),
      },
    },
    scaleDisagreement: disagreement,
  };
}

/** Adapter that keeps the estimate internal and outside SafeFaceFitContext. */
export function estimateAbsoluteFaceSizeFromResult(
  result: FaceFitResult | null,
): AbsoluteFaceSizeEstimate {
  if (!result || result.status === 'rejected') {
    return estimateAbsoluteFaceSize({
      faceWidthProxyPx: null,
      subjectLeftIrisDiameterPx: null,
      subjectRightIrisDiameterPx: null,
      temporalState: result?.quality.temporalState ?? 'collecting',
      qualityAccepted: false,
    });
  }
  return estimateAbsoluteFaceSize({
    faceWidthProxyPx: result.measurements.faceWidthProxyPx,
    subjectLeftIrisDiameterPx: result.quality.irisDiameterPx.subjectLeft,
    subjectRightIrisDiameterPx: result.quality.irisDiameterPx.subjectRight,
    temporalState: result.quality.temporalState,
    qualityAccepted:
      result.rejectionReasons.length === 0 && result.quality.pose !== null,
  });
}
