/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { cn } from '@/shared/lib/utils';
import { CheckCircleIcon } from '@/shared/components/icons';
import styles from './GarmentTile.module.css';

export interface GarmentTileProps {
  name: string;
  imageUrl: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onSelect: () => void;
  className?: string;
  /** Stacked caption below image (studio rail scroller) */
  layout?: 'overlay' | 'stacked';
  /** Active badge label (defaults to English apparel copy). */
  activeLabel?: string;
}

const GarmentTile: React.FC<GarmentTileProps> = ({
  name,
  imageUrl,
  isActive = false,
  isDisabled = false,
  onSelect,
  className,
  layout = 'overlay',
  activeLabel = 'On look',
}) => (
  <button
    type="button"
    onClick={onSelect}
    disabled={isDisabled}
    className={cn(
      styles.root,
      layout === 'stacked' && styles.rootStacked,
      isActive && styles.activeRing,
      isActive && layout === 'stacked' && styles.activeRingStacked,
      className
    )}
    aria-label={`Select ${name}`}
    aria-pressed={isActive}
  >
    <img src={imageUrl} alt={name} className={styles.image} />
    <div className={styles.labelBar}>
      <p className={styles.label}>{name}</p>
    </div>
    {isActive ? (
      <div className={styles.selectedOverlay}>
        <div className={styles.selectedBadge}>
          <CheckCircleIcon className="w-5 h-5" />
        </div>
        <span className={styles.selectedText}>{activeLabel}</span>
      </div>
    ) : null}
  </button>
);

export default GarmentTile;
