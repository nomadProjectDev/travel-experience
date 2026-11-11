import { describe, expect, it } from 'vitest';
import {
  STUDIO_ECHO_MAX_MEAN_ABS_DIFF,
  isLikelyCaptureEcho,
  meanAbsDiffFromImageData,
} from './studioEcho';

function makeImageData(
  fill: (i: number) => readonly [number, number, number, number],
  size = 8,
): ImageData {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    const [r, g, b, a] = fill(i);
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = a;
  }
  return { data, width: size, height: size, colorSpace: 'srgb' } as ImageData;
}

describe('studio echo', () => {
  it('flags identical frames as an echo', () => {
    const frame = makeImageData((i) => {
      const v = (i * 19) % 200;
      return [v, v + 8, 40, 255];
    });
    const diff = meanAbsDiffFromImageData(frame, frame);
    expect(diff).toBe(0);
    expect(isLikelyCaptureEcho(diff)).toBe(true);
  });

  it('does not flag a clearly restyled studio frame', () => {
    const capture = makeImageData((i) => {
      const v = (i * 19) % 200;
      return [v, v + 8, 40, 255];
    });
    const studio = makeImageData(() => [245, 245, 247, 255]);
    const diff = meanAbsDiffFromImageData(capture, studio);
    expect(diff).toBeGreaterThan(STUDIO_ECHO_MAX_MEAN_ABS_DIFF);
    expect(isLikelyCaptureEcho(diff)).toBe(false);
  });

  it('treats mismatched sizes as not an echo', () => {
    const a = makeImageData(() => [10, 10, 10, 255], 4);
    const b = makeImageData(() => [10, 10, 10, 255], 8);
    expect(meanAbsDiffFromImageData(a, b)).toBe(1);
    expect(isLikelyCaptureEcho(1)).toBe(false);
  });
});
