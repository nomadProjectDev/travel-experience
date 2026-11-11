import { describe, expect, it } from 'vitest';
import {
  FACE_FIT_CALIBRATION_STEPS,
  SIMPLE_FRONTAL_REPEAT_LIMIT,
  buildCalibrationGroundTruth,
  canExportCalibrationSample,
  createDefaultCalibrationIdentity,
  getCalibrationExportBlockers,
  inferDeviceLabel,
  isFaceFitSizeSandboxEnabled,
  nextIncompleteCalibrationStep,
  nextSimpleFrontalRepeat,
  parseMeasuredFaceWidthMm,
  simpleFrontalProtocol,
} from './faceFitCalibration';

const exportableCapture = {
  hasCapturedImage: true,
  analysisPending: false,
  capturedLandmarkCount: 478,
  consent: true,
  participantId: 'p-anon-001',
  sessionId: 's-20260907-001',
  deviceLabel: 'Mac-browser',
  groundTruthFaceWidth: '',
  exportState: 'idle' as const,
};

describe('face-fit calibration protocol', () => {
  it('covers repeats, distance, yaw, pitch, and lighting conditions', () => {
    expect(FACE_FIT_CALIBRATION_STEPS.filter((step) => step.id.startsWith('frontal-'))).toHaveLength(3);
    expect(new Set(FACE_FIT_CALIBRATION_STEPS.map((step) => step.distanceCondition))).toEqual(
      new Set(['near', 'target', 'far']),
    );
    expect(FACE_FIT_CALIBRATION_STEPS.map((step) => step.poseTarget)).toEqual(
      expect.arrayContaining([
        'yaw-left-10',
        'yaw-right-10',
        'yaw-left-20',
        'yaw-right-20',
        'pitch-up',
        'pitch-down',
      ]),
    );
    expect(new Set(FACE_FIT_CALIBRATION_STEPS.map((step) => step.lighting))).toEqual(
      new Set(['even', 'challenging']),
    );
  });

  it('advances to the next incomplete protocol step', () => {
    const completed = new Set([
      FACE_FIT_CALIBRATION_STEPS[1].id,
      FACE_FIT_CALIBRATION_STEPS[2].id,
    ]);
    expect(nextIncompleteCalibrationStep(0, completed)).toBe(3);
  });

  it('keeps the size sandbox off unless dev, calibration, and its independent flag agree', () => {
    expect(
      isFaceFitSizeSandboxEnabled({
        dev: true,
        calibrationMode: true,
        flag: 'true',
      }),
    ).toBe(true);
    expect(
      isFaceFitSizeSandboxEnabled({
        dev: false,
        calibrationMode: true,
        flag: 'true',
      }),
    ).toBe(false);
    expect(
      isFaceFitSizeSandboxEnabled({
        dev: true,
        calibrationMode: true,
        flag: undefined,
      }),
    ).toBe(false);
  });
});

describe('simple calibration export path', () => {
  it('auto-fills anonymous identity that the export schema accepts', () => {
    const identity = createDefaultCalibrationIdentity(
      new Date('2026-09-07T10:00:00Z'),
      0.42,
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    );
    expect(identity.participantId).toMatch(/^p-anon-20260907\d{3}$/);
    expect(identity.sessionId).toMatch(/^s-20260907-\d{3}$/);
    expect(identity.deviceLabel).toBe('Mac-browser');
  });

  it('maps common user agents to a short device label', () => {
    expect(inferDeviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(
      'iPhone-browser',
    );
    expect(inferDeviceLabel('Mozilla/5.0 (Linux; Android 14)')).toBe('Android-browser');
    expect(inferDeviceLabel('')).toBe('desktop-browser');
  });

  it('allows download after a capture without measured width, IDs, or the 14-step protocol', () => {
    expect(getCalibrationExportBlockers(exportableCapture)).toEqual([]);
    expect(canExportCalibrationSample(exportableCapture)).toBe(true);
    expect(buildCalibrationGroundTruth({ widthRaw: '' })).toBeUndefined();
  });

  it('keeps download enabled when width is empty and marks ground truth omitted', () => {
    const parsed = parseMeasuredFaceWidthMm('   ');
    expect(parsed).toEqual({ status: 'empty' });
    expect(
      canExportCalibrationSample({
        ...exportableCapture,
        groundTruthFaceWidth: '',
      }),
    ).toBe(true);
  });

  it('accepts comma decimals for measured face width', () => {
    expect(parseMeasuredFaceWidthMm('142,5')).toEqual({ status: 'ok', valueMm: 142.5 });
    expect(
      buildCalibrationGroundTruth({
        widthRaw: '142,5',
      }),
    ).toEqual({
      valueMm: 142.5,
      method: 'bizygomatic-caliper',
      tool: 'caliper',
      repeatCount: 3,
    });
  });

  it('blocks download only for real path errors, not for an incomplete lab protocol', () => {
    expect(getCalibrationExportBlockers({
      ...exportableCapture,
      hasCapturedImage: false,
      capturedLandmarkCount: null,
    })).toEqual(['noCapture']);
    expect(getCalibrationExportBlockers({
      ...exportableCapture,
      analysisPending: true,
      capturedLandmarkCount: null,
    })).toEqual(['analyzing']);
    expect(getCalibrationExportBlockers({
      ...exportableCapture,
      capturedLandmarkCount: 0,
    })).toEqual(['noLandmarks']);
    expect(getCalibrationExportBlockers({
      ...exportableCapture,
      consent: false,
    })).toEqual(['consent']);
    expect(getCalibrationExportBlockers({
      ...exportableCapture,
      groundTruthFaceWidth: 'abc',
    })).toEqual(['invalidWidth']);
    expect(getCalibrationExportBlockers({
      ...exportableCapture,
      participantId: '',
      sessionId: '',
      deviceLabel: '',
    })).toEqual(['missingIdentity']);
  });

  it('keeps the 14-step protocol available without using it as the simple export identity', () => {
    expect(FACE_FIT_CALIBRATION_STEPS).toHaveLength(14);
    expect(simpleFrontalProtocol(0)).toEqual({
      stepId: 'frontal-1',
      stepIndex: 1,
      stepCount: SIMPLE_FRONTAL_REPEAT_LIMIT,
    });
    expect(simpleFrontalProtocol(2).stepId).toBe('frontal-3');
    expect(simpleFrontalProtocol(99).stepId).toBe('frontal-3');
    expect(nextSimpleFrontalRepeat(0)).toBe(1);
    expect(nextSimpleFrontalRepeat(2)).toBe(2);
  });
});
