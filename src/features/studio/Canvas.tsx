/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback, useEffect, useRef } from 'react';
import { CameraIcon, CheckIcon, PlayIcon, RotateCcwIcon, SparklesIcon, Volume2Icon, VolumeXIcon } from '@/shared/components/icons';
import Spinner from '@/shared/components/Spinner';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/shared/lib/utils';
import { captureVideoFrame, usesSummitMupiCameraLayout } from '@/shared/lib/camera';
import Alert from '@/shared/ui/Alert';
import Button from '@/shared/ui/Button';
import { useSfx } from '@/shared/context/useSfx';
import { useUiSfx } from '@/shared/hooks/useUiSfx';
import styles from './Canvas.module.css';

const VIDEO_READY_NOTICE_MS = 4500;

interface CanvasProps {
  displayImageUrl: string | null;
  onStartOver: () => void;
  isLoading: boolean;
  loadingMessage: string;
  /** Set when `features.videoLoop` and session has a loop URL for this still. */
  videoLoopUrl: string | null;
  videoError?: string | null;
  onDismissVideoError: () => void;
  onVideoPlaybackError: () => void;
  /** On-demand Veo generate. Omit to hide the portrait control. */
  onGenerateVideo?: () => void;
  isVideoGenerating?: boolean;
  /** Prefetch or button job in flight — disable tap without busy label. */
  isLoopVideoPending?: boolean;
  videoReadyNotice?: boolean;
  onDismissVideoReadyNotice?: () => void;
  videoCopy?: {
    generateLabel: string;
    generatingLabel: string;
    readyLabel?: string;
    errorTitle: string;
    dismissLabel: string;
    dismissAria: string;
  };
  error?: string | null;
  chromeLabels?: {
    recapture: string;
    sfxOff: string;
    sfxOn: string;
  };
  /** When false, hide the studio Sonido / SFX mute control. */
  showSfxToggle?: boolean;
  /** Parent owns Recapturar / actions (eyewear studio top bar). */
  hideChrome?: boolean;
  /** Decart Realtime VTON live WebRTC mode. */
  isLiveSession?: boolean;
  liveStream?: MediaStream | null;
  localPreviewStream?: MediaStream | null;
  liveVideoRef?: React.RefObject<HTMLVideoElement | null>;
  onCaptureLiveSnapshot?: (dataUrl: string) => void;
  onReturnToLiveStream?: () => void;
}

const Canvas: React.FC<CanvasProps> = ({
  displayImageUrl,
  onStartOver,
  isLoading,
  loadingMessage,
  videoLoopUrl,
  videoError,
  onDismissVideoError,
  onVideoPlaybackError,
  onGenerateVideo,
  isVideoGenerating = false,
  isLoopVideoPending = false,
  videoReadyNotice = false,
  onDismissVideoReadyNotice,
  videoCopy,
  error,
  chromeLabels,
  showSfxToggle = true,
  hideChrome = false,
  isLiveSession = false,
  liveStream = null,
  localPreviewStream = null,
  liveVideoRef,
  onCaptureLiveSnapshot,
  onReturnToLiveStream,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeVideoStream = liveStream ?? localPreviewStream;
  const isShowingLocalFallback = Boolean(!liveStream && localPreviewStream);
  const rotatesCamera = usesSummitMupiCameraLayout();

  const setVideoElement = useCallback(
    (node: HTMLVideoElement | null) => {
      internalVideoRef.current = node;
      if (liveVideoRef) {
        liveVideoRef.current = node;
      }
    },
    [liveVideoRef],
  );

  useEffect(() => {
    const videoEl = internalVideoRef.current;
    if (!videoEl) return;
    if (videoEl.srcObject !== activeVideoStream) {
      videoEl.srcObject = activeVideoStream;
    }
    if (activeVideoStream) {
      void videoEl.play().catch(() => {
        /* Autoplay handled via muted + playsInline */
      });
    }
  }, [activeVideoStream, displayImageUrl]);

  const handleCaptureSnapshot = useCallback(() => {
    const videoEl = internalVideoRef.current;
    if (!videoEl || !onCaptureLiveSnapshot) return;
    const dataUrl = captureVideoFrame(videoEl);
    if (dataUrl) {
      onCaptureLiveSnapshot(dataUrl);
    }
  }, [onCaptureLiveSnapshot]);
  const { musicMuted, toggleMusicMuted, prefersReducedMotion } = useSfx();
  const { onTapClick } = useUiSfx({ volume: 0.4 });
  const handleToggleSfx = () => {
    onTapClick();
    toggleMusicMuted();
  };
  const recaptureLabel = chromeLabels?.recapture ?? 'Recapture';
  const sfxOffLabel = chromeLabels?.sfxOff ?? 'SFX off';
  const sfxOnLabel = chromeLabels?.sfxOn ?? 'SFX on';
  const readyLabel = videoCopy?.readyLabel;
  const showReadyNotice = Boolean(videoReadyNotice && readyLabel);
  const showGenerate =
    Boolean(
      onGenerateVideo &&
        videoCopy?.generateLabel &&
        displayImageUrl &&
        !videoLoopUrl &&
        !isLoading &&
        !showReadyNotice,
    );
  const generateBusy = showGenerate && isVideoGenerating;
  const generateBlocked = generateBusy || (showGenerate && isLoopVideoPending);
  const generateLabel = generateBusy
    ? videoCopy?.generatingLabel
    : videoCopy?.generateLabel;
  const showGenerateSpinner = generateBusy || (showGenerate && isLoopVideoPending);

  useEffect(() => {
    if (!showReadyNotice || !onDismissVideoReadyNotice) return undefined;
    const timer = window.setTimeout(() => {
      onDismissVideoReadyNotice();
    }, VIDEO_READY_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [showReadyNotice, onDismissVideoReadyNotice]);

  return (
    <div className={styles.root}>
      {!hideChrome ? (
        <div className={styles.topBar}>
          <Button type="button" variant="glass" size="md" onClick={onStartOver} className={styles.recaptureBtn}>
            <RotateCcwIcon className={styles.loopIcon} aria-hidden />
            {recaptureLabel}
          </Button>
          {showSfxToggle ? (
            <Button
              type="button"
              variant="glass"
              size="md"
              onClick={handleToggleSfx}
              className={cn(styles.sfxBtn, prefersReducedMotion && styles.sfxBtnReducedMotion)}
              aria-pressed={musicMuted}
              aria-label={musicMuted ? 'Unmute background music' : 'Mute background music'}
            >
              {musicMuted ? (
                <VolumeXIcon className={styles.loopIcon} aria-hidden />
              ) : (
                <Volume2Icon className={styles.loopIcon} aria-hidden />
              )}
              {prefersReducedMotion ? 'SFX (reduced)' : musicMuted ? sfxOffLabel : sfxOnLabel}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className={styles.stage}>
        <div className={styles.sheenOverlay} aria-hidden />

        {isLiveSession && !displayImageUrl && activeVideoStream ? (
          <div className={styles.heroWell}>
            <video
              ref={setVideoElement}
              className={cn(
                styles.heroImage,
                styles.heroVideo,
                rotatesCamera && styles.heroVideoRotated,
                isShowingLocalFallback && styles.localMirroredVideo,
              )}
              autoPlay
              muted
              playsInline
            />
            {liveStream ? (
              <div className={styles.liveBadge} role="status" aria-live="polite">
                <span className={styles.liveDot} aria-hidden />
                <span>EN VIVO</span>
              </div>
            ) : null}
            {liveStream && !isLoading && onCaptureLiveSnapshot ? (
              <Button
                type="button"
                variant="glass"
                size="md"
                className={styles.videoGenerateBtn}
                onClick={handleCaptureSnapshot}
              >
                <CameraIcon className={styles.loopIcon} aria-hidden />
                Capturar look
              </Button>
            ) : null}
          </div>
        ) : displayImageUrl ? (
          <>
            {/* Fills the width beside the portrait well on wide screens. */}
            <img
              src={displayImageUrl}
              alt=""
              aria-hidden
              draggable={false}
              className={styles.heroAmbient}
            />
            <div className={styles.heroWell}>
              <AnimatePresence initial={false} mode="sync">
                <motion.img
                  key={displayImageUrl}
                  src={displayImageUrl}
                  alt="Virtual try-on model"
                  className={styles.heroImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              </AnimatePresence>
              {isLiveSession && onReturnToLiveStream ? (
                <Button
                  type="button"
                  variant="glass"
                  size="md"
                  className={styles.videoGenerateBtn}
                  onClick={onReturnToLiveStream}
                >
                  <PlayIcon className={styles.loopIcon} aria-hidden />
                  Volver al video en vivo
                </Button>
              ) : null}
              {videoLoopUrl ? (
                <video
                  className={cn(styles.heroImage, styles.heroVideo)}
                  src={videoLoopUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={onVideoPlaybackError}
                />
              ) : null}
              {showGenerate ? (
                <Button
                  type="button"
                  variant="glass"
                  size="md"
                  className={styles.videoGenerateBtn}
                  disabled={generateBlocked}
                  aria-busy={generateBusy}
                  aria-label={generateLabel}
                  onClick={() => {
                    if (generateBlocked) return;
                    onGenerateVideo?.();
                  }}
                >
                  {showGenerateSpinner ? (
                    <Spinner className={styles.videoGenerateSpinner} />
                  ) : (
                    <PlayIcon className={styles.loopIcon} aria-hidden />
                  )}
                  {generateLabel}
                </Button>
              ) : null}
              <AnimatePresence>
                {showReadyNotice ? (
                  <motion.div
                    key="video-ready"
                    className={styles.videoReadyNotice}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    transition={{ duration: prefersReducedMotion ? 0.01 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className={styles.videoReadyIconWrap} aria-hidden>
                      <CheckIcon className={styles.videoReadyIcon} />
                    </span>
                    <span className={styles.videoReadyLabel}>{readyLabel}</span>
                    <button
                      type="button"
                      className={styles.videoReadyDismiss}
                      onClick={onDismissVideoReadyNotice}
                      aria-label={videoCopy?.dismissAria ?? 'Dismiss'}
                    >
                      {videoCopy?.dismissLabel ?? 'Close'}
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className={styles.placeholder}>
            <Spinner />
            <p className={styles.placeholderLabel}>Preparing fitting studio</p>
          </div>
        )}

        <AnimatePresence>
          {isLoading ? (
            <motion.div
              className={styles.loadingVeil}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.loadingCenter}>
                <div className={styles.loadingSpinnerWrap}>
                  <Spinner className={styles.loadingSpinner} />
                  <SparklesIcon className={styles.sparkleIcon} aria-hidden />
                </div>
                {loadingMessage ? (
                  <p className={styles.loadingMessage}>{loadingMessage}</p>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {error && !isLoading ? (
            <motion.div
              className={styles.errorDockCentered}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Alert title="Try-on interrupted" variant="danger" className={styles.alertCenter}>
                {error}
              </Alert>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {videoError ? (
            <motion.div
              className={styles.videoErrorDock}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Alert title={videoCopy?.errorTitle ?? 'Loop video unavailable'} variant="danger">
                <div className={styles.videoErrorRow}>
                  <span>{videoError}</span>
                  <button
                    type="button"
                    onClick={onDismissVideoError}
                    className={styles.dismissBtn}
                    aria-label={videoCopy?.dismissAria ?? 'Dismiss loop video error'}
                  >
                    {videoCopy?.dismissLabel ?? 'Close'}
                  </button>
                </div>
              </Alert>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Canvas;
