import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CLAY_EFFECTS,
  DEFAULT_CLAY_EFFECT_ID,
  effectsInGroup,
  getClayEffect,
} from './effects';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

const FORBIDDEN_NEGATIVE_LEAKAGE_NOUNS =
  /\b(glasses|sunglasses|eyewear|beard|moustache|mustache|makeup|face|facial|mask|omitReferenceImage)\b/i;
const FORBIDDEN_NEGATIVE_CONSTRUCTIONS =
  /\b(add no|no glasses|without|do not|don't|never|reference image|reference photo|reference still)\b/i;

describe('travel experience VTON catalog', () => {
  it('keeps México hombre as the catalog fallback, in the approved poster order', () => {
    expect(DEFAULT_CLAY_EFFECT_ID).toBe('mexico-hombre');
    expect(CLAY_EFFECTS.map((effect) => effect.id)).toEqual([
      'mexico-hombre',
      'mexico-mujer',
      'peru-hombre',
      'peru-mujer',
      'colombia-arriero',
      'colombia-chapolera',
      'argentina-hombre',
      'argentina-mujer',
      'chile-hombre',
      'chile-mujer',
      'puerto-rico-rojo-amarillo',
      'puerto-rico-azul-verde',
    ]);
    expect(CLAY_EFFECTS.map((effect) => effect.name)).toEqual([
      'México · Hombre',
      'México · Mujer',
      'Perú · Hombre',
      'Perú · Mujer',
      'Colombia · Arriero',
      'Colombia · Chapolera',
      'Argentina · Hombre',
      'Argentina · Mujer',
      'Chile · Hombre',
      'Chile · Mujer',
      'Puerto Rico · Rojo / Amarillo',
      'Puerto Rico · Azul / Verde',
    ]);
  });

  it('pairs every look with an existing UI card PNG and a verified <400 KB clean garment WebP plate', () => {
    const ids = new Set<string>();
    for (const effect of CLAY_EFFECTS) {
      expect(ids.has(effect.id)).toBe(false);
      ids.add(effect.id);
      expect(effect.group).toBe('restyle');
      expect('omitReferenceImage' in effect).toBe(false);

      expect(effect.referenceImage.src).toBe(
        `/brand/travel-experience/effects/${effect.id}.png`,
      );
      expect(effect.garmentImagePath).toBe(
        `/brand/travel-experience/garments/${effect.id}.webp`,
      );

      const cardDiskPath = path.join(projectRoot, 'public', effect.referenceImage.src);
      const garmentDiskPath = path.join(projectRoot, 'public', effect.garmentImagePath);
      expect(existsSync(cardDiskPath)).toBe(true);
      expect(existsSync(garmentDiskPath)).toBe(true);

      const cardStat = statSync(cardDiskPath);
      const garmentStat = statSync(garmentDiskPath);
      expect(cardStat.size).toBeGreaterThan(0);
      expect(garmentStat.size).toBeGreaterThan(10 * 1024);
      expect(garmentStat.size).toBeLessThan(400 * 1024);
    }

    expect(effectsInGroup('restyle')).toHaveLength(12);
    expect(getClayEffect('nope').id).toBe('mexico-hombre');
  });

  it('uses concise, purely positive canonical VTON prompts with zero negative-leakage facial nouns', () => {
    for (const effect of CLAY_EFFECTS) {
      const prompt = effect.prompt.trim();
      const words = prompt.split(/\s+/);

      expect(prompt.startsWith('Substitute the outfit with ')).toBe(true);
      expect(prompt.endsWith('.')).toBe(true);
      expect(words.length).toBeGreaterThanOrEqual(25);
      expect(words.length).toBeLessThanOrEqual(45);
      expect(prompt.length).toBeLessThanOrEqual(400);

      expect(prompt).not.toMatch(FORBIDDEN_NEGATIVE_LEAKAGE_NOUNS);
      expect(prompt).not.toMatch(FORBIDDEN_NEGATIVE_CONSTRUCTIONS);
    }

    expect(getClayEffect('puerto-rico-rojo-amarillo').prompt).toMatch(/vejigante fustán/i);
    expect(getClayEffect('puerto-rico-azul-verde').prompt).toMatch(/vejigante fustán/i);
  });
});
