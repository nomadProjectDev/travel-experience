import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getManifest, isFeatureEnabled } from './index';

describe('manifest resolution', () => {
  it('resolves travel experience as the default client', () => {
    const manifest = getManifest();
    expect(manifest.clientId).toBe('travel-experience');
    expect(manifest.wardrobe).toEqual([]);
    expect(manifest.copy.landing.ctaLabel).toBe('Comenzar experiencia');
  });

  it('resolves theme from client manifest', () => {
    expect(getManifest().theme).toBe('travel-experience');
  });

  it('runs the web try-on flow without background audio', () => {
    expect(getManifest().features.backgroundAudio).toBe(false);
  });

  it('provides feature flags with correct defaults', () => {
    const manifest = getManifest();
    expect(manifest.features.videoLoop).toBe(false);
    expect(manifest.features.wardrobeFeed).toBe(false);
    expect(manifest.features.studioChrome).toBe('side-rail');
    expect(manifest.features.portraitFraming).toBe('full-body');
    expect(manifest.display).toEqual({
      mode: 'mupi',
      targetWidth: 1080,
      targetHeight: 1920,
    });
  });

  it('isFeatureEnabled reads from manifest', () => {
    expect(isFeatureEnabled('videoLoop')).toBe(false);
    expect(isFeatureEnabled('wardrobeFeed')).toBe(false);
  });

  it('opens on the Travel Experience landing', () => {
    const manifest = getManifest();
    expect(`${manifest.copy.landing.titleLine1} ${manifest.copy.landing.titleLine2}`).toBe(
      'Travel Experience',
    );
    expect(manifest.copy.landing.eyebrow).toBe('NO.MAD LAB');
    expect(manifest.copy.landing.subtitle).toBe(
      'México · Perú · Colombia · Argentina · Chile · Puerto Rico',
    );
    expect(manifest.brand.landingSrc).toBe(
      '/brand/travel-experience/landing/experiencia-cultural-latinoamerica.jpg',
    );
    expect(manifest.brand.landingPlate).toBe(true);
    expect(manifest.brand.landingAlt).toBe('Experiencia cultural. Latinoamérica.');
    expect(existsSync(`public${manifest.brand.landingSrc}`)).toBe(true);
    expect(manifest.copy.brickStudio?.liveBadge).toBe('En vivo');
  });
});
