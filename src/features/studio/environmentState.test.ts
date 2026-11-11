import { describe, expect, it } from 'vitest';
import {
  EnvironmentVariantCache,
  buildEnvironmentCacheKey,
  formatEnvironmentCreatingMessage,
  isGeneratedEnvironmentId,
  isStaleEnvironmentRequest,
} from './environmentState';

describe('environmentState', () => {
  it('builds cache keys per frame and environment', () => {
    expect(buildEnvironmentCacheKey('frame-a', 'beach')).toBe('frame-a:beach');
    expect(buildEnvironmentCacheKey('frame-b', 'beach')).toBe('frame-b:beach');
    expect(buildEnvironmentCacheKey('frame-a', 'city')).toBe('frame-a:city');
  });

  it('treats studio as non-generated restore', () => {
    expect(isGeneratedEnvironmentId('studio')).toBe(false);
    expect(isGeneratedEnvironmentId('beach')).toBe(true);
    expect(isGeneratedEnvironmentId('sunset-cafe')).toBe(true);
  });

  it('detects stale environment request tokens', () => {
    expect(isStaleEnvironmentRequest(2, 1)).toBe(true);
    expect(isStaleEnvironmentRequest(3, 3)).toBe(false);
  });

  it('formats creating copy with environment label', () => {
    expect(
      formatEnvironmentCreatingMessage('Creando tu foto en {environment}…', 'Playa'),
    ).toBe('Creando tu foto en Playa…');
  });

  it('LRU cache keeps newest entries and refreshes on get', () => {
    const cache = new EnvironmentVariantCache(3);
    cache.set('a:beach', 'img-a');
    cache.set('b:beach', 'img-b');
    cache.set('c:city', 'img-c');
    expect(cache.size).toBe(3);

    // Refresh "a" so "b" becomes oldest.
    expect(cache.get('a:beach')).toBe('img-a');
    cache.set('d:mountain', 'img-d');

    expect(cache.has('b:beach')).toBe(false);
    expect(cache.get('a:beach')).toBe('img-a');
    expect(cache.get('c:city')).toBe('img-c');
    expect(cache.get('d:mountain')).toBe('img-d');
    expect(cache.size).toBe(3);
  });

  it('clear wipes all variants', () => {
    const cache = new EnvironmentVariantCache(8);
    cache.set('frame:beach', 'img');
    cache.clear();
    expect(cache.get('frame:beach')).toBeUndefined();
    expect(cache.size).toBe(0);
  });
});
