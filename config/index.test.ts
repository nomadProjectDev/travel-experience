import { describe, expect, it } from 'vitest';
import { getManifest, isFeatureEnabled } from './index';

describe('manifest resolution', () => {
  it('resolves navidad effects as the default client', () => {
    const manifest = getManifest();
    expect(manifest.clientId).toBe('navidad');
    expect(manifest.wardrobe).toEqual([]);
    expect(manifest.copy.landing.ctaLabel).toBe('Empezar');
  });

  it('resolves theme from client manifest', () => {
    expect(getManifest().theme).toBe('navidad');
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

  it('opens on the multi-style festive landing', () => {
    const manifest = getManifest();
    expect(`${manifest.copy.landing.titleLine1} ${manifest.copy.landing.titleLine2}`).toBe(
      'Elige tu Navidad',
    );
    expect(manifest.copy.landing.subtitle).toMatch(/personaje navideño adorable/i);
    expect(manifest.copy.brickStudio?.liveBadge).toBe('En vivo');
  });
});
