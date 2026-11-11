import eyewearManifest from './clients/eyewear/manifest';
import clothingManifest from './clients/clothing/manifest';
import navidadManifest from './clients/navidad/manifest';
import type { PlatformManifest } from './types';

/**
 * Full client registry (dev tooling, tests, verify script).
 * Production bundles import only `@client-manifest` for the active VITE_CLIENT_ID.
 *
 * This fork ships the navidad claymation pack. `_template` is scaffolding only
 * (not registered). Clothing and eyewear stay in the tree from the clone.
 */
export const clientManifests: Record<string, PlatformManifest> = {
  eyewear: eyewearManifest,
  clothing: clothingManifest,
  navidad: navidadManifest,
};

export const REGISTERED_CLIENT_IDS = Object.keys(clientManifests);

export function resolveManifestForClient(clientId: string): PlatformManifest {
  const base = clientManifests[clientId];
  if (!base) {
    throw new Error(`[config] Unknown clientId "${clientId}"`);
  }
  return { ...base, clientId };
}
