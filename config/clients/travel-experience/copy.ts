import type { PlatformCopy } from '../../types';

const copy: PlatformCopy = {
  landing: {
    eyebrow: 'NO.MAD LAB',
    titleLine1: 'Travel',
    titleLine2: 'Experience',
    subtitle: 'México · Perú · Colombia · Argentina · Chile · Puerto Rico',
    privacyNote: 'La cámara solo se usa durante esta sesión.',
    microEdition: 'México',
    microIssue: 'Perú',
    microRail: 'Colombia',
    statusLines: [
      'Ponte frente a la cámara.',
      'Toca un vestuario.',
      'El look cambia en vivo.',
    ],
    ctaLabel: 'Comenzar experiencia',
    ctaBusyLabel: 'Abriendo cámara…',
  },
  generating: {
    statusLines: ['Abriendo la experiencia'],
    eyebrow: 'En vivo',
    eyebrowError: 'Vuelve a intentarlo',
    title: 'Abriendo la experiencia',
    titleError: 'No pudimos abrir la experiencia',
    subtitle: 'Unos segundos y aparece',
    retryLabel: 'Reintentar',
  },
  footer: { line: 'NO.MAD LAB © {year}' },
  brickStudio: {
    liveBadge: 'En vivo',
    connecting: 'Abriendo la experiencia…',
    switching: 'Cambiando el vestuario…',
    restylesTitle: 'Vestuario',
    railHint: 'Toca uno. Sigues siendo tú.',
    restart: 'Volver',
    retry: 'Reintentar',
    applyEffect: 'Aplicar {name}',
    sessionError: 'No pudimos abrir la experiencia en vivo.',
  },
};

export default copy;
