/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCopy, getManifest } from '@config';
import {
  CAMERA_ROTATION_ANGLES,
  nextCameraRotationDeg,
  type CameraRotationDeg,
} from '@/core/media/cameraRotation';
import CameraRotationButton from '@/shared/ui/CameraRotationButton';
import { cn } from '@/shared/lib/utils';
import EffectRail from './EffectRail';
import { useBrickSession } from './useBrickSession';
import styles from './BrickStudio.module.css';

function BrickStudio() {
  const copy = getCopy();
  const manifest = getManifest();
  const studio = copy.brickStudio;
  const session = useBrickSession();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraRotationDeg, setCameraRotationDeg] =
    useState<CameraRotationDeg>(0);
  const [showRotationPill, setShowRotationPill] = useState(false);
  const techTapTimestampsRef = useRef<number[]>([]);
  const rotationPillTimerRef = useRef<number | null>(null);

  const showRemote = Boolean(session.remoteStream);
  const preview = session.remoteStream ?? session.localStream;

  const rotateCamera = useCallback(
    (explicit?: CameraRotationDeg) => {
      if (session.phase !== 'landing') return;
      const nextRotation = explicit ?? nextCameraRotationDeg(cameraRotationDeg);
      setCameraRotationDeg(nextRotation);
    },
    [cameraRotationDeg, session.phase],
  );

  const armRotationPillAutoHide = useCallback(() => {
    if (rotationPillTimerRef.current !== null) {
      window.clearTimeout(rotationPillTimerRef.current);
    }
    rotationPillTimerRef.current = window.setTimeout(() => {
      setShowRotationPill(false);
    }, 6000);
  }, []);

  const revealRotation = useCallback(
    (next?: CameraRotationDeg) => {
      rotateCamera(next);
      setShowRotationPill(true);
      armRotationPillAutoHide();
    },
    [armRotationPillAutoHide, rotateCamera],
  );

  const handleTechnicianTap = () => {
    const now = Date.now();
    const recent = techTapTimestampsRef.current.filter((ts) => now - ts < 3000);
    recent.push(now);
    techTapTimestampsRef.current = recent;
    if (recent.length < 5) return;
    techTapTimestampsRef.current = [];
    setShowRotationPill((open) => {
      const next = !open;
      if (next) armRotationPillAutoHide();
      else if (rotationPillTimerRef.current !== null) {
        window.clearTimeout(rotationPillTimerRef.current);
      }
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (rotationPillTimerRef.current !== null) {
        window.clearTimeout(rotationPillTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (session.phase !== 'landing') return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!event.shiftKey || (event.key !== 'R' && event.key !== 'r')) return;
      event.preventDefault();
      revealRotation(nextCameraRotationDeg(cameraRotationDeg));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [cameraRotationDeg, revealRotation, session.phase]);

  const handleStartLive = () => {
    setShowRotationPill(false);
    void session.start(cameraRotationDeg);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (session.remoteStream && video.srcObject && video.srcObject !== session.remoteStream) {
      video.pause();
      video.srcObject = null;
    }
    if (!preview) {
      video.srcObject = null;
      return;
    }
    if (video.srcObject !== preview) {
      video.srcObject = preview;
    }
    void video.play().catch(() => {
      /* autoplay can reject before the element is ready; the next tick retries */
    });
  }, [preview, session.remoteStream]);

  if (!studio) {
    throw new Error('This effects client pack requires copy.brickStudio.');
  }

  const landingSrc = manifest.brand.landingSrc;
  const landingPlate = manifest.brand.landingPlate === true;

  if (session.phase === 'landing') {
    return (
      <div className={styles.landing}>
        <button
          type="button"
          className={styles.techHotspot}
          onClick={handleTechnicianTap}
          aria-label="Ajuste técnico de rotación de cámara"
          tabIndex={-1}
        />
        {showRotationPill ? (
          <div className={styles.rotationPillAnchor}>
            <div className={styles.rotationPill}>
              <CameraRotationButton
                rotationDeg={cameraRotationDeg}
                onRotate={() => revealRotation()}
              />
              <div className={styles.rotationAngles} role="group" aria-label="Rotación de cámara">
                {CAMERA_ROTATION_ANGLES.map((angle) => (
                  <button
                    key={angle}
                    type="button"
                    className={styles.rotationAngle}
                    data-active={cameraRotationDeg === angle}
                    onClick={() => revealRotation(angle)}
                  >
                    {angle}°
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.rotationClose}
                onClick={() => setShowRotationPill(false)}
                aria-label="Cerrar selector de rotación"
              >
                ×
              </button>
            </div>
          </div>
        ) : null}
        {landingSrc ? (
          <img
            className={styles.set}
            src={landingSrc}
            alt={
              landingPlate
                ? `${manifest.brand.logoAlt}. ${manifest.brand.productName}`
                : ''
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
              onClick={handleStartLive}
              disabled={session.isOpeningCamera}
              aria-busy={session.isOpeningCamera}
            >
              {session.isOpeningCamera ? copy.landing.ctaBusyLabel : copy.landing.ctaLabel}
            </button>
            {session.error ? (
              <p className={styles.error} role="alert">{session.error}</p>
            ) : (
              <p className={styles.privacy}>{copy.landing.privacyNote}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const statusLabel =
    session.status === 'connecting'
      ? studio.connecting
      : session.status === 'switching'
        ? studio.switching
        : null;

  return (
    <div className={styles.studio}>
      <section className={styles.stage} aria-label={studio.liveBadge}>
        <video
          ref={videoRef}
          className={cn(
            styles.video,
            !showRemote && styles.videoMirrored,
          )}
          autoPlay
          muted
          playsInline
        />
        <div className={styles.stageChrome}>
          <p className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden />
            {showRemote ? studio.liveBadge : studio.connecting}
          </p>
          <button type="button" className={styles.exit} onClick={session.leave}>
            {studio.restart}
          </button>
        </div>
        {statusLabel && !session.error ? (
          <p className={styles.status} role="status">{statusLabel}</p>
        ) : null}
        {session.error ? (
          <div className={styles.stageError} role="alert">
            <p>{session.error}</p>
            <button type="button" className={styles.cta} onClick={() => void session.start(cameraRotationDeg)}>
              {studio.retry}
            </button>
          </div>
        ) : null}
      </section>
      <aside className={styles.railPane}>
        <EffectRail
          copy={studio}
          activeEffectId={session.activeEffectId}
          disabled={session.status === 'connecting' || session.status === 'idle'}
          onSelect={(effect) => void session.selectEffect(effect)}
        />
      </aside>
    </div>
  );
}

export default BrickStudio;
