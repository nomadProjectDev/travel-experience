import React, { useMemo, useRef, useState } from 'react';
import type { PlatformCopy, WardrobeItem } from '@config';
import { urlToDecartGarmentFile } from '@/core/media/garmentFile';
import { CheckIcon, HeartIcon, RotateCcwIcon } from '@/shared/components/icons';
import { cn } from '@/shared/lib/utils';
import styles from './MupiWardrobeRail.module.css';

type ClothingCategory = Extract<WardrobeItem['category'], 'tops' | 'bottoms'>;

interface MupiWardrobeRailProps {
  brandName: string;
  wardrobe: WardrobeItem[];
  activeGarmentIds: string[];
  isLoading: boolean;
  displayImageUrl: string | null;
  copy: NonNullable<PlatformCopy['mupiStudio']>;
  onGarmentSelect: (file: File, item: WardrobeItem) => void;
  onSaveLook: () => void;
  onContinue: () => void;
  onStartOver: () => void;
}

const categoryLabel = (
  category: ClothingCategory,
  copy: NonNullable<PlatformCopy['mupiStudio']>,
): string => {
  switch (category) {
    case 'tops':
      return copy.tops;
    case 'bottoms':
      return copy.bottoms;
    default: {
      const exhaustive: never = category;
      return exhaustive;
    }
  }
};

const MupiWardrobeRail: React.FC<MupiWardrobeRailProps> = ({
  brandName,
  wardrobe,
  activeGarmentIds,
  isLoading,
  displayImageUrl,
  copy,
  onGarmentSelect,
  onSaveLook,
  onContinue,
  onStartOver,
}) => {
  const categories = useMemo(
    () =>
      (['tops', 'bottoms'] as const).filter((category) =>
        wardrobe.some((item) => item.category === category),
      ),
    [wardrobe],
  );
  const [activeCategory, setActiveCategory] = useState<ClothingCategory>(
    () => categories[0] ?? 'tops',
  );
  const [error, setError] = useState<string | null>(null);
  const selectLockRef = useRef(false);

  const visibleItems = wardrobe.filter((item) => item.category === activeCategory);

  const selectGarment = async (item: WardrobeItem) => {
    if (isLoading || selectLockRef.current || activeGarmentIds.includes(item.id)) return;
    selectLockRef.current = true;
    setError(null);
    try {
      const file = await urlToDecartGarmentFile(item.url, item.name);
      await onGarmentSelect(file, item);
    } catch (selectionError) {
      console.error('[MupiWardrobeRail] garment load failed', selectionError);
      setError(copy.loadError);
    } finally {
      selectLockRef.current = false;
    }
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <p className={styles.brand}>{brandName}</p>
        <h1 className={styles.title}>{copy.wardrobeTitle}</h1>
        <p className={styles.hint}>{copy.wardrobeHint}</p>
      </header>

      <nav className={styles.categories} aria-label={copy.wardrobeTitle}>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={cn(
              styles.category,
              activeCategory === category && styles.categoryActive,
            )}
            aria-pressed={activeCategory === category}
            onClick={() => setActiveCategory(category)}
          >
            {categoryLabel(category, copy)}
          </button>
        ))}
      </nav>

      <div className={styles.catalog} role="list">
        {visibleItems.map((item) => {
          const isActive = activeGarmentIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="listitem"
              className={cn(styles.tile, isActive && styles.tileActive)}
              disabled={isLoading}
              aria-pressed={isActive}
              onClick={() => void selectGarment(item)}
            >
              <span className={styles.imagePlate}>
                <img src={item.url} alt="" className={styles.image} />
                {isActive ? (
                  <span className={styles.selectedBadge}>
                    <CheckIcon aria-hidden />
                    {copy.selected}
                  </span>
                ) : null}
              </span>
              <span className={styles.itemName}>{item.name}</span>
            </button>
          );
        })}
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryAction}
          disabled={!displayImageUrl || isLoading}
          onClick={onSaveLook}
        >
          <HeartIcon aria-hidden />
          {copy.saveLook}
        </button>
        <button
          type="button"
          className={styles.primaryAction}
          disabled={isLoading}
          onClick={onContinue}
        >
          {copy.continue}
        </button>
        <button type="button" className={styles.restartAction} onClick={onStartOver}>
          <RotateCcwIcon aria-hidden />
          {copy.restart}
        </button>
      </div>
    </div>
  );
};

export default MupiWardrobeRail;
