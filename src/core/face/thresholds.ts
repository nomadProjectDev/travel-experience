/** Central calibration surface. Tune only with versioned real-fixture evidence. */
export const FACE_FIT_THRESHOLDS = {
  maxYawDeg: 18,
  maxPitchDeg: 15,
  maxRollDeg: 12,
  minFaceOccupancy: 0.18,
  maxFaceOccupancy: 0.72,
  minIrisDiameterPx: 8,
  /** Relative difference from the larger per-eye horizontal scale. */
  maxIrisScaleDisagreement: 0.1,
  minIpdToFaceWidth: 0.28,
  maxIpdToFaceWidth: 0.58,
  minCanthiToFaceWidth: 0.42,
  maxCanthiToFaceWidth: 0.82,
  minIpdMm: 45,
  maxIpdMm: 80,
  minFaceWidthMm: 110,
  maxFaceWidthMm: 180,
  irisPriorRangeFraction: 0.06,
  knownCardRangeFraction: 0.03,
  stabilityWindowSize: 15,
  stabilityMinSamples: 7,
  stabilityDurationMs: 500,
  stabilityMaxRelativeDeviation: 0.025,
  stabilityMadMultiplier: 4,
  /**
   * Experimental iris-scale-v1 hypotheses. The individual iris is not known;
   * validate these bounds on consented, held-out ground truth before activation.
   */
  absoluteIrisPriorMinMm: 11.3,
  absoluteIrisPriorMaxMm: 12.1,
  absoluteMaxIrisScaleDisagreement: 0.1,
  absoluteMediumConfidenceDisagreement: 0.04,
  absoluteMediumConfidenceMinIrisPx: 12,
  /** Reject impossible envelopes; never clamp them into this interval. */
  absoluteMinPlausibleFaceWidthMm: 105,
  absoluteMaxPlausibleFaceWidthMm: 190,
} as const;

