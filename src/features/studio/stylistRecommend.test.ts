import { describe, expect, it } from 'vitest';
import type { WardrobeItem } from '@/shared/types';
import {
  hasRetailPhotoUrl,
  preferRetailPhotoFrames,
  recommendGlasses,
} from './stylistRecommend';

const frame = (
  id: string,
  name: string,
  eyewear: NonNullable<WardrobeItem['eyewear']>,
  ext: 'svg' | 'jpg' = 'svg',
): WardrobeItem => ({
  id,
  name,
  url: `/garments/eyewear/glasses/${id}.${ext}`,
  category: 'glasses',
  eyewear,
});

const catalog: WardrobeItem[] = [
  frame('a', 'Classic acetate', {
    shape: 'rectangle',
    material: 'acetate',
    weight: 'bold',
    stylistReason: 'Bold acetate',
  }),
  frame('b', 'Thin metal', {
    shape: 'oval',
    material: 'metal',
    weight: 'light',
    stylistReason: 'Light metal',
  }),
  frame('c', 'City square', {
    shape: 'square',
    material: 'acetate',
    weight: 'medium',
    stylistReason: 'Square structure',
  }),
  frame('d', 'Wire micro', {
    shape: 'oval',
    material: 'metal',
    weight: 'light',
    stylistReason: 'Wire light',
  }),
  frame('e', 'Aviator titan', {
    shape: 'aviator',
    material: 'titanium',
    weight: 'light',
    stylistReason: 'Aviator titan',
  }),
  frame('f', 'Round rimless', {
    shape: 'round',
    material: 'rimless',
    weight: 'light',
    stylistReason: 'Round air',
  }),
];

describe('hasRetailPhotoUrl / preferRetailPhotoFrames', () => {
  it('detects jpg/png/webp and rejects svg', () => {
    expect(hasRetailPhotoUrl('/x.jpg')).toBe(true);
    expect(hasRetailPhotoUrl('/x.jpeg?v=1')).toBe(true);
    expect(hasRetailPhotoUrl('/x.png')).toBe(true);
    expect(hasRetailPhotoUrl('/x.webp')).toBe(true);
    expect(hasRetailPhotoUrl('/x.svg')).toBe(false);
  });

  it('drops SVG when any retail photo exists', () => {
    const mixed = [
      frame('svg-only', 'Wire', {
        shape: 'oval',
        material: 'metal',
        weight: 'light',
      }),
      frame(
        'photo',
        'Savita',
        { shape: 'oval', material: 'acetate', weight: 'medium' },
        'jpg',
      ),
    ];
    const preferred = preferRetailPhotoFrames(mixed);
    expect(preferred).toHaveLength(1);
    expect(preferred[0]?.id).toBe('photo');
  });

  it('keeps SVG pool when no photos exist', () => {
    expect(preferRetailPhotoFrames(catalog)).toHaveLength(catalog.length);
  });
});

describe('recommendGlasses', () => {
  it('returns only legacy style reasons and no physical-fit signal', () => {
    const recs = recommendGlasses({
      wardrobe: catalog,
      excludeIds: ['a'],
      limit: 3,
    });
    expect(recs).toHaveLength(3);
    expect(recs.every((rec) => !Object.hasOwn(rec, 'fit'))).toBe(true);
  });

  it('returns up to two glasses with catalog reasons', () => {
    const recs = recommendGlasses({ wardrobe: catalog, limit: 2 });
    expect(recs).toHaveLength(2);
    expect(recs[0]?.reason.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.item.category === 'glasses')).toBe(true);
  });

  it('excludes active ids and prefers diversity vs worn meta', () => {
    const recs = recommendGlasses({
      wardrobe: catalog,
      excludeIds: ['a'],
      limit: 2,
    });
    expect(recs.every((r) => r.item.id !== 'a')).toBe(true);
    // After bold acetate, prefer a contrasting light/metal or different shape.
    const shapes = new Set(recs.map((r) => r.item.eyewear?.shape));
    const materials = new Set(recs.map((r) => r.item.eyewear?.material));
    expect(shapes.size + materials.size).toBeGreaterThan(2);
  });

  it('uses eyewear.stylistReason when present', () => {
    const recs = recommendGlasses({
      wardrobe: catalog,
      excludeIds: ['a', 'c', 'd', 'e', 'f'],
      limit: 1,
    });
    expect(recs[0]?.reason).toBe('Light metal');
  });

  it('falls back to face-aware shape why when stylistReason is missing', () => {
    const noReason: WardrobeItem = {
      id: 'bare-round',
      name: 'Bare round',
      url: '/x.svg',
      category: 'glasses',
      eyewear: { shape: 'round', material: 'acetate', weight: 'medium' },
    };
    const recs = recommendGlasses({ wardrobe: [noReason], limit: 1 });
    expect(recs[0]?.reason).toBe('Equilibra mandíbulas marcadas');
  });

  it('filters by prefs when matches exist', () => {
    const recs = recommendGlasses({
      wardrobe: catalog,
      prefs: { shapes: ['square'] },
      limit: 2,
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.item.eyewear?.shape === 'square')).toBe(true);
  });

  it('falls back to unfiltered pool when prefs match nothing', () => {
    const recs = recommendGlasses({
      wardrobe: catalog,
      prefs: { shapes: ['geometric'] },
      limit: 2,
    });
    expect(recs).toHaveLength(2);
    expect(recs.every((r) => r.item.category === 'glasses')).toBe(true);
  });

  it('combines material + weight prefs', () => {
    const recs = recommendGlasses({
      wardrobe: catalog,
      prefs: { materials: ['metal'], weights: ['light'] },
      limit: 2,
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(
      recs.every(
        (r) =>
          r.item.eyewear?.material === 'metal' &&
          r.item.eyewear?.weight === 'light',
      ),
    ).toBe(true);
  });

  it('recommends only retail photo frames when JPGs exist', () => {
    const mixed: WardrobeItem[] = [
      frame(
        'frame-classic-01',
        'Savita sol',
        { shape: 'oval', material: 'acetate', weight: 'medium' },
        'jpg',
      ),
      frame(
        'frame-thin-02',
        'Metal fino',
        { shape: 'oval', material: 'metal', weight: 'light' },
        'jpg',
      ),
      frame(
        'frame-aviator-05',
        'Aviador gleam',
        { shape: 'aviator', material: 'metal', weight: 'light' },
        'jpg',
      ),
      frame('frame-narrow-14', 'Narrow lane', {
        shape: 'rectangle',
        material: 'metal',
        weight: 'light',
      }),
      frame('frame-club-13', 'Clubmaster vibe', {
        shape: 'browline',
        material: 'mixed',
        weight: 'medium',
      }),
    ];
    const recs = recommendGlasses({
      wardrobe: mixed,
      excludeIds: ['frame-classic-01'],
      limit: 3,
    });
    expect(recs).toHaveLength(2);
    expect(recs.every((r) => hasRetailPhotoUrl(r.item.url))).toBe(true);
    expect(recs.every((r) => !r.item.url.endsWith('.svg'))).toBe(true);
  });
});
