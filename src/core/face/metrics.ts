/** Pure, versioned face-fit measurement pipeline. */

import type { CaptureQualityMetrics } from '@/core/media/captureQuality';
import {
  FACE_LANDMARK_COUNT_WITH_IRIS,
  LM_NOSE_BRIDGE_MID,
  LM_NOSE_BRIDGE_TOP,
  LM_SUBJECT_LEFT_FACE,
  LM_SUBJECT_LEFT_IRIS,
  LM_SUBJECT_LEFT_OUTER_CANTHUS,
  LM_SUBJECT_RIGHT_FACE,
  LM_SUBJECT_RIGHT_IRIS,
  LM_SUBJECT_RIGHT_OUTER_CANTHUS,
} from './landmarks';
import { evaluateFaceFitQuality, faceFitStatusFromQuality } from './quality';
import { FACE_FIT_THRESHOLDS } from './thresholds';
import type {
  FaceFitAbsoluteEstimate,
  FaceFitConfidence,
  FaceFitResult,
  FaceLandmark,
  HeadPoseDeg,
  MmScaleMethod,
  RoundedMmRange,
} from './types';

/** Adult horizontal visible iris-diameter prior; never a subject measurement. */
export const IRIS_DIAMETER_PRIOR_MM = 11.7;

export interface FaceMatrixLike {
  rows: number;
  columns: number;
  data: number[];
}

export type FaceFitScaleOverride =
  | { method: 'iris-diameter-prior'; irisDiameterMm?: number }
  | { method: 'known-card'; referencePx: number; referenceMm: number }
  | { method: 'unscaled' };

export interface ComputeFaceFitOptions {
  imageWidthPx: number;
  imageHeightPx: number;
  scale?: FaceFitScaleOverride;
  facialMatrix?: FaceMatrixLike | null;
  captureQuality?: CaptureQualityMetrics | null;
  faceCount?: number;
  temporalState?: 'collecting' | 'stabilizing' | 'ready';
}

function dist2d(a: FaceLandmark, b: FaceLandmark, widthPx: number, heightPx: number): number {
  return Math.hypot((a.x - b.x) * widthPx, (a.y - b.y) * heightPx);
}

function requireLandmark(landmarks: FaceLandmark[], index: number): FaceLandmark {
  const landmark = landmarks[index];
  if (!landmark) throw new Error(`Missing landmark ${index}`);
  return landmark;
}

export interface SubjectIrisDiametersPx {
  subjectLeft: number | null;
  subjectRight: number | null;
}

/**
 * Horizontal-only diameters, independently per anatomical eye.
 * Subject-right ring is 469↔471; subject-left ring is 474↔476.
 */
export function estimateSubjectIrisDiametersPx(
  landmarks: FaceLandmark[],
  imageWidthPx: number,
  imageHeightPx: number,
): SubjectIrisDiametersPx {
  if (landmarks.length < FACE_LANDMARK_COUNT_WITH_IRIS) {
    return { subjectLeft: null, subjectRight: null };
  }
  const subjectRight = dist2d(
    landmarks[469]!,
    landmarks[471]!,
    imageWidthPx,
    imageHeightPx,
  );
  const subjectLeft = dist2d(
    landmarks[474]!,
    landmarks[476]!,
    imageWidthPx,
    imageHeightPx,
  );
  return {
    subjectLeft: Number.isFinite(subjectLeft) && subjectLeft > 0 ? subjectLeft : null,
    subjectRight: Number.isFinite(subjectRight) && subjectRight > 0 ? subjectRight : null,
  };
}

/**
 * Extract yaw / pitch / roll (degrees) from a 4×4 column-major matrix.
 * MediaPipe Tasks facialTransformationMatrixes follow OpenGL-style column-major layout.
 */
export function headPoseFromMatrix(matrix: FaceMatrixLike): HeadPoseDeg | null {
  if (matrix.rows !== 4 || matrix.columns !== 4 || matrix.data.length < 16) {
    return null;
  }
  const m = matrix.data;
  // Column-major rotation R:
  //   [ m0 m4 m8  ]
  //   [ m1 m5 m9  ]
  //   [ m2 m6 m10 ]
  const r00 = m[0]!;
  const r02 = m[8]!;
  const r10 = m[1]!;
  const r21 = m[6]!;
  const r22 = m[10]!;

  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  // Approximate Euler extraction for debug / gating (not a calibrated IMU).
  // Yaw uses r02 so a pure +Y rotation yields a positive yawDeg.
  const pitchDeg = (Math.asin(clamp(-r21)) * 180) / Math.PI;
  const yawDeg = (Math.atan2(r02, r22) * 180) / Math.PI;
  const rollDeg = (Math.atan2(r10, r00) * 180) / Math.PI;

  if (![yawDeg, pitchDeg, rollDeg].every(Number.isFinite)) return null;

  return {
    yawDeg,
    pitchDeg,
    rollDeg,
    matrixLayout: 'column-major-4x4',
  };
}

function roundedRange(point: number, fraction: number): RoundedMmRange {
  return {
    min: Math.floor(point * (1 - fraction)),
    max: Math.ceil(point * (1 + fraction)),
  };
}

function buildAbsoluteEstimate(
  method: MmScaleMethod,
  confidence: FaceFitConfidence,
  pxPerMm: number,
  ipdPx: number,
  outerCanthiPx: number,
  faceWidthPx: number,
  irisPriorMm?: number,
): FaceFitAbsoluteEstimate {
  const fraction =
    method === 'known-card'
      ? FACE_FIT_THRESHOLDS.knownCardRangeFraction
      : FACE_FIT_THRESHOLDS.irisPriorRangeFraction;
  return {
    method,
    confidence,
    ...(irisPriorMm == null ? {} : { irisDiameterPriorMm: irisPriorMm }),
    ipdMm: roundedRange(ipdPx / pxPerMm, fraction),
    outerCanthiMm: roundedRange(outerCanthiPx / pxPerMm, fraction),
    faceWidthMm: roundedRange(faceWidthPx / pxPerMm, fraction),
  };
}

export function computeFaceFitMetrics(
  landmarks: FaceLandmark[],
  options: ComputeFaceFitOptions,
): FaceFitResult {
  const { imageWidthPx, imageHeightPx } = options;
  if (landmarks.length < FACE_LANDMARK_COUNT_WITH_IRIS) {
    throw new Error(
      `Need ≥${FACE_LANDMARK_COUNT_WITH_IRIS} landmarks with iris; got ${landmarks.length}`,
    );
  }
  if (imageWidthPx <= 0 || imageHeightPx <= 0) {
    throw new Error('imageWidthPx / imageHeightPx must be positive');
  }

  const subjectLeftIris = requireLandmark(landmarks, LM_SUBJECT_LEFT_IRIS);
  const subjectRightIris = requireLandmark(landmarks, LM_SUBJECT_RIGHT_IRIS);
  const subjectLeftCanthus = requireLandmark(landmarks, LM_SUBJECT_LEFT_OUTER_CANTHUS);
  const subjectRightCanthus = requireLandmark(landmarks, LM_SUBJECT_RIGHT_OUTER_CANTHUS);
  const bridgeTop = requireLandmark(landmarks, LM_NOSE_BRIDGE_TOP);
  const bridgeMid = requireLandmark(landmarks, LM_NOSE_BRIDGE_MID);
  const subjectLeftFace = requireLandmark(landmarks, LM_SUBJECT_LEFT_FACE);
  const subjectRightFace = requireLandmark(landmarks, LM_SUBJECT_RIGHT_FACE);

  const ipdPx = dist2d(subjectLeftIris, subjectRightIris, imageWidthPx, imageHeightPx);
  const outerCanthiPx = dist2d(
    subjectLeftCanthus,
    subjectRightCanthus,
    imageWidthPx,
    imageHeightPx,
  );
  const nasalHeightProxyPx = dist2d(bridgeTop, bridgeMid, imageWidthPx, imageHeightPx);
  const faceWidthPx = dist2d(
    subjectLeftFace,
    subjectRightFace,
    imageWidthPx,
    imageHeightPx,
  );
  const midX = (bridgeTop.x + bridgeMid.x) / 2;
  const subjectLeftIrisToNasalAxisPx =
    Math.abs(subjectLeftIris.x - midX) * imageWidthPx;
  const subjectRightIrisToNasalAxisPx =
    Math.abs(subjectRightIris.x - midX) * imageWidthPx;
  const headPose = options.facialMatrix
    ? headPoseFromMatrix(options.facialMatrix)
    : null;

  const measurements = {
    irisCenterSpanPx: ipdPx,
    outerCanthiSpanPx: outerCanthiPx,
    faceWidthProxyPx: faceWidthPx,
  };
  const ratios = {
    ipdToFaceWidth: faceWidthPx > 0 ? ipdPx / faceWidthPx : 0,
    canthiToFaceWidth: faceWidthPx > 0 ? outerCanthiPx / faceWidthPx : 0,
  };
  const irises = estimateSubjectIrisDiametersPx(landmarks, imageWidthPx, imageHeightPx);

  let pxPerMm: number | null = null;
  let method: MmScaleMethod | null = null;
  let confidence: FaceFitConfidence = 'low';
  let irisPriorMm: number | undefined;
  if (options.scale?.method === 'known-card') {
    if (options.scale.referencePx > 0 && options.scale.referenceMm > 0) {
      pxPerMm = options.scale.referencePx / options.scale.referenceMm;
      method = 'known-card';
      confidence = 'medium';
    }
  } else if (options.scale?.method !== 'unscaled' && irises.subjectLeft && irises.subjectRight) {
    irisPriorMm =
      options.scale?.method === 'iris-diameter-prior'
        ? options.scale.irisDiameterMm ?? IRIS_DIAMETER_PRIOR_MM
        : IRIS_DIAMETER_PRIOR_MM;
    pxPerMm = ((irises.subjectLeft + irises.subjectRight) / 2) / irisPriorMm;
    method = 'iris-diameter-prior';
  }

  const ipdMmPointEstimate = pxPerMm ? ipdPx / pxPerMm : null;
  const faceWidthMmPointEstimate = pxPerMm ? faceWidthPx / pxPerMm : null;
  const quality = evaluateFaceFitQuality({
    faceCount: options.faceCount ?? 1,
    pose: headPose,
    faceOccupancy: faceWidthPx / imageWidthPx,
    subjectLeftIrisDiameterPx: irises.subjectLeft,
    subjectRightIrisDiameterPx: irises.subjectRight,
    ratios,
    ipdMmPointEstimate,
    faceWidthMmPointEstimate,
    captureQuality: options.captureQuality,
    temporalState: options.temporalState,
  });
  const status = faceFitStatusFromQuality(quality);
  const rejectionReasons = quality.reasons;
  if (status === 'rejected') {
    return { schemaVersion: 2, status, quality, rejectionReasons };
  }

  const experimental = {
    nasalHeightProxyPx,
    subjectLeftIrisToNasalAxisPx,
    subjectRightIrisToNasalAxisPx,
  };
  if (status === 'limited' || pxPerMm == null || method == null) {
    return {
      schemaVersion: 2,
      status: 'limited',
      measurements,
      ratios,
      quality,
      rejectionReasons,
      experimental,
    };
  }

  return {
    schemaVersion: 2,
    status: 'valid',
    measurements,
    ratios,
    quality,
    rejectionReasons,
    absoluteEstimate: buildAbsoluteEstimate(
      method,
      confidence,
      pxPerMm,
      ipdPx,
      outerCanthiPx,
      faceWidthPx,
      irisPriorMm,
    ),
    experimental,
  };
}
