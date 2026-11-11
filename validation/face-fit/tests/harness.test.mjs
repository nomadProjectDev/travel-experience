import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { importCsv, importDataset } from '../lib/import.mjs';
import { buildReport } from '../lib/report.mjs';
import { validateDataset } from '../lib/schema.mjs';

const exampleJsonPath = new URL('../examples/synthetic-example.json', import.meta.url);
const exampleCsvPath = new URL('../examples/synthetic-example.csv', import.meta.url);

async function exampleDataset() {
  return JSON.parse(await readFile(exampleJsonPath, 'utf8'));
}

test('strict validator accepts the versioned synthetic fixture', async () => {
  const validation = await validateDataset(await exampleDataset());
  assert.deepEqual(validation, { ok: true, errors: [] });
});

test('v2 accepts measured face-width provenance and reports iris-scale-v1 accuracy', async () => {
  const dataset = await exampleDataset();
  dataset.datasetSchemaVersion = '2.0.0';
  dataset.records[0].groundTruth.maximumFaceWidth = {
    value: 142,
    unit: 'mm',
    method: 'bizygomatic-caliper',
    tool: 'synthetic caliper',
    repeatCount: 3,
  };
  dataset.records[0].results[0].experimentalFaceSize = {
    method: 'iris-scale-v1',
    status: 'usable',
    confidence: 'low',
    reasons: [],
    estimatedFaceWidthMm: { min: 140, max: 150 },
    centralEstimateMm: 145,
  };
  dataset.records[0].results[1].experimentalFaceSize = {
    method: 'iris-scale-v1',
    status: 'usable',
    confidence: 'medium',
    reasons: [],
    estimatedFaceWidthMm: { min: 138, max: 144 },
    centralEstimateMm: 141,
  };
  dataset.records[1].groundTruth = {
    maximumFaceWidth: {
      value: 143,
      unit: 'mm',
      method: 'other',
      tool: 'synthetic fixture',
      repeatCount: 2,
    },
  };
  dataset.records[1].results[0].experimentalFaceSize = {
    method: 'iris-scale-v1',
    status: 'rejected',
    confidence: 'low',
    reasons: ['temporal-unstable'],
  };

  assert.deepEqual(await validateDataset(dataset), { ok: true, errors: [] });
  const summary = buildReport(dataset).experimentalFaceSize;
  assert.deepEqual(summary, {
    method: 'iris-scale-v1',
    status: 'computed',
    observationCount: 3,
    eligibleGroundTruthCount: 3,
    acceptedGroundTruthCount: 2,
    rejectionRate: 0.3333,
    maeMm: 2,
    signedBiasMm: 1,
    medianAbsoluteErrorMm: 2,
    predictedRangeCoverage: 1,
  });
});

test('v1 import remains valid without absolute-size fields', async () => {
  const dataset = await importDataset(exampleJsonPath);
  assert.equal(dataset.datasetSchemaVersion, '1.0.0');
  assert.equal(dataset.records[0].results[0].experimentalFaceSize, undefined);
});

test('strict validator accepts a collector-shaped insufficient result', async () => {
  const dataset = await exampleDataset();
  const record = dataset.records[0];
  delete record.groundTruth;
  record.results = [
    {
      calibrationMethod: 'iris-prior',
      modelVersion: 'mediapipe-face-landmarker-float16-v1',
      pipelineSchemaVersion: '2.0.0',
      thresholdConfigVersion: 'face-fit-thresholds-v1',
      calibrationVersion: 'iris-diameter-prior-11.7mm-v1',
      outputRatios: {
        ipdToFaceWidth: 0.38,
        canthiToFaceWidth: 0.61,
      },
      irisDiametersPx: { left: null, right: null, mean: null },
      poseDeg: { yaw: null, pitch: null, roll: null },
      faceOccupancy: null,
      quality: { status: 'insufficient', reasons: ['pose-unavailable'] },
      readiness: { framesToReady: null, timeToReadyMs: null },
      runtime: { delegate: null, latencyMs: null },
    },
  ];

  assert.deepEqual(await validateDataset(dataset), { ok: true, errors: [] });
  assert.equal(buildReport(dataset).counts.captures, 2);
});

test('strict validator rejects unknown fields', async () => {
  const dataset = await exampleDataset();
  dataset.records[0].participantName = 'must-not-be-collected';
  const validation = await validateDataset(dataset);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /participantName is not allowed/);
});

test('duplicate capture IDs are rejected', async () => {
  const dataset = await exampleDataset();
  dataset.records[1].captureId = dataset.records[0].captureId;
  const validation = await validateDataset(dataset);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /duplicate captureId/);
});

test('participant-level calibration/test leakage is rejected', async () => {
  const dataset = await exampleDataset();
  dataset.records[1].split = 'test';
  const validation = await validateDataset(dataset);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /participant leakage/);
});

test('duplicate methods within one capture are rejected', async () => {
  const dataset = await exampleDataset();
  dataset.records[0].results[1].calibrationMethod = 'iris-prior';
  const validation = await validateDataset(dataset);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /duplicate calibrationMethod/);
});

test('CSV importer creates and validates nested records', async () => {
  const dataset = await importDataset(exampleCsvPath);
  assert.equal(dataset.datasetKind, 'example');
  assert.equal(dataset.records[0].groundTruth.monocularPdMm.left, 30.5);
  assert.deepEqual(dataset.records[0].results[0].quality.reasons, []);
});

test('CSV importer rejects duplicate headers and malformed rows', () => {
  assert.throws(() => importCsv('captureId,captureId\none,two\n'), /headers must be unique/);
  assert.throws(() => importCsv('captureId,split\none\n'), /expected 2/);
});

test('report computes repeatability, accuracy, readiness, slices, and paired methods', async () => {
  const report = buildReport(await exampleDataset(), { generatedAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(report.reportSchemaVersion, '2.0.0');
  assert.equal(report.counts.participants, 1);
  assert.equal(report.byCalibrationMethod['iris-prior'].readiness.rejectionRate, 0.5);
  assert.equal(report.byCalibrationMethod['iris-prior'].accuracy.binocularPdMm.mae, 1.2);
  assert.equal(
    report.repeatabilityByParticipant['example-p001']['iris-prior'].binocularPdMm.cv,
    0.0098,
  );
  assert.equal(report.calibrationMethodComparison.pairedCaptureCount, 1);
  assert.equal(
    report.calibrationMethodComparison.metrics.binocularPdMm.maeDeltaKnownCardMinusIrisPrior,
    -0.8,
  );
  assert.equal(report.slices.distanceBucket.far.readiness.rejectionRate, 1);
  assert.equal(report.privacy.sourceImagesIncluded, false);
});

test('empty datasets produce explicit null metrics without fabricated values', () => {
  const report = buildReport({
    datasetSchemaVersion: '1.0.0',
    datasetKind: 'study',
    records: [],
  });
  assert.deepEqual(report.counts, {
    participants: 0,
    sessions: 0,
    captures: 0,
    calculatedResults: 0,
  });
  assert.deepEqual(report.byCalibrationMethod, {});
  assert.deepEqual(report.repeatabilityByParticipant, {});
  assert.deepEqual(report.calibrationMethodComparison, {
    pairedCaptureCount: 0,
    status: 'not-computable',
  });
});
