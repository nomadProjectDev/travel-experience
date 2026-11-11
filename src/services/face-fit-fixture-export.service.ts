import {
  estimateAbsoluteFaceSizeFromResult,
  type AbsoluteFaceSizeEstimate,
  type FaceFitResult,
  type FaceLandmarkerFixtureV1,
} from '@/core/face';
import {
  getFaceLandmarkerDiagnostics,
  getLatestFaceLandmarkerFixture,
  type FaceLandmarkerSessionToken,
} from './face-landmarker.service';

export type CalibrationSplit = 'calibration' | 'test';
export type CalibrationDistance = 'near' | 'target' | 'far';
export type CalibrationLighting = 'even' | 'challenging';
export type CalibrationPoseTarget =
  | 'frontal'
  | 'yaw-left-10'
  | 'yaw-right-10'
  | 'yaw-left-20'
  | 'yaw-right-20'
  | 'pitch-up'
  | 'pitch-down';

export interface FaceFitCalibrationMetadata {
  participantId: string;
  sessionId: string;
  split: CalibrationSplit;
  deviceLabel: string;
  distanceCondition: CalibrationDistance;
  lighting: CalibrationLighting;
  poseTarget: CalibrationPoseTarget;
  eyewearPresent: boolean;
  groundTruthFaceWidth?: {
    valueMm: number;
    method: 'bizygomatic-caliper' | 'maximum-face-width-tape' | 'other';
    tool: string;
    repeatCount: number;
  };
  consentAcknowledged: true;
}

export interface FaceFitCalibrationProtocol {
  stepId: string;
  stepIndex: number;
  stepCount: number;
}

interface CalibrationHarnessResult {
  calibrationMethod: 'iris-prior' | 'known-card';
  modelVersion: string;
  pipelineSchemaVersion: '2.0.0';
  thresholdConfigVersion: string;
  calibrationVersion: string;
  outputRatios?: {
    ipdToFaceWidth: number;
    canthiToFaceWidth: number;
  };
  estimatesMm?: {
    binocularPdMm: number;
    faceWidthMm: number;
  };
  experimentalFaceSize: {
    method: AbsoluteFaceSizeEstimate['method'];
    status: AbsoluteFaceSizeEstimate['status'];
    confidence: AbsoluteFaceSizeEstimate['confidence'];
    reasons: string[];
    estimatedFaceWidthMm?: { min: number; max: number };
    centralEstimateMm?: number;
  };
  irisDiametersPx: {
    left: number | null;
    right: number | null;
    mean: number | null;
  };
  poseDeg: {
    yaw: number | null;
    pitch: number | null;
    roll: number | null;
  };
  faceOccupancy: number | null;
  quality: {
    status: 'ready' | 'rejected' | 'insufficient';
    reasons: string[];
  };
  readiness: {
    framesToReady: null;
    timeToReadyMs: null;
  };
  runtime: {
    delegate: 'GPU' | 'CPU' | null;
    latencyMs: number | null;
  };
}

export interface FaceFitCalibrationExport {
  datasetSchemaVersion: '2.0.0';
  datasetKind: 'study';
  description: string;
  records: [
    {
      participantAnonId: string;
      sessionId: string;
      captureId: string;
      split: CalibrationSplit;
      session: {
        deviceModel: string;
        deviceCategory: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'other';
        browser: string;
        resolution: { width: number; height: number };
      };
      condition: {
        distanceBucket: CalibrationDistance;
        lighting: 'indoor' | 'backlit';
        poseTarget: 'frontal' | 'yaw-left' | 'yaw-right' | 'pitch-up' | 'pitch-down';
        eyewearPresent: boolean;
      };
      groundTruth?: {
        maximumFaceWidth: {
          value: number;
          unit: 'mm';
          method: NonNullable<
            FaceFitCalibrationMetadata['groundTruthFaceWidth']
          >['method'];
          tool: string;
          repeatCount: number;
        };
      };
      results: [CalibrationHarnessResult];
    },
  ];
}

export interface ExportCalibrationSampleInput {
  metadata: FaceFitCalibrationMetadata;
  protocol: FaceFitCalibrationProtocol;
  result: FaceFitResult;
  expectedLandmarkCount: number;
  sessionToken: FaceLandmarkerSessionToken;
  captureId: number;
  isCurrent: (sessionToken: FaceLandmarkerSessionToken, captureId: number) => boolean;
}

type RawFixture = {
  capturedAt: FaceLandmarkerFixtureV1['capturedAt'];
  imageSize: FaceLandmarkerFixtureV1['imageSize'];
  landmarks: FaceLandmarkerFixtureV1['landmarks'];
};

function fixturePoseFor(target: CalibrationPoseTarget):
  | 'frontal'
  | 'yaw-subject-left'
  | 'yaw-subject-right'
  | 'pitch-up'
  | 'pitch-down' {
  if (target.startsWith('yaw-left')) return 'yaw-subject-left';
  if (target.startsWith('yaw-right')) return 'yaw-subject-right';
  if (target === 'pitch-up' || target === 'pitch-down') return target;
  return 'frontal';
}

function safeFilePart(value: string): string {
  const clean = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return clean || 'anonymous';
}

function assertAnonymousMetadata(metadata: FaceFitCalibrationMetadata): void {
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(metadata.participantId)) {
    throw new Error('Anonymous participant ID must be 3–64 letters, numbers, "_" or "-"');
  }
  if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(metadata.sessionId)) {
    throw new Error('Session ID contains unsupported characters');
  }
}

function poseForHarness(
  target: CalibrationPoseTarget,
): FaceFitCalibrationExport['records'][0]['condition']['poseTarget'] {
  if (target.startsWith('yaw-left')) return 'yaw-left';
  if (target.startsWith('yaw-right')) return 'yaw-right';
  if (target === 'pitch-up' || target === 'pitch-down') return target;
  return 'frontal';
}

function deviceCategory(): FaceFitCalibrationExport['records'][0]['session']['deviceCategory'] {
  const userAgent = navigator.userAgent;
  if (/ipad|tablet/i.test(userAgent)) return 'tablet';
  if (/iphone|android.*mobile|mobile/i.test(userAgent)) return 'phone';
  return 'desktop';
}

function midpoint(range: { min: number; max: number }): number {
  return Number(((range.min + range.max) / 2).toFixed(3));
}

function toHarnessResult(result: FaceFitResult): CalibrationHarnessResult {
  const left = result.quality.irisDiameterPx.subjectLeft;
  const right = result.quality.irisDiameterPx.subjectRight;
  const pose = result.quality.pose;
  const calibrationMethod =
    result.status === 'valid' && result.absoluteEstimate.method === 'known-card'
      ? 'known-card'
      : 'iris-prior';
  const experimentalFaceSize = estimateAbsoluteFaceSizeFromResult(result);

  return {
    calibrationMethod,
    modelVersion: 'mediapipe-face-landmarker-float16-v1',
    pipelineSchemaVersion: '2.0.0',
    thresholdConfigVersion: 'face-fit-thresholds-v1',
    calibrationVersion:
      calibrationMethod === 'known-card'
        ? 'known-card-v1'
        : 'iris-diameter-prior-11.7mm-v1',
    ...(result.status === 'rejected'
      ? {}
      : {
          outputRatios: {
            ipdToFaceWidth: result.ratios.ipdToFaceWidth,
            canthiToFaceWidth: result.ratios.canthiToFaceWidth,
          },
        }),
    ...(result.status === 'valid'
      ? {
          estimatesMm: {
            binocularPdMm: midpoint(result.absoluteEstimate.ipdMm),
            faceWidthMm: midpoint(result.absoluteEstimate.faceWidthMm),
          },
        }
      : {}),
    experimentalFaceSize: {
      method: experimentalFaceSize.method,
      status: experimentalFaceSize.status,
      confidence: experimentalFaceSize.confidence,
      reasons: experimentalFaceSize.reasons,
      ...(experimentalFaceSize.status === 'usable'
        ? {
            estimatedFaceWidthMm: {
              min: experimentalFaceSize.estimatedFaceWidth.minMm,
              max: experimentalFaceSize.estimatedFaceWidth.maxMm,
            },
            centralEstimateMm: experimentalFaceSize.centralEstimateMm,
          }
        : {}),
    },
    irisDiametersPx: {
      left,
      right,
      mean: left !== null && right !== null ? (left + right) / 2 : null,
    },
    poseDeg: {
      yaw: pose?.yawDeg ?? null,
      pitch: pose?.pitchDeg ?? null,
      roll: pose?.rollDeg ?? null,
    },
    faceOccupancy: result.quality.faceOccupancy,
    quality: {
      status:
        result.status === 'valid'
          ? 'ready'
          : result.status === 'rejected'
            ? 'rejected'
            : 'insufficient',
      reasons: [...result.rejectionReasons],
    },
    readiness: {
      framesToReady: null,
      timeToReadyMs: null,
    },
    runtime: {
      delegate: getFaceLandmarkerDiagnostics().delegate,
      latencyMs: getFaceLandmarkerDiagnostics().latestDetectionLatencyMs,
    },
  };
}

function downloadJson(value: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readLatestRawFixture(pose: CalibrationPoseTarget): RawFixture | null {
  return getLatestFaceLandmarkerFixture(fixturePoseFor(pose));
}

export async function exportFaceFitCalibrationSample(
  input: ExportCalibrationSampleInput,
): Promise<FaceFitCalibrationExport> {
  if (!import.meta.env.DEV || import.meta.env.VITE_FACE_FIT_FIXTURE_EXPORT !== 'true') {
    throw new Error('Calibration export is disabled');
  }
  if (!input.isCurrent(input.sessionToken, input.captureId)) {
    throw new Error('The capture changed before export');
  }
  if (input.metadata.consentAcknowledged !== true) {
    throw new Error('Explicit consent is required');
  }
  assertAnonymousMetadata(input.metadata);
  const groundTruth = input.metadata.groundTruthFaceWidth;
  if (
    groundTruth &&
    (!Number.isFinite(groundTruth.valueMm) ||
      groundTruth.valueMm <= 0 ||
      !groundTruth.tool.trim() ||
      !Number.isInteger(groundTruth.repeatCount) ||
      groundTruth.repeatCount < 1)
  ) {
    throw new Error('Ground-truth face width requires valid mm, tool, and repeat count');
  }

  const fixture = readLatestRawFixture(input.metadata.poseTarget);
  if (!fixture || fixture.landmarks.length !== input.expectedLandmarkCount) {
    throw new Error('The raw landmark sample no longer matches this capture');
  }
  if (!input.isCurrent(input.sessionToken, input.captureId)) {
    throw new Error('The capture changed during export');
  }

  const diagnostics = getFaceLandmarkerDiagnostics();
  if (diagnostics.sessionGeneration !== input.sessionToken.generation) {
    throw new Error('The FaceLandmarker session changed before export');
  }

  const document: FaceFitCalibrationExport = {
    datasetSchemaVersion: '2.0.0',
    datasetKind: 'study',
    description: groundTruth
      ? 'Consent-gated local face-fit calibration export. Contains derived measurements only; no source image or raw landmarks.'
      : 'Consent-gated local face-fit calibration export. Contains derived measurements only; no source image or raw landmarks. Incomplete: measured maximum face width omitted.',
    records: [
      {
        participantAnonId: input.metadata.participantId,
        sessionId: input.metadata.sessionId,
        captureId: `${input.metadata.sessionId}:${input.protocol.stepId}:${Date.parse(
          fixture.capturedAt,
        )}`,
        split: input.metadata.split,
        session: {
          deviceModel: input.metadata.deviceLabel,
          deviceCategory: deviceCategory(),
          browser: navigator.userAgent,
          resolution: fixture.imageSize,
        },
        condition: {
          distanceBucket: input.metadata.distanceCondition,
          lighting: input.metadata.lighting === 'even' ? 'indoor' : 'backlit',
          poseTarget: poseForHarness(input.metadata.poseTarget),
          eyewearPresent: input.metadata.eyewearPresent,
        },
        ...(groundTruth
          ? {
              groundTruth: {
                maximumFaceWidth: {
                  value: groundTruth.valueMm,
                  unit: 'mm' as const,
                  method: groundTruth.method,
                  tool: groundTruth.tool.trim(),
                  repeatCount: groundTruth.repeatCount,
                },
              },
            }
          : {}),
        results: [toHarnessResult(input.result)],
      },
    ],
  };

  downloadJson(
    document,
    `face-fit-${safeFilePart(input.metadata.participantId)}-${safeFilePart(
      input.metadata.sessionId,
    )}-${safeFilePart(input.protocol.stepId)}-${Date.now()}.json`,
  );
  return document;
}
