/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Optical PDP entry inspired by Multiopticas web product pages:
 * large product photo + Probador virtual overlay, info column, trust rows,
 * short details, and a compact "Otras monturas" strip.
 */

import React, { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { WardrobeItem } from '@/shared/types';
import type { PlatformCopy } from '@config/types';
import { getManifest } from '@config';
import Spinner from '@/shared/components/Spinner';
import { cn } from '@/shared/lib/utils';
import { pickShopStrip } from './eyewearShop';
import styles from './EyewearProductPage.module.css';

export type EyewearProductPageCopy = NonNullable<PlatformCopy['productPage']>;

interface EyewearProductPageProps {
  wardrobe: WardrobeItem[];
  selected: WardrobeItem;
  copy: EyewearProductPageCopy;
  privacyNote: string;
  isBusy: boolean;
  prepareError: string | null;
  onSelect: (item: WardrobeItem) => void;
  onStartTryOn: () => void;
}

const GlassesTryOnIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
    <path d="M9 5.5a3 3 0 0 1 6 0c0 1.2-.7 2.2-1.7 2.7L20 12l-2 3-3-1v6H9v-6l-3 1-2-3 6.7-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EyewearProductPage: React.FC<EyewearProductPageProps> = ({
  wardrobe,
  selected,
  copy,
  privacyNote,
  isBusy,
  prepareError,
  onSelect,
  onStartTryOn,
}) => {
  const brand = getManifest().brand;
  const shouldReduceMotion = useReducedMotion();
  const strip = useMemo(
    () => pickShopStrip(wardrobe, selected.id, 5),
    [wardrobe, selected.id],
  );

  const shapeLabel = selected.eyewear
    ? copy.shapes[selected.eyewear.shape]
    : undefined;
  const materialLabel = selected.eyewear
    ? copy.materials[selected.eyewear.material]
    : undefined;
  const metaParts = [shapeLabel, materialLabel].filter(Boolean);
  const price = selected.priceLabel ?? '—';
  const tryOnBlurb = copy.tryOnBlurb ?? 'Pruébalas en ti con una foto.';
  const details =
    selected.description ??
    (metaParts.length > 0
      ? `${metaParts.join(' · ')}. ${tryOnBlurb}`
      : tryOnBlurb);

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        {brand.logoSrc ? (
          <img
            src={brand.logoSrc}
            alt={brand.logoAlt || brand.productName}
            className={styles.brandLogo}
          />
        ) : (
          <p className={styles.brandMark}>{brand.productName}</p>
        )}
        <nav className={styles.nav} aria-label="Secciones">
          <span className={styles.navItem}>{copy.brandEyebrow}</span>
        </nav>
      </header>

      <section className={styles.pdp} aria-label={selected.name}>
        <div className={styles.stage}>
          <AnimatePresence mode="wait">
            <motion.img
              key={selected.id}
              src={selected.url}
              alt=""
              className={styles.heroPhoto}
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>
          <button
            type="button"
            className={styles.tryOnPill}
            onClick={onStartTryOn}
            disabled={isBusy}
            aria-busy={isBusy}
          >
            {isBusy ? (
              <Spinner className={styles.tryOnSpinner} aria-hidden />
            ) : (
              <GlassesTryOnIcon className={styles.tryOnIcon} />
            )}
            <span>{isBusy ? copy.ctaBusyLabel : copy.ctaLabel}</span>
          </button>
        </div>

        <div className={styles.info}>
          <AnimatePresence mode="wait">
            <motion.h1
              key={`name-${selected.id}`}
              className={styles.name}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {selected.name}
            </motion.h1>
          </AnimatePresence>

          <p className={styles.price} aria-label="Precio">
            {price}
          </p>

          {metaParts.length > 0 ? (
            <p className={styles.meta}>
              {metaParts.map((part, index) => (
                <React.Fragment key={part}>
                  {index > 0 ? (
                    <span className={styles.metaSep} aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <span>{part}</span>
                </React.Fragment>
              ))}
            </p>
          ) : null}

          <button type="button" className={styles.addBtn} disabled>
            {copy.addLabel}
          </button>

          <div className={styles.trustCard}>
            <p className={styles.trustTitle}>{copy.trustShipping}</p>
            <p className={styles.trustDetail}>{copy.trustShippingDetail}</p>
          </div>

          <ul className={styles.trustGrid}>
            <li>{copy.trustReturns}</li>
            <li>{copy.trustFreeShip}</li>
            <li>{copy.trustWarranty}</li>
          </ul>

          <p className={styles.privacy}>{privacyNote}</p>
          {prepareError ? (
            <p className={styles.error} role="alert">
              {prepareError}
            </p>
          ) : null}
        </div>
      </section>

      <section className={styles.alts} aria-labelledby="eyewear-alts-heading">
        <h2 id="eyewear-alts-heading" className={styles.altsTitle}>
          {copy.otherFrames}
        </h2>
        <ul className={styles.altsRail} role="list">
          {strip.map((item) => {
            const active = item.id === selected.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(styles.alt, active && styles.altActive)}
                  onClick={() => onSelect(item)}
                  aria-current={active ? 'true' : undefined}
                  aria-label={item.name}
                >
                  <img src={item.url} alt="" className={styles.altThumb} />
                  <span className={styles.altName}>{item.name}</span>
                  {item.priceLabel ? (
                    <span className={styles.altPrice}>{item.priceLabel}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.details} aria-labelledby="eyewear-details-heading">
        <h2 id="eyewear-details-heading" className={styles.detailsTitle}>
          {copy.detailsTitle}
        </h2>
        <AnimatePresence mode="wait">
          <motion.p
            key={`desc-${selected.id}`}
            className={styles.detailsBody}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {details}
          </motion.p>
        </AnimatePresence>
        {materialLabel ? (
          <p className={styles.detailsMaterial}>
            <span className={styles.detailsMaterialLabel}>
              {copy.materialLabel ?? 'Material:'}
            </span>{' '}
            {materialLabel.toLowerCase()}
          </p>
        ) : null}
      </section>
    </main>
  );
};

export default EyewearProductPage;
