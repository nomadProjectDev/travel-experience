import type { CaptureQualityMetrics } from '@/core/media/captureQuality';
import {
  CAPTURE_TOO_BLURRY_VARIANCE,
  CAPTURE_TOO_DARK_MEAN,
} from '@/core/media/captureQuality';
import { FACE_FIT_THRESHOLDS } from './thresholds';
import type {
  FaceFitQuality,
  FaceFitRatios,
  FaceFitRejectionReason,
  FaceFitTemporalState,
  HeadPoseDeg,
} from './types';

export interface EvaluateFaceFitQualityInput {
  faceCount: number;
  pose: HeadPoseDeg | null;
  faceOccupancy: number | null;
  subjectLeftIrisDiameterPx: number | null;
  subjectRightIrisDiameterPx: number | null;
  ratios: FaceFitRatios | null;
  ipdMmPointEstimate?: number | null;
  faceWidthMmPointEstimate?: number | null;
  captureQuality?: CaptureQualityMetrics | null;
  temporalState?: FaceFitTemporalState;
}

/** Stable order doubles as UX coaching priority. */
export const FACE_FIT_REASON_PRIORITY: readonly FaceFitRejectionReason[] = [
  'face-not-present',
  'multiple-faces',
  'pose-unavailable',
  'face-too-far',
  'face-too-close',
  'yaw-too-high',
  'pitch-too-high',
  'roll-too-high',
  'illumination-too-low',
  'image-too-blurry',
  'eye-span-ratio-implausible',
  'iris-too-small',
  'iris-scale-asymmetry',
  'ipd-estimate-implausible',
  'face-width-estimate-implausible',
  'temporal-unstable',
  'insufficient-landmarks',
  'runtime-error',
];

const REJECTING_REASONS = new Set<FaceFitRejectionReason>([
  'face-not-present',
  'multiple-faces',
  'face-too-far',
  'face-too-close',
  'yaw-too-high',
  'pitch-too-high',
  'roll-too-high',
  'illumination-too-low',
  'image-too-blurry',
  'eye-span-ratio-implausible',
  'insufficient-landmarks',
  'runtime-error',
]);

export function irisScaleDisagreement(
  subjectLeftPx: number | null,
  subjectRightPx: number | null,
): number | null {
  if (
    subjectLeftPx == null ||
    subjectRightPx == null ||
    subjectLeftPx <= 0 ||
    subjectRightPx <= 0
  ) {
    return null;
  }
  return Math.abs(subjectLeftPx - subjectRightPx) / Math.max(subjectLeftPx, subjectRightPx);
}

export function evaluateFaceFitQuality(
  input: EvaluateFaceFitQualityInput,
): FaceFitQuality {
  const t = FACE_FIT_THRESHOLDS;
  const reasons = new Set<FaceFitRejectionReason>();

  if (input.faceCount < 1) reasons.add('face-not-present');
  if (input.faceCount > 1) reasons.add('multiple-faces');
  if (input.faceCount === 1 && input.pose === null) reasons.add('pose-unavailable');
  if (input.faceOccupancy != null) {
    if (input.faceOccupancy < t.minFaceOccupancy) reasons.add('face-too-far');
    if (input.faceOccupancy > t.maxFaceOccupancy) reasons.add('face-too-close');
  }
  if (input.pose) {
    if (Math.abs(input.pose.yawDeg) > t.maxYawDeg) reasons.add('yaw-too-high');
    if (Math.abs(input.pose.pitchDeg) > t.maxPitchDeg) reasons.add('pitch-too-high');
    if (Math.abs(input.pose.rollDeg) > t.maxRollDeg) reasons.add('roll-too-high');
  }
  if (input.captureQuality) {
    if (input.captureQuality.meanLuminance < CAPTURE_TOO_DARK_MEAN) {
      reasons.add('illumination-too-low');
    }
    if (input.captureQuality.luminanceVariance < CAPTURE_TOO_BLURRY_VARIANCE) {
      reasons.add('image-too-blurry');
    }
  }

  const disagreement = irisScaleDisagreement(
    input.subjectLeftIrisDiameterPx,
    input.subjectRightIrisDiameterPx,
  );
  if (input.faceCount === 1 && input.ratios) {
    const irisDiameters = [
      input.subjectLeftIrisDiameterPx,
      input.subjectRightIrisDiameterPx,
    ];
    if (irisDiameters.some((value) => value == null || value < t.minIrisDiameterPx)) {
      reasons.add('iris-too-small');
    }
    if (disagreement != null && disagreement > t.maxIrisScaleDisagreement) {
      reasons.add('iris-scale-asymmetry');
    }
  }

  if (
    input.ratios &&
    (input.ratios.ipdToFaceWidth < t.minIpdToFaceWidth ||
      input.ratios.ipdToFaceWidth > t.maxIpdToFaceWidth ||
      input.ratios.canthiToFaceWidth < t.minCanthiToFaceWidth ||
      input.ratios.canthiToFaceWidth > t.maxCanthiToFaceWidth)
  ) {
    reasons.add('eye-span-ratio-implausible');
  }
  if (
    input.ipdMmPointEstimate != null &&
    (input.ipdMmPointEstimate < t.minIpdMm || input.ipdMmPointEstimate > t.maxIpdMm)
  ) {
    reasons.add('ipd-estimate-implausible');
  }
  if (
    input.faceWidthMmPointEstimate != null &&
    (input.faceWidthMmPointEstimate < t.minFaceWidthMm ||
      input.faceWidthMmPointEstimate > t.maxFaceWidthMm)
  ) {
    reasons.add('face-width-estimate-implausible');
  }
  const temporalState = input.temporalState ?? 'ready';
  if (temporalState !== 'ready') reasons.add('temporal-unstable');

  return {
    faceCount: input.faceCount,
    pose: input.pose,
    faceOccupancy: input.faceOccupancy,
    irisDiameterPx: {
      subjectLeft: input.subjectLeftIrisDiameterPx,
      subjectRight: input.subjectRightIrisDiameterPx,
    },
    irisScaleDisagreement: disagreement,
    temporalState,
    captureQuality: input.captureQuality ?? null,
    reasons: FACE_FIT_REASON_PRIORITY.filter((reason) => reasons.has(reason)),
  };
}

export function faceFitStatusFromQuality(
  quality: FaceFitQuality,
): 'valid' | 'limited' | 'rejected' {
  if (quality.reasons.some((reason) => REJECTING_REASONS.has(reason))) return 'rejected';
  return quality.reasons.length === 0 ? 'valid' : 'limited';
}

