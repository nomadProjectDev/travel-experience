/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type { WardrobeItem } from '@config/types';

export interface OutfitLayer {
  garment: import('@config/types').WardrobeItem | null;
  imageUrl: string;
  hidden?: boolean;
  slot?: import('@config/types').WardrobeItem['category'] | 'base';
}
