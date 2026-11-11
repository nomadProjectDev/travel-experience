/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WardrobeItem } from '@/shared/types';

export type WardrobeCategory = WardrobeItem['category'];
export type SlotKey = WardrobeCategory;

export interface ActiveSlot {
  garmentId: string | null;
  visible: boolean;
}

export type ActiveSlots = Record<SlotKey, ActiveSlot>;

export interface RenderPlanEntry {
  slot: SlotKey;
  garmentId: string;
}

/** Canonical menu order for category selectors and look stack UI. */
export const MENU_SLOT_ORDER: ReadonlyArray<SlotKey> = [
  'tops',
  'bottoms',
  'hats',
  'glasses',
  'kits',
] as const;

export const SLOT_ORDER: ReadonlyArray<SlotKey> = [
  'kits',
  'bottoms',
  'tops',
  'hats',
  'glasses',
] as const;

export const createInitialActiveSlots = (): ActiveSlots => ({
  tops: { garmentId: null, visible: true },
  bottoms: { garmentId: null, visible: true },
  kits: { garmentId: null, visible: true },
  hats: { garmentId: null, visible: true },
  glasses: { garmentId: null, visible: true },
});

export const cloneActiveSlots = (slots: ActiveSlots): ActiveSlots => ({
  tops: { ...slots.tops },
  bottoms: { ...slots.bottoms },
  kits: { ...slots.kits },
  hats: { ...slots.hats },
  glasses: { ...slots.glasses },
});

/**
 * Resolve category conflicts with predictable slot semantics:
 * - Selecting a kit replaces any previous kit and clears tops/bottoms.
 * - Selecting tops/bottoms clears any active kit.
 * - Hats and glasses are independent face/head slots.
 */
export const resolveSlotsForGarmentSelection = (
  previousSlots: ActiveSlots,
  garment: WardrobeItem
): ActiveSlots => {
  const nextSlots = cloneActiveSlots(previousSlots);

  if (garment.category === 'kits') {
    nextSlots.kits = { garmentId: garment.id, visible: true };
    nextSlots.tops = { garmentId: null, visible: true };
    nextSlots.bottoms = { garmentId: null, visible: true };
    return nextSlots;
  }

  if (garment.category === 'tops' || garment.category === 'bottoms') {
    nextSlots.kits = { garmentId: null, visible: true };
  }

  nextSlots[garment.category] = {
    garmentId: garment.id,
    visible: true,
  };
  return nextSlots;
};

export const toggleSlotVisibility = (slots: ActiveSlots, slot: SlotKey): ActiveSlots => ({
  ...cloneActiveSlots(slots),
  [slot]: { ...slots[slot], visible: !slots[slot].visible },
});

export const clearSlot = (slots: ActiveSlots, slot: SlotKey): ActiveSlots => ({
  ...cloneActiveSlots(slots),
  [slot]: { ...slots[slot], garmentId: null, visible: true },
});

/** Deterministic compose order derived from canonical slot state. */
export const deriveRenderPlan = (slots: ActiveSlots): RenderPlanEntry[] =>
  SLOT_ORDER.flatMap((slot) => {
    const active = slots[slot];
    if (!active.garmentId || !active.visible) return [];
    if (slot === 'tops' || slot === 'bottoms') {
      if (slots.kits.garmentId && slots.kits.visible) return [];
    }
    return [{ slot, garmentId: active.garmentId }];
  });

export const getAllActiveGarmentIds = (slots: ActiveSlots): string[] =>
  SLOT_ORDER.flatMap((slot) => {
    const garmentId = slots[slot].garmentId;
    return garmentId ? [garmentId] : [];
  });

export const getVisibleActiveGarmentIds = (slots: ActiveSlots): string[] =>
  deriveRenderPlan(slots).map((entry) => entry.garmentId);

export const findSlotByGarmentId = (slots: ActiveSlots, garmentId: string): SlotKey | null => {
  for (const slot of SLOT_ORDER) {
    if (slots[slot].garmentId === garmentId) return slot;
  }
  return null;
};

export const buildVisibleLookSignature = (slots: ActiveSlots): string => {
  const visiblePlan = deriveRenderPlan(slots);
  if (visiblePlan.length === 0) return 'base';
  return visiblePlan.map(({ slot, garmentId }) => `${slot}:${garmentId}`).join('|');
};

/**
 * Utility case matrix (manual/mental tests when no test runner is wired):
 * 1) kit selected => renderPlan includes kit, excludes tops+bottoms, keeps hats.
 * 2) top selected while kit active => kit is cleared, top can render.
 * 3) hide/show any slot => garment id remains, only visible flags change.
 * 4) repeated toggles => deriveRenderPlan is pure and deterministic from slots.
 */
