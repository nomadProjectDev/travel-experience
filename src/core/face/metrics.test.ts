import { describe, expect, it } from 'vitest';
import {
  FACE_LANDMARK_COUNT_WITH_IRIS,
  LM_NOSE_BRIDGE_MID,
  LM_NOSE_BRIDGE_TOP,
  LM_SUBJECT_LEFT_FACE,
  LM_SUBJECT_LEFT_IRIS,
  LM_SUBJECT_LEFT_OUTER_CANTHUS,
  LM_SUBJECT_RIGHT_FACE,
  LM_SUBJECT_RIGHT_IRIS,
  LM_SUBJECT_RIGHT_OUTER_CANTHUS,
} from './landmarks';
import {
  computeFaceFitMetrics,
  estimateSubjectIrisDiametersPx,
  headPoseFromMatrix,
} from './metrics';
import { FACE_FIT_THRESHOLDS } from './thresholds';
import type { FaceLandmark } from './types';

const W = 1000;
const H = 1000;
const IDENTITY_FACE_MATRIX = {
  rows: 4,
  columns: 4,
  data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
};

/** Synthetic math fixture. It is not captured human evidence. */
function syntheticLandmarks(
  subjectRightIrisPx = 14,
  subjectLeftIrisPx = 14,
): FaceLandmark[] {
  const landmarks: FaceLandmark[] = Array.from(
    { length: FACE_LANDMARK_COUNT_WITH_IRIS },
    () => ({ x: 0.5, y: 0.5, z: 0 }),
  );
  landmarks[LM_SUBJECT_RIGHT_IRIS] = { x: 0.46, y: 0.42, z: 0 };
  landmarks[LM_SUBJECT_LEFT_IRIS] = { x: 0.54, y: 0.42, z: 0 };
  landmarks[469] = { x: 0.46 - subjectRightIrisPx / W / 2, y: 0.42, z: 0 };
  landmarks[471] = { x: 0.46 + subjectRightIrisPx / W / 2, y: 0.42, z: 0 };
  landmarks[470] = { x: 0.46, y: 0.3, z: 0 };
  landmarks[472] = { x: 0.46, y: 0.54, z: 0 };
  landmarks[474] = { x: 0.54 - subjectLeftIrisPx / W / 2, y: 0.42, z: 0 };
  landmarks[476] = { x: 0.54 + subjectLeftIrisPx / W / 2, y: 0.42, z: 0 };
  landmarks[475] = { x: 0.54, y: 0.3, z: 0 };
  landmarks[477] = { x: 0.54, y: 0.54, z: 0 };
  landmarks[LM_SUBJECT_RIGHT_OUTER_CANTHUS] = { x: 0.435, y: 0.42, z: 0 };
  landmarks[LM_SUBJECT_LEFT_OUTER_CANTHUS] = { x: 0.565, y: 0.42, z: 0 };
  landmarks[LM_NOSE_BRIDGE_TOP] = { x: 0.5, y: 0.4, z: 0 };
  landmarks[LM_NOSE_BRIDGE_MID] = { x: 0.5, y: 0.45, z: 0 };
  landmarks[LM_SUBJECT_RIGHT_FACE] = { x: 0.395, y: 0.5, z: 0 };
  landmarks[LM_SUBJECT_LEFT_FACE] = { x: 0.605, y: 0.5, z: 0 };
  return landmarks;
}

describe('horizontal iris scale', () => {
  it('measures each anatomical iris independently and ignores vertical diameter', () => {
    expect(estimateSubjectIrisDiametersPx(syntheticLandmarks(12, 16), W, H)).toEqual({
      subjectLeft: expect.closeTo(16, 5),
      subjectRight: expect.closeTo(12, 5),
    });
  });

  it('gates diameters below the pixel minimum', () => {
    const result = computeFaceFitMetrics(
      syntheticLandmarks(FACE_FIT_THRESHOLDS.minIrisDiameterPx - 0.1, 14),
      { imageWidthPx: W, imageHeightPx: H },
    );
    expect(result.status).toBe('limited');
    expect(result.rejectionReasons).toContain('iris-too-small');
    expect('absoluteEstimate' in result).toBe(false);
  });

  it('accepts scale disagreement below 10% and rejects absolute scale above it', () => {
    const belowLandmarks = syntheticLandmarks(14, 12.61);
    const aboveLandmarks = syntheticLandmarks(14, 12.59);
    for (const landmarks of [belowLandmarks, aboveLandmarks]) {
      landmarks[LM_SUBJECT_RIGHT_FACE] = { x: 0.4, y: 0.5, z: 0 };
      landmarks[LM_SUBJECT_LEFT_FACE] = { x: 0.6, y: 0.5, z: 0 };
    }
    const below = computeFaceFitMetrics(belowLandmarks, {
      imageWidthPx: W,
      imageHeightPx: H,
      facialMatrix: IDENTITY_FACE_MATRIX,
    });
    const above = computeFaceFitMetrics(aboveLandmarks, {
      imageWidthPx: W,
      imageHeightPx: H,
      facialMatrix: IDENTITY_FACE_MATRIX,
    });
    expect(below.status).toBe('valid');
    expect(above.status).toBe('limited');
    expect(above.rejectionReasons).toContain('iris-scale-asymmetry');
    expect('ratios' in above).toBe(true);
    expect('absoluteEstimate' in above).toBe(false);
  });
});

describe('computeFaceFitMetrics v2', () => {
  it('returns rounded estimate ranges and explicit anatomical experimental fields', () => {
    const result = computeFaceFitMetrics(syntheticLandmarks(), {
      imageWidthPx: W,
      imageHeightPx: H,
      facialMatrix: IDENTITY_FACE_MATRIX,
    });
    expect(result.schemaVersion).toBe(2);
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') throw new Error('Expected valid synthetic result');
    expect(result.absoluteEstimate.ipdMm.min).toBeLessThan(
      result.absoluteEstimate.ipdMm.max,
    );
    expect(Number.isInteger(result.absoluteEstimate.ipdMm.min)).toBe(true);
    expect(result.absoluteEstimate.confidence).toBe('low');
    expect(result.ratios.ipdToFaceWidth).toBeCloseTo(80 / 210, 5);
    expect(result.experimental.subjectLeftIrisToNasalAxisPx).toBeCloseTo(40, 5);
    expect(result.experimental.subjectRightIrisToNasalAxisPx).toBeCloseTo(40, 5);
  });

  it('keeps ratios but removes absolute output when explicitly unscaled', () => {
    const result = computeFaceFitMetrics(syntheticLandmarks(), {
      imageWidthPx: W,
      imageHeightPx: H,
      scale: { method: 'unscaled' },
    });
    expect(result.status).toBe('limited');
    expect('ratios' in result).toBe(true);
    expect('absoluteEstimate' in result).toBe(false);
  });

  it('keeps ratios but removes absolute output when pose is unavailable', () => {
    const result = computeFaceFitMetrics(syntheticLandmarks(), {
      imageWidthPx: W,
      imageHeightPx: H,
      facialMatrix: null,
    });
    expect(result.status).toBe('limited');
    expect(result.rejectionReasons).toContain('pose-unavailable');
    expect('ratios' in result).toBe(true);
    expect('absoluteEstimate' in result).toBe(false);
  });

  it('rejects implausible eye-span ratios', () => {
    const landmarks = syntheticLandmarks();
    landmarks[LM_SUBJECT_RIGHT_FACE] = { x: 0.3, y: 0.5, z: 0 };
    landmarks[LM_SUBJECT_LEFT_FACE] = { x: 0.7, y: 0.5, z: 0 };
    const result = computeFaceFitMetrics(landmarks, {
      imageWidthPx: W,
      imageHeightPx: H,
    });
    expect(result.status).toBe('rejected');
    expect(result.rejectionReasons).toContain('eye-span-ratio-implausible');
  });

  it('limits implausible IPD and face-width absolute estimates', () => {
    const result = computeFaceFitMetrics(syntheticLandmarks(), {
      imageWidthPx: W,
      imageHeightPx: H,
      scale: { method: 'known-card', referencePx: 100, referenceMm: 120 },
    });
    expect(result.status).toBe('limited');
    expect(result.rejectionReasons).toContain('ipd-estimate-implausible');
    expect(result.rejectionReasons).toContain('face-width-estimate-implausible');
  });
});

describe('headPoseFromMatrix', () => {
  it('extracts yaw and rejects malformed matrices', () => {
    const yawRad = Math.PI / 6;
    const c = Math.cos(yawRad);
    const s = Math.sin(yawRad);
    const pose = headPoseFromMatrix({
      rows: 4,
      columns: 4,
      data: [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1],
    });
    expect(pose?.yawDeg).toBeCloseTo(30, 1);
    expect(headPoseFromMatrix({ rows: 3, columns: 3, data: [] })).toBeNull();
  });
});

