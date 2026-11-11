import { describe, expect, it } from 'vitest';
import {
  FACE_FIT_YAW_HINT_DEG,
  hasCurrentSingleFaceLandmarks,
  landmarkToCanvasPoint,
} from './overlay';
import type { FaceFitAnalysisOutcome } from './types';

describe('landmarkToCanvasPoint', () => {
  const base = {
    canvasWidth: 200,
    canvasHeight: 200,
    videoWidth: 100,
    videoHeight: 100,
  };

  it('maps center landmark to canvas center when aspect matches', () => {
    const p = landmarkToCanvasPoint({ x: 0.5, y: 0.5 }, base);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(100);
  });

  it('flips X when mirrored', () => {
    const plain = landmarkToCanvasPoint({ x: 0.25, y: 0.5 }, { ...base, mirrored: false });
    const mirrored = landmarkToCanvasPoint({ x: 0.25, y: 0.5 }, { ...base, mirrored: true });
    expect(mirrored.x).toBeCloseTo(base.canvasWidth - plain.x);
    expect(mirrored.y).toBeCloseTo(plain.y);
  });

  it('applies object-fit cover crop for wide canvas', () => {
    // video 100x100 into 400x200 → scale=4, drawn 400x400, offsetY=-100
    const opts = {
      canvasWidth: 400,
      canvasHeight: 200,
      videoWidth: 100,
      videoHeight: 100,
    };
    const top = landmarkToCanvasPoint({ x: 0.5, y: 0 }, opts);
    expect(top.x).toBeCloseTo(200);
    expect(top.y).toBeCloseTo(-100);
    const mid = landmarkToCanvasPoint({ x: 0.5, y: 0.5 }, opts);
    expect(mid.y).toBeCloseTo(100);
  });

  it('exports a frontal yaw coaching threshold', () => {
    expect(FACE_FIT_YAW_HINT_DEG).toBeGreaterThan(0);
    expect(FACE_FIT_YAW_HINT_DEG).toBeLessThan(45);
  });

  it('keeps a current single-face mesh drawable before stability passes', () => {
    const outcome: Extract<FaceFitAnalysisOutcome, { ok: true }> = {
      ok: true,
      landmarks: [{ x: 0.5, y: 0.5, z: 0 }],
      landmarkCount: 1,
      result: {
        schemaVersion: 2,
        status: 'rejected',
        quality: {
          faceCount: 1,
          pose: null,
          faceOccupancy: null,
          irisDiameterPx: { subjectLeft: null, subjectRight: null },
          irisScaleDisagreement: null,
          temporalState: 'stabilizing',
          captureQuality: null,
          reasons: ['temporal-unstable'],
        },
        rejectionReasons: ['temporal-unstable'],
      },
    };
    expect(hasCurrentSingleFaceLandmarks(outcome)).toBe(true);
    expect(
      hasCurrentSingleFaceLandmarks({
        ...outcome,
        landmarks: [],
        landmarkCount: 0,
        result: {
          ...outcome.result,
          quality: { ...outcome.result.quality, faceCount: 0 },
        },
      }),
    ).toBe(false);
    expect(
      hasCurrentSingleFaceLandmarks({
        ...outcome,
        result: {
          ...outcome.result,
          quality: { ...outcome.result.quality, faceCount: 2 },
        },
      }),
    ).toBe(false);
  });
});
