/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import type { WardrobeItem } from '@/shared/types';
import {
  pickAlternateGlasses,
  pickFeaturedGlasses,
  pickShopStrip,
} from './eyewearShop';

const glasses = (id: string): WardrobeItem => ({
  id,
  name: id,
  url: `/g/${id}.svg`,
  category: 'glasses',
});

const top = (id: string): WardrobeItem => ({
  id,
  name: id,
  url: `/g/${id}.png`,
  category: 'tops',
});

describe('eyewearShop', () => {
  const catalog = [
    glasses('frame-a'),
    glasses('frame-b'),
    glasses('frame-c'),
    glasses('frame-d'),
    glasses('frame-e'),
    glasses('frame-f'),
    top('shirt'),
  ];

  it('picks the first glasses item as featured', () => {
    expect(pickFeaturedGlasses(catalog)?.id).toBe('frame-a');
  });

  it('falls back to non-glasses wardrobe when no frames exist', () => {
    expect(pickFeaturedGlasses([top('only')])?.id).toBe('only');
    expect(pickFeaturedGlasses([])).toBeNull();
  });

  it('lists alternate frames excluding featured', () => {
    expect(pickAlternateGlasses(catalog, 'frame-a', 3).map((i) => i.id)).toEqual([
      'frame-b',
      'frame-c',
      'frame-d',
    ]);
  });

  it('builds a strip with featured first then alts', () => {
    expect(pickShopStrip(catalog, 'frame-c', 4).map((i) => i.id)).toEqual([
      'frame-c',
      'frame-a',
      'frame-b',
      'frame-d',
    ]);
  });

  it('prefers retail JPG frames over SVG wireframes', () => {
    const mixed: WardrobeItem[] = [
      {
        id: 'frame-narrow-14',
        name: 'Narrow',
        url: '/garments/eyewear/glasses/frame-narrow-14.svg',
        category: 'glasses',
      },
      {
        id: 'frame-classic-01',
        name: 'Savita',
        url: '/garments/eyewear/glasses/frame-classic-01.jpg',
        category: 'glasses',
      },
      {
        id: 'frame-thin-02',
        name: 'Metal',
        url: '/garments/eyewear/glasses/frame-thin-02.jpg',
        category: 'glasses',
      },
      top('shirt'),
    ];
    expect(pickFeaturedGlasses(mixed)?.id).toBe('frame-classic-01');
    expect(pickAlternateGlasses(mixed, 'frame-classic-01').map((i) => i.id)).toEqual([
      'frame-thin-02',
    ]);
  });
});
