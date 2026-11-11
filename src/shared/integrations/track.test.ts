import { describe, expect, it } from 'vitest';
import { trackEvent } from './track';

describe('trackEvent', () => {
  it('is a no-op without a beacon adapter', () => {
    expect(() => trackEvent('session_start', { step: 'landing' })).not.toThrow();
  });
});
