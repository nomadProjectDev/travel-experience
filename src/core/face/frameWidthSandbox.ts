export type FrameWidthRangePosition =
  | 'inside estimated range'
  | 'below range'
  | 'above range';

export interface FrameWidthSandboxEvidence {
  id: string;
  brand: string;
  model: string;
  variantId: string;
  color: string;
  sizeVariant: string;
  totalFrontWidthMm: number;
  sourceUrl: string;
  sourceLabel: string;
  evidenceStatement: string;
  publishedSizeLabel?: string;
}

export interface FrameWidthSandboxComparison extends FrameWidthSandboxEvidence {
  position: FrameWidthRangePosition;
  /** Unsigned whole-mm distance to the nearest range boundary; zero when inside. */
  deltaToRangeMm: number;
}

/**
 * Validation-only interval comparison. It does not infer comfort, fit, or a
 * consumer size recommendation.
 */
export function compareFrameWidthsToEstimatedRange(
  range: { minMm: number; maxMm: number },
  frames: readonly FrameWidthSandboxEvidence[],
): FrameWidthSandboxComparison[] {
  if (
    !Number.isFinite(range.minMm) ||
    !Number.isFinite(range.maxMm) ||
    range.minMm <= 0 ||
    range.maxMm < range.minMm
  ) {
    throw new Error('Invalid estimated face-width range');
  }

  return frames.map((frame) => {
    const width = frame.totalFrontWidthMm;
    if (!Number.isFinite(width) || width <= 0) {
      throw new Error(`Invalid published frame width: ${frame.id}`);
    }
    if (width < range.minMm) {
      return {
        ...frame,
        position: 'below range',
        deltaToRangeMm: Math.round(range.minMm - width),
      };
    }
    if (width > range.maxMm) {
      return {
        ...frame,
        position: 'above range',
        deltaToRangeMm: Math.round(width - range.maxMm),
      };
    }
    return { ...frame, position: 'inside estimated range', deltaToRangeMm: 0 };
  });
}
