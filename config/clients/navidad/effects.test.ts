import { describe, expect, it } from 'vitest';
import {
  CLAY_EFFECTS,
  DEFAULT_CLAY_EFFECT_ID,
  effectsInGroup,
  getClayEffect,
} from './effects';

const BREAKS_CLAY_STYLE =
  /realistic|photoreal|plastic building bricks|minifigure|slime|flame|laser|spider|smoke|blocky game/i;

/**
 * Words that trigger unwanted facial accessories in diffusion models even when
 * negated ("do not add glasses"). Keep them completely absent from every prompt.
 */
const HALLUCINATION_TRIGGER_WORDS =
  /\b(glasses|eyeglasses|sunglasses|spectacles|goggles|monocle|earrings|piercings|freckles|makeup|puppet)\b/i;

describe('clay effect catalog', () => {
  it('replaces the real background via Set the background + Swap outfit without face-accessory triggers', () => {
    expect(DEFAULT_CLAY_EFFECT_ID).toBe('duende');

    const ids = new Set<string>();
    for (const effect of CLAY_EFFECTS) {
      expect(ids.has(effect.id)).toBe(false);
      ids.add(effect.id);
      expect(effect.group).toBe('restyle');
      expect(effect.name.trim().length).toBeGreaterThan(0);

      const words = effect.prompt.trim().split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(45);
      expect(words).toBeLessThanOrEqual(95);
      expect(effect.prompt.length).toBeLessThanOrEqual(750);

      expect(effect.prompt.startsWith('Set the background to ')).toBe(true);
      expect(effect.prompt).toContain("swap the person's outfit for ");
      expect(effect.prompt).toContain(
        'and render the person in stop-motion plasticine claymation.',
      );
      expect(effect.prompt).toContain('filling the entire background,');
      expect(effect.prompt).toContain(
        'with the same person in the foreground with their natural face in smooth clay, wearing ',
      );
      // Avoid `restyle the scene` which keeps real-world walls/room structure
      expect(effect.prompt).not.toMatch(/restyle the (entire )?scene/i);

      expect(effect.prompt).not.toMatch(BREAKS_CLAY_STYLE);
      expect(effect.prompt).not.toMatch(HALLUCINATION_TRIGGER_WORDS);

      if (effect.id === 'noel') {
        expect(effect.prompt).toMatch(/white plasticine Santa beard/);
      } else {
        expect(effect.prompt).not.toMatch(/\b(beard|mustache|stubble)\b/i);
      }
    }
  });

  it('excludes Mamá Noel and exposes coherent Christmas costumes', () => {
    expect(effectsInGroup('restyle')).toHaveLength(CLAY_EFFECTS.length);
    expect(CLAY_EFFECTS.some((effect) => effect.id === 'mama')).toBe(false);
    expect(CLAY_EFFECTS.map((effect) => effect.id)).toEqual([
      'duende',
      'noel',
      'reyes',
      'reno',
      'nieve',
      'cascanueces',
      'angel',
      'galleta',
      'trineo',
    ]);
  });

  it('falls back to the first effect for an unknown id', () => {
    expect(getClayEffect('nope').id).toBe(CLAY_EFFECTS[0]?.id);
  });
});
