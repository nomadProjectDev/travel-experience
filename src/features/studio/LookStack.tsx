import React from 'react';
import type { PlatformCopy } from '@config';
import type { WardrobeItem } from '@/shared/types';
import { MENU_SLOT_ORDER, type ActiveSlots, type SlotKey } from '@/core/look/lookComposition';
import { cn } from '@/shared/lib/utils';
import { EyeIcon, EyeOffIcon } from '@/shared/components/icons';
import styles from './LookStack.module.css';

export interface LookStackProps {
  activeSlots: ActiveSlots;
  wardrobeById: Record<string, WardrobeItem>;
  onToggleSlotVisibility: (slot: SlotKey) => void;
  copy: NonNullable<PlatformCopy['mupiStudio']>;
  isBusy?: boolean;
  panel?: boolean;
}

const FALLBACK_SLOT_LABELS: Record<SlotKey, string> = {
  tops: 'Parte de arriba',
  bottoms: 'Parte de abajo',
  kits: 'Kits',
  hats: 'Hats',
  glasses: 'Glasses',
};

const LookStack: React.FC<LookStackProps> = ({
  activeSlots,
  wardrobeById,
  onToggleSlotVisibility,
  copy,
  isBusy = false,
  panel = false,
}) => (
  <div className={cn(styles.stack, panel && styles.panel)}>
    {MENU_SLOT_ORDER.map((slot) => {
      const garmentId = activeSlots[slot].garmentId;
      const garment = garmentId ? wardrobeById[garmentId] : null;
      if (!garment && slot !== 'tops' && slot !== 'bottoms') return null;
      const isHidden = garment ? !activeSlots[slot].visible : false;
      const garmentName = garment?.name ?? copy.noItemSelected;
      const slotLabel =
        slot === 'tops'
          ? copy.topSlot
          : slot === 'bottoms'
            ? copy.bottomSlot
            : FALLBACK_SLOT_LABELS[slot];
      return (
        <section key={slot} className={styles.section}>
          <header className={styles.sectionHeader}>{slotLabel}</header>
          <div
            className={cn(
              styles.layer,
              garment && styles.layerActive,
              isHidden && styles.layerHidden,
              !garment && styles.layerEmpty,
              'animate-fade-in',
            )}
          >
            <div className={styles.layerContent}>
              {garment ? (
                <img
                  src={garment.url}
                  alt={garment.name}
                  className={cn(styles.thumb, isHidden && styles.thumbHidden)}
                />
              ) : null}
              <div className={styles.meta}>
                <p className={styles.name} title={garmentName}>{garmentName}</p>
                <p className={styles.categoryLabel}>
                  {garment
                    ? (isHidden ? copy.hidden : copy.visible)
                    : copy.chooseFromWardrobe}
                </p>
              </div>
            </div>
            {garment ? (
              <button
                type="button"
                onClick={() => onToggleSlotVisibility(slot)}
                className={styles.visibilityBtn}
                aria-label={isHidden ? `Mostrar ${garmentName}` : `Ocultar ${garmentName}`}
                aria-pressed={isHidden}
                disabled={isBusy}
              >
                {isHidden ? (
                  <EyeOffIcon className={styles.visibilityIcon} aria-hidden />
                ) : (
                  <EyeIcon className={styles.visibilityIcon} aria-hidden />
                )}
              </button>
            ) : null}
          </div>
        </section>
      );
    })}
  </div>
);

export default LookStack;
