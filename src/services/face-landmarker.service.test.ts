import { beforeEach, describe, expect, it, vi } from 'vitest';

const detectTimestamps: number[] = [];
const close = vi.fn();
let failGpu = false;
let currentResult = { faceLandmarks: [], facialTransformationMatrixes: [] } as {
  faceLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
  facialTransformationMatrixes: Array<{
    rows: number;
    columns: number;
    data: number[];
  }>;
};

const instance = {
  detect: vi.fn(() => currentResult),
  detectForVideo: vi.fn((_source: unknown, timestamp: number) => {
    detectTimestamps.push(timestamp);
    return currentResult;
  }),
  setOptions: vi.fn(async (_options: { runningMode?: 'IMAGE' | 'VIDEO' }) => undefined),
  close,
};

const createFromOptions = vi.fn(
  async (
    _fileset: unknown,
    options: { baseOptions: { delegate: string }; numFaces: number },
  ) => {
    if (options.baseOptions.delegate === 'GPU' && failGpu) throw new Error('WebGL unavailable');
    return instance;
  },
);

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
  FaceLandmarker: { createFromOptions },
}));

beforeEach(async () => {
  failGpu = false;
  currentResult = { faceLandmarks: [], facialTransformationMatrixes: [] };
  detectTimestamps.length = 0;
  vi.clearAllMocks();
  vi.stubGlobal('HTMLMediaElement', { HAVE_CURRENT_DATA: 2 });
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 640;
      naturalHeight = 480;
      width = 640;
      height = 480;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  const service = await import('./face-landmarker.service');
  await service.__resetFaceLandmarkerForTests();
  vi.clearAllMocks();
});

describe('FaceLandmarker runtime hardening', () => {
  it('falls back from GPU to CPU and exposes the effective delegate', async () => {
    failGpu = true;
    const service = await import('./face-landmarker.service');
    const token = service.beginFaceLandmarkerSession();
    await service.warmupFaceLandmarker(token);
    expect(createFromOptions).toHaveBeenCalledTimes(2);
    expect(createFromOptions.mock.calls.every(([, options]) => options.numFaces === 2)).toBe(
      true,
    );
    expect(service.getFaceLandmarkerDiagnostics().delegate).toBe('CPU');
  });

  it('serializes live detects and assigns strictly increasing timestamps', async () => {
    const service = await import('./face-landmarker.service');
    const token = service.beginFaceLandmarkerSession();
    await service.warmupFaceLandmarker(token);
    const video = { readyState: 2, videoWidth: 640, videoHeight: 480 };
    await Promise.all([
      service.detectLiveFace(video as HTMLVideoElement, token),
      service.detectLiveFace(video as HTMLVideoElement, token),
    ]);
    expect(detectTimestamps).toHaveLength(2);
    expect(detectTimestamps[1]!).toBeGreaterThan(detectTimestamps[0]!);
  });

  it('serializes IMAGE mode and restores VIDEO before the next live frame', async () => {
    const service = await import('./face-landmarker.service');
    const token = service.beginFaceLandmarkerSession();
    await service.warmupFaceLandmarker(token);
    await service.analyzeFaceFromDataUrl('data:image/jpeg;base64,test', token);
    await service.detectLiveFace(
      { readyState: 2, videoWidth: 640, videoHeight: 480 } as HTMLVideoElement,
      token,
    );
    expect(instance.setOptions.mock.calls.map(([options]) => options.runningMode)).toEqual([
      'IMAGE',
      'VIDEO',
    ]);
    expect(instance.detect).toHaveBeenCalledTimes(1);
    expect(instance.detectForVideo).toHaveBeenCalledTimes(1);
  });

  it('discards stale tokens and closes idempotently', async () => {
    const service = await import('./face-landmarker.service');
    const oldToken = service.beginFaceLandmarkerSession();
    const currentToken = service.beginFaceLandmarkerSession();
    const stale = await service.detectLiveFace(
      { readyState: 2, videoWidth: 640, videoHeight: 480 } as HTMLVideoElement,
      oldToken,
    );
    expect(stale).toMatchObject({ ok: false, reason: 'stale-session' });
    await service.warmupFaceLandmarker(currentToken);
    await service.closeFaceLandmarker(currentToken);
    await service.closeFaceLandmarker();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each([
    [0, 'face-not-present'],
    [2, 'multiple-faces'],
  ] as const)('rejects %i detected faces without exposing landmarks', async (faceCount, reason) => {
    const face = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    currentResult = {
      faceLandmarks: Array.from({ length: faceCount }, () => face),
      facialTransformationMatrixes: [],
    };
    const service = await import('./face-landmarker.service');
    const token = service.beginFaceLandmarkerSession();
    const frame = await service.detectLiveFace(
      { readyState: 2, videoWidth: 640, videoHeight: 480 } as HTMLVideoElement,
      token,
    );
    expect(frame.ok).toBe(true);
    if (!frame.ok) throw new Error('Expected an analyzed frame');
    expect(frame.outcome.result.rejectionReasons).toContain(reason);
    expect(frame.outcome.landmarks).toEqual([]);
    expect(frame.outcome.landmarkCount).toBe(0);
  });

  it('measures exactly one detected face', async () => {
    const face = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    currentResult = { faceLandmarks: [face], facialTransformationMatrixes: [] };
    const service = await import('./face-landmarker.service');
    const token = service.beginFaceLandmarkerSession();
    const frame = await service.detectLiveFace(
      { readyState: 2, videoWidth: 640, videoHeight: 480 } as HTMLVideoElement,
      token,
    );
    expect(frame.ok).toBe(true);
    if (!frame.ok) throw new Error('Expected an analyzed frame');
    expect(frame.outcome.landmarkCount).toBe(478);
    expect(frame.outcome.result.rejectionReasons).not.toContain('face-not-present');
    expect(frame.outcome.result.rejectionReasons).not.toContain('multiple-faces');
  });
});

