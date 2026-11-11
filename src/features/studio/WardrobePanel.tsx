import React, { useState } from 'react';
import type { PlatformCopy, WardrobeItem } from '@config';
import Alert from '@/shared/ui/Alert';
import SurfacePanel from '@/shared/ui/SurfacePanel';
import GarmentTile from '@/shared/ui/GarmentTile';
import CategoryRail from '@/shared/ui/CategoryRail';
import styles from '@/shared/ui/ProductRail.module.css';
import { urlToDecartGarmentFile } from '@/core/media/garmentFile';
import { MENU_SLOT_ORDER } from '@/core/look/lookComposition';

interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem) => void;
  activeGarmentIds: string[];
  isLoading: boolean;
  wardrobe: WardrobeItem[];
  copy: NonNullable<PlatformCopy['mupiStudio']>;
}

const WardrobePanel: React.FC<WardrobePanelProps> = ({
  onGarmentSelect,
  activeGarmentIds,
  isLoading,
  wardrobe,
  copy,
}) => {
  const [error, setError] = useState<string | null>(null);
  const availableCategories = MENU_SLOT_ORDER.filter(
    (category) =>
      (category === 'tops' || category === 'bottoms') &&
      wardrobe.some((item) => item.category === category),
  );
  const [activeCategory, setActiveCategory] = useState<WardrobeItem['category']>(
    availableCategories[0] ?? 'tops',
  );
  const filteredWardrobe = wardrobe.filter((item) => item.category === activeCategory);
  const categoryCounts = availableCategories.reduce<
    Partial<Record<WardrobeItem['category'], number>>
  >((counts, category) => {
    counts[category] = wardrobe.filter((item) => item.category === category).length;
    return counts;
  }, {});

  const handleGarmentClick = async (item: WardrobeItem) => {
    if (isLoading || activeGarmentIds.includes(item.id)) return;
    setError(null);
    try {
      const file = await urlToDecartGarmentFile(item.url, item.name);
      onGarmentSelect(file, item);
    } catch (selectionError) {
      console.error('[WardrobePanel] garment load failed', selectionError);
      setError(copy.loadError);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.wardrobeBody}>
        <CategoryRail
          activeCategory={activeCategory}
          categories={availableCategories}
          onCategoryChange={setActiveCategory}
          categoryCounts={categoryCounts}
          categoryLabels={{ tops: copy.tops, bottoms: copy.bottoms }}
          className={styles.categoryStrip}
        />
        <div className={styles.productArea}>
          {filteredWardrobe.length > 0 ? (
            <div className={styles.productList}>
              {filteredWardrobe.map((item) => (
                <GarmentTile
                  key={item.id}
                  name={item.name}
                  imageUrl={item.url}
                  layout="stacked"
                  activeLabel={copy.selected}
                  isActive={activeGarmentIds.includes(item.id)}
                  isDisabled={isLoading || activeGarmentIds.includes(item.id)}
                  onSelect={() => void handleGarmentClick(item)}
                />
              ))}
            </div>
          ) : (
            <SurfacePanel variant="matte" padding="md" className={styles.empty}>
              {copy.wardrobeHint}
            </SurfacePanel>
          )}
        </div>
      </div>
      {error ? (
        <Alert title={copy.wardrobeTitle} variant="danger">
          {error}
        </Alert>
      ) : null}
    </div>
  );
};

export default WardrobePanel;
