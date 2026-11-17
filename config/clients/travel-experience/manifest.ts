import type { PlatformManifest } from '../../types';
import copy from './copy';
import wardrobe from './wardrobe';

const manifest: PlatformManifest = {
  clientId: 'travel-experience',
  theme: 'travel-experience',
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
    productName: 'Travel Experience',
    logoSrc: '',
    logoAlt: 'NO.MAD LAB',
    landingSrc: '/brand/travel-experience/landing/peach-studio-background.png',
    landingArtSrc: '/brand/travel-experience/landing/title-block-left.png',
    landingFiguresSrc: '/brand/travel-experience/landing/figuras-latinoamerica.png',
    landingPlate: true,
    landingAlt: 'Experiencia cultural Latinoamérica. Tradición, identidad, cultura.',
  },
  wardrobe,
  copy,
};

export default manifest;
