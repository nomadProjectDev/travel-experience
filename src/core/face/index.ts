export type {
  FaceFitAnalysisOutcome,
  FaceFitAbsoluteEstimate,
  FaceFitConfidence,
  FaceFitExperimental,
  FaceFitQuality,
  FaceFitRatios,
  FaceFitRejectionReason,
  FaceFitRelativeMeasurements,
  FaceFitResult,
  FaceFitTemporalState,
  FaceLandmark,
  HeadPoseDeg,
  MmScaleMethod,
  PublishedFrameMeasurements,
  RoundedMmRange,
  SafeFaceFitContext,
} from './types';

export {
  EYE_SCAN_CONNECTIONS,
  FACE_LANDMARK_COUNT_WITH_IRIS,
  FACE_OVAL_CONNECTIONS,
  IRIS_RING_CONNECTIONS,
  LM_NOSE_BRIDGE_MID,
  LM_NOSE_BRIDGE_TOP,
  LM_SUBJECT_LEFT_FACE,
  LM_SUBJECT_LEFT_IRIS,
  LM_SUBJECT_LEFT_OUTER_CANTHUS,
  LM_SUBJECT_RIGHT_FACE,
  LM_SUBJECT_RIGHT_IRIS,
  LM_SUBJECT_RIGHT_OUTER_CANTHUS,
} from './landmarks';

export {
  IRIS_DIAMETER_PRIOR_MM,
  computeFaceFitMetrics,
  estimateSubjectIrisDiametersPx,
  headPoseFromMatrix,
  type ComputeFaceFitOptions,
  type FaceFitScaleOverride,
  type FaceMatrixLike,
  type SubjectIrisDiametersPx,
} from './metrics';

export {
  FACE_FIT_REASON_PRIORITY,
  evaluateFaceFitQuality,
  faceFitStatusFromQuality,
  irisScaleDisagreement,
  type EvaluateFaceFitQualityInput,
} from './quality';

export { FACE_FIT_THRESHOLDS } from './thresholds';

export {
  ABSOLUTE_FACE_SIZE_METHOD,
  estimateAbsoluteFaceSize,
  estimateAbsoluteFaceSizeFromResult,
  type AbsoluteFaceSizeAssumptions,
  type AbsoluteFaceSizeEstimate,
  type AbsoluteFaceSizeRejectionReason,
  type AbsoluteFaceSizeSignal,
  type RejectedAbsoluteFaceSizeEstimate,
  type UsableAbsoluteFaceSizeEstimate,
} from './absoluteFaceSize';

export {
  compareFrameWidthsToEstimatedRange,
  type FrameWidthRangePosition,
  type FrameWidthSandboxComparison,
  type FrameWidthSandboxEvidence,
} from './frameWidthSandbox';

export {
  FaceFitStabilityTracker,
  type FaceFitStabilityOptions,
  type FaceFitStabilityUpdate,
} from './stability';

export {
  buildFaceLandmarkerFixture,
  downloadFaceLandmarkerFixture,
  isFaceLandmarkerFixtureV1,
  type FaceFixturePose,
  type FaceLandmarkerFixtureV1,
} from './fixture';

export {
  assertSafeFaceFitContext,
  buildFaceFitMetricPresentation,
  buildSafeFaceFitContext,
  buildFaceFitMetricRows,
  formatFaceFitHud,
  formatPoseDeg,
  formatPx,
  formatRatio,
  type FaceFitMetricKey,
  type FaceFitMetricPresentation,
  type FaceFitMetricRow,
} from './present';

export {
  FACE_FIT_OVERLAY_ACCENT,
  FACE_FIT_OVERLAY_WIRE,
  FACE_FIT_YAW_HINT_DEG,
  clearFaceScanOverlay,
  drawFaceScanOverlay,
  hasCurrentSingleFaceLandmarks,
  landmarkToCanvasPoint,
  type CanvasPoint,
  type DrawFaceScanOverlayOptions,
  type LandmarkCanvasMapOptions,
} from './overlay';
