import type { EyewearMeta, WardrobeItem } from '../../types';
import { garmentUrl } from '../../wardrobePaths';

const CLIENT_ID = 'eyewear';

/** First six frames use retail product photos (.jpg); rest keep SVG wireframes. */
const PHOTO_IDS = new Set([
  'frame-classic-01',
  'frame-thin-02',
  'frame-round-03',
  'frame-square-04',
  'frame-aviator-05',
  'frame-cateye-06',
]);

const frame = ({
  id,
  name,
  eyewear,
  priceLabel,
  description,
}: {
  id: string;
  name: string;
  eyewear: EyewearMeta;
  priceLabel?: string;
  description?: string;
}): WardrobeItem => ({
  id,
  name,
  url: garmentUrl(
    CLIENT_ID,
    'glasses',
    PHOTO_IDS.has(id) ? `${id}.jpg` : `${id}.svg`,
  ),
  category: 'glasses',
  eyewear,
  ...(priceLabel ? { priceLabel } : {}),
  ...(description ? { description } : {}),
});

/** Optical catalog — attributes drive the stylist recommender. */
export const eyewearWardrobe: WardrobeItem[] = [
  frame({
    id: 'frame-classic-01',
    name: 'Savita sol',
    priceLabel: '49 €',
    description:
      'Gafas de sol con silueta ovalada en acetato y varillas metálicas. Incluye lentes polarizadas para un look limpio de día.',
    eyewear: {
      shape: 'oval',
      material: 'acetate',
      weight: 'medium',
      stylistReason: 'Ancla el rostro con seguridad',
    },
  }),
  frame({
    id: 'frame-thin-02',
    name: 'Metal fino',
    priceLabel: '59 €',
    description:
      'Montura metálica ligera de línea fina. Ideal para quien busca presencia sin volumen en el rostro.',
    eyewear: {
      shape: 'oval',
      material: 'metal',
      weight: 'light',
      stylistReason: 'Deja los rasgos abiertos',
    },
  }),
  frame({
    id: 'frame-round-03',
    name: 'Redonda estudio',
    priceLabel: '45 €',
    description:
      'Forma redonda en acetato con un equilibrio suave. Una opción fácil para cambiar de look en segundos.',
    eyewear: {
      shape: 'round',
      material: 'acetate',
      weight: 'medium',
      stylistReason: 'Equilibra mandíbulas marcadas',
    },
  }),
  frame({
    id: 'frame-square-04',
    name: 'Cuadrada city',
    priceLabel: '49 €',
    description:
      'Cuadrada limpia en acetato. Aporta estructura al óvalo y se lee moderna en cualquier contexto urbano.',
    eyewear: {
      shape: 'square',
      material: 'acetate',
      weight: 'medium',
      stylistReason: 'Afina un óvalo más suave',
    },
  }),
  frame({
    id: 'frame-aviator-05',
    name: 'Aviador gleam',
    priceLabel: '55 €',
    description:
      'Aviador clásico en metal ligero. Afirmación sin volumen; funciona de sol y de estilo diario.',
    eyewear: {
      shape: 'aviator',
      material: 'metal',
      weight: 'light',
      stylistReason: 'Afirma sin añadir volumen',
    },
  }),
  frame({
    id: 'frame-cateye-06',
    name: 'Cat-eye edit',
    priceLabel: '52 €',
    description:
      'Cat-eye en acetato con esquinas elevadas. Alarga la mirada y aporta un toque editorial.',
    eyewear: {
      shape: 'cat-eye',
      material: 'acetate',
      weight: 'medium',
      stylistReason: 'Alarga la línea de la mirada',
    },
  }),
  frame({
    id: 'frame-oval-07',
    name: 'Soft oval',
    eyewear: {
      shape: 'oval',
      material: 'acetate',
      weight: 'light',
      stylistReason: 'Ovala suavemente tu rostro',
    },
  }),
  frame({
    id: 'frame-rect-08',
    name: 'Modern rect',
    eyewear: {
      shape: 'rectangle',
      material: 'acetate',
      weight: 'medium',
      stylistReason: 'Aporta estructura limpia',
    },
  }),
  frame({
    id: 'frame-hex-09',
    name: 'Hex edge',
    eyewear: {
      shape: 'geometric',
      material: 'metal',
      weight: 'medium',
      stylistReason: 'Geometría con carácter',
    },
  }),
  frame({
    id: 'frame-wire-10',
    name: 'Wire micro',
    eyewear: {
      shape: 'oval',
      material: 'metal',
      weight: 'light',
      stylistReason: 'Casi invisible: el rostro manda',
    },
  }),
  frame({
    id: 'frame-bold-11',
    name: 'Bold block',
    eyewear: {
      shape: 'rectangle',
      material: 'acetate',
      weight: 'bold',
      stylistReason: 'Presencia óptica marcada',
    },
  }),
  frame({
    id: 'frame-titanium-12',
    name: 'Titanium slim',
    eyewear: {
      shape: 'rectangle',
      material: 'titanium',
      weight: 'light',
      stylistReason: 'Premium ligero en el rostro',
    },
  }),
  frame({
    id: 'frame-club-13',
    name: 'Clubmaster vibe',
    eyewear: {
      shape: 'browline',
      material: 'mixed',
      weight: 'medium',
      stylistReason: 'Eleva la atención a los ojos',
    },
  }),
  frame({
    id: 'frame-narrow-14',
    name: 'Narrow lane',
    eyewear: {
      shape: 'rectangle',
      material: 'metal',
      weight: 'light',
      stylistReason: 'Favorece rostros alargados',
    },
  }),
  frame({
    id: 'frame-browline-15',
    name: 'Browline classic',
    eyewear: {
      shape: 'browline',
      material: 'mixed',
      weight: 'medium',
      stylistReason: 'Lleva el foco a la mirada',
    },
  }),
  frame({
    id: 'frame-softsq-16',
    name: 'Soft square',
    eyewear: {
      shape: 'square',
      material: 'acetate',
      weight: 'medium',
      stylistReason: 'Estructura con borde amable',
    },
  }),
  frame({
    id: 'frame-pilot-17',
    name: 'Pilot drop',
    eyewear: {
      shape: 'aviator',
      material: 'metal',
      weight: 'medium',
      stylistReason: 'Profundidad lista para exterior',
    },
  }),
  frame({
    id: 'frame-geo-18',
    name: 'Facet geo',
    eyewear: {
      shape: 'geometric',
      material: 'acetate',
      weight: 'bold',
      stylistReason: 'Montura firma, facetada',
    },
  }),
  frame({
    id: 'frame-rimless-19',
    name: 'Rimless clear',
    eyewear: {
      shape: 'oval',
      material: 'rimless',
      weight: 'light',
      stylistReason: 'Foco en ti, minimal',
    },
  }),
  frame({
    id: 'frame-horn-20',
    name: 'Horn heritage',
    eyewear: {
      shape: 'oval',
      material: 'acetate',
      weight: 'bold',
      stylistReason: 'Calidez y profundidad clásica',
    },
  }),
  frame({
    id: 'frame-sport-21',
    name: 'Sport wrap',
    eyewear: {
      shape: 'rectangle',
      material: 'mixed',
      weight: 'medium',
      stylistReason: 'Equilibra sienes más anchas',
    },
  }),
  frame({
    id: 'frame-keyhole-22',
    name: 'Keyhole bridge',
    eyewear: {
      shape: 'rectangle',
      material: 'acetate',
      weight: 'medium',
      stylistReason: 'Suaviza el puente nasal',
    },
  }),
];

export default eyewearWardrobe;
