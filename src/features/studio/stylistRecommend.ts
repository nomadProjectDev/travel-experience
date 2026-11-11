/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Eyewear stylist recommender — uses catalog `eyewear` meta when present.
 * Diversity-aware: prefers contrasting shape/material vs active + last shown.
 * Optional prefs filter (shape / material / weight).
 */

import type {
  EyewearMaterial,
  EyewearMeta,
  EyewearShape,
  EyewearWeight,
  WardrobeItem,
} from '@config/types';

export interface StylistRecommendation {
  item: WardrobeItem;
  reason: string;
}

/** Optional filters from voice / UI prefs — OR within each dimension. */
export interface EyewearStylistPrefs {
  shapes?: EyewearShape[];
  materials?: EyewearMaterial[];
  weights?: EyewearWeight[];
}

/** Face-aware short whys — used only when catalog lacks stylistReason. */
const SHAPE_WHY: Record<EyewearShape, string> = {
  oval: 'Suaviza y ovala tu rostro',
  round: 'Equilibra mandíbulas marcadas',
  square: 'Afina un óvalo más suave',
  rectangle: 'Aporta estructura limpia',
  aviator: 'Afirma sin añadir volumen',
  'cat-eye': 'Alarga la línea de la mirada',
  geometric: 'Da carácter geométrico al rostro',
  browline: 'Eleva la atención a los ojos',
};

const FALLBACK_REASONS = [
  'Otra forma para probar',
  'Contraste limpio con tu look',
  'Alternativa clara de montura',
] as const;

const reasonFor = (item: WardrobeItem, index: number): string => {
  if (item.eyewear?.stylistReason) return item.eyewear.stylistReason;
  const shape = item.eyewear?.shape;
  if (shape && SHAPE_WHY[shape]) return SHAPE_WHY[shape];
  return FALLBACK_REASONS[index % FALLBACK_REASONS.length];
};

const metaKey = (meta: EyewearMeta | undefined): string =>
  meta ? `${meta.shape}:${meta.material}:${meta.weight}` : 'unknown';

const diversityScore = (
  candidate: WardrobeItem,
  referenceMeta: Array<EyewearMeta | undefined>,
): number => {
  const meta = candidate.eyewear;
  if (!meta) return 0;
  let score = 0;
  for (const ref of referenceMeta) {
    if (!ref) continue;
    if (meta.shape !== ref.shape) score += 3;
    if (meta.material !== ref.material) score += 2;
    if (meta.weight !== ref.weight) score += 1;
  }
  // Mild preference for light frames as first optical try-on (comfort / face-first).
  if (meta.weight === 'light') score += 1;
  if (meta.weight === 'bold') score -= 0.25;
  return score;
};

const idSalt = (id: string, nonce: number): number =>
  id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) + nonce * 17;

const prefsHaveFilters = (prefs: EyewearStylistPrefs | undefined): boolean =>
  Boolean(
    prefs &&
      ((prefs.shapes && prefs.shapes.length > 0) ||
        (prefs.materials && prefs.materials.length > 0) ||
        (prefs.weights && prefs.weights.length > 0)),
  );

const matchesPrefs = (item: WardrobeItem, prefs: EyewearStylistPrefs): boolean => {
  const meta = item.eyewear;
  if (!meta) return false;
  const shapeOk =
    !prefs.shapes?.length || prefs.shapes.includes(meta.shape);
  const materialOk =
    !prefs.materials?.length || prefs.materials.includes(meta.material);
  const weightOk =
    !prefs.weights?.length || prefs.weights.includes(meta.weight);
  return shapeOk && materialOk && weightOk;
};

/** Retail product photo (not SVG wireframe) — IA rails must use these. */
export const hasRetailPhotoUrl = (url: string): boolean =>
  /\.(jpe?g|png|webp)($|\?)/i.test(url);

/**
 * Prefer frames with real product photos. When any photo exists in the pool,
 * drop SVG wireframes entirely so IA / cross-sell never show blank plates or
 * cropped vector arcs.
 */
export const preferRetailPhotoFrames = (
  items: WardrobeItem[],
): WardrobeItem[] => {
  const photos = items.filter((item) => hasRetailPhotoUrl(item.url));
  return photos.length > 0 ? photos : items;
};

/** Pick up to `limit` glasses frames, excluding current + recently shown. */
export const recommendGlasses = ({
  wardrobe,
  excludeIds = [],
  limit = 2,
  prefs,
}: {
  wardrobe: WardrobeItem[];
  excludeIds?: ReadonlyArray<string>;
  limit?: number;
  prefs?: EyewearStylistPrefs;
}): StylistRecommendation[] => {
  const excluded = new Set(excludeIds);
  const glasses = preferRetailPhotoFrames(
    wardrobe.filter((item) => item.category === 'glasses'),
  );
  const available = glasses.filter((item) => !excluded.has(item.id));
  const basePool = available.length > 0 ? available : glasses;
  if (basePool.length === 0) return [];

  const filtered =
    prefsHaveFilters(prefs) && prefs
      ? basePool.filter((item) => matchesPrefs(item, prefs))
      : basePool;
  // Prefer matching prefs; if empty, fall back to unfiltered diversity.
  const source = filtered.length > 0 ? filtered : basePool;

  const referenceMeta = glasses
    .filter((item) => excluded.has(item.id))
    .map((item) => item.eyewear);

  const ranked = [...source].sort((a, b) => {
    const div =
      diversityScore(b, referenceMeta) - diversityScore(a, referenceMeta);
    if (div !== 0) return div;
    // Stable tie-break that still rotates when excludeIds grow (refresh).
    return idSalt(a.id, excludeIds.length) - idSalt(b.id, excludeIds.length);
  });

  const picked: WardrobeItem[] = [];
  const seenKeys = new Set<string>();

  for (const item of ranked) {
    if (picked.length >= limit) break;
    const key = metaKey(item.eyewear);
    // Prefer distinct shape/material pairs in the same tip strip.
    if (item.eyewear && seenKeys.has(key) && ranked.length > limit) continue;
    picked.push(item);
    if (item.eyewear) seenKeys.add(key);
  }

  // If diversity filter was too strict, fill remaining slots.
  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (!picked.includes(item)) picked.push(item);
  }

  return picked.map((item, index) => ({
    item,
    reason: reasonFor(item, index),
  }));
};
