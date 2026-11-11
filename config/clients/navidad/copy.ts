import type { PlatformCopy } from '../../types';

const copy: PlatformCopy = {
  landing: {
    eyebrow: 'Taller de Barro',
    titleLine1: 'Navidad',
    titleLine2: 'en plastilina',
    subtitle: 'Entra al Polo Norte. La cámara te esculpe.',
    privacyNote: 'La cámara solo se usa durante esta sesión.',
    microEdition: 'Duende',
    microIssue: 'Noel',
    microRail: 'Reyes',
    statusLines: ['Ponte frente a la cámara.', 'Toca un personaje.', 'La plastilina cambia en vivo.'],
    ctaLabel: 'Empezar',
    ctaBusyLabel: 'Abriendo cámara…',
  },
  generating: {
    statusLines: ['Conectando el efecto'],
    eyebrow: 'En vivo',
    eyebrowError: 'Vuelve a intentarlo',
    title: 'Amasando el mundo',
    titleError: 'No pudimos abrir el efecto',
    subtitle: 'Unos segundos y aparece',
    retryLabel: 'Reintentar',
  },
  footer: { line: 'Taller de Barro © {year}' },
  brickStudio: {
    liveBadge: 'En vivo',
    connecting: 'Amasando el mundo de plastilina…',
    switching: 'Cambiando el personaje…',
    restylesTitle: 'Personajes',
    railHint: 'Toca uno. Sigues siendo tú, en plastilina.',
    restart: 'Salir',
    retry: 'Reintentar',
    applyEffect: 'Aplicar {name}',
    sessionError: 'No pudimos abrir el efecto en vivo.',
  },
};

export default copy;
