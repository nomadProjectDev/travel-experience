import type { FaceMatrixLike } from './metrics';
import type { FaceLandmark } from './types';

export type FaceFixturePose =
  | 'frontal'
  | 'yaw-subject-left'
  | 'yaw-subject-right'
  | 'pitch-up'
  | 'pitch-down'
  | 'roll';

export interface FaceLandmarkerFixtureV1 {
  schemaVersion: 1;
  source: 'mediapipe-tasks-face-landmarker';
  synthetic: boolean;
  pose: FaceFixturePose;
  capturedAt: string;
  imageSize: { width: number; height: number };
  landmarks: FaceLandmark[];
  facialTransformationMatrix: FaceMatrixLike | null;
  /** Source pixels are deliberately excluded by schema. */
  notes?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isFaceLandmarkerFixtureV1(value: unknown): value is FaceLandmarkerFixtureV1 {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.source !== 'mediapipe-tasks-face-landmarker' ||
    typeof value.synthetic !== 'boolean' ||
    typeof value.capturedAt !== 'string' ||
    !isRecord(value.imageSize) ||
    !isFiniteNumber(value.imageSize.width) ||
    !isFiniteNumber(value.imageSize.height) ||
    !Array.isArray(value.landmarks)
  ) {
    return false;
  }
  if (typeof value.pose !== 'string') return false;
  const poses: readonly string[] = [
    'frontal',
    'yaw-subject-left',
    'yaw-subject-right',
    'pitch-up',
    'pitch-down',
    'roll',
  ];
  if (!poses.includes(value.pose)) return false;
  if (
    !value.landmarks.every(
      (landmark) =>
        isRecord(landmark) &&
        isFiniteNumber(landmark.x) &&
        isFiniteNumber(landmark.y) &&
        isFiniteNumber(landmark.z),
    )
  ) {
    return false;
  }
  if (value.facialTransformationMatrix !== null) {
    const matrix = value.facialTransformationMatrix;
    if (
      !isRecord(matrix) ||
      matrix.rows !== 4 ||
      matrix.columns !== 4 ||
      !Array.isArray(matrix.data) ||
      matrix.data.length !== 16 ||
      !matrix.data.every(isFiniteNumber)
    ) {
      return false;
    }
  }
  return value.notes === undefined || typeof value.notes === 'string';
}

export function buildFaceLandmarkerFixture(
  input: Omit<
    FaceLandmarkerFixtureV1,
    'schemaVersion' | 'source' | 'synthetic' | 'capturedAt'
  >,
): FaceLandmarkerFixtureV1 {
  return {
    schemaVersion: 1,
    source: 'mediapipe-tasks-face-landmarker',
    synthetic: false,
    capturedAt: new Date().toISOString(),
    ...input,
  };
}

/** Dev-only browser download. Contains landmarks/matrix metadata, never an image. */
export function downloadFaceLandmarkerFixture(
  fixture: FaceLandmarkerFixtureV1,
  filename: string,
): void {
  if (!import.meta.env.DEV || import.meta.env.VITE_FACE_FIT_FIXTURE_EXPORT !== 'true') {
    throw new Error('Face fixture export is disabled');
  }
  const blob = new Blob([JSON.stringify(fixture, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

