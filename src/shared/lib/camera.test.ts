import { describe, expect, it, vi } from 'vitest';
import {
  createOrientedCameraStream,
  stopCameraStream,
  usesSummitMupiCameraLayout,
} from './camera';

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
