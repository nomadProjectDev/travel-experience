/**
 * Country home and the second-step look for NO.MAD LAB Travel Experience.
 * Card art already carries the country name. `label` is the accessible name
 * and includes the region when the pack has one.
 */

const DESTINATION_ROOT = '/brand/travel-experience/destinations';

export const TRAVEL_HOME_BACKGROUND = {
  src: `${DESTINATION_ROOT}/home-background.jpg`,
  alt: '',
} as const;

export interface TravelChoice {
  effectId: string;
  label: string;
}

export interface TravelDestination {
  id: string;
  /** Accessible name. Not painted again over the card. */
  label: string;
  /** Gold headline on the variant screen (e.g. `Colombia • Eje Cafetero`). */
  variantHeadline: string;
  /** Flag accent colors, left to right, for the variant header band. */
  flagStrip: readonly [string, string, string];
  /** Country selection card with name in the art (`destinations/<id>.webp`). */
  cardSrc: string;
  /** Scenic plate for the variant step (`destinations/<id>/fondo.webp`). */
  screenBackgroundSrc: string;
  /** Prompt on the variant screen. */
  variantLead: string;
  choices: readonly TravelChoice[];
}

export interface CountryCardFields {
  src: string;
  alt: string;
}

function destinationCard(id: string): string {
  return `${DESTINATION_ROOT}/${id}.webp`;
}

function destinationFondo(id: string): string {
  return `${DESTINATION_ROOT}/${id}/fondo.webp`;
}

export const TRAVEL_DESTINATIONS: readonly TravelDestination[] = [
  {
    id: 'mexico',
    label: 'México Centro',
    variantHeadline: 'México • Centro',
    flagStrip: ['#006847', '#ffffff', '#ce1126'],
    cardSrc: destinationCard('mexico'),
    screenBackgroundSrc: destinationFondo('mexico'),
    variantLead: 'Elige tu vestuario',
    choices: [
      { effectId: 'mexico-hombre', label: 'Hombre' },
      { effectId: 'mexico-mujer', label: 'Mujer' },
    ],
  },
  {
    id: 'peru',
    label: 'Perú Cusco',
    variantHeadline: 'Perú • Cusco',
    flagStrip: ['#d91023', '#ffffff', '#d91023'],
    cardSrc: destinationCard('peru'),
    screenBackgroundSrc: destinationFondo('peru'),
    variantLead: 'Elige tu vestuario',
    choices: [
      { effectId: 'peru-hombre', label: 'Hombre' },
      { effectId: 'peru-mujer', label: 'Mujer' },
    ],
  },
  {
    id: 'colombia',
    label: 'Colombia Eje Cafetero',
    variantHeadline: 'Colombia • Eje Cafetero',
    flagStrip: ['#fcd116', '#003893', '#ce1126'],
    cardSrc: destinationCard('colombia'),
    screenBackgroundSrc: destinationFondo('colombia'),
    variantLead: 'Elige tu vestuario',
    choices: [
      { effectId: 'colombia-arriero', label: 'Arriero' },
      { effectId: 'colombia-chapolera', label: 'Chapolera' },
    ],
  },
  {
    id: 'argentina',
    label: 'Argentina Región Pampeana',
    variantHeadline: 'Argentina • Región Pampeana',
    flagStrip: ['#74acdf', '#ffffff', '#74acdf'],
    cardSrc: destinationCard('argentina'),
    screenBackgroundSrc: destinationFondo('argentina'),
    variantLead: 'Elige tu vestuario',
    choices: [
      { effectId: 'argentina-hombre', label: 'Hombre' },
      { effectId: 'argentina-mujer', label: 'Mujer' },
    ],
  },
  {
    id: 'chile',
    label: 'Chile Zona Central',
    variantHeadline: 'Chile • Zona Central',
    flagStrip: ['#ffffff', '#d52b1e', '#0039a6'],
    cardSrc: destinationCard('chile'),
    screenBackgroundSrc: destinationFondo('chile'),
    variantLead: 'Elige tu vestuario',
    choices: [
      { effectId: 'chile-hombre', label: 'Hombre' },
      { effectId: 'chile-mujer', label: 'Mujer' },
    ],
  },
  {
    id: 'puerto-rico',
    label: 'Puerto Rico',
    variantHeadline: 'Puerto Rico',
    flagStrip: ['#ed0000', '#ffffff', '#0050f0'],
    cardSrc: destinationCard('puerto-rico'),
    screenBackgroundSrc: destinationFondo('puerto-rico'),
    variantLead: 'Elige tu vejigante',
    choices: [
      { effectId: 'puerto-rico-rojo-amarillo', label: 'Vejigante Rojo/Amarillo' },
      { effectId: 'puerto-rico-azul-verde', label: 'Vejigante Azul/Verde' },
    ],
  },
];

export function getTravelDestination(id: string): TravelDestination | undefined {
  return TRAVEL_DESTINATIONS.find((destination) => destination.id === id);
}

export function countryCardFields(destination: TravelDestination): CountryCardFields {
  return {
    src: destination.cardSrc,
    alt: destination.label,
  };
}
