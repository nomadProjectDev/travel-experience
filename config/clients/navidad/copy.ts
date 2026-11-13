import type { PlatformCopy } from '../../types';

const copy: PlatformCopy = {
  landing: {
    eyebrow: 'Tu personaje. En directo.',
    titleLine1: 'Elige tu',
    titleLine2: 'Navidad',
    subtitle: 'Conviértete en un personaje navideño adorable.',
    privacyNote: 'La cámara solo se usa durante esta sesión.',
    microEdition: 'Duende',
    microIssue: 'Noel',
    microRail: 'Nieve',
    statusLines: ['Ponte frente a la cámara.', 'Toca un personaje.', 'Tu Navidad cambia en vivo.'],
    ctaLabel: 'Empezar',
    ctaBusyLabel: 'Abriendo cámara…',
  },
  generating: {
    statusLines: ['Conectando el efecto'],
    eyebrow: 'En vivo',
    eyebrowError: 'Vuelve a intentarlo',
    title: 'Creando tu Navidad',
    titleError: 'No pudimos abrir el efecto',
    subtitle: 'Unos segundos y aparece',
    retryLabel: 'Reintentar',
  },
  footer: { line: 'Elige tu Navidad © {year}' },
  brickStudio: {
    liveBadge: 'En vivo',
    connecting: 'Creando tu mundo festivo…',
    switching: 'Cambiando el personaje…',
    restylesTitle: 'Personajes',
    railHint: 'Toca uno. Sigues siendo tú, en un mundo navideño.',
    restart: 'Salir',
    retry: 'Reintentar',
    applyEffect: 'Aplicar {name}',
    sessionError: 'No pudimos abrir el efecto en vivo.',
  },
};

export default copy;
