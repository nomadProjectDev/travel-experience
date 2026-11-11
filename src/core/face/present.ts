/** Safe presentation boundary for relative face-fit estimates. */

import type { FaceFitResult, SafeFaceFitContext } from './types';

/** Stable keys mapped to `captureChrome.faceFitPanel.metrics.*` in copy. */
export type FaceFitMetricKey =
  | 'ipd'
  | 'outerCanthi'
  | 'faceWidth'
  | 'ipdRatio'
  | 'canthiRatio'
  | 'yaw'
  | 'pitch';

export interface FaceFitMetricRow {
  key: FaceFitMetricKey;
  /** Formatted relative value (px, ratio, or pose degrees). */
  value: string;
}

export type FaceFitMetricPresentation =
  | { kind: 'none'; rows: [] }
  | { kind: 'preliminary' | 'official'; rows: FaceFitMetricRow[] };

export function formatPx(px: number): string {
  return `${px.toFixed(1)} px`;
}

export function formatRatio(ratio: number): string {
  return ratio.toFixed(3);
}

export function formatPoseDeg(deg: number): string {
  const sign = deg > 0 ? '+' : '';
  return `${sign}${deg.toFixed(0)}°`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(record);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Runtime boundary for future recommendation and prompt consumers.
 * Exact-key checks reject full metrics objects and unsafe field injection.
 */
export function assertSafeFaceFitContext(
  value: unknown,
): asserts value is SafeFaceFitContext {
  if (!isRecord(value) || value.schemaVersion !== 2 || typeof value.status !== 'string') {
    throw new Error('Unsafe face-fit context');
  }
  if (value.status === 'rejected') {
    if (!hasExactKeys(value, ['schemaVersion', 'status'])) {
      throw new Error('Unsafe face-fit context');
    }
    return;
  }
  if (
    (value.status !== 'valid' && value.status !== 'limited') ||
    !hasExactKeys(value, [
      'schemaVersion',
      'status',
      'ipdToFaceWidth',
      'outerCanthiToFaceWidth',
    ]) ||
    !isFiniteNumber(value.ipdToFaceWidth) ||
    !isFiniteNumber(value.outerCanthiToFaceWidth)
  ) {
    throw new Error('Unsafe face-fit context');
  }
}

/**
 * Explicit whitelist from internal metrics to public/prompt-safe context.
 * Pixels, mm, pose, quality, confidence, landmarks, and experimental fields
 * cannot cross this map.
 */
export function buildSafeFaceFitContext(result: FaceFitResult): SafeFaceFitContext {
  const context: SafeFaceFitContext =
    result.status === 'rejected'
      ? {
          schemaVersion: 2,
          status: 'rejected',
        }
      : {
          schemaVersion: 2,
          status: result.status,
          ipdToFaceWidth: result.ratios.ipdToFaceWidth,
          outerCanthiToFaceWidth: result.ratios.canthiToFaceWidth,
        };
  assertSafeFaceFitContext(context);
  return context;
}

export function formatFaceFitHud(result: FaceFitResult): string {
  if (result.status === 'rejected') return '';
  const span = `Iris ${result.measurements.irisCenterSpanPx.toFixed(1)}px`;
  const yaw = result.quality.pose ? ` · yaw ${result.quality.pose.yawDeg.toFixed(0)}°` : '';
  return `${span}${yaw}`;
}

/** Ordered rows for the expandable estimated-analysis panel. */
export function buildFaceFitMetricRows(result: FaceFitResult): FaceFitMetricRow[] {
  if (result.status === 'rejected') return [];
  const rows: FaceFitMetricRow[] = [
    {
      key: 'ipd',
      value: formatPx(result.measurements.irisCenterSpanPx),
    },
    {
      key: 'outerCanthi',
      value: formatPx(result.measurements.outerCanthiSpanPx),
    },
    {
      key: 'faceWidth',
      value: formatPx(result.measurements.faceWidthProxyPx),
    },
    {
      key: 'ipdRatio',
      value: formatRatio(result.ratios.ipdToFaceWidth),
    },
    {
      key: 'canthiRatio',
      value: formatRatio(result.ratios.canthiToFaceWidth),
    },
  ];

  if (result.quality.pose) {
    rows.push(
      {
        key: 'yaw',
        value: formatPoseDeg(result.quality.pose.yawDeg),
      },
      {
        key: 'pitch',
        value: formatPoseDeg(result.quality.pose.pitchDeg),
      },
    );
  }

  return rows;
}

/**
 * Maps only the supplied frame to public rows. Callers must pass the current
 * result; rejected/null frames deliberately produce no fallback values.
 */
export function buildFaceFitMetricPresentation(
  result: FaceFitResult | null,
  official: boolean,
): FaceFitMetricPresentation {
  if (!result || result.status === 'rejected') return { kind: 'none', rows: [] };
  return {
    kind: official ? 'official' : 'preliminary',
    rows: buildFaceFitMetricRows(result),
  };
}
