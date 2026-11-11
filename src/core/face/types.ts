/** Pure face-fit types for MediaPipe Tasks Face Landmarker analysis. */

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type MmScaleMethod = 'iris-diameter-prior' | 'known-card';
export type FaceFitConfidence = 'low' | 'medium' | 'high';
export type FaceFitTemporalState = 'collecting' | 'stabilizing' | 'ready';

export interface HeadPoseDeg {
  yawDeg: number;
  pitchDeg: number;
  rollDeg: number;
  matrixLayout: 'column-major-4x4';
}

export type FaceFitRejectionReason =
  | 'face-not-present'
  | 'multiple-faces'
  | 'pose-unavailable'
  | 'face-too-far'
  | 'face-too-close'
  | 'yaw-too-high'
  | 'pitch-too-high'
  | 'roll-too-high'
  | 'illumination-too-low'
  | 'image-too-blurry'
  | 'iris-too-small'
  | 'iris-scale-asymmetry'
  | 'eye-span-ratio-implausible'
  | 'ipd-estimate-implausible'
  | 'face-width-estimate-implausible'
  | 'temporal-unstable'
  | 'insufficient-landmarks'
  | 'runtime-error';

export interface FaceFitQuality {
  faceCount: number;
  pose: HeadPoseDeg | null;
  faceOccupancy: number | null;
  irisDiameterPx: {
    subjectLeft: number | null;
    subjectRight: number | null;
  };
  irisScaleDisagreement: number | null;
  temporalState: FaceFitTemporalState;
  captureQuality: {
    meanLuminance: number;
    luminanceVariance: number;
  } | null;
  reasons: FaceFitRejectionReason[];
}

export interface FaceFitRatios {
  ipdToFaceWidth: number;
  canthiToFaceWidth: number;
}

export interface FaceFitRelativeMeasurements {
  irisCenterSpanPx: number;
  outerCanthiSpanPx: number;
  faceWidthProxyPx: number;
}

export interface RoundedMmRange {
  min: number;
  max: number;
}

export interface FaceFitAbsoluteEstimate {
  method: MmScaleMethod;
  confidence: FaceFitConfidence;
  irisDiameterPriorMm?: number;
  ipdMm: RoundedMmRange;
  outerCanthiMm: RoundedMmRange;
  faceWidthMm: RoundedMmRange;
}

export interface FaceFitExperimental {
  /** Vertical 168→6 proxy. It is not bridge width and never DBL. */
  nasalHeightProxyPx: number;
  subjectLeftIrisToNasalAxisPx: number;
  subjectRightIrisToNasalAxisPx: number;
}

interface FaceFitResultBase {
  schemaVersion: 2;
  quality: FaceFitQuality;
  rejectionReasons: FaceFitRejectionReason[];
}

export interface ValidFaceFitResult extends FaceFitResultBase {
  status: 'valid';
  measurements: FaceFitRelativeMeasurements;
  ratios: FaceFitRatios;
  absoluteEstimate: FaceFitAbsoluteEstimate;
  experimental: FaceFitExperimental;
}

export interface LimitedFaceFitResult extends FaceFitResultBase {
  status: 'limited';
  measurements: FaceFitRelativeMeasurements;
  ratios: FaceFitRatios;
  absoluteEstimate?: never;
  experimental: FaceFitExperimental;
}

export interface RejectedFaceFitResult extends FaceFitResultBase {
  status: 'rejected';
  measurements?: never;
  ratios?: never;
  absoluteEstimate?: never;
  experimental?: never;
}

export type FaceFitResult =
  | ValidFaceFitResult
  | LimitedFaceFitResult
  | RejectedFaceFitResult;

/** Strict portable recommendation/prompt boundary: normalized ratios only. */
export type SafeFaceFitContext =
  | {
      schemaVersion: 2;
      status: 'valid' | 'limited';
      ipdToFaceWidth: number;
      outerCanthiToFaceWidth: number;
    }
  | {
      schemaVersion: 2;
      status: 'rejected';
    };

export type FaceFitAnalysisOutcome =
  | {
      ok: true;
      result: FaceFitResult;
      landmarks: FaceLandmark[];
      landmarkCount: number;
    }
  | {
      ok: false;
      reason: 'load-failed' | 'detect-failed' | 'stale-session';
      message: string;
    };

/** Published frame measurements for later optical-style fit tests. */
export interface PublishedFrameMeasurements {
  sku: string;
  brand: string;
  model: string;
  /** Closest eyewear wardrobe analogue (shape/material), if any. */
  wardrobeAnalogueId?: string;
  measurementsMm: {
    lensWidth: number;
    bridge: number;
    temple: number;
    lensHeight?: number;
    /** Approximate hinge-to-hinge / total front width when published. */
    frameWidthApprox?: number;
  };
  /** Citation for the published size chart. */
  sourceUrl: string;
  notes?: string;
}
