import { describe, expect, it, vi } from 'vitest';
import {
  CAMERA_ROTATION_ANGLES,
  CAMERA_ROTATION_STORAGE_KEY,
  computeCameraContainPlan,
  drawContainedCameraFrame,
  nextCameraRotationDeg,
  normalizeCameraRotationDeg,
  resolveCameraRotationDeg,
  saveCameraRotationDeg,
} from './cameraRotation';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('camera rotation', () => {
  it('normalizes and cycles every right-angle orientation', () => {
    expect(CAMERA_ROTATION_ANGLES).toEqual([0, 90, 180, 270]);
    expect(normalizeCameraRotationDeg(-90)).toBe(270);
    expect(normalizeCameraRotationDeg('180deg')).toBe(180);
    expect(normalizeCameraRotationDeg(45)).toBe(0);
    expect([0, 90, 180, 270].map(nextCameraRotationDeg)).toEqual([
      90, 180, 270, 0,
    ]);
  });

  it('resolves query, storage, env, then zero and persists query selection', () => {
    const storage = memoryStorage({
      [CAMERA_ROTATION_STORAGE_KEY]: '180',
    });
    expect(
      resolveCameraRotationDeg({
        search: '?cameraRotation=270',
        storage,
        envRotation: 90,
      }),
    ).toBe(270);
    expect(storage.getItem(CAMERA_ROTATION_STORAGE_KEY)).toBe('270');
    expect(resolveCameraRotationDeg({ search: '', storage })).toBe(270);

    const empty = memoryStorage();
    expect(
      resolveCameraRotationDeg({
        search: '',
        storage: empty,
        envRotation: -90,
      }),
    ).toBe(270);
    expect(
      resolveCameraRotationDeg({
        search: '',
        storage: empty,
        envRotation: undefined,
      }),
    ).toBe(0);
  });

  it('saves normalized values', () => {
    const storage = memoryStorage();
    expect(saveCameraRotationDeg(-90, storage)).toBe(270);
    expect(storage.getItem(CAMERA_ROTATION_STORAGE_KEY)).toBe('270');
  });

  it('contains full landscape input after quarter-turn without cropping', () => {
    const plan = computeCameraContainPlan(1280, 720, 1280, 720, 90);
    expect(plan).not.toBeNull();
    expect(plan?.drawWidth).toBeCloseTo(720);
    expect(plan?.drawHeight).toBeCloseTo(405);
  });

  it('contains full upright input at model dimensions', () => {
    expect(computeCameraContainPlan(1280, 720, 1280, 720, 0)).toMatchObject({
      rotationDeg: 0,
      drawWidth: 1280,
      drawHeight: 720,
    });
  });

  it('pre-flips horizontally when mirrorHorizontal is enabled so local and Decart streams never double-flip', () => {
    const scale = vi.fn();
    const ctx = {
      setTransform: vi.fn(),
      fillRect: vi.fn(),
      translate: vi.fn(),
      scale,
      rotate: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    const canvas = { width: 1280, height: 720 } as HTMLCanvasElement;

    drawContainedCameraFrame(ctx, canvas, {} as CanvasImageSource, 1280, 720, 0, true);
    expect(scale).toHaveBeenCalledWith(-1, 1);
  });

  it('applies mirrorHorizontal in upright screen space before quarter-turn rotate so vertical gravity is preserved', () => {
    const ops: string[] = [];
    const ctx = {
      setTransform: vi.fn(() => ops.push('setTransform')),
      fillRect: vi.fn(),
      translate: vi.fn(() => ops.push('translate')),
      scale: vi.fn((sx: number, sy: number) => ops.push(`scale(${sx},${sy})`)),
      rotate: vi.fn((rad: number) => ops.push(`rotate(${Math.round((rad * 180) / Math.PI)})`)),
      drawImage: vi.fn(() => ops.push('drawImage')),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    const canvas = { width: 1280, height: 720 } as HTMLCanvasElement;

    drawContainedCameraFrame(ctx, canvas, {} as CanvasImageSource, 1280, 720, 90, true);
    expect(ops).toEqual([
      'setTransform',
      'translate',
      'scale(-1,1)',
      'rotate(90)',
      'drawImage',
      'setTransform',
    ]);
  });
});
