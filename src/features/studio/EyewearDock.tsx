/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Eyewear studio PDP rail — stacked white cards:
 * selected (media + info + Escena) → IA recs → footer CTAs.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { EnvironmentId } from '@config/types';
import { getManifest } from '@config';
import type { WardrobeItem } from '@/shared/types';
import { cn } from '@/shared/lib/utils';
import {
  CheckIcon,
  HeartIcon,
  PlayIcon,
  SparklesIcon,
} from '@/shared/components/icons';
import Spinner from '@/shared/components/Spinner';
import { urlToDecartGarmentFile, urlToGarmentFile } from '@/core/media/garmentFile';
import {
  preferRetailPhotoFrames,
  recommendGlasses,
  type StylistRecommendation,
} from './stylistRecommend';
import type { EnvironmentChip, EnvironmentRequestState } from './environmentState';
import {
  isStillGalleryPhoto,
  isVideoGalleryPhoto,
  type SessionPhoto,
  type SessionPhotoKind,
} from './sessionPhotos';
import styles from './EyewearDock.module.css';

export type EyewearDockCopy = {
  otherStyles: string;
  recommended: string;
  alsoFits: string;
  saveLook: string;
  continue: string;
  onYou: string;
  filterRecommended?: string;
  chosenLabel?: string;
  moreScenes?: string;
  /** Card title for the worn / selected frame. */
  chosenSectionTitle?: string;
  galleryTitle?: string;
  galleryVideosTitle?: string;
  galleryFront?: string;
  gallerySideLeft?: string;
  gallerySideRight?: string;
  galleryLook?: string;
  galleryScene?: string;
  galleryVideo?: string;
  galleryLoading?: string;
};

export type EyewearEnvironmentCopy = {
  title: string;
  studio: string;
  creating: string;
  cancel: string;
  retry: string;
  error: string;
};

interface EyewearDockProps {
  wardrobe: WardrobeItem[];
  activeGarmentIds: string[];
  isLoading: boolean;
  displayImageUrl: string | null;
  copy: EyewearDockCopy;
  continueDisabled?: boolean;
  onGarmentSelect: (file: File, item: WardrobeItem) => void;
  onContinue?: () => void;
  onSaveLook?: () => void;
  environmentChips?: EnvironmentChip[];
  selectedEnvironmentId?: EnvironmentId;
  environmentRequest?: EnvironmentRequestState;
  environmentCopy?: EyewearEnvironmentCopy;
  environmentLoadingMessage?: string | null;
  onSelectEnvironment?: (id: EnvironmentId) => void;
  onCancelEnvironment?: () => void;
  onRetryEnvironment?: () => void;
  sessionPhotos?: SessionPhoto[];
  activePhotoUrl?: string | null;
  activeSessionPhotoId?: string | null;
  onSelectSessionPhoto?: (id: string) => void;
}

const REC_LIMIT = 4;
const PRIMARY_ENV_IDS: ReadonlyArray<EnvironmentId> = [
  'studio',
  'beach',
  'city',
  'sunset-cafe',
];

const galleryLabelForKind = (
  kind: SessionPhotoKind,
  copy: EyewearDockCopy,
): string => {
  switch (kind) {
    case 'front':
      return copy.galleryFront ?? 'Frente';
    case 'yaw-left':
      return copy.gallerySideLeft ?? 'Giro izq.';
    case 'yaw-right':
      return copy.gallerySideRight ?? 'Giro der.';
    case 'look':
      return copy.galleryLook ?? 'Look';
    case 'environment':
      return copy.galleryScene ?? 'Escena';
    case 'video':
      return copy.galleryVideo ?? 'Vídeo';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
};

const SceneGlyph: React.FC<{ id: EnvironmentId; className?: string }> = ({
  id,
  className,
}) => {
  if (id === 'beach') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="8" r="3.25" />
        <path d="M4 18c2.5-3 5-4.5 8-4.5S17.5 15 20 18" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'city') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 20V10l4-2v12M8 20V6l6-2v16M14 20v-8l6 3v5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === 'sunset-cafe') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M8 10v4a4 4 0 0 0 8 0v-4" strokeLinecap="round" />
        <path d="M7 10h10" strokeLinecap="round" />
        <path d="M12 14v6M9 20h6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
};

const EyewearDock: React.FC<EyewearDockProps> = ({
  wardrobe,
  activeGarmentIds,
  isLoading,
  copy,
  environmentChips = [],
  selectedEnvironmentId = 'studio',
  environmentRequest = { kind: 'idle' },
  environmentCopy,
  environmentLoadingMessage = null,
  onGarmentSelect,
  onContinue,
  onSaveLook,
  onSelectEnvironment,
  onCancelEnvironment,
  onRetryEnvironment,
  sessionPhotos = [],
  activePhotoUrl: _activePhotoUrl = null,
  activeSessionPhotoId = null,
  onSelectSessionPhoto,
}) => {
  const productCopy = getManifest().copy.productPage;
  const [customRecs, setCustomRecs] = useState<StylistRecommendation[] | null>(null);
  const [shownIds, setShownIds] = useState<string[]>([]);
  const [selectedOverride, setSelectedOverride] = useState<{
    baseWornId: string | null;
    id: string;
  } | null>(null);
  const [showMoreScenes, setShowMoreScenes] = useState(false);
  /** Face-first: Escena + Recs appear after the portrait has a beat to land. */
  const [secondaryChromeReady, setSecondaryChromeReady] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [error, setError] = useState<string | null>(null);
  const tryOnLockRef = useRef(false);

  useEffect(() => {
    if (secondaryChromeReady) return;
    let cancelled = false;
    let timeoutId = 0;
    const frame = requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        if (!cancelled) setSecondaryChromeReady(true);
      }, 1200);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timeoutId);
    };
  }, [secondaryChromeReady]);

  const catalog = useMemo(() => {
    const glasses = wardrobe.filter((i) => i.category === 'glasses');
    return glasses.length > 0 ? preferRetailPhotoFrames(glasses) : wardrobe;
  }, [wardrobe]);

  const wornId = useMemo(
    () =>
      activeGarmentIds.find((id) => catalog.some((item) => item.id === id)) ??
      null,
    [activeGarmentIds, catalog],
  );

  const initialRecs = useMemo((): StylistRecommendation[] => {
    if (catalog.length === 0) return [];
    const glasses = wardrobe.some((item) => item.category === 'glasses');
    return glasses
      ? recommendGlasses({
          wardrobe,
          excludeIds: wornId ? [wornId] : activeGarmentIds,
          limit: REC_LIMIT,
        })
      : catalog
          .filter((item) => item.id !== wornId)
          .slice(0, REC_LIMIT)
          .map((item, index) => ({
            item,
            reason: index === 0 ? copy.recommended : copy.alsoFits,
          }));
  }, [catalog, wardrobe, wornId, activeGarmentIds, copy.recommended, copy.alsoFits]);

  const recs = customRecs ?? initialRecs;

  const selectedId =
    selectedOverride && selectedOverride.baseWornId === wornId
      ? selectedOverride.id
      : (wornId ?? recs[0]?.item.id ?? null);

  const focusId = selectedId ?? wornId;

  const displayRecs = useMemo((): StylistRecommendation[] => {
    if (recs.length > 0) return recs;
    const fallbackPool = focusId
      ? catalog.filter((item) => item.id !== focusId)
      : catalog;
    return fallbackPool.slice(0, REC_LIMIT).map((item, index) => ({
      item,
      reason:
        item.eyewear?.stylistReason ??
        (index === 0 ? copy.recommended : copy.alsoFits),
    }));
  }, [recs, catalog, focusId, copy.recommended, copy.alsoFits]);

  const selectedItem = useMemo(() => {
    if (!focusId) return null;
    return (
      catalog.find((item) => item.id === focusId) ??
      displayRecs.find((r) => r.item.id === focusId)?.item ??
      null
    );
  }, [focusId, catalog, displayRecs]);

  const recItems = useMemo((): StylistRecommendation[] => {
    return displayRecs
      .filter((r) => r.item.id !== focusId)
      .slice(0, REC_LIMIT);
  }, [displayRecs, focusId]);

  const selectedOnYou = Boolean(
    selectedItem && activeGarmentIds.includes(selectedItem.id),
  );

  const shapeLabel = selectedItem?.eyewear
    ? productCopy?.shapes[selectedItem.eyewear.shape]
    : undefined;
  const materialLabel = selectedItem?.eyewear
    ? productCopy?.materials[selectedItem.eyewear.material]
    : undefined;
  const metaParts = [shapeLabel, materialLabel].filter(Boolean) as string[];
  const selectedPrice = selectedItem?.priceLabel ?? '—';
  const selectedBlurb =
    selectedItem?.description ??
    (metaParts.length > 0
      ? `${metaParts.join(' · ')}. Pruébalas en ti con una foto.`
      : null);

  const { primaryEnvChips, overflowEnvChips } = useMemo(() => {
    if (environmentChips.length === 0) {
      return {
        primaryEnvChips: [] as EnvironmentChip[],
        overflowEnvChips: [] as EnvironmentChip[],
      };
    }
    const primary = PRIMARY_ENV_IDS.map((id) =>
      environmentChips.find((c) => c.id === id),
    ).filter((c): c is EnvironmentChip => Boolean(c));
    const primaryIds = new Set(primary.map((c) => c.id));
    const rest = environmentChips.filter((c) => !primaryIds.has(c.id));
    return { primaryEnvChips: primary, overflowEnvChips: rest };
  }, [environmentChips]);

  const visibleEnvChips = showMoreScenes ? environmentChips : primaryEnvChips;

  const refreshRecs = () => {
    const seededShownIds =
      shownIds.length > 0 ? shownIds : initialRecs.map((r) => r.item.id);
    const exclude = [
      ...activeGarmentIds,
      ...(selectedId && !activeGarmentIds.includes(selectedId)
        ? [selectedId]
        : []),
      ...seededShownIds,
    ];
    const glasses = wardrobe.some((item) => item.category === 'glasses');
    const next = glasses
      ? recommendGlasses({ wardrobe, excludeIds: exclude, limit: REC_LIMIT })
      : catalog
          .filter((item) => !exclude.includes(item.id))
          .concat(catalog.filter((item) => !activeGarmentIds.includes(item.id)))
          .slice(0, REC_LIMIT)
          .map((item, index) => ({ item, reason: index === 0 ? copy.recommended : copy.alsoFits }));
    setCustomRecs(next);
    setShownIds([...seededShownIds, ...next.map((r) => r.item.id)]);
  };

  const applyFrame = async (item: WardrobeItem) => {
    setSelectedOverride({ baseWornId: wornId, id: item.id });
    setError(null);
    if (activeGarmentIds.includes(item.id) || isLoading || tryOnLockRef.current) {
      return;
    }
    tryOnLockRef.current = true;
    try {
      const file =
        getManifest().clientId === 'clothing'
          ? await urlToDecartGarmentFile(item.url, item.name)
          : await urlToGarmentFile(item.url, item.name);
      await onGarmentSelect(file, item);
    } catch (err) {
      console.error('[EyewearDock] garment load failed', err);
      setError('No se pudo cargar la prenda');
    } finally {
      tryOnLockRef.current = false;
    }
  };

  const envBusy = environmentRequest.kind === 'loading';
  const envError = environmentRequest.kind === 'error';
  const chosenTitle =
    copy.chosenSectionTitle ?? copy.chosenLabel ?? 'Tu montura seleccionada';
  const recsTitle = copy.filterRecommended ?? 'Recomendadas para ti';
  const moreLabel = copy.moreScenes ?? 'Más';
  const sceneTitle = environmentCopy?.title ?? 'Escena';
  const saveLabel = copy.saveLook;
  const cartLabel = copy.continue;

  const showEscena =
    secondaryChromeReady &&
    environmentChips.length > 0 &&
    Boolean(environmentCopy) &&
    Boolean(onSelectEnvironment);

  const galleryTitle = copy.galleryTitle ?? 'Tus fotos';
  const galleryVideosTitle = copy.galleryVideosTitle ?? 'Tus videos';
  const galleryLoadingLabel = copy.galleryLoading ?? 'Creando…';
  const stillPhotos = sessionPhotos.filter(isStillGalleryPhoto);
  const videoPhotos = sessionPhotos.filter(isVideoGalleryPhoto);
  const showStillGallery =
    stillPhotos.length > 0 && Boolean(onSelectSessionPhoto);
  const showVideoGallery =
    videoPhotos.length > 0 && Boolean(onSelectSessionPhoto);

  const renderGalleryThumb = (photo: SessionPhoto) => {
    const label = galleryLabelForKind(photo.kind, copy);
    const isReady = photo.status === 'ready';
    const selected = isReady && photo.id === activeSessionPhotoId;
    return (
      <button
        key={photo.id}
        type="button"
        role="listitem"
        className={cn(
          styles.galleryThumb,
          selected && styles.galleryThumbActive,
        )}
        disabled={!isReady}
        aria-pressed={selected}
        aria-busy={photo.status === 'loading'}
        aria-label={isReady ? label : `${label}. ${galleryLoadingLabel}`}
        onClick={() => {
          if (isReady) onSelectSessionPhoto?.(photo.id);
        }}
      >
        {isReady ? (
          <>
            <img src={photo.imageUrl} alt="" />
            {photo.kind === 'video' ? (
              <span className={styles.galleryVideoBadge} aria-hidden>
                <PlayIcon className={styles.galleryVideoPlay} />
              </span>
            ) : null}
          </>
        ) : (
          <span className={styles.galleryPending}>
            <Spinner className={styles.gallerySpinner} />
          </span>
        )}
        <span className={styles.galleryCaption} aria-hidden>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className={styles.root}>
      {selectedItem ? (
        <section className={styles.panel} aria-label={chosenTitle}>
          <h2 className={styles.panelTitle}>{chosenTitle}</h2>
          <div className={styles.selectedBox}>
            <div className={styles.selectedPdp}>
              <div className={styles.selectedMedia}>
                <img
                  src={selectedItem.url}
                  alt=""
                  className={styles.selectedThumb}
                />
                {selectedOnYou ? (
                  <span
                    className={styles.onYouBadge}
                    title={copy.onYou}
                    aria-label={copy.onYou}
                  >
                    <CheckIcon className={styles.onYouIcon} />
                  </span>
                ) : null}
              </div>
              <div className={styles.selectedBody}>
                <h3 className={styles.selectedName}>{selectedItem.name}</h3>
                <p className={styles.selectedPrice} aria-label="Precio">
                  {selectedPrice}
                </p>
                {metaParts.length > 0 ? (
                  <p className={styles.selectedMeta}>
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
                {selectedBlurb ? (
                  <p className={styles.selectedBlurb}>{selectedBlurb}</p>
                ) : null}
              </div>
            </div>
            {showStillGallery && onSelectSessionPhoto ? (
              <div className={styles.gallery} aria-label={galleryTitle}>
                <p className={styles.galleryTitle}>{galleryTitle}</p>
                <div className={styles.galleryRow} role="list">
                  {stillPhotos.map(renderGalleryThumb)}
                </div>
              </div>
            ) : null}
            {showVideoGallery && onSelectSessionPhoto ? (
              <div className={styles.gallery} aria-label={galleryVideosTitle}>
                <p className={styles.galleryTitle}>{galleryVideosTitle}</p>
                <div className={styles.galleryRow} role="list">
                  {videoPhotos.map(renderGalleryThumb)}
                </div>
              </div>
            ) : null}

            {showEscena && environmentCopy && onSelectEnvironment ? (
              <div className={styles.selectedScene}>
                <h3 className={styles.sceneTitle}>{sceneTitle}</h3>
                <div
                  className={styles.sceneRow}
                  role="listbox"
                  aria-label={sceneTitle}
                >
                  {visibleEnvChips.map((chip) => {
                    const selected = chip.id === selectedEnvironmentId;
                    const chipLoading = envBusy && selected;
                    const chipDisabled =
                      isLoading || (envBusy && chip.id !== 'studio');
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        aria-busy={chipLoading}
                        className={cn(
                          styles.sceneChip,
                          selected && styles.sceneChipActive,
                        )}
                        disabled={chipDisabled}
                        onClick={() => onSelectEnvironment(chip.id)}
                      >
                        {chipLoading ? (
                          <Spinner className={styles.sceneSpinner} />
                        ) : (
                          <SceneGlyph
                            id={chip.id}
                            className={styles.sceneIcon}
                          />
                        )}
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                  {!showMoreScenes && overflowEnvChips.length > 0 ? (
                    <button
                      type="button"
                      className={styles.sceneChip}
                      disabled={isLoading}
                      onClick={() => setShowMoreScenes(true)}
                    >
                      … {moreLabel}
                    </button>
                  ) : null}
                </div>

                {envBusy && environmentLoadingMessage ? (
                  <div className={styles.sceneStatus}>
                    <span>{environmentLoadingMessage}</span>
                    {onCancelEnvironment ? (
                      <button
                        type="button"
                        className={styles.sceneLink}
                        onClick={onCancelEnvironment}
                      >
                        {environmentCopy.cancel}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {envError ? (
                  <div className={styles.sceneStatus}>
                    <span>{environmentCopy.error}</span>
                    {onRetryEnvironment ? (
                      <button
                        type="button"
                        className={styles.sceneLink}
                        onClick={onRetryEnvironment}
                      >
                        {environmentCopy.retry}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {secondaryChromeReady ? (
      <section className={styles.panel} aria-label={recsTitle}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>
            {recsTitle}
            <SparklesIcon className={styles.sparkle} aria-hidden />
          </h2>
          <button
            type="button"
            className={styles.refreshLink}
            onClick={refreshRecs}
            disabled={isLoading}
          >
            {copy.otherStyles}
          </button>
        </div>
        <div className={styles.recRow} role="list">
          {recItems.map((rec) => (
            <button
              key={rec.item.id}
              type="button"
              role="listitem"
              className={styles.recCard}
              disabled={isLoading}
              onClick={() => {
                void applyFrame(rec.item);
              }}
              aria-label={`${rec.item.name}. ${rec.reason}`}
            >
              <span className={styles.recPlate}>
                <img src={rec.item.url} alt="" className={styles.recThumb} />
              </span>
              <span className={styles.recName}>{rec.item.name}</span>
              <span className={styles.recReason}>{rec.reason}</span>
            </button>
          ))}
        </div>
      </section>
      ) : null}

      <div className={styles.footerActions}>
        <button
          type="button"
          className={styles.footerSecondary}
          onClick={onSaveLook}
          disabled={!onSaveLook || isLoading}
        >
          <HeartIcon className={styles.footerIcon} aria-hidden />
          {saveLabel}
        </button>
        <button
          type="button"
          className={styles.footerPrimary}
          onClick={onContinue}
          disabled={!onContinue || isLoading}
        >
          {cartLabel}
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
};

export default EyewearDock;
