import { describe, expect, it } from 'vitest';
import * as frameFit from './frameFit';
import { assertSafeFaceFitContext } from './present';
import type { PublishedFrame } from './frameFit';
import type { SafeFaceFitContext } from './types';

const publishedFrame: PublishedFrame = {
  id: 'published-medium',
  sku: 'PUBLISHED-M',
  wardrobeAnalogueId: 'frame-square-04',
  catalogMatch: 'analogue',
  brand: 'Test',
  model: 'Published frame',
  aLensWidthMm: 50,
  bLensHeightMm: null,
  dblMm: 20,
  templeLengthMm: 145,
  totalFrontWidthMm: null,
  shape: 'square',
  supportType: 'integrated-acetate-bridge',
  wrapCategory: 'low',
  commercialSize: 'M',
  sourceUrl: 'https://example.com/published-medium',
  provenance: {
    sourceKind: 'manufacturer',
    sourceLabel: 'Test manufacturer product page',
    statement: 'Published box size and commercial size.',
    supportedFields: [
      'aLensWidthMm',
      'dblMm',
      'templeLengthMm',
      'commercialSize',
    ],
    accessedOn: '2026-09-03',
  },
};

const normalizedContext: SafeFaceFitContext = {
  schemaVersion: 2,
  status: 'valid',
  ipdToFaceWidth: 0.37,
  outerCanthiToFaceWidth: 0.61,
};

describe('published frame semantic boundary', () => {
  it('stores cited catalog measurements without deriving missing front width', () => {
    expect(() => frameFit.assertPublishedFrame(publishedFrame)).not.toThrow();
    expect(publishedFrame.totalFrontWidthMm).toBeNull();
    expect(publishedFrame.commercialSize).toBe('M');
  });

  it('keeps exact, analogue, and unverified catalog joins distinct', () => {
    expect(() =>
      frameFit.assertPublishedFrame({
        ...publishedFrame,
        catalogMatch: 'exact',
      }),
    ).toThrow(/Invalid published frame/);
    expect(() =>
      frameFit.assertPublishedFrame({
        ...publishedFrame,
        catalogMatch: 'unverified',
      }),
    ).toThrow(/Invalid published frame/);
    expect(() =>
      frameFit.assertPublishedFrame({
        ...publishedFrame,
        wardrobeAnalogueId: undefined,
        wardrobeItemId: 'frame-square-04',
        catalogMatch: 'exact',
      }),
    ).not.toThrow();
  });

  it('does not export normalized-ratio to physical-size scoring', () => {
    expect(frameFit).not.toHaveProperty('scoreFrameFit');
    expect(frameFit).not.toHaveProperty('recommendFrameSize');
    expect(frameFit).not.toHaveProperty('UNCALIBRATED_FRAME_FIT_PARAMETERS');
  });

  it('keeps normalized face context valid but physically scale-free', () => {
    expect(() => assertSafeFaceFitContext(normalizedContext)).not.toThrow();
    expect(JSON.stringify(normalizedContext)).not.toMatch(
      /px|mm|physical|commercialSize|targetSize|targetBucket/i,
    );
  });

  it('rejects physical measurements injected into the safe context', () => {
    const unsafe = {
      ...normalizedContext,
      faceWidthMm: 145,
    } as SafeFaceFitContext;
    expect(() => assertSafeFaceFitContext(unsafe)).toThrow(
      /Unsafe face-fit context/,
    );
  });
});
