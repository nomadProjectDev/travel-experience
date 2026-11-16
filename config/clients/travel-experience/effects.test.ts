import { describe, expect, it } from 'vitest';
import {
  CLAY_EFFECTS,
  DEFAULT_CLAY_EFFECT_ID,
  effectsInGroup,
  getClayEffect,
} from './effects';

describe('travel experience catalog', () => {
  it('opens on México hombre, in the approved poster order', () => {
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

  it('keeps a reference still and a short prompt on every look', () => {
    const ids = new Set<string>();
    for (const effect of CLAY_EFFECTS) {
      expect(ids.has(effect.id)).toBe(false);
      ids.add(effect.id);
      expect(effect.group).toBe('restyle');
      expect(effect.prompt.startsWith('Replace the full background with ')).toBe(true);
      expect(effect.prompt).toMatch(/reference image/i);
      expect(effect.prompt).toMatch(/facial identity/i);
      expect(effect.prompt.split(/\s+/).length).toBeLessThanOrEqual(55);
      expect(effect.prompt.length).toBeLessThanOrEqual(400);
      expect(effect.referenceImage?.src).toBe(
        `/brand/travel-experience/effects/${effect.id}.png`,
      );
    }
    expect(effectsInGroup('restyle')).toHaveLength(12);
    expect(getClayEffect('nope').id).toBe('mexico-hombre');
  });
});
