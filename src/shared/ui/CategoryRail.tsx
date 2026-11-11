/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import type { WardrobeItem } from '@/shared/types';
import { ShirtIcon } from '@/shared/components/icons';
import { cn } from '@/shared/lib/utils';
import styles from './CategoryRail.module.css';

export type WardrobeCategory = WardrobeItem['category'];

const CATEGORY_LABELS: Record<WardrobeCategory, string> = {
  tops: 'Tops',
  bottoms: 'Bottoms',
  kits: 'Sets',
  hats: 'Hats',
  glasses: 'Glasses',
};

const BottomsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M6 2h12v4l-1.5 16H7.5L6 6V2z" />
    <path d="M9 6h6" />
    <path d="M8.5 14h7" />
  </svg>
);

const SetsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M8 3h8l1 4H7l1-4z" />
    <path d="M7 7h10l-1.5 14H8.5L7 7z" />
    <path d="M10 11h4" />
  </svg>
);

const HatsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M4 14c0-3 3.5-5 8-5s8 2 8 5" />
    <path d="M3 14h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z" />
    <path d="M9 9V7a3 3 0 0 1 6 0v2" />
  </svg>
);

const GlassesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="6.5" cy="13.5" r="3.5" />
    <circle cx="17.5" cy="13.5" r="3.5" />
    <path d="M10 13.5h4" />
    <path d="M3 13.5H2" />
    <path d="M22 13.5h-1" />
  </svg>
);

const CATEGORY_ICONS: Record<WardrobeCategory, React.FC<React.SVGProps<SVGSVGElement>>> = {
  tops: ShirtIcon,
  bottoms: BottomsIcon,
  kits: SetsIcon,
  hats: HatsIcon,
  glasses: GlassesIcon,
};

export interface CategoryRailProps {
  activeCategory: WardrobeCategory;
  categories: ReadonlyArray<WardrobeCategory>;
  onCategoryChange: (category: WardrobeCategory) => void;
  categoryCounts?: Partial<Record<WardrobeCategory, number>>;
  categoryLabels?: Partial<Record<WardrobeCategory, string>>;
  className?: string;
}

const CategoryRail: React.FC<CategoryRailProps> = ({
  activeCategory,
  categories,
  onCategoryChange,
  categoryCounts,
  categoryLabels,
  className,
}) => {
  return (
    <nav className={cn(styles.rail, className)} aria-label="Wardrobe categories">
      <ul className={styles.list}>
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category];
          const isActive = activeCategory === category;
          const count = categoryCounts?.[category];
          const label = categoryLabels?.[category] ?? CATEGORY_LABELS[category];

          return (
            <li key={category}>
              <button
                type="button"
                className={cn(styles.item, isActive ? styles.itemActive : styles.itemIdle)}
                onClick={() => onCategoryChange(category)}
                aria-current={isActive ? 'true' : undefined}
                aria-label={
                  typeof count === 'number' && count > 0
                    ? `${label}, ${count}`
                    : label
                }
              >
                <span className={styles.iconWrap} aria-hidden>
                  <Icon className={styles.icon} />
                </span>
                <span className={styles.labelRow}>
                  <span className={styles.label}>{label}</span>
                  {typeof count === 'number' && count > 0 ? (
                    <span className={styles.count} aria-hidden>
                      {count}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default CategoryRail;
