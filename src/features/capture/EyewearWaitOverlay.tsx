/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Eyewear wait screen — campaign stills over a frosted panel, with a thin
 * generating-progress header. Append a slide in pack copy to add another.
 */

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '@/shared/ui/Button';
import { cn } from '@/shared/lib/utils';
import type { PlatformCopy } from '@config/types';
import styles from './EyewearWaitOverlay.module.css';

const CAMPAIGN_ROTATE_MS = 5200;

interface EyewearWaitOverlayProps {
  /** Captured portrait, used as blurred underlay. */
  captureUrl: string | null;
  copy: PlatformCopy['generating'];
  /** Current rotating status line; parent owns the cadence. */
  statusLine: string;
  error: string | null;
  onRetry: () => void;
  reducedMotion: boolean;
}

const EyewearWaitOverlay: React.FC<EyewearWaitOverlayProps> = ({
  captureUrl,
  copy,
  statusLine,
  error,
  onRetry,
  reducedMotion,
}) => {
  const waitSlides = copy.waitSlides ?? [];
  const [campaignIndex, setCampaignIndex] = useState(0);
  const campaignCount = waitSlides.length;
  const showCampaign = !error && campaignCount > 0;

  useEffect(() => {
    if (!showCampaign || reducedMotion || campaignCount < 2) return;
    const timer = window.setTimeout(() => {
      setCampaignIndex((prev) => (prev + 1) % campaignCount);
    }, CAMPAIGN_ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [showCampaign, reducedMotion, campaignCount, campaignIndex]);

  return (
    <div className={styles.overlay}>
      {captureUrl ? (
        <div className={styles.stage} aria-hidden>
          <img
            src={captureUrl}
            alt=""
            className={styles.stageImage}
            draggable={false}
          />
        </div>
      ) : null}
      <div className={styles.veil} aria-hidden />

      <div className={styles.center}>
        <section
          className={cn(styles.card, showCampaign && styles.cardWide)}
          aria-label={error ? copy.titleError : copy.title}
        >
          <div className={styles.rail} aria-hidden>
            <span className={cn(styles.railFill, error && styles.railFillHalted)} />
          </div>

          <header className={styles.head}>
            <div className={styles.headMain} role="status" aria-live="polite">
              <p className={styles.eyebrow}>
                {error ? copy.eyebrowError : copy.eyebrow}
              </p>
              <h2 className={styles.title}>{error ? copy.titleError : copy.title}</h2>
            </div>
            {error ? null : (
              <div className={styles.headMeta}>
                <span className={styles.eta}>{copy.subtitle}</span>
                <span className={styles.status}>
                  {reducedMotion ? (
                    statusLine
                  ) : (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={statusLine}
                        className={styles.statusLine}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {statusLine}
                      </motion.span>
                    </AnimatePresence>
                  )}
                </span>
              </div>
            )}
          </header>

          {error ? (
            <div className={styles.errorBody}>
              <p className={styles.errorText}>{error}</p>
              <Button variant="secondary" size="lg" onClick={onRetry}>
                {copy.retryLabel}
              </Button>
            </div>
          ) : showCampaign ? (
            <div
              className={styles.campaign}
              aria-label={copy.waitSlidesLabel ?? copy.title}
              aria-roledescription="carousel"
            >
              <div className={styles.campaignSlides}>
                {waitSlides.map((slide, slideIndex) => {
                  const isCurrent = slideIndex === campaignIndex;
                  return (
                    <article
                      key={slide.imageSrc}
                      className={cn(
                        styles.campaignSlide,
                        isCurrent && styles.campaignSlideCurrent,
                      )}
                      aria-hidden={!isCurrent}
                    >
                      <img
                        src={slide.imageSrc}
                        alt={isCurrent ? slide.imageAlt : ''}
                        className={styles.campaignImage}
                        draggable={false}
                        fetchPriority={slideIndex === 0 ? 'high' : 'low'}
                        loading={slideIndex === 0 ? 'eager' : 'lazy'}
                      />
                      <div className={styles.campaignCaption}>
                        {slide.eyebrow ? (
                          <p className={styles.campaignEyebrow}>{slide.eyebrow}</p>
                        ) : null}
                        <h3 className={styles.campaignTitle}>{slide.title}</h3>
                        {slide.subtitle ? (
                          <p className={styles.campaignSubtitle}>{slide.subtitle}</p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
              {campaignCount > 1 ? (
                <div className={styles.campaignDots}>
                  {waitSlides.map((slide, dotIndex) => (
                    <button
                      key={slide.imageSrc}
                      type="button"
                      className={cn(
                        styles.campaignDot,
                        dotIndex === campaignIndex && styles.campaignDotCurrent,
                      )}
                      onClick={() => setCampaignIndex(dotIndex)}
                      aria-label={slide.title}
                      aria-current={dotIndex === campaignIndex ? 'true' : undefined}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default EyewearWaitOverlay;
