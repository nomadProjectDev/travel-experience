import { describe, expect, it } from 'vitest';
import { clothingWardrobe } from '../../config/clients/clothing/wardrobe';
import type { WardrobeItem } from '@config/types';
import {
  DECART_VTON_MAX_PROMPT_CHARS,
  buildDecartVtonPrompt,
} from './decart-vton.prompts';

describe('buildDecartVtonPrompt', () => {
  it('uses curated vtonPrompt with enhance:false for every clothing catalog item', () => {
    expect(clothingWardrobe.length).toBeGreaterThan(0);

    for (const item of clothingWardrobe) {
      const spec = buildDecartVtonPrompt(item);
      expect(spec.enhance).toBe(false);
      expect(spec.prompt.length).toBeGreaterThan(20);
      expect(spec.prompt.length).toBeLessThanOrEqual(DECART_VTON_MAX_PROMPT_CHARS);

      if (item.category === 'tops') {
        expect(spec.prompt.startsWith('Substitute the upper body garment with')).toBe(true);
      } else if (item.category === 'bottoms') {
        expect(spec.prompt.startsWith('Substitute the lower body garment with')).toBe(true);
      }
    }
  });

  it('builds a fallback prompt with enhance:true when vtonPrompt is omitted', () => {
    const customTop: WardrobeItem = {
      id: 'custom-top',
      name: 'Oversized Navy Hoodie',
      url: '/garments/clothing/tops/custom.webp',
      category: 'tops',
    };
    const spec = buildDecartVtonPrompt(customTop);
    expect(spec.enhance).toBe(true);
    expect(spec.prompt).toBe('Substitute the upper body garment with Oversized Navy Hoodie.');
  });

  it('uses Add prefix for hats and glasses', () => {
    const hatItem: WardrobeItem = {
      id: 'custom-hat',
      name: 'black ribbed beanie',
      url: '/garments/clothing/hats/beanie.webp',
      category: 'hats',
    };
    const spec = buildDecartVtonPrompt(hatItem);
    expect(spec.enhance).toBe(true);
    expect(spec.prompt).toBe('Add black ribbed beanie to the outfit.');
  });
});
