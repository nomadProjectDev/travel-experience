import { describe, expect, it } from 'vitest';
import { buildFaceLandmarkerFixture, isFaceLandmarkerFixtureV1 } from './fixture';

describe('FaceLandmarker fixture schema', () => {
  it('accepts anonymized Tasks output without source pixels', () => {
    const fixture = buildFaceLandmarkerFixture({
      pose: 'frontal',
      imageSize: { width: 1280, height: 720 },
      landmarks: [{ x: 0.5, y: 0.4, z: -0.01 }],
      facialTransformationMatrix: {
        rows: 4,
        columns: 4,
        data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      },
    });
    expect(isFaceLandmarkerFixtureV1(fixture)).toBe(true);
    expect(JSON.stringify(fixture)).not.toMatch(/data:image|sourceImage|pixels/);
    expect(fixture.synthetic).toBe(false);
  });

  it('rejects malformed matrices and unsupported pose labels', () => {
    expect(
      isFaceLandmarkerFixtureV1({
        schemaVersion: 1,
        source: 'mediapipe-tasks-face-landmarker',
        synthetic: false,
        pose: 'left',
        capturedAt: new Date().toISOString(),
        imageSize: { width: 1, height: 1 },
        landmarks: [],
        facialTransformationMatrix: { rows: 4, columns: 4, data: [] },
      }),
    ).toBe(false);
  });
});

