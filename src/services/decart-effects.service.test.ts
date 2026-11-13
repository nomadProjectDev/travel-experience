import { describe, expect, it, vi } from 'vitest';
import {
  CLAY_EFFECTS,
  DEFAULT_CLAY_EFFECT_ID,
  getClayEffect,
} from '@config/clients/navidad/effects';
import {
  applyClayEffect,
  buildClayEffectSetInput,
  DECART_EFFECTS_MAX_PROMPT_CHARS,
  DECART_EFFECTS_MAX_PROMPT_WORDS,
  type ClayEffectSetClient,
} from './decart-effects.service';

const FORBIDDEN_BRAND_TERMS =
  /\blego\b|\bminifigure\b|interlocking bricks?|c-hands?|\bbrand(?:s| names?)?\b/i;

function createClient() {
  const set = vi.fn<ClayEffectSetClient['set']>().mockResolvedValue(undefined);
  return {
    client: { set } satisfies ClayEffectSetClient,
    set,
  };
}

describe('Decart clay effect payloads', () => {
  it('starts Decart with the handcrafted Papá Noel prompt and no image conditioning', () => {
    const initialEffect = getClayEffect(DEFAULT_CLAY_EFFECT_ID);

    expect(initialEffect.id).toBe('noel');
    expect(buildClayEffectSetInput(initialEffect)).toEqual({
      prompt: initialEffect.prompt,
      enhance: false,
      image: null,
    });
  });

  it('keeps every final outgoing prompt within the realtime budget', () => {
    for (const effect of CLAY_EFFECTS) {
      const payload = buildClayEffectSetInput(effect);
      expect(payload.prompt).toBe(effect.prompt.trim());
      expect(payload.prompt).toBeTypeOf('string');
      const prompt = payload.prompt as string;
      expect(prompt.length).toBeLessThanOrEqual(DECART_EFFECTS_MAX_PROMPT_CHARS);
      expect(prompt.split(/\s+/).length).toBeLessThanOrEqual(
        DECART_EFFECTS_MAX_PROMPT_WORDS,
      );
      expect(payload).toEqual({
        prompt,
        enhance: false,
        image: null,
      });
    }
  });

  it('rejects an oversized final prompt before calling Decart', () => {
    const effect = {
      ...getClayEffect('duende'),
      prompt: Array.from({ length: DECART_EFFECTS_MAX_PROMPT_WORDS + 1 }, () => 'word').join(' '),
    };

    expect(() => buildClayEffectSetInput(effect)).toThrow(/exceeds the realtime budget/i);
  });

  it('sends the Papá Noel reference Blob with the exact brand-neutral payload', async () => {
    const effect = getClayEffect('santa-lego');
    const image = new Blob(['papá noel'], { type: 'image/jpeg' });
    const loadImage = vi.fn().mockResolvedValue(image);
    const { client, set } = createClient();

    await applyClayEffect(client, effect, loadImage);

    expect(loadImage).toHaveBeenCalledOnce();
    expect(loadImage).toHaveBeenCalledWith(
      '/brand/navidad/effects/santa-blocks.jpg',
    );
    expect(set).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith({
      prompt: effect.prompt,
      enhance: false,
      image,
    });
    expect(effect.prompt).not.toMatch(FORBIDDEN_BRAND_TERMS);
  });

  it('clears image state for realistic Papá Noel and every other unconditioned effect', async () => {
    const loadImage = vi.fn();
    const { client, set } = createClient();
    const otherEffects = CLAY_EFFECTS.filter(
      (effect) => effect.id !== 'santa-lego',
    );

    for (const effect of otherEffects) {
      await applyClayEffect(client, effect, loadImage);
    }

    expect(loadImage).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledTimes(otherEffects.length);
    expect(otherEffects).toContainEqual(getClayEffect('santa-realista'));
    otherEffects.forEach((effect, index) => {
      expect(set).toHaveBeenNthCalledWith(index + 1, {
        prompt: effect.prompt,
        enhance: false,
        image: null,
      });
    });
  });

  it('falls back to the exact text-only payload when the image cannot load', async () => {
    const effect = getClayEffect('santa-lego');
    const loadImage = vi.fn().mockRejectedValue(new Error('image unavailable'));
    const { client, set } = createClient();

    await expect(applyClayEffect(client, effect, loadImage)).resolves.toBeUndefined();
    expect(set).toHaveBeenCalledWith({
      prompt: effect.prompt,
      enhance: false,
      image: null,
    });
  });
});
