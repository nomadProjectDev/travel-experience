import { describe, expect, it } from 'vitest';
import {
  assertSafeFaceFitContext,
  buildFaceFitMetricPresentation,
  buildFaceFitMetricRows,
  buildSafeFaceFitContext,
} from './present';
import { estimateAbsoluteFaceSize } from './absoluteFaceSize';
import type { FaceFitResult, LimitedFaceFitResult } from './types';

function limitedResult(): LimitedFaceFitResult {
  return {
    schemaVersion: 2,
    status: 'limited',
    measurements: {
      irisCenterSpanPx: 80,
      outerCanthiSpanPx: 130,
      faceWidthProxyPx: 210,
    },
    ratios: { ipdToFaceWidth: 0.381, canthiToFaceWidth: 0.619 },
    experimental: {
      nasalHeightProxyPx: 50,
      subjectLeftIrisToNasalAxisPx: 40,
      subjectRightIrisToNasalAxisPx: 40,
    },
    quality: {
      faceCount: 1,
      pose: null,
      faceOccupancy: 0.3,
      irisDiameterPx: { subjectLeft: 12, subjectRight: 14 },
      irisScaleDisagreement: 0.14,
      temporalState: 'ready',
      captureQuality: null,
      reasons: ['pose-unavailable', 'iris-scale-asymmetry'],
    },
    rejectionReasons: ['pose-unavailable', 'iris-scale-asymmetry'],
  };
}

describe('safe face-fit presenter', () => {
  it('keeps UI rows while serializing only normalized portable ratios', () => {
    const result = limitedResult();
    const context = buildSafeFaceFitContext(result);
    const serialized = JSON.stringify(context);
    expect(() => assertSafeFaceFitContext(context)).not.toThrow();
    expect(buildFaceFitMetricRows(result).length).toBeGreaterThan(0);
    expect(context).toEqual({
      schemaVersion: 2,
      status: 'limited',
      ipdToFaceWidth: 0.381,
      outerCanthiToFaceWidth: 0.619,
    });
    expect(serialized).not.toMatch(
      /px|mm|absolute|estimate|experimental|nasal|bridge|mono|landmark|pose|yaw|pitch|quality|confidence|occupancy|irisDiameter|rejectionReasons/i,
    );
  });

  it('emits no measurements for rejected results', () => {
    const rejected: FaceFitResult = {
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
    const context = buildSafeFaceFitContext(rejected);
    expect(buildFaceFitMetricRows(rejected)).toEqual([]);
    expect(context).toEqual({ schemaVersion: 2, status: 'rejected' });
  });

  it('labels only the current measurable frame as preliminary until ready', () => {
    const current = limitedResult();
    const preliminary = buildFaceFitMetricPresentation(current, false);
    expect(preliminary.kind).toBe('preliminary');
    expect(preliminary.rows).toEqual(buildFaceFitMetricRows(current));

    const invalid: FaceFitResult = {
      schemaVersion: 2,
      status: 'rejected',
      quality: {
        faceCount: 2,
        pose: null,
        faceOccupancy: null,
        irisDiameterPx: { subjectLeft: null, subjectRight: null },
        irisScaleDisagreement: null,
        temporalState: 'collecting',
        captureQuality: null,
        reasons: ['multiple-faces'],
      },
      rejectionReasons: ['multiple-faces'],
    };
    expect(buildFaceFitMetricPresentation(invalid, false)).toEqual({
      kind: 'none',
      rows: [],
    });
    expect(buildFaceFitMetricPresentation(null, false)).toEqual({
      kind: 'none',
      rows: [],
    });
  });

  it('marks ready rows as official without widening the safe context', () => {
    const limited = limitedResult();
    const result: FaceFitResult = {
      ...limited,
      status: 'valid',
      absoluteEstimate: {
        method: 'iris-diameter-prior',
        confidence: 'low',
        irisDiameterPriorMm: 11.7,
        ipdMm: { min: 60, max: 70 },
        outerCanthiMm: { min: 100, max: 115 },
        faceWidthMm: { min: 160, max: 185 },
      },
      rejectionReasons: [],
    };
    expect(buildFaceFitMetricPresentation(result, true)).toEqual({
      kind: 'official',
      rows: buildFaceFitMetricRows(result),
    });
    expect(JSON.stringify(buildSafeFaceFitContext(result))).not.toMatch(
      /px|mm|bridge|mono|experimental|landmark/i,
    );
  });

  it('rejects extra unsafe fields at runtime', () => {
    expect(() =>
      assertSafeFaceFitContext({
        schemaVersion: 2,
        status: 'limited',
        ipdToFaceWidth: 0.38,
        outerCanthiToFaceWidth: 0.62,
        faceWidthProxyPx: 210,
      }),
    ).toThrow(/Unsafe face-fit context/);
  });

  it('never adds the experimental absolute-size contract to the safe boundary', () => {
    const result = limitedResult();
    const estimate = estimateAbsoluteFaceSize({
      faceWidthProxyPx: result.measurements.faceWidthProxyPx,
      subjectLeftIrisDiameterPx: 14,
      subjectRightIrisDiameterPx: 14,
      temporalState: 'ready',
      qualityAccepted: true,
    });
    expect(estimate.status).toBe('usable');
    const safe = buildSafeFaceFitContext(result);
    expect(safe).not.toHaveProperty('method');
    expect(safe).not.toHaveProperty('estimatedFaceWidth');
    expect(JSON.stringify(safe)).not.toMatch(/iris-scale|Mm|confidence/);
  });
});

