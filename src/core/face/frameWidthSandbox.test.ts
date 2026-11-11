import { describe, expect, it } from 'vitest';
import {
  compareFrameWidthsToEstimatedRange,
  type FrameWidthSandboxEvidence,
} from './frameWidthSandbox';

function frame(id: string, totalFrontWidthMm: number): FrameWidthSandboxEvidence {
  return {
    id,
    brand: 'Example',
    model: id,
    variantId: `${id}:variant`,
    color: 'Neutral',
    sizeVariant: 'fixture',
    totalFrontWidthMm,
    sourceUrl: 'https://example.test/frame',
    sourceLabel: 'Deterministic fixture',
    evidenceStatement: 'Fixture evidence',
  };
}

describe('frame-width validation sandbox', () => {
  it('classifies below, inclusive boundaries, inside, and above deterministically', () => {
    const rows = compareFrameWidthsToEstimatedRange(
      { minMm: 130, maxMm: 140 },
      [
        frame('below', 125),
        frame('lower-boundary', 130),
        frame('inside', 135),
        frame('upper-boundary', 140),
        frame('above', 144),
      ],
    );
    expect(rows.map(({ position, deltaToRangeMm }) => [position, deltaToRangeMm])).toEqual([
      ['below range', 5],
      ['inside estimated range', 0],
      ['inside estimated range', 0],
      ['inside estimated range', 0],
      ['above range', 4],
    ]);
  });

  it('rejects invalid ranges and frame widths instead of clamping', () => {
    expect(() =>
      compareFrameWidthsToEstimatedRange({ minMm: 140, maxMm: 130 }, []),
    ).toThrow(/Invalid estimated/);
    expect(() =>
      compareFrameWidthsToEstimatedRange(
        { minMm: 130, maxMm: 140 },
        [frame('bad', Number.NaN)],
      ),
    ).toThrow(/Invalid published/);
  });
});
