export const REPORT_SCHEMA_VERSION = '2.0.0';

const ERROR_FIELDS = [
  ['binocularPdMm', 'binocularPdMm'],
  ['faceWidthMm', 'faceWidthMm'],
  ['templeDistanceMm', 'templeDistanceMm'],
];
const REPEATABILITY_FIELDS = [
  ['ipdToFaceWidth', (result) => result.outputRatios?.ipdToFaceWidth],
  ['canthiToFaceWidth', (result) => result.outputRatios?.canthiToFaceWidth],
  ['bridgeToIpd', (result) => result.outputRatios?.bridgeToIpd],
  ['binocularPdMm', (result) => result.estimatesMm?.binocularPdMm],
  ['faceWidthMm', (result) => result.estimatesMm?.faceWidthMm],
];

function round(value, digits = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values, probability) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil(probability * sorted.length) - 1;
  return sorted[Math.max(0, rank)];
}

function summarizeValues(values) {
  return {
    count: values.length,
    mean: round(mean(values)),
    median: round(median(values)),
    p90: round(percentile(values, 0.9)),
    p95: round(percentile(values, 0.95)),
  };
}

function accuracySummary(observations) {
  const errors = observations.map(({ estimate, truth }) => estimate - truth);
  const absoluteErrors = errors.map(Math.abs);
  return {
    groundTruthCount: observations.length,
    mae: round(mean(absoluteErrors)),
    medianAbsoluteError: round(median(absoluteErrors)),
    p90AbsoluteError: round(percentile(absoluteErrors, 0.9)),
    p95AbsoluteError: round(percentile(absoluteErrors, 0.95)),
    signedBias: round(mean(errors)),
  };
}

function experimentalFaceSizeSummary(items) {
  const withEstimator = items.filter(({ result }) => result.experimentalFaceSize);
  const rejected = withEstimator.filter(
    ({ result }) => result.experimentalFaceSize.status === 'rejected',
  );
  const eligible = withEstimator.filter(({ record }) =>
    Number.isFinite(
      record.groundTruth?.maximumFaceWidth?.value ??
        record.groundTruth?.faceWidthMm,
    ),
  );
  const observations = eligible
    .filter(({ result }) => result.experimentalFaceSize.status === 'usable')
    .map(({ record, result }) => {
      const truth =
        record.groundTruth.maximumFaceWidth?.value ??
        record.groundTruth.faceWidthMm;
      return {
        truth,
        estimate: result.experimentalFaceSize.centralEstimateMm,
        range: result.experimentalFaceSize.estimatedFaceWidthMm,
      };
    });
  const errors = observations.map(({ estimate, truth }) => estimate - truth);
  const absoluteErrors = errors.map(Math.abs);
  const covered = observations.filter(
    ({ truth, range }) => truth >= range.min && truth <= range.max,
  ).length;

  return {
    method: 'iris-scale-v1',
    status: observations.length >= 2 ? 'computed' : 'insufficient-data',
    observationCount: withEstimator.length,
    eligibleGroundTruthCount: eligible.length,
    acceptedGroundTruthCount: observations.length,
    rejectionRate: withEstimator.length
      ? round(rejected.length / withEstimator.length)
      : null,
    maeMm: round(mean(absoluteErrors)),
    signedBiasMm: round(mean(errors)),
    medianAbsoluteErrorMm: round(median(absoluteErrors)),
    predictedRangeCoverage: observations.length
      ? round(covered / observations.length)
      : null,
  };
}

function flatten(dataset) {
  return dataset.records.flatMap((record) =>
    record.results.map((result) => ({
      record,
      result,
      method: result.calibrationMethod,
    })),
  );
}

function metricAgreement(items) {
  const comparable = items.filter(
    ({ record, result }) =>
      result.predictedSizeLabel &&
      (record.groundTruth?.comfortableFrameMeasurements?.sizeLabel ||
        ['S', 'M', 'L'].includes(record.groundTruth?.opticianFitLabel)),
  );
  const matches = comparable.filter(
    ({ record, result }) => {
      const groundTruthLabel =
        record.groundTruth.comfortableFrameMeasurements?.sizeLabel ?? record.groundTruth.opticianFitLabel;
      return result.predictedSizeLabel === groundTruthLabel;
    },
  ).length;
  return {
    comparableCount: comparable.length,
    matchCount: matches,
    agreementRate: comparable.length ? round(matches / comparable.length) : null,
  };
}

function readinessSummary(items) {
  const ready = items.filter(({ result }) => result.quality.status === 'ready');
  const rejected = items.filter(({ result }) => result.quality.status === 'rejected');
  const insufficient = items.filter(({ result }) => result.quality.status === 'insufficient');
  const reasonCounts = {};
  for (const { result } of items) {
    for (const reason of result.quality.reasons) reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
  }
  return {
    observationCount: items.length,
    readyCount: ready.length,
    rejectionRate: items.length ? round(rejected.length / items.length) : null,
    insufficientRate: items.length ? round(insufficient.length / items.length) : null,
    framesToReady: summarizeValues(
      ready.map(({ result }) => result.readiness.framesToReady).filter(Number.isFinite),
    ),
    timeToReadyMs: summarizeValues(
      ready.map(({ result }) => result.readiness.timeToReadyMs).filter(Number.isFinite),
    ),
    inferenceLatencyMs: summarizeValues(items.map(({ result }) => result.runtime.latencyMs)),
    qualityReasonCounts: Object.fromEntries(Object.entries(reasonCounts).sort()),
  };
}

function accuracyByField(items) {
  return Object.fromEntries(
    ERROR_FIELDS.map(([estimateField, truthField]) => {
      const eligible = items.filter(({ record }) => Number.isFinite(record.groundTruth?.[truthField]));
      const observations = eligible
        .filter(({ result }) => Number.isFinite(result.estimatesMm?.[estimateField]))
        .map(({ record, result }) => ({
          estimate: result.estimatesMm[estimateField],
          truth: record.groundTruth[truthField],
        }));
      return [
        estimateField,
        {
          ...accuracySummary(observations),
          eligibleGroundTruthCount: eligible.length,
          coverage: eligible.length ? round(observations.length / eligible.length) : null,
        },
      ];
    }),
  );
}

function groupBy(items, keyFor) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFor(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function sliceReport(items, keyFor) {
  return Object.fromEntries(
    [...groupBy(items, keyFor).entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, group]) => [
        key,
        {
          readiness: readinessSummary(group),
          sizeAgreement: metricAgreement(group),
          accuracy: accuracyByField(group),
        },
      ]),
  );
}

function repeatability(items) {
  const participantGroups = groupBy(items, ({ record }) => record.participantAnonId);
  return Object.fromEntries(
    [...participantGroups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([participantAnonId, participantItems]) => {
        const byMethod = groupBy(participantItems, ({ method }) => method);
        return [
          participantAnonId,
          Object.fromEntries(
            [...byMethod.entries()].map(([method, methodItems]) => [
              method,
              Object.fromEntries(
                REPEATABILITY_FIELDS.map(([name, getValue]) => {
                  const values = methodItems.map(({ result }) => getValue(result)).filter(Number.isFinite);
                  const average = mean(values);
                  const variance =
                    values.length > 1
                      ? values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
                        (values.length - 1)
                      : null;
                  return [
                    name,
                    {
                      count: values.length,
                      cv:
                        variance !== null && average !== 0
                          ? round(Math.sqrt(variance) / Math.abs(average))
                          : null,
                    },
                  ];
                }),
              ),
            ]),
          ),
        ];
      }),
  );
}

function compareCalibrationMethods(dataset) {
  const pairs = dataset.records
    .map((record) => {
      const irisPrior = record.results.find((result) => result.calibrationMethod === 'iris-prior');
      const knownCard = record.results.find((result) => result.calibrationMethod === 'known-card');
      return irisPrior && knownCard ? { record, irisPrior, knownCard } : null;
    })
    .filter(Boolean);

  if (!pairs.length) return { pairedCaptureCount: 0, status: 'not-computable' };

  const metrics = Object.fromEntries(
    ERROR_FIELDS.map(([estimateField, truthField]) => {
      const estimatePairs = pairs.filter(
        ({ irisPrior, knownCard }) =>
          Number.isFinite(irisPrior.estimatesMm?.[estimateField]) &&
          Number.isFinite(knownCard.estimatesMm?.[estimateField]),
      );
      const comparable = pairs.filter(
        ({ record, irisPrior, knownCard }) =>
          Number.isFinite(record.groundTruth?.[truthField]) &&
          Number.isFinite(irisPrior.estimatesMm?.[estimateField]) &&
          Number.isFinite(knownCard.estimatesMm?.[estimateField]),
      );
      const irisErrors = comparable.map(
        ({ record, irisPrior }) => Math.abs(irisPrior.estimatesMm[estimateField] - record.groundTruth[truthField]),
      );
      const cardErrors = comparable.map(
        ({ record, knownCard }) => Math.abs(knownCard.estimatesMm[estimateField] - record.groundTruth[truthField]),
      );
      return [
        estimateField,
        {
          pairedEstimateCount: estimatePairs.length,
          meanEstimateDeltaKnownCardMinusIrisPrior: round(
            mean(
              estimatePairs.map(
                ({ irisPrior, knownCard }) =>
                  knownCard.estimatesMm[estimateField] - irisPrior.estimatesMm[estimateField],
              ),
            ),
          ),
          comparableGroundTruthCount: comparable.length,
          irisPriorMae: round(mean(irisErrors)),
          knownCardMae: round(mean(cardErrors)),
          maeDeltaKnownCardMinusIrisPrior:
            comparable.length ? round(mean(cardErrors) - mean(irisErrors)) : null,
        },
      ];
    }),
  );
  return { pairedCaptureCount: pairs.length, status: 'computed', metrics };
}

export function buildReport(dataset, options = {}) {
  const items = flatten(dataset);
  const methods = [...new Set(items.map(({ method }) => method))].sort();
  return {
    reportSchemaVersion: REPORT_SCHEMA_VERSION,
    sourceDatasetSchemaVersion: dataset.datasetSchemaVersion,
    sourceDatasetKind: dataset.datasetKind,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    privacy: {
      sourceImagesIncluded: false,
      rawPersonallyIdentifyingDataIncluded: false,
      participantIdentifiers: 'study-local pseudonyms only',
    },
    counts: {
      participants: new Set(dataset.records.map((record) => record.participantAnonId)).size,
      sessions: new Set(dataset.records.map((record) => record.sessionId)).size,
      captures: dataset.records.length,
      calculatedResults: items.length,
    },
    experimentalFaceSize: experimentalFaceSizeSummary(items),
    byCalibrationMethod: Object.fromEntries(
      methods.map((method) => {
        const methodItems = items.filter((item) => item.method === method);
        return [
          method,
          {
            readiness: readinessSummary(methodItems),
            sizeAgreement: metricAgreement(methodItems),
            accuracy: accuracyByField(methodItems),
          },
        ];
      }),
    ),
    repeatabilityByParticipant: repeatability(items),
    calibrationMethodComparison: compareCalibrationMethods(dataset),
    slices: {
      deviceCategory: sliceReport(items, ({ record }) => record.session.deviceCategory),
      deviceModel: sliceReport(items, ({ record }) => record.session.deviceModel),
      distanceBucket: sliceReport(items, ({ record }) => record.condition.distanceBucket),
      lighting: sliceReport(items, ({ record }) => record.condition.lighting),
      poseTarget: sliceReport(items, ({ record }) => record.condition.poseTarget),
    },
  };
}
