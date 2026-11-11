import { describe, expect, it } from 'vitest';
import { estimateAbsoluteFaceSize } from './absoluteFaceSize';

const readySignal = {
  faceWidthProxyPx: 168,
  subjectLeftIrisDiameterPx: 14,
  subjectRightIrisDiameterPx: 14,
  temporalState: 'ready' as const,
  qualityAccepted: true,
};

describe('iris-scale-v1 absolute face-size estimate', () => {
  it('propagates the iris prior interval independently through known geometry', () => {
    const estimate = estimateAbsoluteFaceSize(readySignal);
    expect(estimate.status).toBe('usable');
    if (estimate.status !== 'usable') throw new Error('Expected usable estimate');
    expect(estimate.method).toBe('iris-scale-v1');
    expect(estimate.estimatedFaceWidth).toEqual({ minMm: 135, maxMm: 146 });
    expect(estimate.centralEstimateMm).toBe(140);
    expect(estimate.perEye.subjectLeft).toEqual({
      minMm: 135,
      maxMm: 146,
      centralMm: 140,
    });
    expect(estimate.assumptions.note).toMatch(/individual iris diameter is not known/i);
  });

  it('rejects per-eye scale disagreement above the configured threshold', () => {
    const estimate = estimateAbsoluteFaceSize({
      ...readySignal,
      subjectRightIrisDiameterPx: 12.5,
    });
    expect(estimate).toMatchObject({
      status: 'rejected',
      reasons: ['iris-scale-disagreement'],
    });
  });

  it('limits confidence for smaller or moderately disagreeing iris scales', () => {
    const estimate = estimateAbsoluteFaceSize({
      ...readySignal,
      subjectRightIrisDiameterPx: 13.3,
    });
    expect(estimate.status).toBe('usable');
    if (estimate.status !== 'usable') throw new Error('Expected usable estimate');
    expect(estimate.confidence).toBe('low');
    expect(estimate.estimatedFaceWidth.minMm).toBeLessThan(
      estimate.estimatedFaceWidth.maxMm,
    );
  });

  it.each([
    [
      'iris too small',
      { ...readySignal, subjectLeftIrisDiameterPx: 7.9 },
      'iris-too-small',
    ],
    [
      'bad pose or quality',
      { ...readySignal, qualityAccepted: false },
      'pose-or-quality-rejected',
    ],
    [
      'unstable frame',
      { ...readySignal, temporalState: 'stabilizing' as const },
      'temporal-unstable',
    ],
  ])('rejects %s', (_label, signal, reason) => {
    expect(estimateAbsoluteFaceSize(signal)).toMatchObject({
      status: 'rejected',
      reasons: expect.arrayContaining([reason]),
    });
  });

  it('rejects missing, non-finite, and anthropometrically impossible geometry', () => {
    expect(
      estimateAbsoluteFaceSize({ ...readySignal, faceWidthProxyPx: null }),
    ).toMatchObject({
      status: 'rejected',
      reasons: expect.arrayContaining(['not-enough-signal', 'invalid-geometry']),
    });
    expect(
      estimateAbsoluteFaceSize({ ...readySignal, faceWidthProxyPx: Number.NaN }),
    ).toMatchObject({
      status: 'rejected',
      reasons: ['invalid-geometry'],
    });
    expect(
      estimateAbsoluteFaceSize({ ...readySignal, faceWidthProxyPx: 300 }),
    ).toMatchObject({
      status: 'rejected',
      reasons: ['anthropometric-implausible'],
    });
  });
});
