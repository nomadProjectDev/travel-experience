import { describe, expect, it } from 'vitest';
import { evaluateFaceFitQuality, faceFitStatusFromQuality } from './quality';

const base = {
  faceCount: 1,
  pose: {
    yawDeg: 0,
    pitchDeg: 0,
    rollDeg: 0,
    matrixLayout: 'column-major-4x4' as const,
  },
  faceOccupancy: 0.3,
  subjectLeftIrisDiameterPx: 14,
  subjectRightIrisDiameterPx: 14,
  ratios: { ipdToFaceWidth: 0.38, canthiToFaceWidth: 0.62 },
  ipdMmPointEstimate: 64,
  faceWidthMmPointEstimate: 150,
  temporalState: 'ready' as const,
};

describe('evaluateFaceFitQuality', () => {
  it('prioritizes distance before pose and image coaching', () => {
    const quality = evaluateFaceFitQuality({
      ...base,
      faceOccupancy: 0.1,
      pose: { ...base.pose, yawDeg: 30 },
      captureQuality: { meanLuminance: 10, luminanceVariance: 2 },
    });
    expect(quality.reasons.slice(0, 4)).toEqual([
      'face-too-far',
      'yaw-too-high',
      'illumination-too-low',
      'image-too-blurry',
    ]);
    expect(faceFitStatusFromQuality(quality)).toBe('rejected');
  });

  it('limits absolute scale issues without discarding plausible ratios', () => {
    const quality = evaluateFaceFitQuality({
      ...base,
      subjectLeftIrisDiameterPx: 12,
      subjectRightIrisDiameterPx: 14,
    });
    expect(quality.reasons).toContain('iris-scale-asymmetry');
    expect(faceFitStatusFromQuality(quality)).toBe('limited');
  });

  it('limits a single face when pose is unavailable', () => {
    const quality = evaluateFaceFitQuality({ ...base, pose: null });
    expect(quality.reasons).toContain('pose-unavailable');
    expect(faceFitStatusFromQuality(quality)).toBe('limited');
  });

  it('rejects missing and multiple faces', () => {
    expect(evaluateFaceFitQuality({ ...base, faceCount: 0 }).reasons[0]).toBe(
      'face-not-present',
    );
    expect(evaluateFaceFitQuality({ ...base, faceCount: 2 }).reasons[0]).toBe(
      'multiple-faces',
    );
  });
});

