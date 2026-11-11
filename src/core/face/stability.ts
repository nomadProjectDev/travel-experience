import { FACE_FIT_REASON_PRIORITY } from './quality';
import { FACE_FIT_THRESHOLDS } from './thresholds';
import type {
  FaceFitResult,
  FaceFitTemporalState,
  LimitedFaceFitResult,
  ValidFaceFitResult,
} from './types';

type MeasurableResult = ValidFaceFitResult | LimitedFaceFitResult;

export interface FaceFitStabilityOptions {
  windowSize?: number;
  minSamples?: number;
  stableDurationMs?: number;
  maxRelativeDeviation?: number;
  madMultiplier?: number;
}

export interface FaceFitStabilityUpdate {
  state: FaceFitTemporalState;
  result: FaceFitResult;
}

interface Sample {
  atMs: number;
  result: MeasurableResult;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function medianAbsoluteDeviation(values: number[]): number {
  const center = median(values);
  return median(values.map((value) => Math.abs(value - center)));
}

function relativeDeviation(values: number[]): number {
  const center = median(values);
  if (center === 0) return Number.POSITIVE_INFINITY;
  return Math.max(...values.map((value) => Math.abs(value - center) / Math.abs(center)));
}

function withTemporalState(
  result: MeasurableResult,
  state: FaceFitTemporalState,
): FaceFitResult {
  const reasons = new Set(result.rejectionReasons);
  if (state === 'ready') reasons.delete('temporal-unstable');
  else reasons.add('temporal-unstable');
  const rejectionReasons = FACE_FIT_REASON_PRIORITY.filter((reason) => reasons.has(reason));
  const quality = { ...result.quality, temporalState: state, reasons: rejectionReasons };
  if (state !== 'ready' || result.status === 'limited') {
    return {
      schemaVersion: 2,
      status: 'limited',
      measurements: result.measurements,
      ratios: result.ratios,
      experimental: result.experimental,
      quality,
      rejectionReasons,
    };
  }
  return { ...result, quality, rejectionReasons };
}

function medianResult(samples: Sample[], current: MeasurableResult): MeasurableResult {
  const measurement = (select: (result: MeasurableResult) => number) =>
    median(samples.map(({ result }) => select(result)));
  const measurements = {
    irisCenterSpanPx: measurement((result) => result.measurements.irisCenterSpanPx),
    outerCanthiSpanPx: measurement((result) => result.measurements.outerCanthiSpanPx),
    faceWidthProxyPx: measurement((result) => result.measurements.faceWidthProxyPx),
  };
  const ratios = {
    ipdToFaceWidth: measurement((result) => result.ratios.ipdToFaceWidth),
    canthiToFaceWidth: measurement((result) => result.ratios.canthiToFaceWidth),
  };
  if (current.status === 'limited') return { ...current, measurements, ratios };

  const validSamples = samples
    .map(({ result }) => result)
    .filter((result): result is ValidFaceFitResult => result.status === 'valid');
  if (validSamples.length === 0) {
    return {
      schemaVersion: 2,
      status: 'limited',
      measurements,
      ratios,
      experimental: current.experimental,
      quality: current.quality,
      rejectionReasons: current.rejectionReasons,
    };
  }
  const rangeMedian = (
    select: (result: ValidFaceFitResult) => { min: number; max: number },
  ) => ({
    min: Math.round(median(validSamples.map((result) => select(result).min))),
    max: Math.round(median(validSamples.map((result) => select(result).max))),
  });
  return {
    ...current,
    measurements,
    ratios,
    absoluteEstimate: {
      ...current.absoluteEstimate,
      ipdMm: rangeMedian((result) => result.absoluteEstimate.ipdMm),
      outerCanthiMm: rangeMedian((result) => result.absoluteEstimate.outerCanthiMm),
      faceWidthMm: rangeMedian((result) => result.absoluteEstimate.faceWidthMm),
    },
  };
}

export class FaceFitStabilityTracker {
  private readonly windowSize: number;
  private readonly minSamples: number;
  private readonly stableDurationMs: number;
  private readonly maxRelativeDeviation: number;
  private readonly madMultiplier: number;
  private samples: Sample[] = [];
  private stableSinceMs: number | null = null;

  constructor(options: FaceFitStabilityOptions = {}) {
    this.windowSize = options.windowSize ?? FACE_FIT_THRESHOLDS.stabilityWindowSize;
    this.minSamples = options.minSamples ?? FACE_FIT_THRESHOLDS.stabilityMinSamples;
    this.stableDurationMs =
      options.stableDurationMs ?? FACE_FIT_THRESHOLDS.stabilityDurationMs;
    this.maxRelativeDeviation =
      options.maxRelativeDeviation ?? FACE_FIT_THRESHOLDS.stabilityMaxRelativeDeviation;
    this.madMultiplier = options.madMultiplier ?? FACE_FIT_THRESHOLDS.stabilityMadMultiplier;
  }

  reset(): void {
    this.samples = [];
    this.stableSinceMs = null;
  }

  push(result: FaceFitResult, atMs: number): FaceFitStabilityUpdate {
    if (result.status === 'rejected') {
      this.reset();
      return { state: 'collecting', result };
    }

    const primaryValues = this.samples.map(
      ({ result: sample }) => sample.ratios.ipdToFaceWidth,
    );
    if (primaryValues.length >= this.minSamples) {
      const center = median(primaryValues);
      const mad = medianAbsoluteDeviation(primaryValues);
      const delta = Math.abs(result.ratios.ipdToFaceWidth - center);
      const robustLimit = Math.max(
        center * this.maxRelativeDeviation,
        mad * this.madMultiplier,
      );
      if (delta > robustLimit) {
        this.reset();
        return { state: 'collecting', result: withTemporalState(result, 'collecting') };
      }
    }

    this.samples.push({ atMs, result });
    if (this.samples.length > this.windowSize) this.samples.shift();
    if (this.samples.length < this.minSamples) {
      this.stableSinceMs = null;
      return { state: 'collecting', result: withTemporalState(result, 'collecting') };
    }

    const trackedSeries = [
      this.samples.map(({ result: sample }) => sample.ratios.ipdToFaceWidth),
      this.samples.map(({ result: sample }) => sample.ratios.canthiToFaceWidth),
      this.samples.map(({ result: sample }) => sample.measurements.irisCenterSpanPx),
    ];
    const stable = trackedSeries.every(
      (values) => relativeDeviation(values) <= this.maxRelativeDeviation,
    );
    if (!stable) {
      this.stableSinceMs = null;
      return { state: 'stabilizing', result: withTemporalState(result, 'stabilizing') };
    }
    this.stableSinceMs ??= atMs;
    const state =
      atMs - this.stableSinceMs >= this.stableDurationMs ? 'ready' : 'stabilizing';
    const robustResult = medianResult(this.samples, result);
    return { state, result: withTemporalState(robustResult, state) };
  }
}

