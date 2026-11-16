/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { getCopy, getManifest } from '@config';
import {
  decartRemoteFrameScale,
  isQuarterTurnRotation,
  nextCameraRotationDeg,
  resolveCameraRotationDeg,
  saveCameraRotationDeg,
  type CameraRotationDeg,
} from '@/core/media/cameraRotation';
import { cn } from '@/shared/lib/utils';
import { TechnicianRotationOverlay } from '@/shared/ui/CameraRotationButton';
import { getTravelDestination } from '@config/clients/travel-experience/destinations';
import { requireClayEffect } from '@config/clients/travel-experience/effects';
import { DestinationHome, VariantPicker } from './DestinationFlow';
import { useBrickSession } from './useBrickSession';
import styles from './BrickStudio.module.css';

function BrickStudio() {
  const copy = getCopy();
  const manifest = getManifest();
  const studio = copy.brickStudio;
  const session = useBrickSession();
  const { reorient } = session;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraRotationDeg, setCameraRotationDeg] = useState<CameraRotationDeg>(
    resolveCameraRotationDeg,
  );

  const showRemote =
    Boolean(session.remoteStream) &&
    session.status !== 'connecting' &&
    session.status !== 'idle';
  const quarterTurnLive = isQuarterTurnRotation(cameraRotationDeg);

  const rotateCamera = useCallback(
    (explicit?: CameraRotationDeg) => {
      const nextRotation = explicit ?? nextCameraRotationDeg(cameraRotationDeg);
      const saved = saveCameraRotationDeg(nextRotation);
      setCameraRotationDeg(saved);
      if (saved !== cameraRotationDeg) {
        reorient(saved);
      }
    },
    [cameraRotationDeg, reorient],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const remote = session.remoteStream;
    if (!remote) {
      video.pause();
      video.srcObject = null;
      return;
    }
    if (video.srcObject !== remote) {
      video.srcObject = remote;
    }
    void video.play().catch(() => {
      /* autoplay can reject before the element is ready; the next tick retries */
    });
  }, [session.remoteStream]);

  if (!studio) {
    throw new Error('This effects client pack requires copy.brickStudio.');
  }

  const landingSrc = manifest.brand.landingSrc;
  const landingPlate = manifest.brand.landingPlate === true;

  let view: ReactNode;

  if (session.screen.name === 'landing') {
    view = (
      <div className={styles.landing}>
        {landingSrc ? (
          <img
            className={styles.set}
            src={landingSrc}
            alt={
              manifest.brand.landingAlt ??
              (landingPlate
                ? `${manifest.brand.logoAlt}. ${manifest.brand.productName}`
                : '')
            }
            fetchPriority="high"
            decoding="async"
          />
        ) : null}
        {landingPlate ? null : <div className={styles.scrim} aria-hidden />}
        {landingPlate ? null : (
          <p className={styles.brandLabel}>{manifest.brand.productName}</p>
        )}
        <div className={styles.landingContent}>
          {landingPlate ? null : (
            <header className={styles.hero}>
              <p className={styles.eyebrow}>{copy.landing.eyebrow}</p>
              <h1 className={styles.title}>
                {copy.landing.titleLine1}
                <br />
                <span className={styles.titleAccent}>{copy.landing.titleLine2}</span>
              </h1>
              <p className={styles.subtitle}>{copy.landing.subtitle}</p>
            </header>
          )}
          <div className={styles.plate}>
            <button
              type="button"
              className={styles.cta}
              onClick={session.openCountryHome}
            >
              {copy.landing.ctaLabel}
            </button>
            <p className={styles.privacy}>{copy.landing.privacyNote}</p>
          </div>
        </div>
      </div>
    );
  } else if (session.screen.name === 'countries') {
    view = (
      <DestinationHome
        title={studio.destinationsTitle}
        backLabel={studio.restart}
        onChoose={session.chooseDestination}
        onBack={session.returnToLanding}
      />
    );
  } else if (session.screen.name === 'variant') {
    const destination = getTravelDestination(session.screen.destinationId);
    if (!destination) {
      throw new Error(`Unknown destination "${session.screen.destinationId}"`);
    }
    view = (
      <VariantPicker
        destination={destination}
        brandEyebrow={copy.landing.eyebrow}
        experienceTitleLine1={copy.landing.titleLine1}
        experienceTitleLine2={copy.landing.titleLine2}
        backLabel={studio.variantBackLabel ?? studio.restart}
        busyLabel={copy.landing.ctaBusyLabel}
        error={session.error}
        isOpeningCamera={session.isOpeningCamera}
        onChoose={(effectId) => session.chooseLook(effectId, cameraRotationDeg)}
        onBack={session.returnToCountries}
      />
    );
  } else if (session.screen.name === 'live') {
    const effect = requireClayEffect(session.screen.effectId);
    const statusLabel =
      session.status === 'connecting'
        ? studio.connecting
        : session.status === 'switching'
          ? studio.switching
          : null;
    const changeLabel = studio.changeLook ?? studio.restart;

    view = (
      <div className={styles.studio}>
        <section className={styles.stage} aria-label={studio.liveBadge}>
          {showRemote ? (
            <video
              ref={videoRef}
              className={cn(
                styles.video,
                cameraRotationDeg === 0 && styles.videoMirrored,
                quarterTurnLive && styles.videoQuarter,
              )}
              style={
                quarterTurnLive
                  ? ({
                      ['--remote-frame-scale']: String(decartRemoteFrameScale()),
                    } as CSSProperties)
                  : undefined
              }
              autoPlay
              muted
              playsInline
            />
          ) : null}
          <div className={styles.stageChrome}>
            <p className={showRemote ? `${styles.badge} ${styles.lookBadge}` : styles.badge}>
              <span className={styles.badgeDot} aria-hidden />
              {showRemote ? effect.name : studio.connecting}
            </p>
            <button type="button" className={styles.exit} onClick={session.returnToCountries}>
              {changeLabel}
            </button>
          </div>
          {statusLabel && !session.error ? (
            <p className={styles.status} role="status">{statusLabel}</p>
          ) : null}
          {session.error ? (
            <div className={styles.stageError} role="alert">
              <p>{session.error}</p>
              <button type="button" className={styles.cta} onClick={() => session.retry(cameraRotationDeg)}>
                {studio.retry}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    );
  } else {
    const exhaustive: never = session.screen;
    return exhaustive;
  }

  return (
    <>
      <TechnicianRotationOverlay
        rotationDeg={cameraRotationDeg}
        onRotate={rotateCamera}
      />
      {view}
    </>
  );
}

export default BrickStudio;
