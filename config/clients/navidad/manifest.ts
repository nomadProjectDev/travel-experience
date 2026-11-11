import type { PlatformManifest } from '../../types';
import copy from './copy';
import wardrobe from './wardrobe';

const manifest: PlatformManifest = {
  clientId: 'navidad',
  theme: 'navidad',
  display: {
    mode: 'mupi',
    targetWidth: 1080,
    targetHeight: 1920,
  },
  features: {
    videoLoop: false,
    wardrobeFeed: false,
    studioChrome: 'side-rail',
    portraitFraming: 'full-body',
    stylistAssistant: false,
    voiceStylist: false,
    backgroundAudio: false,
    environmentScenes: false,
    faceFitAnalysis: false,
    faceFitRecommendations: false,
  },
  brand: {
    productName: 'TALLER DE BARRO',
    logoSrc: '',
    logoAlt: 'Taller de Barro, efectos en vivo',
  },
  wardrobe,
  copy,
};

export default manifest;
