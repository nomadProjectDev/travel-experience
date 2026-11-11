import { describe, expect, it } from 'vitest';
import type { WardrobeItem } from '@/shared/types';
import {
  buildVisibleLookSignature,
  clearSlot,
  createInitialActiveSlots,
  deriveRenderPlan,
  findSlotByGarmentId,
  getAllActiveGarmentIds,
  getVisibleActiveGarmentIds,
  MENU_SLOT_ORDER,
  resolveSlotsForGarmentSelection,
  toggleSlotVisibility,
} from './lookComposition';

const garment = (id: string, category: WardrobeItem['category']): WardrobeItem => ({
  id,
  category,
  name: id,
  url: `https://example.com/${id}.png`,
});

describe('look composition slot rules', () => {
  it('builds same final composition for top->bottom->hat and hat->top->bottom', () => {
    const top = garment('top-alpha', 'tops');
    const bottom = garment('bottom-alpha', 'bottoms');
    const hat = garment('hat-alpha', 'hats');

    const topBottomHat = resolveSlotsForGarmentSelection(
      resolveSlotsForGarmentSelection(
        resolveSlotsForGarmentSelection(createInitialActiveSlots(), top),
        bottom
      ),
      hat
    );

    const hatTopBottom = resolveSlotsForGarmentSelection(
      resolveSlotsForGarmentSelection(
        resolveSlotsForGarmentSelection(createInitialActiveSlots(), hat),
        top
      ),
      bottom
    );

    expect(deriveRenderPlan(topBottomHat)).toEqual([
      { slot: 'bottoms', garmentId: 'bottom-alpha' },
      { slot: 'tops', garmentId: 'top-alpha' },
      { slot: 'hats', garmentId: 'hat-alpha' },
    ]);
    expect(deriveRenderPlan(hatTopBottom)).toEqual([
      { slot: 'bottoms', garmentId: 'bottom-alpha' },
      { slot: 'tops', garmentId: 'top-alpha' },
      { slot: 'hats', garmentId: 'hat-alpha' },
    ]);
    expect(buildVisibleLookSignature(topBottomHat)).toBe(
      'bottoms:bottom-alpha|tops:top-alpha|hats:hat-alpha'
    );
    expect(buildVisibleLookSignature(hatTopBottom)).toBe(
      'bottoms:bottom-alpha|tops:top-alpha|hats:hat-alpha'
    );
  });

  it('keeps top and bottom when adding hat (top -> bottom -> hat)', () => {
    const top = garment('top-alpha', 'tops');
    const bottom = garment('bottom-alpha', 'bottoms');
    const hat = garment('hat-alpha', 'hats');

    const afterTop = resolveSlotsForGarmentSelection(createInitialActiveSlots(), top);
    const afterBottom = resolveSlotsForGarmentSelection(afterTop, bottom);
    const afterHat = resolveSlotsForGarmentSelection(afterBottom, hat);

    expect(deriveRenderPlan(afterHat)).toEqual([
      { slot: 'bottoms', garmentId: 'bottom-alpha' },
      { slot: 'tops', garmentId: 'top-alpha' },
      { slot: 'hats', garmentId: 'hat-alpha' },
    ]);
    expect(buildVisibleLookSignature(afterHat)).toBe(
      'bottoms:bottom-alpha|tops:top-alpha|hats:hat-alpha'
    );
  });

  it('keeps set when adding hat (set -> hat)', () => {
    const set = garment('set-alpha', 'kits');
    const hat = garment('hat-alpha', 'hats');

    const afterSet = resolveSlotsForGarmentSelection(createInitialActiveSlots(), set);
    const afterHat = resolveSlotsForGarmentSelection(afterSet, hat);

    expect(deriveRenderPlan(afterHat)).toEqual([
      { slot: 'kits', garmentId: 'set-alpha' },
      { slot: 'hats', garmentId: 'hat-alpha' },
    ]);
    expect(buildVisibleLookSignature(afterHat)).toBe('kits:set-alpha|hats:hat-alpha');
  });

  it('keeps apparel when adding glasses (independent face slot)', () => {
    const top = garment('top-alpha', 'tops');
    const glasses = garment('glasses-alpha', 'glasses');

    const afterTop = resolveSlotsForGarmentSelection(createInitialActiveSlots(), top);
    const afterGlasses = resolveSlotsForGarmentSelection(afterTop, glasses);

    expect(deriveRenderPlan(afterGlasses)).toEqual([
      { slot: 'tops', garmentId: 'top-alpha' },
      { slot: 'glasses', garmentId: 'glasses-alpha' },
    ]);
    expect(buildVisibleLookSignature(afterGlasses)).toBe(
      'tops:top-alpha|glasses:glasses-alpha',
    );
  });

  it('replaces top+bottom with set and keeps hat', () => {
    const top = garment('top-alpha', 'tops');
    const bottom = garment('bottom-alpha', 'bottoms');
    const hat = garment('hat-alpha', 'hats');
    const set = garment('set-alpha', 'kits');

    const withTopBottomHat = resolveSlotsForGarmentSelection(
      resolveSlotsForGarmentSelection(
        resolveSlotsForGarmentSelection(createInitialActiveSlots(), top),
        bottom
      ),
      hat
    );
    const withHiddenTop = toggleSlotVisibility(withTopBottomHat, 'tops');
    const withSet = resolveSlotsForGarmentSelection(withHiddenTop, set);

    expect(withSet.tops).toEqual({ garmentId: null, visible: true });
    expect(withSet.bottoms).toEqual({ garmentId: null, visible: true });
    expect(deriveRenderPlan(withSet)).toEqual([
      { slot: 'kits', garmentId: 'set-alpha' },
      { slot: 'hats', garmentId: 'hat-alpha' },
    ]);
    expect(buildVisibleLookSignature(withSet)).toBe('kits:set-alpha|hats:hat-alpha');
  });

  it('preserves garment ids across visibility toggles', () => {
    const top = garment('top-alpha', 'tops');
    const bottom = garment('bottom-alpha', 'bottoms');
    const hat = garment('hat-alpha', 'hats');

    const withLayers = resolveSlotsForGarmentSelection(
      resolveSlotsForGarmentSelection(
        resolveSlotsForGarmentSelection(createInitialActiveSlots(), top),
        bottom
      ),
      hat
    );

    const hiddenHat = toggleSlotVisibility(withLayers, 'hats');
    expect(hiddenHat.hats.garmentId).toBe('hat-alpha');
    expect(hiddenHat.hats.visible).toBe(false);
    expect(deriveRenderPlan(hiddenHat)).toEqual([
      { slot: 'bottoms', garmentId: 'bottom-alpha' },
      { slot: 'tops', garmentId: 'top-alpha' },
    ]);

    const visibleHatAgain = toggleSlotVisibility(hiddenHat, 'hats');
    expect(visibleHatAgain.hats.garmentId).toBe('hat-alpha');
    expect(visibleHatAgain.hats.visible).toBe(true);
    expect(deriveRenderPlan(visibleHatAgain)).toEqual([
      { slot: 'bottoms', garmentId: 'bottom-alpha' },
      { slot: 'tops', garmentId: 'top-alpha' },
      { slot: 'hats', garmentId: 'hat-alpha' },
    ]);
  });

  it('keeps hat active while toggling top visibility', () => {
    const top = garment('top-alpha', 'tops');
    const bottom = garment('bottom-alpha', 'bottoms');
    const hat = garment('hat-alpha', 'hats');

    const withLayers = resolveSlotsForGarmentSelection(
      resolveSlotsForGarmentSelection(
        resolveSlotsForGarmentSelection(createInitialActiveSlots(), top),
        bottom
      ),
      hat
    );

    const topHidden = toggleSlotVisibility(withLayers, 'tops');
    expect(deriveRenderPlan(topHidden)).toEqual([
      { slot: 'bottoms', garmentId: 'bottom-alpha' },
      { slot: 'hats', garmentId: 'hat-alpha' },
    ]);
    expect(buildVisibleLookSignature(topHidden)).toBe('bottoms:bottom-alpha|hats:hat-alpha');

    const topVisibleAgain = toggleSlotVisibility(topHidden, 'tops');
    expect(deriveRenderPlan(topVisibleAgain)).toEqual([
      { slot: 'bottoms', garmentId: 'bottom-alpha' },
      { slot: 'tops', garmentId: 'top-alpha' },
      { slot: 'hats', garmentId: 'hat-alpha' },
    ]);
    expect(buildVisibleLookSignature(topVisibleAgain)).toBe(
      'bottoms:bottom-alpha|tops:top-alpha|hats:hat-alpha'
    );
  });

  it('clears active kit when selecting top and keeps hat', () => {
    const set = garment('set-alpha', 'kits');
    const top = garment('top-alpha', 'tops');
    const hat = garment('hat-alpha', 'hats');

    const withSetAndHat = resolveSlotsForGarmentSelection(
      resolveSlotsForGarmentSelection(createInitialActiveSlots(), set),
      hat
    );
    const afterTop = resolveSlotsForGarmentSelection(withSetAndHat, top);

    expect(afterTop.kits).toEqual({ garmentId: null, visible: true });
    expect(deriveRenderPlan(afterTop)).toEqual([
      { slot: 'tops', garmentId: 'top-alpha' },
      { slot: 'hats', garmentId: 'hat-alpha' },
    ]);
    expect(buildVisibleLookSignature(afterTop)).toBe('tops:top-alpha|hats:hat-alpha');
  });

  it('returns base signature when all active layers are hidden', () => {
    const top = garment('top-alpha', 'tops');
    const bottom = garment('bottom-alpha', 'bottoms');
    const hat = garment('hat-alpha', 'hats');

    const withLayers = resolveSlotsForGarmentSelection(
      resolveSlotsForGarmentSelection(
        resolveSlotsForGarmentSelection(createInitialActiveSlots(), top),
        bottom
      ),
      hat
    );
    const withAllHidden = toggleSlotVisibility(
      toggleSlotVisibility(toggleSlotVisibility(withLayers, 'tops'), 'bottoms'),
      'hats'
    );

    expect(deriveRenderPlan(withAllHidden)).toEqual([]);
    expect(buildVisibleLookSignature(withAllHidden)).toBe('base');
  });

  it('clearSlot removes garment and restores visibility', () => {
    const top = garment('top-alpha', 'tops');

    const withTop = resolveSlotsForGarmentSelection(createInitialActiveSlots(), top);
    const hiddenTop = toggleSlotVisibility(withTop, 'tops');
    const clearedTop = clearSlot(hiddenTop, 'tops');

    expect(clearedTop.tops).toEqual({ garmentId: null, visible: true });
    expect(buildVisibleLookSignature(clearedTop)).toBe('base');
  });

  it('is idempotent when selecting the same garment again', () => {
    const top = garment('top-alpha', 'tops');
    const once = resolveSlotsForGarmentSelection(createInitialActiveSlots(), top);
    const twice = resolveSlotsForGarmentSelection(once, top);

    expect(twice).toEqual(once);
    expect(deriveRenderPlan(twice)).toEqual([{ slot: 'tops', garmentId: 'top-alpha' }]);
  });

  it('excludes hidden garments from visible ids but keeps them in active ids', () => {
    const top = garment('top-alpha', 'tops');
    const bottom = garment('bottom-alpha', 'bottoms');

    const withLayers = resolveSlotsForGarmentSelection(
      resolveSlotsForGarmentSelection(createInitialActiveSlots(), top),
      bottom
    );
    const topHidden = toggleSlotVisibility(withLayers, 'tops');

    expect(getAllActiveGarmentIds(topHidden).sort()).toEqual(['bottom-alpha', 'top-alpha']);
    expect(getVisibleActiveGarmentIds(topHidden)).toEqual(['bottom-alpha']);
  });

  it('finds slot by garment id across categories', () => {
    const hat = garment('hat-alpha', 'hats');
    const withHat = resolveSlotsForGarmentSelection(createInitialActiveSlots(), hat);

    expect(findSlotByGarmentId(withHat, 'hat-alpha')).toBe('hats');
    expect(findSlotByGarmentId(withHat, 'missing')).toBeNull();
  });

  it('keeps kits + hats when adding bottom after kit', () => {
    const kit = garment('kit-alpha', 'kits');
    const hat = garment('hat-alpha', 'hats');
    const bottom = garment('bottom-alpha', 'bottoms');

    const withKitHat = resolveSlotsForGarmentSelection(
      resolveSlotsForGarmentSelection(createInitialActiveSlots(), kit),
      hat
    );
    const withBottom = resolveSlotsForGarmentSelection(withKitHat, bottom);

    expect(withBottom.kits.garmentId).toBeNull();
    expect(deriveRenderPlan(withBottom)).toEqual([
      { slot: 'bottoms', garmentId: 'bottom-alpha' },
      { slot: 'hats', garmentId: 'hat-alpha' },
    ]);
  });

  it('stabilizes signature through a long visibility toggle chain', () => {
    const top = garment('top-alpha', 'tops');
    const bottom = garment('bottom-alpha', 'bottoms');
    const hat = garment('hat-alpha', 'hats');

    const full = resolveSlotsForGarmentSelection(
      resolveSlotsForGarmentSelection(
        resolveSlotsForGarmentSelection(createInitialActiveSlots(), top),
        bottom
      ),
      hat
    );
    const signature = buildVisibleLookSignature(full);

    const chain = toggleSlotVisibility(
      toggleSlotVisibility(toggleSlotVisibility(full, 'hats'), 'bottoms'),
      'tops'
    );
    expect(buildVisibleLookSignature(chain)).toBe('base');

    const restored = toggleSlotVisibility(
      toggleSlotVisibility(toggleSlotVisibility(chain, 'tops'), 'bottoms'),
      'hats'
    );
    expect(buildVisibleLookSignature(restored)).toBe(signature);
  });

  it('double toggle on one slot restores original visibility', () => {
    const bottom = garment('bottom-alpha', 'bottoms');
    const withBottom = resolveSlotsForGarmentSelection(createInitialActiveSlots(), bottom);
    const toggled = toggleSlotVisibility(withBottom, 'bottoms');
    const restored = toggleSlotVisibility(toggled, 'bottoms');

    expect(restored.bottoms.visible).toBe(true);
    expect(buildVisibleLookSignature(restored)).toBe('bottoms:bottom-alpha');
  });

  it('exposes menu slot order with kits last', () => {
    expect(MENU_SLOT_ORDER.at(-1)).toBe('kits');
    expect(MENU_SLOT_ORDER).toEqual(['tops', 'bottoms', 'hats', 'glasses', 'kits']);
  });
});
