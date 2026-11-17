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
      '/brand/travel-experience/landing/peach-studio-background.png',
    );
    expect(manifest.brand.landingArtSrc).toBe(
      '/brand/travel-experience/landing/title-block-left.png',
    );
    expect(manifest.brand.landingFiguresSrc).toBe(
      '/brand/travel-experience/landing/figuras-latinoamerica.png',
    );
    expect(manifest.copy.landing.plateEyebrow).toBe('Experiencia cultural');
    expect(manifest.copy.landing.plateTitle).toBe('Latinoamérica');
    expect(manifest.copy.landing.plateTagline).toBe('Tradición · Identidad · Cultura');
    expect(manifest.copy.landing.privacyNote).toBe(
      'La cámara solo se usa durante esta sesión.',
    );
    expect(manifest.brand.landingPlate).toBe(true);
    expect(manifest.brand.landingAlt).toBe(
      'Experiencia cultural Latinoamérica. Tradición, identidad, cultura.',
    );
    expect(existsSync(`public${manifest.brand.landingSrc}`)).toBe(true);
    expect(existsSync(`public${manifest.brand.landingArtSrc}`)).toBe(true);
    expect(existsSync(`public${manifest.brand.landingFiguresSrc}`)).toBe(true);
    expect(manifest.copy.brickStudio?.liveBadge).toBe('En vivo');
  });
});
