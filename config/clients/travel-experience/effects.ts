/**
 * Live Lucy 2.6 looks for NO.MAD LAB Travel Experience (`enhance: false`).
 *
 * Names, places, and reference stills come from the delivery pack.
 * Each prompt only names the place and the labeled look; the reference image
 * carries the costume. Identity stays with the person in camera.
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

export const DEFAULT_CLAY_EFFECT_ID = 'mexico-hombre';

const EFFECT_ROOT = '/brand/travel-experience/effects';

function travelLook(background: string, outfit: string): string {
  return (
    `Replace the full background with ${background}. ` +
    `Dress the person in ${outfit} from the reference image. ` +
    'Preserve facial identity, expression, age and skin tone.'
  );
}

export const CLAY_EFFECTS: readonly ClayEffect[] = [
  {
    id: 'mexico-hombre',
    group: 'restyle',
    name: 'México · Hombre',
    kicker: 'Centro',
    stud: '#1A1A1A',
    ink: 'light',
    style: 'reference portrait',
    prompt: travelLook('a Mexican town center', 'the charro outfit'),
    referenceImage: {
      src: `${EFFECT_ROOT}/mexico-hombre.png`,
      alt: 'México, vestuario de hombre',
    },
  },
  {
    id: 'mexico-mujer',
    group: 'restyle',
    name: 'México · Mujer',
    kicker: 'Centro',
    stud: '#C23B6E',
    ink: 'light',
    style: 'reference portrait',
    prompt: travelLook('a Mexican town center', 'the embroidered traditional outfit'),
    referenceImage: {
      src: `${EFFECT_ROOT}/mexico-mujer.png`,
      alt: 'México, vestuario de mujer',
    },
  },
  {
    id: 'peru-hombre',
    group: 'restyle',
    name: 'Perú · Hombre',
    kicker: 'Cusco',
    stud: '#8C2F2F',
    ink: 'light',
    style: 'reference portrait',
    prompt: travelLook('the Cusco highlands', 'the traditional highland outfit'),
    referenceImage: {
      src: `${EFFECT_ROOT}/peru-hombre.png`,
      alt: 'Perú, vestuario de hombre',
    },
  },
  {
    id: 'peru-mujer',
    group: 'restyle',
    name: 'Perú · Mujer',
    kicker: 'Cusco',
    stud: '#C45A2A',
    ink: 'light',
    style: 'reference portrait',
    prompt: travelLook('the Cusco highlands', 'the embroidered highland outfit'),
    referenceImage: {
      src: `${EFFECT_ROOT}/peru-mujer.png`,
      alt: 'Perú, vestuario de mujer',
    },
  },
  {
    id: 'colombia-arriero',
    group: 'restyle',
    name: 'Colombia · Arriero',
    kicker: 'Eje Cafetero',
    stud: '#C4A574',
    ink: 'dark',
    style: 'reference portrait',
    prompt: travelLook("Colombia's coffee region", 'the arriero outfit'),
    referenceImage: {
      src: `${EFFECT_ROOT}/colombia-arriero.png`,
      alt: 'Colombia, arriero',
    },
  },
  {
    id: 'colombia-chapolera',
    group: 'restyle',
    name: 'Colombia · Chapolera',
    kicker: 'Eje Cafetero',
    stud: '#6B2D5C',
    ink: 'light',
    style: 'reference portrait',
    prompt: travelLook("Colombia's coffee region", 'the chapolera outfit'),
    referenceImage: {
      src: `${EFFECT_ROOT}/colombia-chapolera.png`,
      alt: 'Colombia, chapolera',
    },
  },
  {
    id: 'argentina-hombre',
    group: 'restyle',
    name: 'Argentina · Hombre',
    kicker: 'Pampeana',
    stud: '#6B3E2A',
    ink: 'light',
    style: 'reference portrait',
    prompt: travelLook('the Argentine pampas', 'the traditional pampas outfit'),
    referenceImage: {
      src: `${EFFECT_ROOT}/argentina-hombre.png`,
      alt: 'Argentina, vestuario de hombre',
    },
  },
  {
    id: 'argentina-mujer',
    group: 'restyle',
    name: 'Argentina · Mujer',
    kicker: 'Pampeana',
    stud: '#2C4C7C',
    ink: 'light',
    style: 'reference portrait',
    prompt: travelLook('the Argentine pampas', 'the traditional pampas dress'),
    referenceImage: {
      src: `${EFFECT_ROOT}/argentina-mujer.png`,
      alt: 'Argentina, vestuario de mujer',
    },
  },
  {
    id: 'chile-hombre',
    group: 'restyle',
    name: 'Chile · Hombre',
    kicker: 'Zona Central',
    stud: '#7A3030',
    ink: 'light',
    style: 'reference portrait',
    prompt: travelLook('central Chile', 'the traditional central Chile outfit'),
    referenceImage: {
      src: `${EFFECT_ROOT}/chile-hombre.png`,
      alt: 'Chile, vestuario de hombre',
    },
  },
  {
    id: 'chile-mujer',
    group: 'restyle',
    name: 'Chile · Mujer',
    kicker: 'Zona Central',
    stud: '#A33B52',
    ink: 'light',
    style: 'reference portrait',
    prompt: travelLook('central Chile', 'the floral traditional dress'),
    referenceImage: {
      src: `${EFFECT_ROOT}/chile-mujer.png`,
      alt: 'Chile, vestuario de mujer',
    },
  },
  {
    id: 'puerto-rico-rojo-amarillo',
    group: 'restyle',
    name: 'Puerto Rico · Rojo / Amarillo',
    kicker: 'Loíza',
    stud: '#E23B2F',
    ink: 'light',
    style: 'reference portrait',
    prompt: travelLook(
      'the Loíza coast in Puerto Rico',
      'the red and yellow vejigante costume',
    ),
    referenceImage: {
      src: `${EFFECT_ROOT}/puerto-rico-rojo-amarillo.png`,
      alt: 'Puerto Rico, vejigante rojo y amarillo',
    },
  },
  {
    id: 'puerto-rico-azul-verde',
    group: 'restyle',
    name: 'Puerto Rico · Azul / Verde',
    kicker: 'Loíza',
    stud: '#1F6B4A',
    ink: 'light',
    style: 'reference portrait',
    prompt: travelLook(
      'the Loíza coast in Puerto Rico',
      'the blue and green vejigante costume',
    ),
    referenceImage: {
      src: `${EFFECT_ROOT}/puerto-rico-azul-verde.png`,
      alt: 'Puerto Rico, vejigante azul y verde',
    },
  },
];

export function getClayEffect(id: string): ClayEffect {
  const found = CLAY_EFFECTS.find((effect) => effect.id === id);
  if (found) return found;
  const fallback = CLAY_EFFECTS[0];
  if (!fallback) {
    throw new Error('Travel effect catalog is empty');
  }
  return fallback;
}

export function effectsInGroup(group: ClayEffectGroup): readonly ClayEffect[] {
  return CLAY_EFFECTS.filter((effect) => effect.group === group);
}
