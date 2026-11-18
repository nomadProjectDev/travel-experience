/**
 * Curated Decart Lucy VTON (`lucy-vton-3.6`) regional outfits for
 * NO.MAD LAB Travel Experience (`enhance: false`).
 *
 * Each look pairs:
 * - `referenceImage`: the approved studio portrait card shown in the UI picker (`effects/<id>.png`)
 * - `garmentImagePath`: a clean, person-free ghost-mannequin garment plate on white (`garments/<id>.webp`)
 * - `prompt`: a concise, purely positive canonical VTON garment description (`Substitute the outfit with...`)
 */

export const CLAY_EFFECT_GROUPS = ['restyle'] as const;

export type ClayEffectGroup = (typeof CLAY_EFFECT_GROUPS)[number];

export interface ClayEffect {
  id: string;
  group: ClayEffectGroup;
  /** Rail / badge label. */
  name: string;
  /** Short gallery-style kicker. */
  kicker: string;
  /** Preview accent color. */
  stud: string;
  /** Preview glyph contrast mode. */
  ink: 'dark' | 'light';
  /** Canonical English VTON prompt (`enhance: false`). */
  prompt: string;
  /** Deliberate visual medium used by this look. */
  style: string;
  /** UI picker portrait card (`public/brand/travel-experience/effects/*.png`). */
  referenceImage?: {
    src: string;
    alt: string;
  };
  /** Clean person-free garment plate sent to Decart Lucy VTON (`public/brand/travel-experience/garments/*.webp`). */
  garmentImagePath?: string;
}

export interface TravelClayEffect extends ClayEffect {
  referenceImage: {
    src: string;
    alt: string;
  };
  garmentImagePath: string;
}

export const DEFAULT_CLAY_EFFECT_ID = 'mexico-hombre';

const EFFECT_ROOT = '/brand/travel-experience/effects';
const GARMENT_ROOT = '/brand/travel-experience/garments';

export const CLAY_EFFECTS: readonly TravelClayEffect[] = [
  {
    id: 'mexico-hombre',
    group: 'restyle',
    name: 'México · Hombre',
    kicker: 'Centro',
    stud: '#1A1A1A',
    ink: 'light',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a traditional black Mexican charro suit featuring silver greca embroidery, a short jacket with silver botonadura buttons over a vest, crisp white shirt, red bow tie, silver-buckled belt, side-buttoned trousers, and an embroidered black sombrero.',
    referenceImage: {
      src: `${EFFECT_ROOT}/mexico-hombre.png`,
      alt: 'México, vestuario de hombre',
    },
    garmentImagePath: `${GARMENT_ROOT}/mexico-hombre.webp`,
  },
  {
    id: 'mexico-mujer',
    group: 'restyle',
    name: 'México · Mujer',
    kicker: 'Centro',
    stud: '#C23B6E',
    ink: 'light',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a traditional Mexican folkloric dress ensemble featuring a white lace-trimmed short-sleeve blouse with vibrant red and yellow floral chest embroidery, a fringed forest-green waist sash, a tiered burgundy floral-and-lace skirt, and a floral-embroidered tan sombrero.',
    referenceImage: {
      src: `${EFFECT_ROOT}/mexico-mujer.png`,
      alt: 'México, vestuario de mujer',
    },
    garmentImagePath: `${GARMENT_ROOT}/mexico-mujer.webp`,
  },
  {
    id: 'peru-hombre',
    group: 'restyle',
    name: 'Perú · Hombre',
    kicker: 'Cusco',
    stud: '#8C2F2F',
    ink: 'light',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a traditional Peruvian Andean ensemble featuring a deep burgundy woven poncho with white llama and geometric diamond motifs and colorful fringe over a white collared shirt, patterned chumpi sash, dark wool trousers, and a knit chullo hat.',
    referenceImage: {
      src: `${EFFECT_ROOT}/peru-hombre.png`,
      alt: 'Perú, vestuario de hombre',
    },
    garmentImagePath: `${GARMENT_ROOT}/peru-hombre.webp`,
  },
  {
    id: 'peru-mujer',
    group: 'restyle',
    name: 'Perú · Mujer',
    kicker: 'Cusco',
    stud: '#C45A2A',
    ink: 'light',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a traditional Peruvian Cusco ensemble featuring a floral-embroidered black long-sleeve bolero jacket beneath a striped red and pink woven lliclla shoulder shawl, a pleated black floral-embroidered pollera skirt with red lace-edged hem, and a red pom-pom montera hat.',
    referenceImage: {
      src: `${EFFECT_ROOT}/peru-mujer.png`,
      alt: 'Perú, vestuario de mujer',
    },
    garmentImagePath: `${GARMENT_ROOT}/peru-mujer.webp`,
  },
  {
    id: 'colombia-arriero',
    group: 'restyle',
    name: 'Colombia · Arriero',
    kicker: 'Eje Cafetero',
    stud: '#C4A574',
    ink: 'dark',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a traditional Colombian arriero ensemble featuring a crisp white rolled-sleeve button-down shirt, bright red knotted neckerchief, cream striped fringed shoulder ruana, leather crossbody carriel satchel with colorful woven flap, dark trousers, and a cream straw aguadeño hat.',
    referenceImage: {
      src: `${EFFECT_ROOT}/colombia-arriero.png`,
      alt: 'Colombia, arriero',
    },
    garmentImagePath: `${GARMENT_ROOT}/colombia-arriero.webp`,
  },
  {
    id: 'colombia-chapolera',
    group: 'restyle',
    name: 'Colombia · Chapolera',
    kicker: 'Eje Cafetero',
    stud: '#6B2D5C',
    ink: 'light',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a traditional Colombian chapolera ensemble featuring a white eyelet-lace ruffled blouse with yellow, blue, and red ribbon trim, woven geometric waist sash, white lace-trimmed front apron, tiered black floral skirt, and a flower-trimmed straw aguadeño hat.',
    referenceImage: {
      src: `${EFFECT_ROOT}/colombia-chapolera.png`,
      alt: 'Colombia, chapolera',
    },
    garmentImagePath: `${GARMENT_ROOT}/colombia-chapolera.webp`,
  },
  {
    id: 'argentina-hombre',
    group: 'restyle',
    name: 'Argentina · Hombre',
    kicker: 'Pampeana',
    stud: '#6B3E2A',
    ink: 'light',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a traditional Argentinian gaucho ensemble featuring an off-white rolled-sleeve button-down shirt, deep red knotted neckerchief, wide brown leather rastra belt with ornate silver medallions, baggy pleated black bombacha trousers, tall leather boots, and a flat-brimmed black felt hat.',
    referenceImage: {
      src: `${EFFECT_ROOT}/argentina-hombre.png`,
      alt: 'Argentina, vestuario de hombre',
    },
    garmentImagePath: `${GARMENT_ROOT}/argentina-hombre.webp`,
  },
  {
    id: 'argentina-mujer',
    group: 'restyle',
    name: 'Argentina · Mujer',
    kicker: 'Pampeana',
    stud: '#2C4C7C',
    ink: 'light',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a traditional Argentinian paisana ensemble featuring a cream cotton puff-sleeve blouse with eyelet lace ruffles, light sky-blue knotted silk neckerchief, wide dark brown leather belt with ornate silver buckle, and a full pleated dark indigo floral-tiered pollera skirt.',
    referenceImage: {
      src: `${EFFECT_ROOT}/argentina-mujer.png`,
      alt: 'Argentina, vestuario de mujer',
    },
    garmentImagePath: `${GARMENT_ROOT}/argentina-mujer.webp`,
  },
  {
    id: 'chile-hombre',
    group: 'restyle',
    name: 'Chile · Hombre',
    kicker: 'Zona Central',
    stud: '#7A3030',
    ink: 'light',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a traditional Chilean huaso ensemble featuring a burgundy and cream striped woven chamanto poncho with navy floral band and red fringe over a light collared shirt, silver-buckled leather belt, dark tailored trousers, spurred riding boots, and a black chupalla hat.',
    referenceImage: {
      src: `${EFFECT_ROOT}/chile-hombre.png`,
      alt: 'Chile, vestuario de hombre',
    },
    garmentImagePath: `${GARMENT_ROOT}/chile-hombre.webp`,
  },
  {
    id: 'chile-mujer',
    group: 'restyle',
    name: 'Chile · Mujer',
    kicker: 'Zona Central',
    stud: '#A33B52',
    ink: 'light',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a traditional Chilean cueca folk dress in white cotton printed with red roses and green leaves, featuring a red-and-lace ruffled square neckline, short puffed sleeves, a wide red side-bow waist sash, and a triple-tiered ruffled skirt.',
    referenceImage: {
      src: `${EFFECT_ROOT}/chile-mujer.png`,
      alt: 'Chile, vestuario de mujer',
    },
    garmentImagePath: `${GARMENT_ROOT}/chile-mujer.webp`,
  },
  {
    id: 'puerto-rico-rojo-amarillo',
    group: 'restyle',
    name: 'Puerto Rico · Rojo / Amarillo',
    kicker: 'Loíza',
    stud: '#E23B2F',
    ink: 'light',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a vibrant Puerto Rican carnival vejigante fustán bat-wing jumpsuit covered in layered jagged ruffles of bright red, orange, and golden yellow fabric, cinched with a tasseled rope waist belt, and a full-head closed vejigante mask with curved horns, dotted carnival paint, and carved fangs.',
    referenceImage: {
      src: `${EFFECT_ROOT}/puerto-rico-rojo-amarillo.png`,
      alt: 'Puerto Rico, vejigante rojo y amarillo',
    },
    garmentImagePath: `${EFFECT_ROOT}/puerto-rico-rojo-amarillo.png`,
  },
  {
    id: 'puerto-rico-azul-verde',
    group: 'restyle',
    name: 'Puerto Rico · Azul / Verde',
    kicker: 'Loíza',
    stud: '#1F6B4A',
    ink: 'light',
    style: 'regional vton',
    prompt:
      'Substitute the outfit with a vibrant Puerto Rican carnival vejigante fustán bat-wing jumpsuit and ruffled shoulder cape in layered royal blue and bright lime green fabric with cowrie shell chest trim, and a full-head closed vejigante mask with curved horns, dotted blue-and-green carnival paint, and carved fangs.',
    referenceImage: {
      src: `${EFFECT_ROOT}/puerto-rico-azul-verde.png`,
      alt: 'Puerto Rico, vejigante azul y verde',
    },
    garmentImagePath: `${EFFECT_ROOT}/puerto-rico-azul-verde.png`,
  },
];

export function getClayEffect(id: string): TravelClayEffect {
  const found = CLAY_EFFECTS.find((effect) => effect.id === id);
  if (found) return found;
  const fallback = CLAY_EFFECTS[0];
  if (!fallback) {
    throw new Error('Travel effect catalog is empty');
  }
  return fallback;
}

export function requireClayEffect(id: string): TravelClayEffect {
  const found = CLAY_EFFECTS.find((effect) => effect.id === id);
  if (!found) {
    throw new Error(`Unknown travel look "${id}"`);
  }
  return found;
}

export function effectsInGroup(group: ClayEffectGroup): readonly TravelClayEffect[] {
  return CLAY_EFFECTS.filter((effect) => effect.group === group);
}
