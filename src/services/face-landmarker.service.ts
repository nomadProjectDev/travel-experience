/** Serialized browser bridge for a single MediaPipe Tasks FaceLandmarker. */

import {
  computeFaceFitMetrics,
  buildFaceLandmarkerFixture,
  evaluateFaceFitQuality,
  type FaceFixturePose,
  type FaceFitAnalysisOutcome,
  type FaceFitResult,
  type FaceLandmarkerFixtureV1,
  type FaceLandmark,
} from '@/core/face';
import type { CaptureQualityMetrics } from '@/core/media/captureQuality';

const WASM_BASE = '/mediapipe/wasm';
const MODEL_PATH = '/mediapipe/face_landmarker.task';
const MAX_DETECTED_FACES = 2;

type RunningMode = 'IMAGE' | 'VIDEO';
export type FaceLandmarkerDelegate = 'GPU' | 'CPU';
export interface FaceLandmarkerSessionToken {
  readonly generation: number;
}

type FaceLandmarkerResult = {
  faceLandmarks: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>;
  facialTransformationMatrixes: Array<{ rows: number; columns: number; data: number[] }>;
};

type DetectSource = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap;
type FaceLandmarkerInstance = {
  detect: (image: Exclude<DetectSource, HTMLVideoElement>) => FaceLandmarkerResult;
  detectForVideo: (frame: DetectSource, timestamp: number) => FaceLandmarkerResult;
  setOptions: (options: { runningMode?: RunningMode }) => Promise<void>;
  close: () => void;
};

export type FaceLandmarkerTelemetry =
  | { event: 'init'; latencyMs: number; delegate: FaceLandmarkerDelegate }
  | {
      event: 'detect';
      latencyMs: number;
      mode: RunningMode;
      delegate: FaceLandmarkerDelegate;
    }
  | { event: 'error'; stage: 'init' | 'detect' | 'mode' | 'close'; message: string }
  | { event: 'close' };

interface Runtime {
  landmarker: FaceLandmarkerInstance;
  delegate: FaceLandmarkerDelegate;
}

let runtimePromise: Promise<Runtime> | null = null;
let operationQueue: Promise<void> = Promise.resolve();
let activeRunningMode: RunningMode = 'VIDEO';
let lastVideoTimestampMs = -1;
let sessionGeneration = 0;
let closed = false;
let effectiveDelegate: FaceLandmarkerDelegate | null = null;
let latestDetectionLatencyMs: number | null = null;
let latestFixtureInput: {
  imageSize: { width: number; height: number };
  landmarks: FaceLandmark[];
  facialTransformationMatrix: {
    rows: number;
    columns: number;
    data: number[];
  } | null;
} | null = null;
const telemetryListeners = new Set<(event: FaceLandmarkerTelemetry) => void>();

function nowMs(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function emitTelemetry(event: FaceLandmarkerTelemetry): void {
  telemetryListeners.forEach((listener) => listener(event));
  if (import.meta.env.DEV) {
    const method = event.event === 'error' ? console.warn : console.info;
    method('[face-fit-telemetry]', event);
  }
}

export function subscribeFaceLandmarkerTelemetry(
  listener: (event: FaceLandmarkerTelemetry) => void,
): () => void {
  telemetryListeners.add(listener);
  return () => telemetryListeners.delete(listener);
}

function enqueue<T>(operation: () => Promise<T> | T): Promise<T> {
  const pending = operationQueue.then(operation, operation);
  operationQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

function nextVideoTimestamp(): number {
  const timestamp = Math.max(nowMs(), lastVideoTimestampMs + 1);
  lastVideoTimestampMs = timestamp;
  return timestamp;
}

async function createRuntime(): Promise<Runtime> {
  const startedAt = nowMs();
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const create = (delegate: FaceLandmarkerDelegate) =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate },
      runningMode: 'VIDEO',
      // numFaces > 1 disables MediaPipe's built-in smoothing. The product's
      // temporal stability window owns smoothing so ambiguity can be detected.
      numFaces: MAX_DETECTED_FACES,
      outputFacialTransformationMatrixes: true,
      outputFaceBlendshapes: false,
    });

  let runtime: Runtime;
  try {
    runtime = { landmarker: await create('GPU'), delegate: 'GPU' };
  } catch (gpuError) {
    emitTelemetry({
      event: 'error',
      stage: 'init',
      message: `GPU unavailable; retrying CPU: ${
        gpuError instanceof Error ? gpuError.message : 'unknown error'
      }`,
    });
    runtime = { landmarker: await create('CPU'), delegate: 'CPU' };
  }
  closed = false;
  effectiveDelegate = runtime.delegate;
  activeRunningMode = 'VIDEO';
  lastVideoTimestampMs = -1;
  emitTelemetry({ event: 'init', latencyMs: nowMs() - startedAt, delegate: runtime.delegate });
  return runtime;
}

function getRuntime(): Promise<Runtime> {
  if (!runtimePromise) {
    runtimePromise = createRuntime().catch((error) => {
      runtimePromise = null;
      emitTelemetry({
        event: 'error',
        stage: 'init',
        message: error instanceof Error ? error.message : 'FaceLandmarker init failed',
      });
      throw error;
    });
  }
  return runtimePromise;
}

async function ensureRunningMode(mode: RunningMode): Promise<Runtime> {
  const runtime = await getRuntime();
  if (activeRunningMode !== mode) {
    const previous = activeRunningMode;
    try {
      await runtime.landmarker.setOptions({ runningMode: mode });
      activeRunningMode = mode;
      if (mode === 'VIDEO' || previous === 'IMAGE') lastVideoTimestampMs = -1;
    } catch (error) {
      emitTelemetry({
        event: 'error',
        stage: 'mode',
        message: error instanceof Error ? error.message : 'Running-mode switch failed',
      });
      throw error;
    }
  }
  return runtime;
}

export function beginFaceLandmarkerSession(): FaceLandmarkerSessionToken {
  sessionGeneration += 1;
  lastVideoTimestampMs = -1;
  latestDetectionLatencyMs = null;
  return { generation: sessionGeneration };
}

function isCurrentSession(token: FaceLandmarkerSessionToken): boolean {
  return token.generation === sessionGeneration;
}

export function getFaceLandmarkerDiagnostics(): {
  delegate: FaceLandmarkerDelegate | null;
  runningMode: RunningMode;
  sessionGeneration: number;
  latestDetectionLatencyMs: number | null;
} {
  return {
    delegate: effectiveDelegate,
    runningMode: activeRunningMode,
    sessionGeneration,
    latestDetectionLatencyMs,
  };
}

export async function warmupFaceLandmarker(
  token: FaceLandmarkerSessionToken,
): Promise<void> {
  await enqueue(async () => {
    if (!isCurrentSession(token)) return;
    await ensureRunningMode('VIDEO');
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode capture data URL'));
    image.src = dataUrl;
  });
}

function toLandmarks(
  face: Array<{ x: number; y: number; z: number; visibility?: number }>,
): FaceLandmark[] {
  return face.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility,
  }));
}

function rejectedResult(
  reason:
    | 'face-not-present'
    | 'multiple-faces'
    | 'insufficient-landmarks'
    | 'runtime-error',
  faceCount: number,
): FaceFitResult {
  const quality = evaluateFaceFitQuality({
    faceCount,
    pose: null,
    faceOccupancy: null,
    subjectLeftIrisDiameterPx: null,
    subjectRightIrisDiameterPx: null,
    ratios: null,
  });
  const reasons = quality.reasons.includes(reason)
    ? quality.reasons
    : [...quality.reasons, reason];
  return {
    schemaVersion: 2,
    status: 'rejected',
    quality: { ...quality, reasons },
    rejectionReasons: reasons,
  };
}

function outcomeFromResult(
  result: FaceLandmarkerResult,
  imageWidthPx: number,
  imageHeightPx: number,
): Extract<FaceFitAnalysisOutcome, { ok: true }> {
  if (result.faceLandmarks.length > 1) {
    return {
      ok: true,
      result: rejectedResult('multiple-faces', result.faceLandmarks.length),
      landmarks: [],
      landmarkCount: 0,
    };
  }
  const face = result.faceLandmarks[0];
  if (!face?.length) {
    return {
      ok: true,
      result: rejectedResult('face-not-present', 0),
      landmarks: [],
      landmarkCount: 0,
    };
  }
  const landmarks = toLandmarks(face);
  try {
    return {
      ok: true,
      result: computeFaceFitMetrics(landmarks, {
        imageWidthPx,
        imageHeightPx,
        facialMatrix: result.facialTransformationMatrixes[0] ?? null,
        faceCount: result.faceLandmarks.length,
      }),
      landmarks,
      landmarkCount: landmarks.length,
    };
  } catch {
    return {
      ok: true,
      result: rejectedResult('insufficient-landmarks', result.faceLandmarks.length),
      landmarks,
      landmarkCount: landmarks.length,
    };
  }
}

function rememberFixtureInput(
  result: FaceLandmarkerResult,
  width: number,
  height: number,
): void {
  if (result.faceLandmarks.length !== 1) {
    latestFixtureInput = null;
    return;
  }
  const face = result.faceLandmarks[0];
  if (!face?.length) {
    latestFixtureInput = null;
    return;
  }
  latestFixtureInput = {
    imageSize: { width, height },
    landmarks: toLandmarks(face),
    facialTransformationMatrix: result.facialTransformationMatrixes[0] ?? null,
  };
}

export function getLatestFaceLandmarkerFixture(
  pose: FaceFixturePose,
): FaceLandmarkerFixtureV1 | null {
  if (!latestFixtureInput) return null;
  return buildFaceLandmarkerFixture({
    ...latestFixtureInput,
    pose,
  });
}

export type LiveFaceFrame =
  | { ok: true; outcome: Extract<FaceFitAnalysisOutcome, { ok: true }> }
  | { ok: false; reason: 'detect-failed' | 'not-ready' | 'stale-session'; message?: string };

export async function detectLiveFace(
  video: HTMLVideoElement,
  token: FaceLandmarkerSessionToken,
): Promise<LiveFaceFrame> {
  if (!isCurrentSession(token)) return { ok: false, reason: 'stale-session' };
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    return { ok: false, reason: 'not-ready' };
  }
  try {
    return await enqueue(async () => {
      if (!isCurrentSession(token)) return { ok: false, reason: 'stale-session' };
      const runtime = await ensureRunningMode('VIDEO');
      const startedAt = nowMs();
      const result = runtime.landmarker.detectForVideo(video, nextVideoTimestamp());
      rememberFixtureInput(result, video.videoWidth, video.videoHeight);
      latestDetectionLatencyMs = nowMs() - startedAt;
      emitTelemetry({
        event: 'detect',
        latencyMs: latestDetectionLatencyMs,
        mode: 'VIDEO',
        delegate: runtime.delegate,
      });
      if (!isCurrentSession(token)) return { ok: false, reason: 'stale-session' };
      return {
        ok: true,
        outcome: outcomeFromResult(result, video.videoWidth, video.videoHeight),
      };
    });
  } catch (error) {
    emitTelemetry({
      event: 'error',
      stage: 'detect',
      message: error instanceof Error ? error.message : 'VIDEO detect failed',
    });
    return {
      ok: false,
      reason: 'detect-failed',
      message: error instanceof Error ? error.message : 'FaceLandmarker detectForVideo failed',
    };
  }
}

export async function analyzeFaceFromDataUrl(
  dataUrl: string,
  token: FaceLandmarkerSessionToken,
  captureQuality?: CaptureQualityMetrics | null,
): Promise<FaceFitAnalysisOutcome> {
  if (!isCurrentSession(token)) {
    return { ok: false, reason: 'stale-session', message: 'Capture session changed' };
  }
  let image: HTMLImageElement;
  try {
    image = await loadImage(dataUrl);
  } catch (error) {
    return {
      ok: false,
      reason: 'load-failed',
      message: error instanceof Error ? error.message : 'Image load failed',
    };
  }
  try {
    return await enqueue(async () => {
      if (!isCurrentSession(token)) {
        return { ok: false, reason: 'stale-session', message: 'Capture session changed' };
      }
      let result: FaceLandmarkerResult;
      let runtime: Runtime;
      const startedAt = nowMs();
      try {
        runtime = await ensureRunningMode('IMAGE');
        result = runtime.landmarker.detect(image);
      } catch {
        runtime = await ensureRunningMode('VIDEO');
        result = runtime.landmarker.detectForVideo(image, nextVideoTimestamp());
      }
      if (activeRunningMode === 'IMAGE') await ensureRunningMode('VIDEO');
      rememberFixtureInput(
        result,
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
      );
      latestDetectionLatencyMs = nowMs() - startedAt;
      emitTelemetry({
        event: 'detect',
        latencyMs: latestDetectionLatencyMs,
        mode: 'IMAGE',
        delegate: runtime.delegate,
      });
      if (!isCurrentSession(token)) {
        return { ok: false, reason: 'stale-session', message: 'Capture session changed' };
      }
      const outcome = outcomeFromResult(
        result,
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
      );
      if (outcome.result.status === 'rejected') return outcome;
      return {
        ...outcome,
        result: computeFaceFitMetrics(outcome.landmarks, {
          imageWidthPx: image.naturalWidth || image.width,
          imageHeightPx: image.naturalHeight || image.height,
          facialMatrix: result.facialTransformationMatrixes[0] ?? null,
          faceCount: result.faceLandmarks.length,
          captureQuality,
          temporalState: 'collecting',
        }),
      };
    });
  } catch (error) {
    emitTelemetry({
      event: 'error',
      stage: 'detect',
      message: error instanceof Error ? error.message : 'IMAGE detect failed',
    });
    return {
      ok: false,
      reason: 'detect-failed',
      message: error instanceof Error ? error.message : 'FaceLandmarker detect failed',
    };
  }
}

export async function closeFaceLandmarker(
  token?: FaceLandmarkerSessionToken,
): Promise<void> {
  if (token && !isCurrentSession(token)) return;
  sessionGeneration += 1;
  await enqueue(async () => {
    if (closed && !runtimePromise) return;
    const runtime = runtimePromise ? await runtimePromise.catch(() => null) : null;
    runtimePromise = null;
    effectiveDelegate = null;
    latestDetectionLatencyMs = null;
    latestFixtureInput = null;
    activeRunningMode = 'VIDEO';
    lastVideoTimestampMs = -1;
    if (runtime && !closed) {
      try {
        runtime.landmarker.close();
        emitTelemetry({ event: 'close' });
      } catch (error) {
        emitTelemetry({
          event: 'error',
          stage: 'close',
          message: error instanceof Error ? error.message : 'FaceLandmarker close failed',
        });
      }
    }
    closed = true;
  });
}

export async function __resetFaceLandmarkerForTests(): Promise<void> {
  await closeFaceLandmarker();
  operationQueue = Promise.resolve();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void closeFaceLandmarker();
  });
}

