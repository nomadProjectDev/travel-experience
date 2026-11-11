/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prompt builder for Decart Lucy VTON (`lucy-vton-3.6` / `lucy-vton-latest`).
 * Follows the official VTON 3.5 / 3.6 prompting guide:
 * - Single clear action ("Substitute the upper body garment with...",
 *   "Substitute the lower body garment with...", "Substitute the outfit with...",
 *   or "Add ... to the outfit").
 * - Under 750 characters (~20-30 words recommended).
 * - Pre-written catalog prompts disable server auto-enhancement (`enhance: false`)
 *   so the exact garment description is preserved.
 */

import type { WardrobeItem } from '@config/types';

export const DECART_VTON_MAX_PROMPT_CHARS = 750;

export interface DecartVtonPromptSpec {
  prompt: string;
  enhance: boolean;
}

function prefixForCategory(category: WardrobeItem['category']): string {
  switch (category) {
    case 'tops':
      return 'Substitute the upper body garment with';
    case 'bottoms':
      return 'Substitute the lower body garment with';
    case 'kits':
      return 'Substitute the outfit with';
    case 'hats':
      return 'Add';
    case 'glasses':
      return 'Add';
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

function clampPromptLength(raw: string): string {
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (normalized.length <= DECART_VTON_MAX_PROMPT_CHARS) {
    return normalized;
  }
  return `${normalized.slice(0, DECART_VTON_MAX_PROMPT_CHARS - 1).trimEnd()}.`;
}

/**
 * Resolve the VTON prompt and `enhance` flag for a catalog or uploaded garment.
 */
export function buildDecartVtonPrompt(item: WardrobeItem): DecartVtonPromptSpec {
  const curated = item.vtonPrompt?.trim();
  if (curated) {
    return {
      prompt: clampPromptLength(curated),
      enhance: false,
    };
  }

  const prefix = prefixForCategory(item.category);
  const detail = item.description?.trim() || item.name.trim();

  if (item.category === 'hats' || item.category === 'glasses') {
    const noun = item.category === 'glasses' ? `eyeglasses (${detail})` : detail;
    return {
      prompt: clampPromptLength(`${prefix} ${noun} to the outfit.`),
      enhance: true,
    };
  }

  return {
    prompt: clampPromptLength(`${prefix} ${detail}.`),
    enhance: true,
  };
}
