import { afterEach, describe, expect, it, vi } from 'vitest';
import { FaceFitStabilityTracker } from './stability';
import type { FaceFitResult, ValidFaceFitResult } from './types';

function validResult(jitter = 0): ValidFaceFitResult {
  return {
    schemaVersion: 2,
    status: 'valid',
    measurements: {
      irisCenterSpanPx: 80 * (1 + jitter),
      outerCanthiSpanPx: 130 * (1 + jitter),
      faceWidthProxyPx: 210 * (1 + jitter),
    },
    ratios: {
      ipdToFaceWidth: 0.381 * (1 + jitter),
      canthiToFaceWidth: 0.619 * (1 + jitter),
    },
    absoluteEstimate: {
      method: 'iris-diameter-prior',
      confidence: 'low',
      irisDiameterPriorMm: 11.7,
      ipdMm: { min: 63, max: 71 },
      outerCanthiMm: { min: 103, max: 116 },
      faceWidthMm: { min: 165, max: 187 },
    },
    experimental: {
      nasalHeightProxyPx: 50,
      subjectLeftIrisToNasalAxisPx: 40,
      subjectRightIrisToNasalAxisPx: 40,
    },
    quality: {
      faceCount: 1,
      pose: null,
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

function noFaceResult(): FaceFitResult {
  return {
    schemaVersion: 2,
    status: 'rejected',
    quality: {
      faceCount: 0,
      pose: null,
      faceOccupancy: null,
      irisDiameterPx: { subjectLeft: null, subjectRight: null },
      irisScaleDisagreement: null,
      temporalState: 'collecting',
      captureQuality: null,
      reasons: ['face-not-present'],
    },
    rejectionReasons: ['face-not-present'],
  };
}

afterEach(() => vi.useRealTimers());

describe('FaceFitStabilityTracker', () => {
  it('requires a stable continuous 500ms window and uses robust medians', () => {
    vi.useFakeTimers();
    const tracker = new FaceFitStabilityTracker();
    let update = tracker.push(validResult(), 0);
    for (let at = 100; at <= 1000; at += 100) {
      update = tracker.push(validResult((at % 3 - 1) * 0.002), at);
    }
    expect(update.state).toBe('stabilizing');
    update = tracker.push(validResult(), 1100);
    expect(update.state).toBe('ready');
    expect(update.result.status).toBe('valid');
  });

  it('discards an outlier and clears stale readiness', () => {
    const tracker = new FaceFitStabilityTracker({
      minSamples: 3,
      stableDurationMs: 500,
    });
    tracker.push(validResult(), 0);
    tracker.push(validResult(), 100);
    tracker.push(validResult(), 200);
    const outlier = tracker.push(validResult(0.4), 300);
    expect(outlier.state).toBe('collecting');
    expect(outlier.result.status).toBe('limited');
  });

  it('resets on face loss and does not reuse the last valid result', () => {
    const tracker = new FaceFitStabilityTracker({
      minSamples: 2,
      stableDurationMs: 0,
    });
    tracker.push(validResult(), 0);
    expect(tracker.push(validResult(), 100).state).toBe('ready');
    const lost = tracker.push(noFaceResult(), 200);
    expect(lost.result.status).toBe('rejected');
    const reacquired = tracker.push(validResult(), 300);
    expect(reacquired.state).toBe('collecting');
    expect(reacquired.result.status).toBe('limited');
  });
});

