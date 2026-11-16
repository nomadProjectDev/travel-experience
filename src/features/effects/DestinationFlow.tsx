import type { CSSProperties } from 'react';
import { requireClayEffect } from '@config/clients/travel-experience/effects';
import {
  TRAVEL_DESTINATIONS,
  TRAVEL_HOME_BACKGROUND,
  countryCardFields,
  type TravelDestination,
} from '@config/clients/travel-experience/destinations';
import styles from './BrickStudio.module.css';

interface DestinationHomeProps {
  title?: string;
  backLabel: string;
  onChoose: (destinationId: string) => void;
  onBack: () => void;
}

export function DestinationHome({
  title,
  backLabel,
  onChoose,
  onBack,
}: DestinationHomeProps) {
  return (
    <div className={styles.home}>
      <img
        className={styles.homeBg}
        src={TRAVEL_HOME_BACKGROUND.src}
        alt={TRAVEL_HOME_BACKGROUND.alt}
        fetchPriority="high"
        decoding="async"
      />
      <div className={styles.homeScrim} aria-hidden />
      <div className={styles.homeFrame}>
        {title ? <h1 className={styles.homeTitle}>{title}</h1> : null}
        <div className={styles.countryGrid}>
          {TRAVEL_DESTINATIONS.map((destination) => {
            const card = countryCardFields(destination);
            return (
              <button
                key={destination.id}
                type="button"
                className={styles.countryCard}
                onClick={() => onChoose(destination.id)}
              >
                <img src={card.src} alt={card.alt} decoding="async" />
              </button>
            );
          })}
        </div>
        <button type="button" className={styles.back} onClick={onBack}>
          {backLabel}
        </button>
      </div>
    </div>
  );
}

interface VariantPickerProps {
  destination: TravelDestination;
  brandEyebrow: string;
  experienceTitleLine1: string;
  experienceTitleLine2: string;
  backLabel: string;
  busyLabel: string;
  error: string | null;
  isOpeningCamera: boolean;
  onChoose: (effectId: string) => void;
  onBack: () => void;
}

export function VariantPicker({
  destination,
  brandEyebrow,
  experienceTitleLine1,
  experienceTitleLine2,
  backLabel,
  busyLabel,
  error,
  isOpeningCamera,
  onChoose,
  onBack,
}: VariantPickerProps) {
  const flagStyle = {
    '--variant-flag-1': destination.flagStrip[0],
    '--variant-flag-2': destination.flagStrip[1],
    '--variant-flag-3': destination.flagStrip[2],
  } as CSSProperties;

  return (
    <div className={styles.home}>
      <img
        className={styles.homeBg}
        src={destination.screenBackgroundSrc}
        alt=""
        decoding="async"
      />
      <div className={`${styles.homeScrim} ${styles.variantScrim}`} aria-hidden />
      <div className={styles.variantFrame}>
        <header className={styles.variantBrandHeader}>
          <p className={styles.variantBrandEyebrow}>{brandEyebrow}</p>
          <div className={styles.variantBrandArc} aria-hidden="true" />
          <div className={styles.variantBrandTitle}>
            <span className={styles.variantBrandTitleLine}>{experienceTitleLine1}</span>
            <span className={styles.variantBrandTitleAccent}>{experienceTitleLine2}</span>
          </div>
          <div className={styles.variantBrandRule} aria-hidden="true" />
          <p className={styles.variantDestinationLine}>{destination.variantHeadline}</p>
          <div
            className={styles.variantFlagBand}
            style={flagStyle}
            aria-hidden="true"
          />
          <p className={styles.variantLead}>{destination.variantLead}</p>
        </header>
        <div className={styles.choiceGrid} role="group" aria-label={destination.variantLead}>
          {destination.choices.map((choice) => {
            const effect = requireClayEffect(choice.effectId);
            const still = effect.referenceImage;
            if (!still) {
              throw new Error(`Travel look "${effect.id}" is missing its reference still`);
            }
            const choiceLabel = still.alt || choice.label;
            return (
              <button
                key={choice.effectId}
                type="button"
                className={styles.choice}
                disabled={isOpeningCamera}
                aria-label={choiceLabel}
                onClick={() => onChoose(choice.effectId)}
              >
                <span className={styles.choiceFigure}>
                  <img src={still.src} alt="" decoding="async" />
                </span>
              </button>
            );
          })}
        </div>
        {isOpeningCamera ? (
          <p className={styles.pickerStatus} role="status">{busyLabel}</p>
        ) : null}
        {error ? (
          <p className={styles.pickerError} role="alert">{error}</p>
        ) : null}
        <button type="button" className={`${styles.back} ${styles.variantBack}`} onClick={onBack}>
          {backLabel}
        </button>
      </div>
    </div>
  );
}
