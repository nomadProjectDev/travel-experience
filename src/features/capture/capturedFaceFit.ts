import {
  buildSafeFaceFitContext,
  type FaceFitResult,
  type SafeFaceFitContext,
} from '@/core/face';
import type { FaceLandmarkerSessionToken } from '@/services/face-landmarker.service';

export interface CapturedFaceFitResolution {
  result: FaceFitResult;
  ready: boolean;
}

export interface ConfirmedCapture {
  imageSrc: string;
  fitContext?: SafeFaceFitContext;
}

/** Converts only the current accepted relative result at the confirmation boundary. */
export function buildConfirmedCapture(
  imageSrc: string,
  result: FaceFitResult | null,
): ConfirmedCapture {
  if (!result || result.status === 'rejected') return { imageSrc };
  return {
    imageSrc,
    fitContext: buildSafeFaceFitContext(result),
  };
}

/**
 * A still analysis is always temporally collecting. Reuse a stable live result
 * only when temporal collection is the still's sole limitation.
 */
export function resolveCapturedFaceFit(
  liveResult: FaceFitResult | null,
  stillResult: FaceFitResult,
): CapturedFaceFitResolution {
  if (stillResult.status === 'valid') {
    return { result: stillResult, ready: true };
  }
  if (
    liveResult?.status === 'valid' &&
    stillResult.status === 'limited' &&
    stillResult.rejectionReasons.length === 1 &&
    stillResult.rejectionReasons[0] === 'temporal-unstable'
  ) {
    return { result: liveResult, ready: true };
  }
  return { result: stillResult, ready: false };
}

export function isCurrentCapturedFaceFitAnalysis(
  currentToken: FaceLandmarkerSessionToken | null,
  analysisToken: FaceLandmarkerSessionToken,
  currentImage: string | null,
  analysisImage: string,
): boolean {
  return currentToken === analysisToken && currentImage === analysisImage;
}
