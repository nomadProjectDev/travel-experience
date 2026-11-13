import { describe, expect, it } from 'vitest';
import {
  CLAY_EFFECTS,
  DEFAULT_CLAY_EFFECT_ID,
  effectsInGroup,
  getClayEffect,
} from './effects';

const UNWANTED_EYEWEAR_WORDS =
  /\b(glasses|eyeglasses|sunglasses|spectacles|goggles|monocle)\b/i;
const FACIAL_HAIR_WORDS = /\b(beard|mustache|moustache|stubble|goatee)\b/i;
const NOEL_IDS = new Set(['noel', 'santa-realista', 'santa-lego']);
const REJECTED_DIRECTION_WORDS =
  /\b(fashion|gala|tailor(?:ed|ing)?|couture|royal evening|carnival(?:esque)?)\b/i;
const CUTE_CHARACTER_WORDS =
  /\b(cute|lovable|friendly|cheerful|joyful|cuddly|sweet|warm)\b/i;

describe('festive effect catalog', () => {
  it('has unique IDs, usable labels, and no unwanted eyewear types', () => {
    expect(DEFAULT_CLAY_EFFECT_ID).toBe('duende');

    const ids = new Set<string>();
    for (const effect of CLAY_EFFECTS) {
      expect(ids.has(effect.id)).toBe(false);
      ids.add(effect.id);
      expect(effect.group).toBe('restyle');
      expect(effect.name.trim().length).toBeGreaterThan(0);
      expect(effect.style.trim().length).toBeGreaterThan(0);
      expect(effect.stud).toMatch(/^#[0-9a-f]{6}$/i);
      expect(['dark', 'light']).toContain(effect.ink);
      expect(effect.prompt).not.toMatch(UNWANTED_EYEWEAR_WORDS);
    }
    expect([...new Set(CLAY_EFFECTS.map((effect) => effect.stud))]).toHaveLength(
      CLAY_EFFECTS.length,
    );
  });

  it('preserves identity and fully replaces the environment in every prompt', () => {
    for (const effect of CLAY_EFFECTS) {
      expect(effect.prompt.startsWith('Replace the full background with ')).toBe(true);
      expect(effect.prompt).toMatch(/Christmas|North Pole/i);
      expect(effect.prompt).toMatch(/expression/i);
      expect(effect.prompt).toMatch(/no eyewear/i);
      expect(effect.prompt).not.toMatch(UNWANTED_EYEWEAR_WORDS);
      expect(effect.prompt).not.toMatch(REJECTED_DIRECTION_WORDS);

      if (effect.id === 'santa-realista') {
        expect(effect.prompt).toMatch(/preserving recognizable identity/i);
        expect(effect.prompt).toMatch(/natural skin/i);
        expect(effect.prompt).toMatch(/uncanny/i);
        expect(effect.prompt).not.toMatch(/cute coherent character/i);
      } else {
        expect(effect.prompt).toMatch(/one cute coherent character/i);
        expect(effect.prompt).toMatch(/preserve facial identity/i);
        expect(effect.prompt).toMatch(/age and skin-tone cues/i);
        expect(effect.prompt).toMatch(/friendly eyes/i);
        expect(effect.prompt).toMatch(/non-uncanny anatomy/i);
        expect(effect.prompt).toMatch(CUTE_CHARACTER_WORDS);
      }

      if (NOEL_IDS.has(effect.id)) {
        expect(effect.prompt).toMatch(FACIAL_HAIR_WORDS);
      } else {
        expect(effect.prompt).not.toMatch(FACIAL_HAIR_WORDS);
        expect(effect.prompt).toMatch(/no eyewear or facial hair/i);
      }
    }
  });

  it('assigns deliberately diverse festive media', () => {
    expect(Object.fromEntries(CLAY_EFFECTS.map(({ id, style }) => [id, style]))).toEqual({
      duende: 'handmade plasticine claymation',
      noel: 'wool-felt stop-motion',
      'santa-realista': 'photoreal cinematic human',
      'santa-lego': 'block-built toy',
      reno: 'stitched plush',
      nieve: 'soft plasticine claymation',
      pinguino: 'foam-clay stop-motion',
      'oso-polar': 'needle-felted wool',
      angel: 'layered paper-cut storybook',
      galleta: 'baked gingerbread puppet',
    });
    expect([...new Set(CLAY_EFFECTS.map((effect) => effect.style))]).toHaveLength(
      CLAY_EFFECTS.length,
    );
  });

  it('keeps handcrafted, realistic, and block-built Papá Noel styles distinct', () => {
    const noel = getClayEffect('noel');
    expect(noel.name).toBe('Papá Noel');
    expect(noel.kicker).toBe('Polo Norte');
    expect(noel.style).toBe('wool-felt stop-motion');
    expect(noel.prompt).toMatch(/friendly red-suited Christmas gift-bringer puppet/i);
    expect(noel.prompt).toMatch(/white wool-felt beard/i);
    expect(noel.prompt).not.toMatch(/photoreal|realistic human|plasticine|block-built|minifigure/i);
    expect(noel.prompt).not.toMatch(UNWANTED_EYEWEAR_WORDS);

    const realistic = getClayEffect('santa-realista');
    expect(realistic.name).toBe('Papá Noel realista');
    expect(realistic.kicker).toBe('Cine real');
    expect(realistic.stud).toBe('#741F2B');
    expect(realistic.style).toBe('photoreal cinematic human');
    expect(realistic.prompt).toMatch(/photoreal cinematic/i);
    expect(realistic.prompt).toMatch(/realistic human Christmas gift-bringer/i);
    expect(realistic.prompt).toMatch(/premium red velvet suit/i);
    expect(realistic.prompt).toMatch(/natural warm lighting/i);
    expect(realistic.prompt).toMatch(/natural skin/i);
    expect(realistic.prompt).toMatch(/believable white beard/i);
    expect(realistic.prompt).toMatch(/no eyewear, prosthetic or uncanny look/i);
    expect(realistic.prompt).not.toMatch(/felt|puppet|clay|plasticine|block-built/i);
    expect(realistic.referenceImage).toBeUndefined();

    const blocks = getClayEffect('santa-lego');
    expect(blocks.name).toBe('Papá Noel de bloques');
    expect(blocks.prompt).toMatch(/^Replace the full background with /);
    expect(blocks.prompt).toMatch(/glossy block-built Christmas gift-bringer toy/i);
    expect(blocks.prompt).toMatch(/preserve facial identity, expression, age/i);
    expect(blocks.prompt).toMatch(/stepped white block beard/i);
    expect(blocks.referenceImage).toEqual({
      src: '/brand/navidad/effects/santa-blocks.jpg',
      alt: 'Papá Noel de juguete construido con bloques rojos, blancos y amarillos',
    });
    expect(blocks.prompt).not.toMatch(/clay|plasticine|stop-motion/i);
    expect(blocks.prompt).not.toMatch(UNWANTED_EYEWEAR_WORDS);
    expect(blocks.prompt).not.toMatch(
      /\blego\b|\bminifigure\b|interlocking bricks?|c-hands?|brand names?/i,
    );

    expect(
      CLAY_EFFECTS.filter((effect) => /believable white beard/i.test(effect.prompt)),
    ).toEqual([realistic]);
    expect(new Set([noel.style, realistic.style, blocks.style])).toHaveLength(3);
  });

  it('uses cohesive Papá Noel display names for every active Noel variant', () => {
    const names = CLAY_EFFECTS.filter((effect) => NOEL_IDS.has(effect.id)).map(
      (effect) => effect.name,
    );

    expect(names).toHaveLength(NOEL_IDS.size);
    names.forEach((name) => {
      expect(name).toMatch(/^Papá Noel/);
      expect(name).not.toMatch(/Santa/i);
    });
  });

  it('exposes ten coherent Christmas characters', () => {
    expect(effectsInGroup('restyle')).toHaveLength(CLAY_EFFECTS.length);
    expect(CLAY_EFFECTS).toHaveLength(10);
    expect(CLAY_EFFECTS.some((effect) => effect.id === 'mama')).toBe(false);
    expect(CLAY_EFFECTS.map((effect) => effect.id)).toEqual([
      'duende',
      'noel',
      'santa-realista',
      'santa-lego',
      'reno',
      'nieve',
      'pinguino',
      'oso-polar',
      'angel',
      'galleta',
    ]);
    expect(CLAY_EFFECTS.map((effect) => effect.name)).toEqual([
      'Duende de plastilina',
      'Papá Noel',
      'Papá Noel realista',
      'Papá Noel de bloques',
      'Reno de peluche',
      'Muñeco de nieve',
      'Pingüino navideño',
      'Oso polar',
      'Estrella de Navidad',
      'Galleta de jengibre',
    ]);
  });

  it('removes the rejected human-look slots and wording', () => {
    const serialized = JSON.stringify(
      CLAY_EFFECTS.filter((effect) => effect.id !== 'santa-realista'),
    );
    expect(CLAY_EFFECTS.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(['reyes', 'cascanueces', 'trineo']),
    );
    expect(serialized).not.toMatch(
      /Noche Real|Guardia de Navidad|Dulce Invierno|Explorador/i,
    );
    expect(serialized).not.toMatch(REJECTED_DIRECTION_WORDS);
  });

  it('falls back to the first effect for an unknown id', () => {
    expect(getClayEffect('nope').id).toBe(CLAY_EFFECTS[0]?.id);
  });
});
