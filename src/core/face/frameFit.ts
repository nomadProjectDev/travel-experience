export type CommercialFrameSize = 'XS' | 'S' | 'M' | 'L' | 'XL';
export type FrameShape =
  | 'aviator'
  | 'browline'
  | 'cat-eye'
  | 'geometric'
  | 'oval'
  | 'rectangle'
  | 'round'
  | 'square'
  | 'wayfarer';
export type FrameSupportType =
  | 'adjustable-nose-pads'
  | 'integrated-acetate-bridge'
  | 'keyhole-bridge'
  | 'saddle-bridge'
  | 'unknown';
export type FrameWrapCategory = 'flat' | 'low' | 'medium' | 'high' | 'unknown';
export type MeasurementSourceKind =
  | 'manufacturer'
  | 'authorized-retailer'
  | 'retailer';
export type CatalogMeasurementMatch = 'exact' | 'analogue' | 'unverified';
export type PublishedMeasurementField =
  | 'aLensWidthMm'
  | 'bLensHeightMm'
  | 'dblMm'
  | 'templeLengthMm'
  | 'totalFrontWidthMm'
  | 'commercialSize';

export interface FrameMeasurementProvenance {
  sourceKind: MeasurementSourceKind;
  sourceLabel: string;
  /** Human-readable description of exactly what the cited page publishes. */
  statement: string;
  /** Measurement fields directly supported by the cited source. */
  supportedFields: readonly PublishedMeasurementField[];
  accessedOn: string;
}

/**
 * Independent, published frame specification. `totalFrontWidthMm` is nullable
 * because A + DBL is not total front width and must never be substituted for it.
 */
export interface PublishedFrame {
  id: string;
  sku: string;
  /** Exact local catalog identity join; model, variant, and size must all match. */
  wardrobeItemId?: string;
  /** Representative local catalog join only; never an exact product identity. */
  wardrobeAnalogueId?: string;
  catalogMatch: CatalogMeasurementMatch;
  brand: string;
  model: string;
  aLensWidthMm: number;
  bLensHeightMm: number | null;
  dblMm: number;
  templeLengthMm: number;
  totalFrontWidthMm: number | null;
  shape: FrameShape;
  supportType: FrameSupportType;
  wrapCategory: FrameWrapCategory;
  commercialSize: CommercialFrameSize;
  sourceUrl: string;
  provenance: FrameMeasurementProvenance;
  notes?: string;
}

export type PublicPocWidthStratum =
  | 'lower-width-cohort'
  | 'middle-width-cohort'
  | 'upper-width-cohort';

/**
 * Exact public product evidence used only for physical-size validation.
 * `catalogMatch` remains `unverified` until the local wardrobe carries the
 * same product, variant, and size identity.
 */
export interface PublicPocFrameMeasurement extends PublishedFrame {
  catalogMatch: 'unverified';
  evidenceClass: 'exact';
  variantId: string;
  color: string;
  sizeVariant: string;
  publishedSizeLabel?: string;
  pocWidthStratum: PublicPocWidthStratum;
  /** Research metadata only; never a production/hotlinked wardrobe asset. */
  productImageUrl?: string;
}

/**
 * This module deliberately validates catalog facts only. SafeFaceFitContext
 * contains scale-free ratios, so it cannot select or rank physical S/M/L,
 * total-width, bridge, or temple fit without a separately validated absolute
 * face-size signal.
 */
function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function assertPublishedFrame(frame: PublishedFrame): void {
  const catalogMatches: readonly CatalogMeasurementMatch[] = [
    'exact',
    'analogue',
    'unverified',
  ];
  const supportedFields = new Set(frame.provenance?.supportedFields ?? []);
  const requiredProvenanceFields: PublishedMeasurementField[] = [
    'aLensWidthMm',
    'dblMm',
    'templeLengthMm',
  ];
  if (frame.bLensHeightMm !== null) {
    requiredProvenanceFields.push('bLensHeightMm');
  }
  if (frame.totalFrontWidthMm !== null) {
    requiredProvenanceFields.push('totalFrontWidthMm');
  }
  if (
    !isNonEmptyString(frame.id) ||
    !isNonEmptyString(frame.sku) ||
    !catalogMatches.includes(frame.catalogMatch) ||
    (frame.wardrobeItemId !== undefined &&
      !isNonEmptyString(frame.wardrobeItemId)) ||
    (frame.wardrobeAnalogueId !== undefined &&
      !isNonEmptyString(frame.wardrobeAnalogueId)) ||
    (frame.catalogMatch === 'exact' &&
      (!frame.wardrobeItemId || frame.wardrobeAnalogueId !== undefined)) ||
    (frame.catalogMatch === 'analogue' &&
      (!frame.wardrobeAnalogueId || frame.wardrobeItemId !== undefined)) ||
    (frame.catalogMatch === 'unverified' &&
      (frame.wardrobeItemId !== undefined ||
        frame.wardrobeAnalogueId !== undefined)) ||
    !isNonEmptyString(frame.brand) ||
    !isNonEmptyString(frame.model) ||
    !isPositiveFinite(frame.aLensWidthMm) ||
    (frame.bLensHeightMm !== null && !isPositiveFinite(frame.bLensHeightMm)) ||
    !isPositiveFinite(frame.dblMm) ||
    !isPositiveFinite(frame.templeLengthMm) ||
    (frame.totalFrontWidthMm !== null &&
      !isPositiveFinite(frame.totalFrontWidthMm)) ||
    !isNonEmptyString(frame.sourceUrl) ||
    !isHttpUrl(frame.sourceUrl) ||
    !frame.provenance ||
    !isNonEmptyString(frame.provenance.sourceLabel) ||
    !isNonEmptyString(frame.provenance.statement) ||
    !isNonEmptyString(frame.provenance.accessedOn) ||
    frame.provenance.supportedFields.length === 0 ||
    requiredProvenanceFields.some((field) => !supportedFields.has(field))
  ) {
    throw new Error(`Invalid published frame: ${frame.id || frame.sku || 'unknown'}`);
  }
}

export function assertPublicPocFrameMeasurement(
  frame: PublicPocFrameMeasurement,
): void {
  assertPublishedFrame(frame);
  if (
    frame.catalogMatch !== 'unverified' ||
    frame.evidenceClass !== 'exact' ||
    !isNonEmptyString(frame.variantId) ||
    !isNonEmptyString(frame.color) ||
    !isNonEmptyString(frame.sizeVariant) ||
    frame.totalFrontWidthMm === null ||
    frame.provenance.accessedOn !== '2026-09-03' ||
    (frame.productImageUrl !== undefined && !isHttpUrl(frame.productImageUrl))
  ) {
    throw new Error(
      `Invalid public PoC frame: ${frame.id || frame.sku || 'unknown'}`,
    );
  }
}
