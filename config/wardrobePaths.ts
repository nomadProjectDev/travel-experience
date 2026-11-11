/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WardrobeItem } from './types';

/** Build a garment public URL scoped to a client pack. */
export function garmentUrl(
  clientId: string,
  category: WardrobeItem['category'],
  file: string,
): string {
  return `/garments/${clientId}/${category}/${file}`;
}
