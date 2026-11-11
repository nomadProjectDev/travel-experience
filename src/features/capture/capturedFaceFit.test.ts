import { describe, expect, it } from 'vitest';
import type {
  FaceFitRejectionReason,
  FaceFitResult,
} from '@/core/face';
import {
  buildConfirmedCapture,
  isCurrentCapturedFaceFitAnalysis,
  resolveCapturedFaceFit,
} from './capturedFaceFit';

function validLiveResult(): Extract<FaceFitResult, { status: 'valid' }> {
  return {
    schemaVersion: 2,
    status: 'valid',
    measurements: {
      irisCenterSpanPx: 80,
      outerCanthiSpanPx: 130,
      faceWidthProxyPx: 210,
    },
    ratios: { ipdToFaceWidth: 0.381, canthiToFaceWidth: 0.619 },
    absoluteEstimate: {
      method: 'iris-diameter-prior',
      confidence: 'low',
      ipdMm: { min: 60, max: 68 },
      outerCanthiMm: { min: 98, max: 112 },
      faceWidthMm: { min: 145, max: 165 },
    },
    experimental: {
      nasalHeightProxyPx: 30,
      subjectLeftIrisToNasalAxisPx: 40,
      subjectRightIrisToNasalAxisPx: 40,
    },
    quality: {
      faceCount: 1,
      pose: {
        yawDeg: 0,
        pitchDeg: 0,
        rollDeg: 0,
        matrixLayout: 'column-major-4x4',
      },
      faceOccupancy: 0.3,
      irisDiameterPx: { subjectLeft: 14, subjectRight: 14 },
      irisScaleDisagreement: 0,
      temporalState: 'ready',
      captureQuality: null,
      reasons: [],
    },
    rejectionReasons: [],
  };
}

function stillResult(
  status: 'limited' | 'rejected',
  reason: FaceFitRejectionReason,
): FaceFitResult {
  const live = validLiveResult();
  const quality = {
    ...live.quality,
    temporalState: 'collecting' as const,
    reasons: [reason],
  };
  if (status === 'rejected') {
    return {
      schemaVersion: 2,
      status,
      quality,
      rejectionReasons: [reason],
    };
  }
  return {
    schemaVersion: 2,
    status,
    quality,
    measurements: live.measurements,
    ratios: live.ratios,
    experimental: live.experimental,
    rejectionReasons: [reason],
  };
}

describe('captured still face-fit readiness', () => {
  it('exports only normalized safe fields for valid or limited results', () => {
    const capture = buildConfirmedCapture('data:image/jpeg;base64,current', validLiveResult());
    expect(capture).toEqual({
      imageSrc: 'data:image/jpeg;base64,current',
      fitContext: {
        schemaVersion: 2,
        status: 'valid',
        ipdToFaceWidth: 0.381,
        outerCanthiToFaceWidth: 0.619,
      },
    });
    expect(JSON.stringify(capture.fitContext)).not.toMatch(
      /px|mm|landmark|matrix|experimental|image/i,
    );
  });

  it('omits context for unavailable or rejected analysis', () => {
    expect(buildConfirmedCapture('current', null)).toEqual({ imageSrc: 'current' });
    expect(
      buildConfirmedCapture(
        'current',
        stillResult('rejected', 'illumination-too-low'),
      ),
    ).toEqual({ imageSrc: 'current' });
  });

  it.each([
    ['dark', 'illumination-too-low'],
    ['blurred', 'image-too-blurry'],
  ] as const)('does not reuse a stable live result for a %s still', (_label, reason) => {
    const live = validLiveResult();
    const still = stillResult('rejected', reason);
    const resolved = resolveCapturedFaceFit(live, still);
    expect(resolved).toEqual({ result: still, ready: false });
    expect(resolved.result.rejectionReasons).toContain(reason);
  });

  it('retains the stable live result when the current still only lacks temporal history', () => {
    const live = validLiveResult();
    const still = stillResult('limited', 'temporal-unstable');
    expect(resolveCapturedFaceFit(live, still)).toEqual({ result: live, ready: true });
  });

  it('rejects completion from another capture or session', () => {
    const token = { generation: 3 };
    expect(isCurrentCapturedFaceFitAnalysis(token, token, 'current', 'current')).toBe(true);
    expect(
      isCurrentCapturedFaceFitAnalysis(token, { generation: 3 }, 'current', 'current'),
    ).toBe(false);
    expect(isCurrentCapturedFaceFitAnalysis(token, token, null, 'old')).toBe(false);
  });
});
