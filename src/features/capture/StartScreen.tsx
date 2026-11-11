/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CameraIcon } from '@/shared/components/icons';
import Spinner from '@/shared/components/Spinner';
import Button from '@/shared/ui/Button';
import KioskShell from '@/shared/ui/KioskShell';
import { getFriendlyErrorMessage } from '@/shared/lib/utils';
import CameraCapture from './CameraCapture';
import EyewearWaitOverlay from './EyewearWaitOverlay';
import styles from './StartScreen.module.css';
import {
  screenTransition,
  screenVariants,
  generatingScreenTransition,
  generatingScreenVariants,
  viewportFadeTransition,
} from '@/shared/lib/motionPresets';
import { useCameraStream } from './useCameraStream';
import { useSfx } from '@/shared/context/useSfx';
import { useUiSfx } from '@/shared/hooks/useUiSfx';
import { getCopy, getManifest, getWardrobe } from '@config';
import { trackEvent } from '@/shared/integrations/track';
import { urlToGarmentFile } from '@/core/media/garmentFile';
import { DECART_VTON_VIDEO_CONSTRAINTS } from '@/services/decart-vton.service';
import type { FramingProfile } from '@/core/media/framing';
import type { ModelImageResult } from '@/services/geminiService';
import type { WardrobeItem } from '@/shared/types';
import type { SafeFaceFitContext } from '@/core/face';
import type { ConfirmedCapture } from './capturedFaceFit';

export type ModelBootstrapLook = {
  displayUrl: string;
  garment: WardrobeItem;
};

export type ModelFinalization = {
  sessionToken: number;
  modelUrl: string;
  profile: FramingProfile;
  bootstrap?: ModelBootstrapLook;
  fitContext?: SafeFaceFitContext;
};

export type LiveTryOnBootstrap = {
  sessionToken: number;
  stream: MediaStream;
  garment: WardrobeItem | null;
};

interface StartScreenProps {
  onBeginCaptureSession: () => number;
  onModelFinalized: (finalization: ModelFinalization) => void;
  onStartLiveTryOn?: (bootstrap: LiveTryOnBootstrap) => void;
}

type StartScreenKey = 'landing' | 'camera-view' | 'generating';

type SpeculativePortrait = {
  dataUrl: string;
  invalidated: boolean;
  promise: Promise<ModelImageResult>;
};

const generateModelFromDataUrl = async (dataUrl: string): Promise<ModelImageResult> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], 'capture.jpg', { type: blob.type || 'image/jpeg' });
  const { generateModelImage } = await import('@/services/geminiService');
  return generateModelImage(file);
};

function getStartScreenKey(
  showCamera: boolean,
  isGenerating: boolean,
  hasCapture: boolean,
): StartScreenKey {
  if (showCamera) return 'camera-view';
  if (isGenerating || hasCapture) return 'generating';
  return 'landing';
}

const StartScreen: React.FC<StartScreenProps> = ({
  onBeginCaptureSession,
  onModelFinalized,
  onStartLiveTryOn,
}) => {
  const copy = getCopy();
  const manifest = getManifest();
  const wardrobe = getWardrobe();
  const featuredDefault = useMemo(() => wardrobe[0] ?? null, [wardrobe]);
  const [selectedGarment] = useState<WardrobeItem | null>(
    () => featuredDefault,
  );
  const [showCamera, setShowCamera] = useState(false);
  const [isPreparingCamera, setIsPreparingCamera] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const isModelRequestInFlightRef = useRef(false);
  const modelRequestTokenRef = useRef(0);
  const captureSessionTokenRef = useRef(0);
  const speculativePortraitRef = useRef<SpeculativePortrait | null>(null);
  const selectedGarmentRef = useRef<WardrobeItem | null>(selectedGarment);
  const prevScreenKeyRef = useRef<StartScreenKey>('landing');
  const sessionStartTrackedRef = useRef(false);
  const { stream, prepare, release, takeStream } = useCameraStream();
  const shouldReduceMotion = useReducedMotion();
  const { unlock } = useSfx();
  const { play, playTransition, onCtaClick } = useUiSfx();

  useEffect(() => {
    selectedGarmentRef.current = selectedGarment;
  }, [selectedGarment]);

  const screenKey = getStartScreenKey(showCamera, isGenerating, Boolean(userImageUrl));

  useEffect(() => {
    if (!showCamera) return;
    document.documentElement.dataset.vfCamera = 'open';
    return () => {
      delete document.documentElement.dataset.vfCamera;
    };
  }, [showCamera]);

  useEffect(() => {
    const prev = prevScreenKeyRef.current;
    if (prev === screenKey) return;
    prevScreenKeyRef.current = screenKey;

    if (screenKey === 'camera-view' && prev === 'landing') {
      return;
    }
    if (screenKey === 'camera-view') {
      playTransition('open');
      return;
    }
    // Confirm plays tap in CameraCapture — skip transition into generating.
    if (screenKey === 'generating' && prev === 'camera-view') {
      return;
    }
    if (screenKey === 'landing' && (prev === 'camera-view' || prev === 'generating')) {
      playTransition('close');
    }
  }, [screenKey, playTransition]);

  useEffect(() => {
    const isLandingActive = !showCamera && !userImageUrl && !isGenerating;
    if (!isLandingActive || sessionStartTrackedRef.current) return;
    sessionStartTrackedRef.current = true;
    trackEvent('session_start');
  }, [showCamera, userImageUrl, isGenerating]);

  const invalidateSpeculativePortrait = () => {
    const entry = speculativePortraitRef.current;
    if (!entry) return;
    entry.invalidated = true;
    speculativePortraitRef.current = null;
  };

  /** Kick studio portrait at snap so confirm often awaits an in-flight request. */
  const startSpeculativePortrait = (dataUrl: string) => {
    if (isModelRequestInFlightRef.current) return;
    invalidateSpeculativePortrait();
    const entry: SpeculativePortrait = {
      dataUrl,
      invalidated: false,
      promise: generateModelFromDataUrl(dataUrl),
    };
    entry.promise.catch(() => {});
    speculativePortraitRef.current = entry;
  };

  const processCapturedImage = async ({
    imageSrc: dataUrl,
    fitContext,
  }: ConfirmedCapture) => {
    if (isModelRequestInFlightRef.current) return;
    isModelRequestInFlightRef.current = true;
    const requestToken = modelRequestTokenRef.current + 1;
    modelRequestTokenRef.current = requestToken;
    const sessionToken = captureSessionTokenRef.current;
    const speculative = speculativePortraitRef.current;
    speculativePortraitRef.current = null;
    const bootstrapGarment = selectedGarmentRef.current;
    setUserImageUrl(dataUrl);
    setShowCamera(false);
    release();
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const pending =
        speculative && !speculative.invalidated && speculative.dataUrl === dataUrl
          ? speculative.promise
          : generateModelFromDataUrl(dataUrl);
      const { imageUrl, profile } = await pending;
      if (modelRequestTokenRef.current !== requestToken) return;

      if (!bootstrapGarment) {
        play('success');
        trackEvent('generation_done', { code: 'studio_bootstrap' });
        onModelFinalized({ sessionToken, modelUrl: imageUrl, profile, fitContext });
        return;
      }

      const { generateVirtualTryOnImage } = await import('@/services/geminiService');
      const garmentFile = await urlToGarmentFile(
        bootstrapGarment.url,
        bootstrapGarment.name,
      );
      const composedUrl = await generateVirtualTryOnImage(
        imageUrl,
        garmentFile,
        profile,
        bootstrapGarment.category,
      );
      if (modelRequestTokenRef.current !== requestToken) return;
      play('success');
      trackEvent('generation_done', {
        code: 'studio_bootstrap_with_product',
        product_id: bootstrapGarment.id,
      });
      onModelFinalized({
        sessionToken,
        modelUrl: imageUrl,
        profile,
        fitContext,
        bootstrap: {
          displayUrl: composedUrl,
          garment: bootstrapGarment,
        },
      });
    } catch (err) {
      play('error');
      trackEvent('generation_blocked', { code: 'model_generation_failed' });
      setGenerationError(getFriendlyErrorMessage(err, copy.generating.titleError));
    } finally {
      if (modelRequestTokenRef.current === requestToken) {
        setIsGenerating(false);
        isModelRequestInFlightRef.current = false;
      }
    }
  };

  const reset = () => {
    onCtaClick();
    modelRequestTokenRef.current += 1;
    invalidateSpeculativePortrait();
    setUserImageUrl(null);
    setIsGenerating(false);
    setGenerationError(null);
    isModelRequestInFlightRef.current = false;
  };

  const handleStartTryOn = async () => {
    if (isPreparingCamera || showCamera) return;

    trackEvent('tap_start', {
      product_id: selectedGarmentRef.current?.id,
    });
    const sessionToken = onBeginCaptureSession();
    captureSessionTokenRef.current = sessionToken;
    unlock();
    play('success');
    setPrepareError(null);
    setIsPreparingCamera(true);

    const useLiveDecart = Boolean(onStartLiveTryOn && manifest.clientId === 'clothing');
    const result = await prepare(
      useLiveDecart ? DECART_VTON_VIDEO_CONSTRAINTS : undefined,
    );
    setIsPreparingCamera(false);

    if (result.status === 'ready') {
      if (useLiveDecart && onStartLiveTryOn) {
        const liveStream = takeStream() ?? result.stream;
        onStartLiveTryOn({
          sessionToken,
          stream: liveStream,
          garment: selectedGarmentRef.current,
        });
        return;
      }
      setShowCamera(true);
      return;
    }

    play('error');
    trackEvent('generation_blocked', { code: 'camera_prepare_failed' });
    setPrepareError(result.error.message);
  };

  const handleCloseCamera = () => {
    modelRequestTokenRef.current += 1;
    invalidateSpeculativePortrait();
    setShowCamera(false);
    release();
  };

  const handleRetake = () => {
    invalidateSpeculativePortrait();
  };

  const isCtaBusy = isPreparingCamera;

  return (
    <AnimatePresence mode="wait">
      {showCamera ? (
        <motion.div
          key="camera-view"
          className={styles.cameraOverlay}
          /* Opacity-only — y/scale transforms break fixed full-bleed + shutter hits. */
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={viewportFadeTransition}
        >
          <CameraCapture
            mediaStream={stream}
            streamPreheated
            onCapture={processCapturedImage}
            onCancel={handleCloseCamera}
            onSnapshot={startSpeculativePortrait}
            onRetake={handleRetake}
            captureHint={
              manifest.features.portraitFraming === 'face'
                ? copy.captureChrome?.faceHint
                : undefined
            }
            qualityCopy={copy.captureQuality}
            chromeCopy={copy.captureChrome}
          />
        </motion.div>
      ) : userImageUrl || isGenerating || generationError ? (
        <motion.div
          key="generating"
          className={styles.generatingShop}
          variants={generatingScreenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={generatingScreenTransition}
          aria-busy={isGenerating && !generationError}
        >
          <EyewearWaitOverlay
            captureUrl={userImageUrl}
            copy={copy.generating}
            statusLine={copy.generating.subtitle}
            error={generationError}
            onRetry={reset}
            reducedMotion={Boolean(shouldReduceMotion)}
          />
        </motion.div>
      ) : selectedGarment ? (
        <motion.div
          key="landing"
          className={styles.landingShell}
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={screenTransition}
        >
          <KioskShell>
            <div className={styles.landing}>
              <img
                src={selectedGarment.url}
                alt=""
                className={styles.landingMedia}
                aria-hidden
              />
              <div className={styles.landingBackdrop} aria-hidden />
              <div className={styles.landingMicro} aria-hidden>
                <span className={styles.landingMicroEdition}>{copy.landing.microEdition}</span>
                <span className={styles.landingMicroRail}>{copy.landing.microRail}</span>
                <span className={styles.landingMicroIssue}>{copy.landing.microIssue}</span>
              </div>
              <div className={styles.landingHero}>
                <header className={styles.entryMasthead}>
                  <p className={styles.entryEyebrow}>{copy.landing.eyebrow}</p>
                  <h1 className={styles.entryTitle}>
                    {copy.landing.titleLine1}
                    <br />
                    {copy.landing.titleLine2}
                  </h1>
                  <p className={styles.entrySubtitle}>{copy.landing.subtitle}</p>
                  <p className={styles.entryPrivacy}>{copy.landing.privacyNote}</p>
                  <p className={styles.landingStatus}>{copy.landing.statusLines[0]}</p>
                </header>
                <div className={styles.ctaWrap}>
                  <Button
                    variant="glass"
                    size="lg"
                    onClick={() => void handleStartTryOn()}
                    disabled={isCtaBusy}
                    aria-busy={isCtaBusy}
                    className={styles.cta}
                  >
                    {isCtaBusy ? (
                      <Spinner className={styles.ctaSpinner} aria-hidden />
                    ) : (
                      <CameraIcon className={styles.ctaIcon} aria-hidden />
                    )}
                    <span>
                      {isCtaBusy ? copy.landing.ctaBusyLabel : copy.landing.ctaLabel}
                    </span>
                  </Button>
                  {prepareError ? (
                    <p className={styles.ctaError} role="alert">{prepareError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </KioskShell>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default StartScreen;
