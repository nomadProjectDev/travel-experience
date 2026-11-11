import type {
  CalibrationDistance,
  CalibrationLighting,
  CalibrationPoseTarget,
  FaceFitCalibrationMetadata,
  FaceFitCalibrationProtocol,
} from '@/services/face-fit-fixture-export.service';

export interface FaceFitCalibrationStep {
  id: string;
  labelKey:
    | 'frontal1'
    | 'frontal2'
    | 'frontal3'
    | 'near'
    | 'target'
    | 'far'
    | 'yawLeft10'
    | 'yawRight10'
    | 'yawLeft20'
    | 'yawRight20'
    | 'pitchUp'
    | 'pitchDown'
    | 'lightingEven'
    | 'lightingChallenging';
  distanceCondition: CalibrationDistance;
  lighting: CalibrationLighting;
  poseTarget: CalibrationPoseTarget;
}

export const FACE_FIT_CALIBRATION_STEPS: readonly FaceFitCalibrationStep[] = [
  { id: 'frontal-1', labelKey: 'frontal1', distanceCondition: 'target', lighting: 'even', poseTarget: 'frontal' },
  { id: 'frontal-2', labelKey: 'frontal2', distanceCondition: 'target', lighting: 'even', poseTarget: 'frontal' },
  { id: 'frontal-3', labelKey: 'frontal3', distanceCondition: 'target', lighting: 'even', poseTarget: 'frontal' },
  { id: 'distance-near', labelKey: 'near', distanceCondition: 'near', lighting: 'even', poseTarget: 'frontal' },
  { id: 'distance-target', labelKey: 'target', distanceCondition: 'target', lighting: 'even', poseTarget: 'frontal' },
  { id: 'distance-far', labelKey: 'far', distanceCondition: 'far', lighting: 'even', poseTarget: 'frontal' },
  { id: 'yaw-left-10', labelKey: 'yawLeft10', distanceCondition: 'target', lighting: 'even', poseTarget: 'yaw-left-10' },
  { id: 'yaw-right-10', labelKey: 'yawRight10', distanceCondition: 'target', lighting: 'even', poseTarget: 'yaw-right-10' },
  { id: 'yaw-left-20', labelKey: 'yawLeft20', distanceCondition: 'target', lighting: 'even', poseTarget: 'yaw-left-20' },
  { id: 'yaw-right-20', labelKey: 'yawRight20', distanceCondition: 'target', lighting: 'even', poseTarget: 'yaw-right-20' },
  { id: 'pitch-up', labelKey: 'pitchUp', distanceCondition: 'target', lighting: 'even', poseTarget: 'pitch-up' },
  { id: 'pitch-down', labelKey: 'pitchDown', distanceCondition: 'target', lighting: 'even', poseTarget: 'pitch-down' },
  { id: 'lighting-even', labelKey: 'lightingEven', distanceCondition: 'target', lighting: 'even', poseTarget: 'frontal' },
  { id: 'lighting-challenging', labelKey: 'lightingChallenging', distanceCondition: 'target', lighting: 'challenging', poseTarget: 'frontal' },
];

export const SIMPLE_FRONTAL_REPEAT_LIMIT = 3;
export const DEFAULT_GROUND_TRUTH_METHOD = 'bizygomatic-caliper' as const;
export const DEFAULT_GROUND_TRUTH_TOOL = 'caliper';
export const DEFAULT_GROUND_TRUTH_REPEATS = 3;
export const ANONYMOUS_PARTICIPANT_PATTERN = /^[A-Za-z0-9_-]{3,64}$/;
export const CALIBRATION_SESSION_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

export type CalibrationExportBlocker =
  | 'noCapture'
  | 'analyzing'
  | 'noLandmarks'
  | 'consent'
  | 'invalidWidth'
  | 'missingIdentity'
  | 'exporting';

export type ParsedMeasuredFaceWidth =
  | { status: 'empty' }
  | { status: 'invalid' }
  | { status: 'ok'; valueMm: number };

export interface CalibrationExportGateInput {
  hasCapturedImage: boolean;
  analysisPending: boolean;
  capturedLandmarkCount: number | null;
  consent: boolean;
  participantId: string;
  sessionId: string;
  deviceLabel: string;
  groundTruthFaceWidth: string;
  exportState: 'idle' | 'exporting' | 'exported' | 'error';
}

export interface CalibrationIdentityDefaults {
  participantId: string;
  sessionId: string;
  deviceLabel: string;
}

export function nextIncompleteCalibrationStep(
  currentIndex: number,
  completedStepIds: ReadonlySet<string>,
): number {
  for (let offset = 1; offset <= FACE_FIT_CALIBRATION_STEPS.length; offset += 1) {
    const index = (currentIndex + offset) % FACE_FIT_CALIBRATION_STEPS.length;
    if (!completedStepIds.has(FACE_FIT_CALIBRATION_STEPS[index].id)) return index;
  }
  return currentIndex;
}

export function isFaceFitSizeSandboxEnabled(input: {
  dev: boolean;
  calibrationMode: boolean;
  flag: string | undefined;
}): boolean {
  return input.dev && input.calibrationMode && input.flag === 'true';
}

export function inferDeviceLabel(
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): string {
  if (/iPhone/i.test(userAgent)) return 'iPhone-browser';
  if (/iPad/i.test(userAgent)) return 'iPad-browser';
  if (/Android/i.test(userAgent)) return 'Android-browser';
  if (/Macintosh/i.test(userAgent)) return 'Mac-browser';
  if (/Windows/i.test(userAgent)) return 'Windows-browser';
  return 'desktop-browser';
}

export function createDefaultCalibrationIdentity(
  now = new Date(),
  entropy = Math.random(),
  userAgent?: string,
): CalibrationIdentityDefaults {
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const suffix = Math.floor((entropy % 1) * 1000)
    .toString()
    .padStart(3, '0');
  return {
    participantId: `p-anon-${stamp}${suffix}`,
    sessionId: `s-${stamp}-${suffix}`,
    deviceLabel: inferDeviceLabel(userAgent),
  };
}

export function parseMeasuredFaceWidthMm(raw: string): ParsedMeasuredFaceWidth {
  const trimmed = raw.trim();
  if (!trimmed) return { status: 'empty' };
  const value = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return { status: 'invalid' };
  return { status: 'ok', valueMm: value };
}

export function hasValidCalibrationIdentity(input: {
  participantId: string;
  sessionId: string;
  deviceLabel: string;
}): boolean {
  return (
    ANONYMOUS_PARTICIPANT_PATTERN.test(input.participantId.trim()) &&
    CALIBRATION_SESSION_PATTERN.test(input.sessionId.trim()) &&
    input.deviceLabel.trim().length > 0
  );
}

export function getCalibrationExportBlockers(
  input: CalibrationExportGateInput,
): CalibrationExportBlocker[] {
  const blockers: CalibrationExportBlocker[] = [];
  if (input.exportState === 'exporting') blockers.push('exporting');
  if (!input.consent) blockers.push('consent');
  if (parseMeasuredFaceWidthMm(input.groundTruthFaceWidth).status === 'invalid') {
    blockers.push('invalidWidth');
  }
  if (!hasValidCalibrationIdentity(input)) blockers.push('missingIdentity');
  if (input.analysisPending) {
    blockers.push('analyzing');
  } else if (input.capturedLandmarkCount !== null && input.capturedLandmarkCount > 0) {
    /* capture is exportable */
  } else if (input.hasCapturedImage) {
    blockers.push('noLandmarks');
  } else {
    blockers.push('noCapture');
  }
  return blockers;
}

export function canExportCalibrationSample(input: CalibrationExportGateInput): boolean {
  return getCalibrationExportBlockers(input).length === 0;
}

export function simpleFrontalProtocol(repeatIndex: number): FaceFitCalibrationProtocol {
  const clamped = Math.min(
    Math.max(repeatIndex, 0),
    SIMPLE_FRONTAL_REPEAT_LIMIT - 1,
  );
  const step = FACE_FIT_CALIBRATION_STEPS[clamped];
  return {
    stepId: step.id,
    stepIndex: clamped + 1,
    stepCount: SIMPLE_FRONTAL_REPEAT_LIMIT,
  };
}

export function nextSimpleFrontalRepeat(currentIndex: number): number {
  return Math.min(currentIndex + 1, SIMPLE_FRONTAL_REPEAT_LIMIT - 1);
}

export function buildCalibrationGroundTruth(input: {
  widthRaw: string;
  method?: NonNullable<FaceFitCalibrationMetadata['groundTruthFaceWidth']>['method'];
  toolRaw?: string;
  repeatsRaw?: string;
}): NonNullable<FaceFitCalibrationMetadata['groundTruthFaceWidth']> | undefined {
  const parsed = parseMeasuredFaceWidthMm(input.widthRaw);
  if (parsed.status !== 'ok') return undefined;
  const repeats = Number(input.repeatsRaw);
  return {
    valueMm: parsed.valueMm,
    method: input.method ?? DEFAULT_GROUND_TRUTH_METHOD,
    tool: input.toolRaw?.trim() || DEFAULT_GROUND_TRUTH_TOOL,
    repeatCount:
      Number.isInteger(repeats) && repeats > 0 ? repeats : DEFAULT_GROUND_TRUTH_REPEATS,
  };
}
