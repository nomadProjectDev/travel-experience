/**
 * Skeleton for a new client deployment.
 *
 * Prefer: `npm run new-client <id>` then add logo + garments.
 * Manual: copy config/clients/_template/ to config/clients/<id>/ and register in config/registry.ts.
 *
 * This fork is eyewear-web oriented — defaults match a responsive storefront demo, not MUPI.
 */
import type { PlatformManifest } from '../../types';
import copy from './copy';
import wardrobe from './wardrobe';

const manifest: PlatformManifest = {
  clientId: 'CHANGE_ME',
  theme: 'lifestyle-sport',
  features: {
    videoLoop: true,
    wardrobeFeed: false,
  },
  brand: {
    productName: 'Client Name',
    logoSrc: '/brand/CHANGE_ME/logo.png',
    logoAlt: 'Client Name',
  },
  wardrobe,
  copy,
};

export default manifest;
