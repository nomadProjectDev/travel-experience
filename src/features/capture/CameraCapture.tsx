/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { RefreshCwIcon, CheckIcon, XIcon } from '@/shared/components/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/lib/utils';
import {
  CAMERA_VIDEO_CONSTRAINTS,
  captureVideoFrame,
  getUnavailableCameraError,
  isCameraApiAvailable,
  parseUserMediaError,
  usesSummitMupiCameraLayout,
  type CameraErrorKind,
} from '@/shared/lib/camera';
import {
  screenEase,
  viewportFadeTransition,
  webcamRevealTransition,
} from '@/shared/lib/motionPresets';
import Spinner from '@/shared/components/Spinner';
import frameStyles from '@/shared/ui/CaptureFrame.module.css';
import captureStyles from './CameraCapture.module.css';
import { useUiSfx } from '@/shared/hooks/useUiSfx';
import { useSfx } from '@/shared/context/useSfx';
import { playShutterSfx } from '@/shared/lib/sfx';
import {
  measureCaptureQuality,
  type CaptureQualityAssessment,
  type CaptureQualityIssue,
} from '@/core/media/captureQuality';
import { getManifest } from '@config';
import {
  FaceFitStabilityTracker,
  clearFaceScanOverlay,
  drawFaceScanOverlay,
  hasCurrentSingleFaceLandmarks,
  type FaceFitResult,
} from '@/core/face';
import type { FaceLandmarkerSessionToken } from '@/services/face-landmarker.service';
import FaceFitMetricsPanel, {
  type FaceFitPanelCopy,
  type FaceFitUiState,
} from './FaceFitMetricsPanel';
import FaceFitCalibrationPanel from './FaceFitCalibrationPanel';
import { isFaceFitSizeSandboxEnabled } from './faceFitCalibration';
import type {
  FaceFitCalibrationMetadata,
} from '@/services/face-fit-fixture-export.service';
import {
  buildConfirmedCapture,
  isCurrentCapturedFaceFitAnalysis,
  resolveCapturedFaceFit,
  type ConfirmedCapture,
} from './capturedFaceFit';

const CAMERA_SFX_VOLUME = 0.4;
/** Live FaceLandmarker throttle — ~15 fps keeps mobile cooler. */
const FACE_FIT_DETECT_INTERVAL_MS = 66;

function uiStateForFaceFitResult(result: FaceFitResult): FaceFitUiState {
  const reason = result.rejectionReasons[0];
  if (reason === 'multiple-faces') return 'singleFace';
  if (reason === 'pose-unavailable') return 'poseUnavailable';
  if (reason === 'face-too-far') return 'moveCloser';
  if (reason === 'face-too-close') return 'moveFarther';
  if (reason === 'yaw-too-high' || reason === 'pitch-too-high' || reason === 'roll-too-high') {
    return 'lookFront';
  }
  if (reason === 'illumination-too-low') return 'improveLighting';
  if (reason === 'image-too-blurry') return 'holdSteady';
  return result.status === 'rejected' ? 'searching' : 'limited';
}

interface CaptureQualityCopy {
  darkWarn: string;
  blurWarn: string;
  continueLabel: string;
  recaptureLabel: string;
}

interface CaptureChromeCopy {
  closeAria: string;
  shutterAria: string;
  timerOff: string;
  timerSecondsAria: string;
  retry: string;
  retake: string;
  confirm: string;
  capturedAlt: string;
  faceHint?: string;
  faceFitPanel?: FaceFitPanelCopy;
}

interface CameraCaptureProps {
  onCapture: (capture: ConfirmedCapture) => void;
  onCancel: () => void;
  /** Fired the moment a frame is snapped (before confirm) — enables speculative work. */
  onSnapshot?: (imageSrc: string) => void;
  /** Fired when the user discards the snapped frame. */
  onRetake?: () => void;
  /** Reuse a stream acquired before this screen mounts (avoids a second permission prompt). */
  mediaStream?: MediaStream | null;
  /** Stream was warmed on the landing screen — skip the full warmup overlay. */
  streamPreheated?: boolean;
  /** Capture coaching line; defaults to full-body apparel guidance. */
  captureHint?: string;
  /** Soft extreme-only quality gate copy (optional). */
  qualityCopy?: CaptureQualityCopy;
  /** Locale chrome for buttons / arias. */
  chromeCopy?: CaptureChromeCopy;
}

const COUNTDOWN_SECONDS = 3;
const COUNTDOWN_OPTIONS = [0, 3, 5] as const;
const DEFAULT_CAPTURE_HINT = 'Step back · Arms relaxed · Look at the lens';

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  onSnapshot,
  onRetake,
  mediaStream = null,
  streamPreheated = false,
  captureHint = DEFAULT_CAPTURE_HINT,
  qualityCopy,
  chromeCopy,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mountedRef = useRef(true);
  const { play, onTapClick } = useUiSfx({ volume: CAMERA_SFX_VOLUME });
  const { unlock, prefersReducedMotion } = useSfx();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const capturedImageRef = useRef<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(streamPreheated && !!mediaStream);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedCountdownSeconds, setSelectedCountdownSeconds] = useState<number>(COUNTDOWN_SECONDS);
  const [showFlash, setShowFlash] = useState(false);
  const [webcamKey, setWebcamKey] = useState(0);
  const [qualityIssue, setQualityIssue] = useState<CaptureQualityIssue | null>(null);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);
  const qualityPromiseRef = useRef<Promise<CaptureQualityAssessment> | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastLiveResultRef = useRef<FaceFitResult | null>(null);
  const faceFitSessionRef = useRef<FaceLandmarkerSessionToken | null>(null);
  const stabilityTrackerRef = useRef(new FaceFitStabilityTracker());
  const faceFitDetectingRef = useRef(false);
  const activeCaptureIdRef = useRef(0);
  const [faceFitResult, setFaceFitResult] = useState<FaceFitResult | null>(null);
  const [faceFitState, setFaceFitState] = useState<FaceFitUiState>('initializing');
  const [faceFitWarming, setFaceFitWarming] = useState(false);
  const [faceFitLiveReady, setFaceFitLiveReady] = useState(false);
  const faceFitEnabled = getManifest().features.faceFitAnalysis === true;
  const faceFitPanelCopy = chromeCopy?.faceFitPanel;
  const calibrationMode =
    faceFitEnabled &&
    !!faceFitPanelCopy?.calibration &&
    import.meta.env.DEV &&
    import.meta.env.VITE_FACE_FIT_FIXTURE_EXPORT === 'true' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('faceFitCalibration') === '1';
  const sizeSandboxEnabled = isFaceFitSizeSandboxEnabled({
    dev: import.meta.env.DEV,
    calibrationMode,
    flag: import.meta.env.VITE_FACE_FIT_SIZE_SANDBOX,
  });
  /** Estimated facial-analysis panel opens by default outside calibration collection. */
  const [faceFitPanelOpen, setFaceFitPanelOpen] = useState(
    faceFitEnabled && !calibrationMode,
  );
  const [capturedCalibrationSample, setCapturedCalibrationSample] = useState<{
    captureId: number;
    sessionToken: FaceLandmarkerSessionToken;
    result: FaceFitResult;
    landmarkCount: number;
  } | null>(null);
  const [cameraError, setCameraError] = useState<{ kind: CameraErrorKind; message: string } | null>(
    () => (isCameraApiAvailable() ? null : getUnavailableCameraError())
  );

  const usesExternalStream = mediaStream != null;
  const showWebcam = cameraError === null && isCameraApiAvailable();
  const summitMupiLayout = usesSummitMupiCameraLayout();
  const videoContainerClass = summitMupiLayout
    ? captureStyles.mupiVideoContainer
    : captureStyles.mupiVideoContainerPlain;

  const getLiveVideo = useCallback((): HTMLVideoElement | null => {
    if (usesExternalStream) return videoRef.current;
    return webcamRef.current?.video ?? null;
  }, [usesExternalStream]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fireShutterSfx = useCallback(() => {
    unlock();
    playShutterSfx({ muted: prefersReducedMotion, baseVolume: CAMERA_SFX_VOLUME });
  }, [unlock, prefersReducedMotion]);

  const captureNow = useCallback(() => {
    fireShutterSfx();
    setShowFlash(true);
    window.setTimeout(() => setShowFlash(false), 160);

    const video = getLiveVideo();
    const imageSrc = video ? captureVideoFrame(video) : null;

    if (imageSrc) {
      const captureId = activeCaptureIdRef.current + 1;
      activeCaptureIdRef.current = captureId;
      capturedImageRef.current = imageSrc;
      setCapturedImage(imageSrc);
      setCapturedCalibrationSample(null);
      setQualityIssue(null);
      // Readiness belongs to the captured still, not the preceding live frame.
      const liveResult = lastLiveResultRef.current;
      setFaceFitResult(null);
      setFaceFitState('limited');
      onSnapshot?.(imageSrc);

      // Soft quality gate starts at snap so the warn is ready before Confirm.
      if (qualityCopy || faceFitEnabled) {
        setIsCheckingQuality(true);
        const pending = measureCaptureQuality(imageSrc)
          .catch((err) => {
            if (import.meta.env.DEV) {
              console.warn('[capture-quality] check failed; continuing', err);
            }
            return {
              metrics: { meanLuminance: 128, luminanceVariance: 1000 },
              issue: null,
            } satisfies CaptureQualityAssessment;
          })
          .then((assessment) => {
            if (mountedRef.current && capturedImageRef.current === imageSrc) {
              setQualityIssue(assessment.issue);
              setIsCheckingQuality(false);
            }
            return assessment;
          });
        qualityPromiseRef.current = pending;
      } else {
        qualityPromiseRef.current = null;
      }

      // Feature-flagged MediaPipe face-fit: still analysis for final metrics.
      // Does not block confirm / Gemini — failure is soft.
      if (faceFitEnabled) {
        const token = faceFitSessionRef.current;
        if (!token) {
          setFaceFitState('runtimeFailure');
          return;
        }
        void import('@/services/face-landmarker.service')
          .then(async ({ analyzeFaceFromDataUrl }) => {
            const assessment = qualityPromiseRef.current
              ? await qualityPromiseRef.current
              : null;
            return analyzeFaceFromDataUrl(imageSrc, token, assessment?.metrics);
          })
          .then((outcome) => {
            if (
              !isCurrentCapturedFaceFitAnalysis(
                faceFitSessionRef.current,
                token,
                capturedImageRef.current,
                imageSrc,
              )
            ) {
              return;
            }
            if (outcome.ok) {
              const resolved = resolveCapturedFaceFit(liveResult, outcome.result);
              setFaceFitResult(resolved.result);
              setCapturedCalibrationSample({
                captureId,
                sessionToken: token,
                result: outcome.result,
                landmarkCount: outcome.landmarkCount,
              });
              setFaceFitState(
                resolved.ready
                  ? 'ready'
                  : uiStateForFaceFitResult(resolved.result),
              );
            } else if (outcome.reason !== 'stale-session') {
              console.warn('[face-fit]', outcome.reason, outcome.message);
              setFaceFitResult(null);
              setFaceFitState('runtimeFailure');
            }
          })
          .catch((err) => {
            console.warn('[face-fit] analysis failed', err);
            if (
              isCurrentCapturedFaceFitAnalysis(
                faceFitSessionRef.current,
                token,
                capturedImageRef.current,
                imageSrc,
              )
            ) {
              setFaceFitResult(null);
              setFaceFitState('runtimeFailure');
            }
          });
      }
    }
  }, [getLiveVideo, fireShutterSfx, onSnapshot, qualityCopy, faceFitEnabled]);

  useEffect(() => {
    if (!usesExternalStream || !mediaStream) return;

    const video = videoRef.current;
    if (!video) return;

    video.srcObject = mediaStream;
    void video.play().catch(() => {
      /* Autoplay may reject until a gesture; stream still paints via autoPlay/muted. */
    });

    const markReady = () => {
      setCameraError(null);
      setIsCameraReady(true);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      markReady();
      return;
    }

    video.addEventListener('loadeddata', markReady, { once: true });
    return () => video.removeEventListener('loadeddata', markReady);
  }, [usesExternalStream, mediaStream]);

  // Prefetch FaceLandmarker as soon as capture mounts (flag on) so Wasm/GPU
  // init overlaps camera open and shutter never blanks the preview.
  useEffect(() => {
    if (!faceFitEnabled) return;

    let cancelled = false;
    const tracker = stabilityTrackerRef.current;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setFaceFitWarming(true);
      setFaceFitLiveReady(false);
      setFaceFitState('initializing');
    });
    tracker.reset();
    lastLiveResultRef.current = null;

    void import('@/services/face-landmarker.service')
      .then(async ({ beginFaceLandmarkerSession, warmupFaceLandmarker }) => {
        const token = beginFaceLandmarkerSession();
        faceFitSessionRef.current = token;
        await warmupFaceLandmarker(token);
      })
      .then(() => {
        if (cancelled) return;
        setFaceFitLiveReady(true);
        setFaceFitWarming(false);
        setFaceFitState('searching');
      })
      .catch((err) => {
        if (cancelled) return;
        setFaceFitWarming(false);
        setFaceFitLiveReady(false);
        setFaceFitResult(null);
        setFaceFitState('runtimeFailure');
        const canvas = overlayCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) clearFaceScanOverlay(ctx, canvas.width, canvas.height);
        console.warn('[face-fit] warmup failed', err);
      });

    return () => {
      cancelled = true;
      tracker.reset();
      lastLiveResultRef.current = null;
      activeCaptureIdRef.current += 1;
      setCapturedCalibrationSample(null);
      const token = faceFitSessionRef.current;
      faceFitSessionRef.current = null;
      if (token) {
        void import('@/services/face-landmarker.service').then(({ closeFaceLandmarker }) =>
          closeFaceLandmarker(token),
        );
      }
    };
  }, [faceFitEnabled, webcamKey]);

  // Live VIDEO-mode scan overlay (rAF + throttled detect). Flag off = no work.
  useEffect(() => {
    if (!faceFitEnabled || !faceFitLiveReady || !isCameraReady || capturedImage) {
      return;
    }

    let rafId = 0;
    let lastDetectAt = 0;
    let cancelled = false;
    const canvas = overlayCanvasRef.current;
    const tracker = stabilityTrackerRef.current;

    const syncCanvasSize = (video: HTMLVideoElement, overlay: HTMLCanvasElement) => {
      // Prefer layout box (pre-transform) so MUPI rotate/mirror CSS stays correct.
      const cssW = Math.max(1, overlay.clientWidth || Math.round(overlay.getBoundingClientRect().width));
      const cssH = Math.max(1, overlay.clientHeight || Math.round(overlay.getBoundingClientRect().height));
      if (overlay.width !== cssW || overlay.height !== cssH) {
        overlay.width = cssW;
        overlay.height = cssH;
      }
      return { cssW, cssH, videoW: video.videoWidth, videoH: video.videoHeight };
    };

    const tick = (now: number) => {
      rafId = window.requestAnimationFrame(tick);
      if (cancelled) return;

      const video = getLiveVideo();
      const overlay = overlayCanvasRef.current;
      if (!video || !overlay || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }

      if (faceFitDetectingRef.current || now - lastDetectAt < FACE_FIT_DETECT_INTERVAL_MS) {
        return;
      }

      lastDetectAt = now;
      faceFitDetectingRef.current = true;
      const token = faceFitSessionRef.current;
      if (!token) {
        faceFitDetectingRef.current = false;
        return;
      }

      void import('@/services/face-landmarker.service')
        .then(({ detectLiveFace }) => detectLiveFace(video, token))
        .then((frame) => {
          if (cancelled) return;
          const active = overlayCanvasRef.current;
          if (!active) return;
          const ctx = active.getContext('2d');
          if (!ctx) return;

          const { cssW, cssH, videoW, videoH } = syncCanvasSize(video, active);
          // Canvas shares CSS transforms with the video element, so landmark
          // space matches without an extra mirror flip.
          const map = {
            canvasWidth: cssW,
            canvasHeight: cssH,
            videoWidth: videoW,
            videoHeight: videoH,
            mirrored: false,
          };

          if (!frame.ok) {
            // A transient video readiness gap is not a new face result.
            // Preserve the current drawing until an explicit clearing state.
            if (frame.reason === 'not-ready') return;
            clearFaceScanOverlay(ctx, cssW, cssH);
            tracker.reset();
            lastLiveResultRef.current = null;
            setFaceFitResult(null);
            if (frame.reason === 'stale-session') return;
            setFaceFitState('runtimeFailure');
            return;
          }

          const { outcome } = frame;
          if (hasCurrentSingleFaceLandmarks(outcome)) {
            // Current landmarks are useful visual feedback before any quality
            // or temporal-stability gate accepts their measurements.
            drawFaceScanOverlay(ctx, outcome.landmarks, map);
          } else {
            clearFaceScanOverlay(ctx, cssW, cssH);
          }
          if (outcome.result.status === 'rejected') {
            tracker.reset();
            lastLiveResultRef.current = null;
            setFaceFitResult(outcome.result);
            setFaceFitState(uiStateForFaceFitResult(outcome.result));
            return;
          }

          const stable = tracker.push(outcome.result, now);
          if (stable.state === 'ready') {
            setFaceFitResult(stable.result);
            if (stable.result.status === 'valid') {
              lastLiveResultRef.current = stable.result;
              setFaceFitState('ready');
            } else {
              lastLiveResultRef.current = null;
              setFaceFitState(uiStateForFaceFitResult(stable.result));
            }
          } else {
            // Preliminary rows must describe this frame, not a median or a
            // previously accepted result from the stability window.
            setFaceFitResult(outcome.result);
            lastLiveResultRef.current = null;
            setFaceFitState('stabilizing');
          }
        })
        .catch((err) => {
          if (!cancelled && import.meta.env.DEV) {
            console.warn('[face-fit] live detect failed', err);
          }
          if (!cancelled) {
            const active = overlayCanvasRef.current;
            const ctx = active?.getContext('2d');
            if (active && ctx) {
              clearFaceScanOverlay(ctx, active.width, active.height);
            }
            tracker.reset();
            lastLiveResultRef.current = null;
            setFaceFitResult(null);
            setFaceFitState('runtimeFailure');
          }
        })
        .finally(() => {
          faceFitDetectingRef.current = false;
        });
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      faceFitDetectingRef.current = false;
      tracker.reset();
      lastLiveResultRef.current = null;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) clearFaceScanOverlay(ctx, canvas.width, canvas.height);
      }
    };
  }, [
    faceFitEnabled,
    faceFitLiveReady,
    isCameraReady,
    capturedImage,
    getLiveVideo,
    webcamKey,
  ]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const captureId = window.setTimeout(() => {
        setCountdown(null);
        captureNow();
      }, 0);
      return () => window.clearTimeout(captureId);
    }
    const timeoutId = window.setTimeout(() => {
      setCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [countdown, captureNow]);

  const startCountdownCapture = () => {
    if (!isCameraReady || countdown !== null) return;
    if (selectedCountdownSeconds <= 0) {
      captureNow();
      return;
    }
    onTapClick();
    setCountdown(selectedCountdownSeconds);
  };

  const handleCancel = () => {
    unlock();
    play('select');
    onCancel();
  };

  const retake = () => {
    onTapClick();
    activeCaptureIdRef.current += 1;
    setCountdown(null);
    capturedImageRef.current = null;
    setCapturedImage(null);
    setCapturedCalibrationSample(null);
    setQualityIssue(null);
    setFaceFitResult(null);
    setFaceFitState(faceFitLiveReady ? 'searching' : 'initializing');
    stabilityTrackerRef.current.reset();
    lastLiveResultRef.current = null;
    setIsCheckingQuality(false);
    qualityPromiseRef.current = null;
    onRetake?.();
  };

  const exportCalibrationSample = async (
    metadata: FaceFitCalibrationMetadata,
    protocol: { stepId: string; stepIndex: number; stepCount: number },
  ): Promise<void> => {
    const sample = capturedCalibrationSample;
    if (!calibrationMode || !sample || !capturedImageRef.current) {
      throw new Error('No current calibration capture');
    }
    const { exportFaceFitCalibrationSample } = await import(
      '@/services/face-fit-fixture-export.service'
    );
    await exportFaceFitCalibrationSample({
      metadata,
      protocol,
      result: sample.result,
      expectedLandmarkCount: sample.landmarkCount,
      sessionToken: sample.sessionToken,
      captureId: sample.captureId,
      isCurrent: (sessionToken, captureId) =>
        faceFitSessionRef.current === sessionToken &&
        activeCaptureIdRef.current === captureId &&
        capturedImageRef.current !== null,
    });
  };

  const confirm = async () => {
    if (!capturedImage || isCheckingQuality) return;
    onTapClick();

    // Soft gate: warn on extreme dark/blur, still allow continue.
    // Measurement usually finished at snap; await only if Confirm is very fast.
    if (qualityCopy && !qualityIssue) {
      setIsCheckingQuality(true);
      try {
        const pending = qualityPromiseRef.current;
        const issue = pending
          ? (await pending).issue
          : (await measureCaptureQuality(capturedImage)).issue;
        if (issue) {
          setQualityIssue(issue);
          return;
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[capture-quality] check failed; continuing', err);
        }
      } finally {
        setIsCheckingQuality(false);
      }
    }

    onCapture(buildConfirmedCapture(capturedImage, faceFitResult));
  };

  const continueDespiteQuality = () => {
    if (!capturedImage) return;
    onTapClick();
    onCapture(buildConfirmedCapture(capturedImage, faceFitResult));
  };

  const handleUserMedia = () => {
    setCameraError(null);
    setIsCameraReady(true);
  };

  const handleUserMediaError = (err: string | DOMException) => {
    if (import.meta.env.DEV) {
      console.error(err);
    }
    const parsed = parseUserMediaError(err);
    setCameraError(parsed);
    setIsCameraReady(false);
    setCountdown(null);
  };

  const selectCountdown = (option: number) => {
    if (option === selectedCountdownSeconds) return;
    onTapClick();
    setSelectedCountdownSeconds(option);
  };

  const retryCamera = () => {
    onTapClick();
    if (usesExternalStream) {
      onCancel();
      return;
    }
    setCameraError(null);
    setIsCameraReady(false);
    setCountdown(null);
    setWebcamKey((key) => key + 1);
  };

  const showRetry = cameraError?.kind === 'permission' || cameraError?.kind === 'generic';
  const showWarmupOverlay = showWebcam && !isCameraReady && !streamPreheated;

  return (
    <div className={frameStyles.root}>
      <AnimatePresence mode="wait">
        {!capturedImage ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={viewportFadeTransition}
            className={frameStyles.viewport}
          >
            {showWebcam ? (
              <>
                <motion.div
                  className={videoContainerClass}
                  initial={{ opacity: streamPreheated ? 1 : 0 }}
                  animate={{ opacity: isCameraReady ? 1 : 0 }}
                  transition={webcamRevealTransition}
                >
                  {usesExternalStream ? (
                    <video ref={videoRef} autoPlay playsInline muted />
                  ) : (
                    <Webcam
                      key={webcamKey}
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={CAMERA_VIDEO_CONSTRAINTS}
                      onUserMedia={handleUserMedia}
                      mirrored={false}
                      forceScreenshotSourceSize={false}
                      imageSmoothing
                      disablePictureInPicture
                      onUserMediaError={handleUserMediaError}
                      screenshotQuality={0.92}
                    />
                  )}
                  {faceFitEnabled ? (
                    <canvas
                      ref={overlayCanvasRef}
                      className={captureStyles.faceFitOverlay}
                      aria-hidden
                    />
                  ) : null}
                </motion.div>
                <AnimatePresence>
                  {showWarmupOverlay ? (
                    <motion.div
                      key="warmup"
                      className={frameStyles.warmupOverlay}
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: screenEase }}
                      aria-hidden
                    >
                      <div className={frameStyles.warmupInner}>
                        <Spinner className={frameStyles.warmupSpinner} />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                {faceFitEnabled &&
                faceFitPanelCopy &&
                countdown === null ? (
                  <FaceFitMetricsPanel
                    result={faceFitResult}
                    state={faceFitWarming ? 'initializing' : faceFitState}
                    copy={faceFitPanelCopy}
                    open={faceFitPanelOpen}
                    onToggle={() => setFaceFitPanelOpen((v) => !v)}
                    placement="live"
                  />
                ) : null}
                <div className={captureStyles.liveVignette} aria-hidden />
                {showFlash ? (
                  <motion.div
                    className={captureStyles.shutterFlash}
                    initial={{ opacity: 0.9 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  />
                ) : null}
              </>
            ) : (
              <div className={captureStyles.errorBackdrop} aria-hidden />
            )}

            <AnimatePresence>
              {countdown !== null && showWebcam ? (
                <>
                  <motion.div
                    className={frameStyles.countdownOverlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                  <motion.div
                    key={countdown}
                    className={frameStyles.countdownBubble}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.15 }}
                  >
                    <div className={cn(frameStyles.countdownInner, 'capture-countdown')}>{countdown}</div>
                  </motion.div>
                  <p className={cn(frameStyles.countdownHint, 'capture-hint')}>{captureHint}</p>
                </>
              ) : null}
            </AnimatePresence>

            {countdown === null ? (
              <div className={frameStyles.topBar}>
                <button
                  type="button"
                  onClick={handleCancel}
                  className={cn(frameStyles.closeBtn, 'capture-close')}
                  aria-label={chromeCopy?.closeAria ?? 'Close camera'}
                >
                  <XIcon className={captureStyles.closeIcon} />
                </button>
                <span className={cn(frameStyles.topBarSpacer, 'topBarSpacer')} aria-hidden />
                <span className={cn(frameStyles.topBarSpacer, 'topBarSpacer')} aria-hidden />
              </div>
            ) : null}

            {countdown === null && showWebcam ? (
              <div className={frameStyles.controlsDock}>
                <div className={frameStyles.controlsInner}>
                  <button
                    type="button"
                    onClick={startCountdownCapture}
                    disabled={!isCameraReady}
                    className={cn(frameStyles.shutter, 'capture-shutter')}
                    aria-label={chromeCopy?.shutterAria ?? 'Capture portrait'}
                  >
                    <div className={frameStyles.shutterInner} />
                  </button>
                  <div className={frameStyles.timerRail}>
                    {COUNTDOWN_OPTIONS.map((option) => {
                      const isSelected = selectedCountdownSeconds === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => selectCountdown(option)}
                          className={cn(
                            frameStyles.timerBtn,
                            'capture-timer-btn',
                            isSelected ? frameStyles.timerBtnActive : frameStyles.timerBtnIdle
                          )}
                          aria-label={
                            option === 0
                              ? chromeCopy?.timerOff ?? 'Off'
                              : (chromeCopy?.timerSecondsAria ?? 'Set {seconds} second timer').replace(
                                  '{seconds}',
                                  String(option),
                                )
                          }
                        >
                          {option === 0 ? chromeCopy?.timerOff ?? 'Off' : `${option}s`}
                        </button>
                      );
                    })}
                  </div>
                  <p className={cn(frameStyles.captureHintText, 'capture-hint')}>{captureHint}</p>
                </div>
              </div>
            ) : null}

            {countdown === null && cameraError ? (
              <div className={frameStyles.controlsDock}>
                <div className={frameStyles.errorPanel}>
                  <p className={frameStyles.errorText}>{cameraError.message}</p>
                  {showRetry ? (
                    <button type="button" onClick={retryCamera} className={frameStyles.retryBtn}>
                      {chromeCopy?.retry ?? 'Try again'}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.45, ease: screenEase }}
            className={frameStyles.viewport}
          >
            <img
              src={capturedImage}
              alt={chromeCopy?.capturedAlt ?? 'Captured'}
              className={captureStyles.previewImage}
            />
            <div className={captureStyles.previewVignette} aria-hidden />
            {faceFitEnabled && faceFitPanelCopy ? (
              <FaceFitMetricsPanel
                result={faceFitResult}
                state={faceFitState}
                copy={faceFitPanelCopy}
                open={faceFitPanelOpen}
                onToggle={() => setFaceFitPanelOpen((v) => !v)}
                placement="preview"
              />
            ) : null}
            {!calibrationMode ? (
              <div className={frameStyles.previewDock}>
              {qualityIssue && qualityCopy ? (
                <div className={frameStyles.errorPanel}>
                  <p className={frameStyles.errorText}>
                    {qualityIssue === 'too_dark' ? qualityCopy.darkWarn : qualityCopy.blurWarn}
                  </p>
                  <div className={frameStyles.previewActions}>
                    <button
                      type="button"
                      onClick={retake}
                      className={cn(frameStyles.previewPill, frameStyles.previewPillSecondary, 'capture-preview-retake')}
                    >
                      <RefreshCwIcon className={frameStyles.previewPillIcon} aria-hidden />
                      <span>{qualityCopy.recaptureLabel}</span>
                    </button>
                    <button
                      type="button"
                      onClick={continueDespiteQuality}
                      className={cn(frameStyles.previewPill, frameStyles.previewPillPrimary, 'capture-preview-confirm')}
                    >
                      <CheckIcon className={frameStyles.previewPillIcon} aria-hidden />
                      <span>{qualityCopy.continueLabel}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={frameStyles.previewActions}>
                  <button
                    type="button"
                    onClick={retake}
                    className={cn(frameStyles.previewPill, frameStyles.previewPillSecondary, 'capture-preview-retake')}
                  >
                    <RefreshCwIcon className={frameStyles.previewPillIcon} aria-hidden />
                    <span>{chromeCopy?.retake ?? 'Retake'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirm()}
                    disabled={isCheckingQuality}
                    className={cn(frameStyles.previewPill, frameStyles.previewPillPrimary, 'capture-preview-confirm')}
                  >
                    <CheckIcon className={frameStyles.previewPillIcon} aria-hidden />
                    <span>{isCheckingQuality ? '…' : chromeCopy?.confirm ?? 'Confirm'}</span>
                  </button>
                </div>
              )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
      {calibrationMode && faceFitPanelCopy?.calibration ? (
        <FaceFitCalibrationPanel
          copy={faceFitPanelCopy.calibration}
          result={capturedCalibrationSample?.result ?? null}
          capturedLandmarkCount={capturedCalibrationSample?.landmarkCount ?? null}
          hasCapturedImage={capturedImage !== null}
          analysisPending={
            capturedImage !== null &&
            capturedCalibrationSample === null &&
            faceFitState !== 'runtimeFailure'
          }
          sizeSandboxEnabled={sizeSandboxEnabled}
          onExport={exportCalibrationSample}
          onPrepareNextCapture={() => {
            if (capturedImageRef.current) retake();
          }}
        />
      ) : null}
    </div>
  );
};

export default CameraCapture;
