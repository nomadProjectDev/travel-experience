import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CameraRotationDeg } from '@/core/media/cameraRotation';
import {
  createOrientedCameraStream,
  stopCameraStream,
  usesSummitMupiCameraLayout,
} from './camera';

function installFakeOrientationDom() {
  const rotateAngles: number[] = [];
  const scales: Array<[number, number]> = [];
  const requestFrame = vi.fn();
  const outputTrackStop = vi.fn();
  const sourceTrackStop = vi.fn();
  const videoPause = vi.fn();
  const videoRemove = vi.fn();
  const appendChild = vi.fn();
  const clearIntervalSpy = vi.fn();
  let intervalCallback: (() => void) | null = null;
  const setIntervalSpy = vi.fn((cb: () => void) => {
    intervalCallback = cb;
    return 42 as unknown as number;
  });

  const ctx = {
    fillStyle: '',
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn((sx: number, sy: number) => {
      scales.push([sx, sy]);
    }),
    rotate: vi.fn((rad: number) => {
      rotateAngles.push(Math.round((rad * 180) / Math.PI));
    }),
    drawImage: vi.fn(),
  };

  const outputTrack = {
    id: 'oriented-canvas-track',
    stop: outputTrackStop,
    requestFrame,
  } as unknown as MediaStreamTrack;

  const outputStream = {
    getVideoTracks: () => [outputTrack],
    getTracks: () => [outputTrack],
  } as unknown as MediaStream;

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    captureStream: vi.fn(() => outputStream),
  };

  const video = {
    muted: false,
    playsInline: false,
    srcObject: null as MediaStream | null,
    readyState: 1,
    videoWidth: 1280,
    videoHeight: 720,
    style: { cssText: '' },
    setAttribute: vi.fn(),
    play: vi.fn(async () => undefined),
    pause: videoPause,
    remove: videoRemove,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  const sourceTrack = {
    id: 'raw-camera-track',
    stop: sourceTrackStop,
  } as unknown as MediaStreamTrack;

  const sourceStream = {
    getVideoTracks: () => [sourceTrack],
    getTracks: () => [sourceTrack],
  } as unknown as MediaStream;

  vi.stubGlobal('HTMLMediaElement', { HAVE_METADATA: 1 });
  vi.stubGlobal('document', {
    body: { appendChild },
    createElement: vi.fn((tag: string) => {
      if (tag === 'canvas') return canvas;
      if (tag === 'video') return video;
      throw new Error(`Unexpected element: ${tag}`);
    }),
  });
  vi.stubGlobal('window', {
    setInterval: setIntervalSpy,
    clearInterval: clearIntervalSpy,
    localStorage: {
      getItem: () => null,
      setItem: () => undefined,
    },
    location: { search: '' },
  });

  return {
    sourceStream,
    outputStream,
    canvas,
    video,
    appendChild,
    videoPause,
    videoRemove,
    outputTrackStop,
    sourceTrackStop,
    requestFrame,
    rotateAngles,
    scales,
    setIntervalSpy,
    clearIntervalSpy,
    pumpTick: () => intervalCallback?.(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('createOrientedCameraStream', () => {
  it('keeps the native camera stream unchanged at zero rotation', async () => {
    const stream = {} as MediaStream;

    await expect(
      createOrientedCameraStream(stream, 0, {
        width: 1280,
        height: 720,
        frameRate: 30,
      }),
    ).resolves.toBe(stream);
  });

  it.each([90, 180, 270] as const satisfies readonly CameraRotationDeg[])(
    'rotates pixels at %i° before Decart, pumps via wall-clock interval, and tears down video + tracks on stop',
    async (angle) => {
      const env = installFakeOrientationDom();

      const oriented = await createOrientedCameraStream(env.sourceStream, angle, {
        width: 1280,
        height: 720,
        frameRate: 30,
      });

      expect(oriented).toBe(env.outputStream);
      expect(env.canvas.width).toBe(1280);
      expect(env.canvas.height).toBe(720);
      expect(env.canvas.captureStream).toHaveBeenCalledWith(30);
      expect(env.appendChild).toHaveBeenCalledWith(env.video);
      expect(env.rotateAngles).toEqual([angle]);
      expect(env.scales).toEqual([[-1, 1]]);
      expect(env.requestFrame).toHaveBeenCalledTimes(1);
      expect(env.setIntervalSpy).toHaveBeenCalledTimes(1);

      env.pumpTick();
      expect(env.rotateAngles).toEqual([angle, angle]);
      expect(env.requestFrame).toHaveBeenCalledTimes(2);

      stopCameraStream(oriented);
      stopCameraStream(oriented);

      expect(env.clearIntervalSpy).toHaveBeenCalledWith(42);
      expect(env.videoPause).toHaveBeenCalledTimes(1);
      expect(env.video.srcObject).toBeNull();
      expect(env.videoRemove).toHaveBeenCalledTimes(1);
      expect(env.outputTrackStop).toHaveBeenCalledTimes(1);
      expect(env.sourceTrackStop).toHaveBeenCalledTimes(1);

      // Post-dispose interval ticks are no-ops
      env.pumpTick();
      expect(env.requestFrame).toHaveBeenCalledTimes(2);
    },
  );
});

describe('usesSummitMupiCameraLayout', () => {
  it('defaults to upright web camera when env unset', () => {
    vi.stubEnv('VITE_CAMERA_ROTATION_DEG', undefined);
    expect(usesSummitMupiCameraLayout()).toBe(false);
  });

  it('stays upright when env is 0', () => {
    vi.stubEnv('VITE_CAMERA_ROTATION_DEG', '0');
    expect(usesSummitMupiCameraLayout()).toBe(false);
  });

  it('enables rotated layout for non-zero mount angles', () => {
    vi.stubEnv('VITE_CAMERA_ROTATION_DEG', '-90');
    expect(usesSummitMupiCameraLayout()).toBe(true);
  });
});

describe('stopCameraStream', () => {
  it('stops each owned track exactly once across repeated cleanup paths', () => {
    const stop = vi.fn();
    const stream = {
      getTracks: () => [{ stop }],
    } as unknown as MediaStream;

    stopCameraStream(stream);
    stopCameraStream(stream);

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
