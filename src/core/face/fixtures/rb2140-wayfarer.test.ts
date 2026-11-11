import { describe, expect, it } from 'vitest';
import type { PublishedFrameMeasurements } from '../types';
import fixture from './rb2140-wayfarer.json';

describe('rb2140-wayfarer fixture', () => {
  it('documents a real published SKU with citation URL', () => {
    const frame = fixture as PublishedFrameMeasurements;
    expect(frame.sku).toMatch(/RB2140/i);
    expect(frame.measurementsMm.lensWidth).toBe(50);
    expect(frame.measurementsMm.bridge).toBe(22);
    expect(frame.measurementsMm.temple).toBe(150);
    expect(frame.sourceUrl).toMatch(/^https:\/\//);
    expect(frame.wardrobeAnalogueId).toBe('frame-square-04');
  });
});
