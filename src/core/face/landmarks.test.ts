import { describe, expect, it } from 'vitest';
import {
  LM_SUBJECT_LEFT_IRIS,
  LM_SUBJECT_LEFT_OUTER_CANTHUS,
  LM_SUBJECT_RIGHT_IRIS,
  LM_SUBJECT_RIGHT_OUTER_CANTHUS,
} from './landmarks';
import { landmarkToCanvasPoint } from './overlay';

describe('subject-anatomical landmark convention', () => {
  it('matches the official topology independent of preview orientation', () => {
    expect(LM_SUBJECT_RIGHT_IRIS).toBe(468);
    expect(LM_SUBJECT_RIGHT_OUTER_CANTHUS).toBe(33);
    expect(LM_SUBJECT_LEFT_IRIS).toBe(473);
    expect(LM_SUBJECT_LEFT_OUTER_CANTHUS).toBe(263);
  });

  it('keeps anatomy fixed while mirroring affects drawing only', () => {
    const options = {
      canvasWidth: 200,
      canvasHeight: 100,
      videoWidth: 200,
      videoHeight: 100,
    };
    const unmirrored = landmarkToCanvasPoint(
      { x: 0.25, y: 0.5 },
      { ...options, mirrored: false },
    );
    const mirrored = landmarkToCanvasPoint(
      { x: 0.25, y: 0.5 },
      { ...options, mirrored: true },
    );
    expect(unmirrored.x).toBe(50);
    expect(mirrored.x).toBe(150);
    expect(LM_SUBJECT_RIGHT_IRIS).toBe(468);
  });
});

