/**
 * Live Lucy 2.6 Christmas characters (`enhance: false`).
 *
 * Each effect uses one handcrafted medium across the character and its set.
 * Identity survives through stylized facial relationships rather than a pasted
 * realistic face. Only the three Papá Noel characters intentionally include beards.
 * Papá Noel realista is the sole photoreal exception to the handcrafted catalog.
 */

export const CLAY_EFFECT_GROUPS = ['restyle'] as const;

export type ClayEffectGroup = (typeof CLAY_EFFECT_GROUPS)[number];

export interface ClayEffect {
  id: string;
  group: ClayEffectGroup;
  /** Rail label. */
  name: string;
  /** Short gallery-style kicker. */
  kicker: string;
  /** Rail preview accent color. */
  stud: string;
  /** Preview glyph contrast mode. */
  ink: 'dark' | 'light';
  /** English Lucy 2.6 prompt replacing background + outfit. */
  prompt: string;
  /** Deliberate visual medium used by this effect. */
  style: string;
  /** Optional hidden visual reference used only for Decart conditioning. */
  referenceImage?: {
    src: string;
    alt: string;
  };
}

export const DEFAULT_CLAY_EFFECT_ID = 'duende';

interface ChristmasCharacterSpec {
  background: string;
  character: string;
  medium: string;
  faceDirection?: string;
}

function christmasCharacter({
  background,
  character,
  medium,
  faceDirection = 'no eyewear or facial hair',
}: ChristmasCharacterSpec): string {
  return (
    `Replace the full background with ${background}. ` +
    `Turn the person into ${character}, entirely ${medium}. ` +
    `Keep one cute coherent character; preserve facial identity, expression, age and skin-tone cues, friendly eyes and non-uncanny anatomy; ${faceDirection}.`
  );
}

export const CLAY_EFFECTS: readonly ClayEffect[] = [
  {
    id: 'duende',
    group: 'restyle',
    name: 'Duende de plastilina',
    kicker: 'Plastilina',
    stud: '#1B6B45',
    ink: 'light',
    style: 'handmade plasticine claymation',
    prompt: christmasCharacter({
      background: 'a plasticine Christmas workshop with gifts, lights and snow',
      character: 'one green-and-red handmade elf puppet',
      medium: 'hand-sculpted plasticine claymation',
    }),
  },
  {
    id: 'noel',
    group: 'restyle',
    name: 'Papá Noel',
    kicker: 'Polo Norte',
    stud: '#C23A32',
    ink: 'light',
    style: 'wool-felt stop-motion',
    prompt: christmasCharacter({
      background: 'a wool-felt North Pole cabin with fire, tree and snow',
      character: 'a friendly red-suited Christmas gift-bringer puppet',
      medium: 'soft wool felt stop-motion',
      faceDirection: 'no eyewear; one rounded white wool-felt beard',
    }),
  },
  {
    id: 'santa-realista',
    group: 'restyle',
    name: 'Papá Noel realista',
    kicker: 'Cine real',
    stud: '#741F2B',
    ink: 'light',
    style: 'photoreal cinematic human',
    prompt:
      'Replace the full background with a photoreal cinematic North Pole Christmas cabin, glowing fireplace, decorated tree and natural warm lighting. Transform the person into a realistic human Christmas gift-bringer in a premium red velvet suit and hat, preserving recognizable identity, expression and natural skin. Add one believable white beard; no eyewear, prosthetic or uncanny look.',
  },
  {
    id: 'santa-lego',
    group: 'restyle',
    name: 'Papá Noel de bloques',
    kicker: 'Taller',
    stud: '#D7352A',
    ink: 'light',
    style: 'block-built toy',
    prompt: christmasCharacter({
      background: 'a bright block-built Christmas workshop with gifts and snow',
      character: 'one glossy block-built Christmas gift-bringer toy in red',
      medium: 'coherent block-toy geometry',
      faceDirection: 'no eyewear; one stepped white block beard',
    }),
    referenceImage: {
      src: '/brand/navidad/effects/santa-blocks.jpg',
      alt: 'Papá Noel de juguete construido con bloques rojos, blancos y amarillos',
    },
  },
  {
    id: 'reno',
    group: 'restyle',
    name: 'Reno de peluche',
    kicker: 'Peluche',
    stud: '#7A4A28',
    ink: 'light',
    style: 'stitched plush',
    prompt: christmasCharacter({
      background: 'a stitched-plush Christmas forest with snow, lanterns and sleigh',
      character: 'one chestnut reindeer plush with antlers and red scarf',
      medium: 'soft stitched plush fabric',
    }),
  },
  {
    id: 'nieve',
    group: 'restyle',
    name: 'Muñeco de nieve',
    kicker: 'Plastilina',
    stud: '#F7F3EA',
    ink: 'dark',
    style: 'soft plasticine claymation',
    prompt: christmasCharacter({
      background: 'a plasticine Christmas village with glowing cottages and snow',
      character: 'one rounded snowman puppet with scarf, carrot nose and hat',
      medium: 'soft plasticine claymation',
    }),
  },
  {
    id: 'pinguino',
    group: 'restyle',
    name: 'Pingüino navideño',
    kicker: 'Stop-motion',
    stud: '#27465A',
    ink: 'light',
    style: 'foam-clay stop-motion',
    prompt: christmasCharacter({
      background: 'a foam-clay Antarctic Christmas party with snow and lanterns',
      character: 'one round penguin puppet with scarf and bobble hat',
      medium: 'matte foam-clay stop-motion',
    }),
  },
  {
    id: 'oso-polar',
    group: 'restyle',
    name: 'Oso polar',
    kicker: 'Fieltro',
    stud: '#DDE9E5',
    ink: 'dark',
    style: 'needle-felted wool',
    prompt: christmasCharacter({
      background: 'a needle-felted Arctic Christmas camp with cabin and firs',
      character: 'one round polar bear with scarf and wool cap',
      medium: 'handmade needle-felted wool',
    }),
  },
  {
    id: 'angel',
    group: 'restyle',
    name: 'Estrella de Navidad',
    kicker: 'Papel',
    stud: '#F2C94C',
    ink: 'dark',
    style: 'layered paper-cut storybook',
    prompt: christmasCharacter({
      background: 'a paper-cut Christmas night above a glowing village',
      character: 'one five-point star with rounded limbs and golden glow',
      medium: 'layered cut paper',
    }),
  },
  {
    id: 'galleta',
    group: 'restyle',
    name: 'Galleta de jengibre',
    kicker: 'Horno',
    stud: '#C47A3A',
    ink: 'dark',
    style: 'baked gingerbread puppet',
    prompt: christmasCharacter({
      background: 'a gingerbread Christmas bakery with candy canes and oven',
      character: 'one gingerbread puppet with icing and gumdrop buttons',
      medium: 'baked gingerbread and piped icing',
    }),
  },
];

export function getClayEffect(id: string): ClayEffect {
  const found = CLAY_EFFECTS.find((effect) => effect.id === id);
  if (found) return found;
  const fallback = CLAY_EFFECTS[0];
  if (!fallback) {
    throw new Error('Clay effect catalog is empty');
  }
  return fallback;
}

export function effectsInGroup(group: ClayEffectGroup): readonly ClayEffect[] {
  return CLAY_EFFECTS.filter((effect) => effect.group === group);
}
