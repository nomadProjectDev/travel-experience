/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Eyewear shop entry helpers — featured PDP frame + alternate picks.
 */

import type { WardrobeItem } from '@/shared/types';
import { preferRetailPhotoFrames } from '@/features/studio/stylistRecommend';

const ALT_LIMIT = 5;

const glassesPool = (wardrobe: WardrobeItem[]): WardrobeItem[] => {
  const glasses = wardrobe.filter((item) => item.category === 'glasses');
  return glasses.length > 0 ? preferRetailPhotoFrames(glasses) : wardrobe;
};

/** First glasses item in wardrobe order (featured PDP). Prefers retail photos. */
export function pickFeaturedGlasses(wardrobe: WardrobeItem[]): WardrobeItem | null {
  return glassesPool(wardrobe)[0] ?? null;
}

/** Alternate frames for the PDP strip (excludes featured; catalog order). */
export function pickAlternateGlasses(
  wardrobe: WardrobeItem[],
  featuredId: string,
  limit = ALT_LIMIT,
): WardrobeItem[] {
  return glassesPool(wardrobe)
    .filter((item) => item.id !== featuredId)
    .slice(0, limit);
}

/** Featured + a few neighbors for the strip (featured first, then alts). */
export function pickShopStrip(
  wardrobe: WardrobeItem[],
  featuredId: string,
  limit = ALT_LIMIT,
): WardrobeItem[] {
  const pool = glassesPool(wardrobe);
  const featured = pool.find((item) => item.id === featuredId);
  const alts = pickAlternateGlasses(wardrobe, featuredId, Math.max(0, limit - 1));
  return featured ? [featured, ...alts] : alts;
}
