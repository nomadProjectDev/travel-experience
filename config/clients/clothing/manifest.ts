import type { PlatformManifest } from '../../types';
import copy from './copy';
import wardrobe from './wardrobe';

const manifest: PlatformManifest = {
  clientId: 'clothing',
  theme: 'lifestyle-sport',
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
  brand: { productName: 'FASHION', logoSrc: '', logoAlt: 'Fashion virtual try-on' },
  wardrobe,
  copy,
  environmentScenes: {
    presets: [{ id: 'city' }, { id: 'sunset-cafe' }, { id: 'beach' }],
  },
};

export default manifest;
