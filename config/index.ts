import activeManifest from '@client-manifest';
import type {
  PlatformCopy,
  PlatformFeatures,
  PlatformManifest,
  WardrobeItem,
} from './types';

export type {
  PlatformBrand,
  PlatformCopy,
  PlatformFeatures,
  PlatformManifest,
  PlatformTheme,
  WardrobeItem,
} from './types';

export { REGISTERED_CLIENT_IDS, resolveManifestForClient } from './registry';

function parseEnvBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return value.trim() === 'true';
}

let _resolved: PlatformManifest | null = null;

/** Resolved manifest for this build (active client pack + `VITE_*` overrides). */
export function getManifest(): PlatformManifest {
  if (_resolved) return _resolved;

  const clientId = import.meta.env.VITE_CLIENT_ID?.trim() || activeManifest.clientId;

  const resolved: PlatformManifest = {
    ...activeManifest,
    clientId,
    features: {
      ...activeManifest.features,
      wardrobeFeed: parseEnvBool(
        import.meta.env.VITE_WARDROBE_FEED,
        activeManifest.features.wardrobeFeed,
      ),
      faceFitAnalysis: parseEnvBool(
        import.meta.env.VITE_FACE_FIT_ANALYSIS,
        activeManifest.features.faceFitAnalysis === true,
      ),
      faceFitRecommendations: parseEnvBool(
        import.meta.env.VITE_FACE_FIT_RECOMMENDATIONS,
        activeManifest.features.faceFitRecommendations === true,
      ),
    },
  };

  _resolved = resolved;
  return resolved;
}

/** Curated garment catalog for the active client pack. */
export function getWardrobe(): WardrobeItem[] {
  return getManifest().wardrobe;
}

/** UI copy for the active client pack. */
export function getCopy(): PlatformCopy {
  return getManifest().copy;
}

/** Interpolate `{year}` in footer copy lines. */
export function formatFooterLine(template: string, year = new Date().getFullYear()): string {
  return template.replace(/\{year\}/g, String(year));
}

export function isFeatureEnabled(feature: keyof PlatformFeatures): boolean {
  return Boolean(getManifest().features[feature]);
}

/** @internal Reset cached manifest (unit tests only). */
export function __resetManifestCacheForTests(): void {
  _resolved = null;
}
