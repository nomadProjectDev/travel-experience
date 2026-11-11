import type { PlatformManifest } from '../../types';
import copy from './copy';
import frameMeasurements from './frameMeasurements';
import wardrobe from './wardrobe';

const manifest: PlatformManifest = {
  clientId: 'eyewear',
  theme: 'eyewear',
  features: {
    videoLoop: true,
    wardrobeFeed: false,
    studioChrome: 'bottom-bar',
    portraitFraming: 'face',
    stylistAssistant: true,
    voiceStylist: false,
    backgroundAudio: false,
    environmentScenes: true,
    faceFitRecommendations: false,
  },
  brand: {
    productName: 'Eyewear',
    logoSrc: '',
    logoAlt: '',
  },
  wardrobe,
  frameMeasurements,
  copy,
  environmentScenes: {
    presets: [
      { id: 'beach' },
      { id: 'mountain' },
      { id: 'city' },
      { id: 'sunset-cafe' },
    ],
  },
};

export default manifest;
