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
  it('has unique IDs, usable labels, and no face-accessory trigger words', () => {
    expect(DEFAULT_CLAY_EFFECT_ID).toBe('duende');

    const ids = new Set<string>();
    for (const effect of CLAY_EFFECTS) {
      expect(ids.has(effect.id)).toBe(false);
      ids.add(effect.id);
      expect(effect.group).toBe('restyle');
      expect(effect.name.trim().length).toBeGreaterThan(0);
      expect(effect.prompt).not.toMatch(HALLUCINATION_TRIGGER_WORDS);
    }
  });

  it('keeps the clay looks consistent and replaces their real backgrounds', () => {
    const nonClaySantaIds = new Set(['santa-realista', 'santa-lego']);
    const clayEffects = CLAY_EFFECTS.filter(
      (effect) => !nonClaySantaIds.has(effect.id),
    );

    for (const effect of clayEffects) {
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

  it('exposes realistic and LEGO Santa variants with exact prompt bases', () => {
    const realistic = getClayEffect('santa-realista');
    expect(realistic.name).toBe('Santa realista');
    expect(realistic.prompt).toMatch(/^Convert me in Santa Claus\./);
    expect(realistic.prompt).toContain('Set the background to ');
    expect(realistic.prompt).toMatch(/realistic human Santa/i);
    expect(realistic.prompt).toMatch(/same recognizable identity/i);
    expect(realistic.prompt).toMatch(/white Santa beard/i);
    expect(realistic.prompt).not.toMatch(/clay|plasticine|LEGO|minifigure/i);
    expect(realistic.prompt).not.toMatch(HALLUCINATION_TRIGGER_WORDS);

    const lego = getClayEffect('santa-lego');
    expect(lego.name).toBe('Santa LEGO');
    expect(lego.prompt).toMatch(
      /^Convert me in a classic LEGO Santa Claus figure\./,
    );
    expect(lego.prompt).toContain('Set the background to ');
    expect(lego.prompt).toMatch(/whole person from head to toe/i);
    expect(lego.prompt).toMatch(/classic LEGO minifigure Santa/i);
    expect(lego.prompt).toMatch(/recognizable identity cues/i);
    expect(lego.prompt).toMatch(/white Santa beard/i);
    expect(lego.prompt).not.toMatch(/clay|plasticine|stop-motion/i);
    expect(lego.prompt).not.toMatch(HALLUCINATION_TRIGGER_WORDS);
  });

  it('excludes Mamá Noel and exposes coherent Christmas costumes', () => {
    expect(effectsInGroup('restyle')).toHaveLength(CLAY_EFFECTS.length);
    expect(CLAY_EFFECTS.some((effect) => effect.id === 'mama')).toBe(false);
    expect(CLAY_EFFECTS.map((effect) => effect.id)).toEqual([
      'duende',
      'noel',
      'santa-realista',
      'santa-lego',
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
