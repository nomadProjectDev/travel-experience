/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { OutfitLayer, WardrobeItem } from '@/shared/types';
import { getFriendlyErrorMessage } from '@/shared/lib/utils';
import { getWardrobe, isFeatureEnabled, getManifest } from '@config';
import { useUiSfx } from '@/shared/hooks/useUiSfx';
import { trackEvent } from '@/shared/integrations/track';
import { urlToDecartGarmentFile, urlToGarmentFile } from '@/core/media/garmentFile';
import {
  buildVisibleLookSignature,
  createInitialActiveSlots,
  deriveRenderPlan,
  findSlotByGarmentId,
  getAllActiveGarmentIds,
  getVisibleActiveGarmentIds,
  resolveSlotsForGarmentSelection,
  toggleSlotVisibility,
  type ActiveSlots,
  type SlotKey,
} from '@/core/look/lookComposition';
import {
  FACE_FRAMING_OPTIONS,
  createFramingProfileFromDataUrl,
  type FramingProfile,
} from '@/core/media/framing';
import type { EnvironmentId, EnvironmentSceneId } from '@config/types';
import type { SafeFaceFitContext } from '@/core/face';
import type { LiveTryOnBootstrap, ModelFinalization } from '@/features/capture/StartScreen';
import { stopCameraStream } from '@/shared/lib/camera';
import {
  connectDecartVtonSession,
  disconnectDecartVtonSession,
  setDecartVtonGarment,
} from '@/services/decart-vton.service';
import {
  EnvironmentVariantCache,
  buildEnvironmentCacheKey,
  formatEnvironmentCreatingMessage,
  isGeneratedEnvironmentId,
  isStaleEnvironmentRequest,
  type EnvironmentRequestState,
} from './environmentState';
import {
  dropLoadingYawPhotos,
  findReadyPhoto,
  removePhotoById,
  upsertReadyPhoto,
  upsertReadyPhotoResult,
  type SessionPhoto,
} from './sessionPhotos';
import {
  canStartLoopVideoJob,
  isEligibleLoopStill,
  registerFramePrimaryStill,
  resolveWellVideoUrl,
  shouldPrefetchLoopVideo,
} from './studioVideo';
import {
  INITIAL_FACE_FIT_SESSION,
  finalizeFaceFitSession,
  startFaceFitSession,
} from './faceFitSession';

const DEV_STUDIO_SEED_PATH = '/dev/studio-seed.png';

function shouldSeedStudioSession(): boolean {
  if (!import.meta.env.DEV) return false;
  if (import.meta.env.VITE_DEV_STUDIO_SEED?.trim() === 'true') return true;
  try {
    return new URLSearchParams(window.location.search).get('studio') === '1';
  } catch {
    return false;
  }
}

function readDevStudioQuery(): { seedSrc: string; frameId: string | null } {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      seedSrc: params.get('seed')?.trim() || DEV_STUDIO_SEED_PATH,
      frameId: params.get('frame')?.trim() || null,
    };
  } catch {
    return { seedSrc: DEV_STUDIO_SEED_PATH, frameId: null };
  }
}

async function loadImageAsDataUrl(src: string): Promise<string> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Dev studio seed failed to load: ${src}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Dev studio seed decode failed'));
    };
    reader.onerror = () => reject(new Error('Dev studio seed read failed'));
    reader.readAsDataURL(blob);
  });
}

export function useTryOnSession() {
  const { play, playTransition } = useUiSfx({ volume: 0.32 });
  const hadStudioSessionRef = useRef(false);
  const tryOnStartTrackedRef = useRef(false);
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [isLiveSession, setIsLiveSession] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const isLiveSessionRef = useRef(false);
  const liveConnectTokenRef = useRef(0);
  /** Clears the "remote stream never arrived" watchdog for the active live connect. */
  const remoteStreamWaitTimerRef = useRef<number | null>(null);
  const remoteStreamReceivedRef = useRef(false);

  const clearRemoteStreamWaitTimer = useCallback(() => {
    if (remoteStreamWaitTimerRef.current != null) {
      window.clearTimeout(remoteStreamWaitTimerRef.current);
      remoteStreamWaitTimerRef.current = null;
    }
  }, []);
  const [safeFaceFitContext, setSafeFaceFitContext] =
    useState<SafeFaceFitContext | undefined>(undefined);
  /** Composed studio look with active glasses — source for environment variants. */
  const [studioImageUrl, setStudioImageUrl] = useState<string | null>(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] =
    useState<EnvironmentId>('studio');
  const [displayedEnvironmentId, setDisplayedEnvironmentId] =
    useState<EnvironmentId>('studio');
  const [environmentRequest, setEnvironmentRequest] =
    useState<EnvironmentRequestState>({ kind: 'idle' });
  const [cachedEnvKeys, setCachedEnvKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [activeSlots, setActiveSlots] = useState<ActiveSlots>(() => createInitialActiveSlots());
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const clientWardrobe = getWardrobe();
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(clientWardrobe);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  /** True for prefetch or button — disables Crear vídeo without forcing the busy label. */
  const [loopVideoInFlight, setLoopVideoInFlight] = useState(false);
  const [videoLoopsBySource, setVideoLoopsBySource] = useState<Record<string, string>>(
    {},
  );
  const [videoJobSourceUrl, setVideoJobSourceUrl] = useState<string | null>(null);
  const [videoReadySourceUrl, setVideoReadySourceUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [primaryStillByFrame, setPrimaryStillByFrame] = useState<
    Record<string, string>
  >({});
  const [sessionPhotos, setSessionPhotos] = useState<SessionPhoto[]>([]);
  /** Which gallery thumb drives the well (still vs video playback). */
  const [activeSessionPhotoId, setActiveSessionPhotoId] = useState<string | null>(null);
  const activeSlotsRef = useRef<ActiveSlots>(createInitialActiveSlots());
  const isComposeRequestInFlightRef = useRef(false);
  const isVideoRequestInFlightRef = useRef(false);
  const prefetchedStillUrlsRef = useRef(new Set<string>());
  const primaryStillByFrameRef = useRef<Record<string, string>>({});
  const videoLoopsRef = useRef<Record<string, string>>({});
  const videoRequestTokenRef = useRef(0);
  const runLoopVideoGenerationRef = useRef<
    (sourceUrl: string, origin: 'prefetch' | 'button') => void
  >(() => undefined);
  const composeRequestTokenRef = useRef(0);
  const envRequestTokenRef = useRef(0);
  const envAbortRef = useRef<AbortController | null>(null);
  const envCacheRef = useRef(new EnvironmentVariantCache(8));
  const studioImageRef = useRef<string | null>(null);
  const modelImageRef = useRef<string | null>(null);
  const displayImageRef = useRef<string | null>(null);
  const framingProfileRef = useRef<FramingProfile | null>(null);
  const faceFitSessionRef = useRef(INITIAL_FACE_FIT_SESSION);
  const lookSnapshotRef = useRef<Record<string, string>>({});
  const sideYawAbortsRef = useRef(new Set<AbortController>());
  const photoSeqRef = useRef(0);
  /** Source currently generating left+right yaw (blocks duplicate in-flight only). */
  const yawInFlightSourceRef = useRef<string | null>(null);
  /**
   * Successful left/right stills keyed by sourceUrl.
   * Restores thumbs on A→B→A without re-paying Gemini; keys always include both yaws.
   */
  const yawStillsBySourceRef = useRef(
    new Map<string, { readonly left: string; readonly right: string }>(),
  );
  const prefetchDelayTimersRef = useRef(new Map<string, number>());
  const videoSlotBySourceRef = useRef(new Map<string, string>());
  const PREFETCH_IDLE_MS = 2500;

  const nextPhotoId = (prefix: string): string => {
    photoSeqRef.current += 1;
    return `${prefix}-${photoSeqRef.current}`;
  };

  const videoSlotIdForSource = useCallback((sourceUrl: string): string => {
    const existing = videoSlotBySourceRef.current.get(sourceUrl);
    if (existing) return existing;
    const id = nextPhotoId('video');
    videoSlotBySourceRef.current.set(sourceUrl, id);
    return id;
  }, []);

  const revokeBlobUrl = useCallback((url: string | null | undefined) => {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const clearAllVideoLoops = useCallback(() => {
    for (const url of Object.values(videoLoopsRef.current)) {
      revokeBlobUrl(url);
    }
    videoLoopsRef.current = {};
    setVideoLoopsBySource({});
  }, [revokeBlobUrl]);

  const resetVideoSession = useCallback(() => {
    videoRequestTokenRef.current += 1;
    prefetchedStillUrlsRef.current = new Set();
    isVideoRequestInFlightRef.current = false;
    primaryStillByFrameRef.current = {};
    videoSlotBySourceRef.current = new Map();
    for (const timer of prefetchDelayTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    prefetchDelayTimersRef.current.clear();
    setPrimaryStillByFrame({});
    setVideoJobSourceUrl(null);
    setVideoReadySourceUrl(null);
    setIsVideoGenerating(false);
    setLoopVideoInFlight(false);
    setVideoError(null);
    clearAllVideoLoops();
    setSessionPhotos((prev) => prev.filter((photo) => photo.kind !== 'video'));
  }, [clearAllVideoLoops]);

  const storeLoopForSource = useCallback(
    (sourceUrl: string, videoUrl: string) => {
      const previous = videoLoopsRef.current[sourceUrl];
      if (previous && previous !== videoUrl) {
        revokeBlobUrl(previous);
      }
      const next = { ...videoLoopsRef.current, [sourceUrl]: videoUrl };
      videoLoopsRef.current = next;
      setVideoLoopsBySource(next);
      setVideoReadySourceUrl(sourceUrl);
      const videoId = videoSlotIdForSource(sourceUrl);
      setSessionPhotos((prev) =>
        upsertReadyPhoto(prev, {
          id: videoId,
          kind: 'video',
          status: 'ready',
          imageUrl: sourceUrl,
          videoUrl,
        }),
      );
    },
    [revokeBlobUrl, videoSlotIdForSource],
  );

  const tryPrefetchLoopForStill = useCallback((sourceUrl: string) => {
    if (
      !shouldPrefetchLoopVideo({
        videoLoopEnabled: isFeatureEnabled('videoLoop'),
        sourceUrl,
        alreadyPrefetched: prefetchedStillUrlsRef.current.has(sourceUrl),
        inFlight: isVideoRequestInFlightRef.current,
      })
    ) {
      return;
    }
    const existing = prefetchDelayTimersRef.current.get(sourceUrl);
    if (existing) window.clearTimeout(existing);
    // Delay so land + yaw don't compete with Veo on the same API budget.
    const timer = window.setTimeout(() => {
      prefetchDelayTimersRef.current.delete(sourceUrl);
      if (
        !shouldPrefetchLoopVideo({
          videoLoopEnabled: isFeatureEnabled('videoLoop'),
          sourceUrl,
          alreadyPrefetched: prefetchedStillUrlsRef.current.has(sourceUrl),
          inFlight: isVideoRequestInFlightRef.current,
        })
      ) {
        return;
      }
      prefetchedStillUrlsRef.current.add(sourceUrl);
      runLoopVideoGenerationRef.current(sourceUrl, 'prefetch');
    }, PREFETCH_IDLE_MS);
    prefetchDelayTimersRef.current.set(sourceUrl, timer);
  }, []);

  const rememberFramePrimaryStill = useCallback(
    (frameId: string, imageUrl: string) => {
      const { next, registered } = registerFramePrimaryStill(
        primaryStillByFrameRef.current,
        frameId,
        imageUrl,
      );
      primaryStillByFrameRef.current = next;
      setPrimaryStillByFrame(next);
      if (registered) {
        tryPrefetchLoopForStill(imageUrl);
      }
    },
    [tryPrefetchLoopForStill],
  );

  useEffect(() => {
    return () => {
      videoRequestTokenRef.current += 1;
      clearAllVideoLoops();
      disconnectDecartVtonSession();
    };
  }, [clearAllVideoLoops]);

  useEffect(() => {
    if (modelImageUrl) {
      if (!hadStudioSessionRef.current) {
        hadStudioSessionRef.current = true;
        playTransition('open');
      }
      if (!tryOnStartTrackedRef.current) {
        tryOnStartTrackedRef.current = true;
        trackEvent('try_on_start');
      }
      return;
    }
    hadStudioSessionRef.current = false;
    tryOnStartTrackedRef.current = false;
  }, [modelImageUrl, playTransition]);

  useEffect(() => {
    modelImageRef.current = modelImageUrl;
  }, [modelImageUrl]);

  useEffect(() => {
    displayImageRef.current = displayImageUrl;
  }, [displayImageUrl]);

  useEffect(() => {
    studioImageRef.current = studioImageUrl;
  }, [studioImageUrl]);

  const cancelEnvironmentRequest = useCallback(() => {
    envRequestTokenRef.current += 1;
    envAbortRef.current?.abort();
    envAbortRef.current = null;
    setEnvironmentRequest({ kind: 'idle' });
  }, []);

  const abortAllSideYaw = useCallback(() => {
    for (const controller of sideYawAbortsRef.current) {
      controller.abort();
    }
    sideYawAbortsRef.current.clear();
  }, []);

  const cancelSideYaw = useCallback(() => {
    abortAllSideYaw();
    yawInFlightSourceRef.current = null;
    // Keep ready side stills + source cache; only clear in-flight placeholders.
    setSessionPhotos((prev) => dropLoadingYawPhotos(prev));
  }, [abortAllSideYaw]);

  const rememberReadyPhoto = useCallback((photo: Extract<SessionPhoto, { status: 'ready' }>) => {
    setSessionPhotos((prev) => upsertReadyPhoto(prev, photo));
    if (photo.kind !== 'video') {
      setActiveSessionPhotoId(photo.id);
    }
  }, []);

  const startSideYawFrom = useCallback((sourceUrl: string) => {
    const profile = framingProfileRef.current;
    if (!sourceUrl || !profile) return;

    const yawCacheKey = sourceUrl;
    const cached = yawStillsBySourceRef.current.get(yawCacheKey);
    if (cached) {
      // A→B→A: ensure both sides are present without a second Gemini bill.
      // Do not wipe other looks' ready yaws — upsert skips duplicate imageUrls.
      abortAllSideYaw();
      yawInFlightSourceRef.current = null;
      const leftId = nextPhotoId('yaw-left');
      const rightId = nextPhotoId('yaw-right');
      setSessionPhotos((prev) => {
        let next = dropLoadingYawPhotos(prev);
        next = upsertReadyPhoto(next, {
          id: leftId,
          kind: 'yaw-left',
          status: 'ready',
          imageUrl: cached.left,
        });
        next = upsertReadyPhoto(next, {
          id: rightId,
          kind: 'yaw-right',
          status: 'ready',
          imageUrl: cached.right,
        });
        return next;
      });
      return;
    }

    if (yawInFlightSourceRef.current === sourceUrl) return;

    // Drop only in-flight yaw slots; ready side stills from prior looks accumulate.
    abortAllSideYaw();
    yawInFlightSourceRef.current = sourceUrl;

    const abort = new AbortController();
    sideYawAbortsRef.current.add(abort);

    const leftId = nextPhotoId('yaw-left');
    const rightId = nextPhotoId('yaw-right');
    setSessionPhotos((prev) => [
      ...dropLoadingYawPhotos(prev),
      { id: leftId, kind: 'yaw-left', status: 'loading' },
      { id: rightId, kind: 'yaw-right', status: 'loading' },
    ]);
    let leftUrl: string | null = null;
    let rightUrl: string | null = null;
    let settled = 0;

    const settleYawFlight = () => {
      settled += 1;
      if (settled < 2) return;
      if (yawInFlightSourceRef.current === sourceUrl) {
        yawInFlightSourceRef.current = null;
      }
      if (
        !abort.signal.aborted &&
        leftUrl &&
        rightUrl &&
        leftUrl !== rightUrl
      ) {
        yawStillsBySourceRef.current.set(yawCacheKey, { left: leftUrl, right: rightUrl });
      }
    };

    const runYaw = async (yaw: 'left' | 'right', id: string, kind: 'yaw-left' | 'yaw-right') => {
      try {
        const { generateSideYawImage } = await import('@/services/geminiService');
        const imageUrl = await generateSideYawImage({
          sourceImageUrl: sourceUrl,
          yaw,
          profile,
          signal: abort.signal,
        });
        if (abort.signal.aborted) {
          settleYawFlight();
          return;
        }

        setSessionPhotos((prev) => {
          const next = upsertReadyPhotoResult(prev, {
            id,
            kind,
            status: 'ready',
            imageUrl,
          });
          // useState updaters run eagerly during dispatch — record URLs only when accepted
          // so a front/sibling echo never becomes a cached "side" still.
          if (next.accepted) {
            if (yaw === 'left') leftUrl = imageUrl;
            else rightUrl = imageUrl;
          }
          return next.photos;
        });
        settleYawFlight();
      } catch (err) {
        if (abort.signal.aborted || (err as Error)?.name === 'AbortError') {
          settleYawFlight();
          return;
        }
        setSessionPhotos((prev) => removePhotoById(prev, id));
        settleYawFlight();
      }
    };

    void runYaw('left', leftId, 'yaw-left');
    void runYaw('right', rightId, 'yaw-right');
  }, [abortAllSideYaw]);

  useEffect(() => {
    return () => {
      abortAllSideYaw();
    };
  }, [abortAllSideYaw]);

  const wardrobeById = useMemo(
    () =>
      wardrobe.reduce(
        (acc, item) => {
          acc[item.id] = item;
          return acc;
        },
        {} as Record<string, WardrobeItem>
      ),
    [wardrobe]
  );

  const activeGarmentIds = useMemo(
    () => getAllActiveGarmentIds(activeSlots),
    [activeSlots]
  );

  const activeFrameId = useMemo(() => {
    const glasses = activeSlots.glasses;
    return glasses.visible && glasses.garmentId ? glasses.garmentId : null;
  }, [activeSlots]);

  const hasCachedSelectedEnvironment = useMemo(() => {
    if (!activeFrameId || !isGeneratedEnvironmentId(selectedEnvironmentId)) {
      return false;
    }
    return cachedEnvKeys.has(
      buildEnvironmentCacheKey(activeFrameId, selectedEnvironmentId),
    );
  }, [activeFrameId, selectedEnvironmentId, cachedEnvKeys]);

  const visibleActiveGarmentIds = useMemo(
    () => getVisibleActiveGarmentIds(activeSlots),
    [activeSlots]
  );

  const hasVisibleGarmentLayers = useMemo(
    () => visibleActiveGarmentIds.length > 0,
    [visibleActiveGarmentIds]
  );

  const commitSlots = useCallback((slots: ActiveSlots) => {
    activeSlotsRef.current = slots;
    setActiveSlots(slots);
  }, []);

  const commitOutfitHistory = useCallback((history: OutfitLayer[]) => {
    setOutfitHistory(history);
  }, []);

  const cacheLookSnapshot = useCallback((slots: ActiveSlots, imageUrl: string) => {
    const signature = buildVisibleLookSignature(slots);
    lookSnapshotRef.current = {
      ...lookSnapshotRef.current,
      [signature]: imageUrl,
    };
  }, []);

  const onBeginCaptureSession = useCallback((): number => {
    const next = startFaceFitSession(faceFitSessionRef.current);
    faceFitSessionRef.current = next;
    setSafeFaceFitContext(undefined);
    return next.token;
  }, []);

  const onModelFinalized = useCallback(
    ({
      sessionToken,
      modelUrl: url,
      profile,
      bootstrap,
      fitContext,
    }: ModelFinalization) => {
      const nextFaceFit = finalizeFaceFitSession(
        faceFitSessionRef.current,
        sessionToken,
        fitContext,
      );
      if (nextFaceFit === faceFitSessionRef.current) return;
      faceFitSessionRef.current = nextFaceFit;
      setSafeFaceFitContext(nextFaceFit.context);
      void import('@/services/geminiService');
      const initialSlots = bootstrap
        ? resolveSlotsForGarmentSelection(
            createInitialActiveSlots(),
            bootstrap.garment,
          )
        : createInitialActiveSlots();
      const displayUrl = bootstrap?.displayUrl ?? url;
      cancelEnvironmentRequest();
      envCacheRef.current.clear();
      setCachedEnvKeys(new Set());
      setSelectedEnvironmentId('studio');
      setDisplayedEnvironmentId('studio');
      setModelImageUrl(url);
      setDisplayImageUrl(displayUrl);
      modelImageRef.current = url;
      displayImageRef.current = displayUrl;
      framingProfileRef.current = profile;
      photoSeqRef.current = 0;
      abortAllSideYaw();
      yawInFlightSourceRef.current = null;
      yawStillsBySourceRef.current = new Map();
      const frontId = nextPhotoId('front');
      setSessionPhotos([
        { id: frontId, kind: 'front', status: 'ready', imageUrl: displayUrl },
      ]);
      setActiveSessionPhotoId(frontId);
      if (bootstrap) {
        setStudioImageUrl(displayUrl);
        studioImageRef.current = displayUrl;
        lookSnapshotRef.current = {
          base: url,
          [buildVisibleLookSignature(initialSlots)]: displayUrl,
        };
      } else {
        setStudioImageUrl(null);
        studioImageRef.current = null;
        lookSnapshotRef.current = { base: url };
      }
      composeRequestTokenRef.current += 1;
      commitSlots(initialSlots);
      commitOutfitHistory(
        bootstrap
          ? [
              {
                garment: null,
                imageUrl: url,
                slot: 'base',
              },
              {
                garment: bootstrap.garment,
                imageUrl: displayUrl,
                slot: bootstrap.garment.category,
              },
            ]
          : [
              {
                garment: null,
                imageUrl: url,
                slot: 'base',
              },
            ],
      );
      resetVideoSession();
      isComposeRequestInFlightRef.current = false;
      if (bootstrap) {
        trackEvent('try_on_complete', { product_id: bootstrap.garment.id });
      }
      startSideYawFrom(displayUrl);
      if (bootstrap) {
        rememberFramePrimaryStill(bootstrap.garment.id, displayUrl);
      }
    },
    [
      cancelEnvironmentRequest,
      commitOutfitHistory,
      commitSlots,
      rememberFramePrimaryStill,
      resetVideoSession,
      startSideYawFrom,
      abortAllSideYaw,
    ],
  );

  const onStartLiveTryOn = useCallback(
    async ({ sessionToken, stream, garment }: LiveTryOnBootstrap) => {
      const nextFaceFit = finalizeFaceFitSession(
        faceFitSessionRef.current,
        sessionToken,
        undefined,
      );
      if (nextFaceFit === faceFitSessionRef.current) {
        stopCameraStream(stream);
        return;
      }
      faceFitSessionRef.current = nextFaceFit;
      setSafeFaceFitContext(undefined);

      const connectToken = liveConnectTokenRef.current + 1;
      liveConnectTokenRef.current = connectToken;

      cancelEnvironmentRequest();
      envCacheRef.current.clear();
      setCachedEnvKeys(new Set());
      setSelectedEnvironmentId('studio');
      setDisplayedEnvironmentId('studio');
      resetVideoSession();
      abortAllSideYaw();
      yawInFlightSourceRef.current = null;
      yawStillsBySourceRef.current = new Map();
      photoSeqRef.current = 0;
      setSessionPhotos([]);
      setActiveSessionPhotoId(null);

      isLiveSessionRef.current = true;
      setIsLiveSession(true);
      setLocalStream(stream);
      setRemoteStream(null);
      setModelImageUrl('live://decart-vton');
      setDisplayImageUrl(null);
      setStudioImageUrl(null);
      modelImageRef.current = 'live://decart-vton';
      displayImageRef.current = null;
      studioImageRef.current = null;
      isComposeRequestInFlightRef.current = false;

      const initialSlots = createInitialActiveSlots();
      if (garment) {
        initialSlots[garment.category] = { garmentId: garment.id, visible: true };
      }
      commitSlots(initialSlots);
      commitOutfitHistory([]);

      setError(null);
      setIsLoading(true);
      remoteStreamReceivedRef.current = false;
      clearRemoteStreamWaitTimer();
      setLoadingMessage(
        garment
          ? `Conectando probador en vivo (${garment.name})…`
          : 'Conectando probador en vivo…',
      );

      const isStaleConnect = () =>
        liveConnectTokenRef.current !== connectToken || !isLiveSessionRef.current;

      try {
        const initialGarment = garment
          ? {
              item: garment,
              file: await urlToDecartGarmentFile(garment.url, garment.name),
            }
          : undefined;

        if (isStaleConnect()) {
          return;
        }

        await connectDecartVtonSession({
          localStream: stream,
          initialGarment,
          onRemoteStream: (transformedStream) => {
            if (isStaleConnect()) {
              return;
            }
            remoteStreamReceivedRef.current = true;
            clearRemoteStreamWaitTimer();
            setRemoteStream(transformedStream);
            setIsLoading(false);
            setLoadingMessage('');
            play('success');
            if (garment) {
              trackEvent('try_on_complete', { product_id: garment.id });
            }
          },
          onConnectionChange: (state) => {
            if (isStaleConnect() || remoteStreamReceivedRef.current) {
              return;
            }
            // Leave pure "Conectando…" once LiveKit is up; remote track is still pending.
            switch (state) {
              case 'connected':
              case 'generating':
                setLoadingMessage(
                  garment
                    ? `Conectado — esperando video (${garment.name})…`
                    : 'Conectado — esperando video transformado…',
                );
                break;
              case 'connecting':
              case 'reconnecting':
                setLoadingMessage(
                  garment
                    ? `Conectando probador en vivo (${garment.name})…`
                    : 'Conectando probador en vivo…',
                );
                break;
              case 'disconnected':
                break;
              default: {
                const _exhaustive: never = state;
                void _exhaustive;
                break;
              }
            }
          },
          onCapacityWait: ({ retryAfterMs }) => {
            if (isStaleConnect()) {
              return;
            }
            const secs = Math.max(1, Math.ceil(retryAfterMs / 1000));
            setLoadingMessage(`Servidor con alta demanda, reintentando en ${secs}s…`);
          },
          onError: (err) => {
            if (isStaleConnect()) {
              return;
            }
            clearRemoteStreamWaitTimer();
            play('error');
            setIsLoading(false);
            setLoadingMessage('');
            setError(getFriendlyErrorMessage(err, 'Error en la sesión de video en vivo'));
          },
          onSessionEnded: (reason) => {
            if (isStaleConnect()) {
              return;
            }
            clearRemoteStreamWaitTimer();
            setIsLoading(false);
            setLoadingMessage('');
            if (reason === 'session_limit') {
              setError('Se alcanzó el límite de sesiones simultáneas de Decart.');
            } else {
              setError('La sesión en vivo ha finalizado. Pulsa volver para reconectar.');
            }
          },
        });

        // The session manager waits through image/prompt fallback and, when
        // needed, a second VP8 connection. Start the UI watchdog only after
        // those attempts finish; starting it before connect() falsely marked
        // slower reloads as interrupted while the fallback was still active.
        if (!isStaleConnect() && !remoteStreamReceivedRef.current) {
          setLoadingMessage(
            garment
              ? `Conectado — esperando video (${garment.name})…`
              : 'Conectado — esperando video transformado…',
          );
          const REMOTE_STREAM_WAIT_MS = 12_000;
          remoteStreamWaitTimerRef.current = window.setTimeout(() => {
            if (isStaleConnect() || remoteStreamReceivedRef.current) return;
            play('error');
            setIsLoading(false);
            setLoadingMessage('');
            setError(
              'La conexión WebRTC está activa, pero no llegó el video transformado. Vuelve a intentar o comprueba la red.',
            );
          }, REMOTE_STREAM_WAIT_MS);
        }
      } catch (err) {
        if (isStaleConnect()) {
          return;
        }
        clearRemoteStreamWaitTimer();
        play('error');
        setIsLoading(false);
        setLoadingMessage('');
        setError(getFriendlyErrorMessage(err, 'No se pudo conectar al probador en vivo'));
      }
    },
    [
      abortAllSideYaw,
      cancelEnvironmentRequest,
      clearRemoteStreamWaitTimer,
      commitOutfitHistory,
      commitSlots,
      play,
      resetVideoSession,
    ],
  );

  const onRecordLiveSnapshot = useCallback(
    (snapshotDataUrl: string) => {
      if (!snapshotDataUrl) return;
      play('tap');
      const id = nextPhotoId('look');
      setSessionPhotos((prev) =>
        upsertReadyPhoto(prev, {
          id,
          kind: 'look',
          status: 'ready',
          imageUrl: snapshotDataUrl,
        }),
      );
    },
    [play],
  );

  const onReturnToLiveStream = useCallback(() => {
    if (!isLiveSessionRef.current) return;
    play('tap');
    setActiveSessionPhotoId(null);
    setDisplayImageUrl(null);
    displayImageRef.current = null;
  }, [play]);

  const onDismissVideoReadyNotice = useCallback(() => {
    setVideoReadySourceUrl(null);
  }, []);

  const onDismissVideoError = useCallback(() => {
    play('tap');
    setVideoError(null);
  }, [play]);

  const onStartOver = useCallback(() => {
    play('select');
    playTransition('close');
    composeRequestTokenRef.current += 1;
    liveConnectTokenRef.current += 1;
    isLiveSessionRef.current = false;
    clearRemoteStreamWaitTimer();
    remoteStreamReceivedRef.current = false;
    disconnectDecartVtonSession();
    setIsLiveSession(false);
    setLocalStream(null);
    setRemoteStream(null);
    cancelEnvironmentRequest();
    envCacheRef.current.clear();
    setCachedEnvKeys(new Set());
    resetVideoSession();
    cancelSideYaw();
    yawStillsBySourceRef.current = new Map();
    setSessionPhotos([]);
    setModelImageUrl(null);
    setDisplayImageUrl(null);
    setStudioImageUrl(null);
    setSelectedEnvironmentId('studio');
    setDisplayedEnvironmentId('studio');
    modelImageRef.current = null;
    displayImageRef.current = null;
    studioImageRef.current = null;
    framingProfileRef.current = null;
    const nextFaceFit = startFaceFitSession(faceFitSessionRef.current);
    faceFitSessionRef.current = nextFaceFit;
    setSafeFaceFitContext(undefined);
    lookSnapshotRef.current = {};
    commitSlots(createInitialActiveSlots());
    commitOutfitHistory([]);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setWardrobe(getWardrobe());
    isComposeRequestInFlightRef.current = false;
  }, [
    cancelEnvironmentRequest,
    cancelSideYaw,
    clearRemoteStreamWaitTimer,
    commitOutfitHistory,
    commitSlots,
    play,
    playTransition,
    resetVideoSession,
  ]);

  const runComposePipeline = useCallback(
    async (nextSlots: ActiveSlots, loadingLabel: string): Promise<boolean> => {
      const baseModelImage = modelImageRef.current;
      const framingProfile = framingProfileRef.current;
      if (!baseModelImage || !framingProfile || isComposeRequestInFlightRef.current) return false;

      const requestToken = composeRequestTokenRef.current + 1;
      composeRequestTokenRef.current = requestToken;
      isComposeRequestInFlightRef.current = true;
      setIsLoading(true);
      setLoadingMessage(loadingLabel);
      setError(null);

      try {
        const { generateVirtualTryOnImage } = await import('@/services/geminiService');
        if (composeRequestTokenRef.current !== requestToken) return false;

        const renderPlan = deriveRenderPlan(nextSlots);
        if (renderPlan.length === 0) {
          cacheLookSnapshot(nextSlots, baseModelImage);
          setDisplayImageUrl(baseModelImage);
          displayImageRef.current = baseModelImage;
          setStudioImageUrl(null);
          studioImageRef.current = null;
          play('success');
          trackEvent('try_on_complete');
          return true;
        }

        let composedImage = baseModelImage;
        const pipelineSlots = createInitialActiveSlots();
        cacheLookSnapshot(pipelineSlots, baseModelImage);

        for (const { slot, garmentId } of renderPlan) {
          if (composeRequestTokenRef.current !== requestToken) return false;

          const garmentInfo = wardrobeById[garmentId];
          if (!garmentInfo) {
            throw new Error(`Missing wardrobe item for slot ${slot}`);
          }

          pipelineSlots[slot] = { garmentId, visible: true };
          if (slot === 'kits') {
            pipelineSlots.tops = { ...pipelineSlots.tops, garmentId: null };
            pipelineSlots.bottoms = { ...pipelineSlots.bottoms, garmentId: null };
          }

          const signature = buildVisibleLookSignature(pipelineSlots);
          const cachedLayer = lookSnapshotRef.current[signature];
          if (cachedLayer) {
            composedImage = cachedLayer;
            continue;
          }

          const garmentFile = await urlToGarmentFile(garmentInfo.url, garmentInfo.name);
          if (composeRequestTokenRef.current !== requestToken) return false;
          composedImage = await generateVirtualTryOnImage(
            composedImage,
            garmentFile,
            framingProfile,
            slot,
          );
          if (composeRequestTokenRef.current !== requestToken) return false;
          cacheLookSnapshot(pipelineSlots, composedImage);
        }

        cacheLookSnapshot(nextSlots, composedImage);
        setDisplayImageUrl(composedImage);
        displayImageRef.current = composedImage;
        const glasses = nextSlots.glasses;
        if (glasses.visible && glasses.garmentId) {
          setStudioImageUrl(composedImage);
          studioImageRef.current = composedImage;
          rememberReadyPhoto({
            id: nextPhotoId('look'),
            kind: 'look',
            status: 'ready',
            imageUrl: composedImage,
          });
          rememberFramePrimaryStill(glasses.garmentId, composedImage);
          startSideYawFrom(composedImage);
        } else {
          setStudioImageUrl(null);
          studioImageRef.current = null;
          cancelSideYaw();
        }
        play('success');
        const primaryGarmentId = renderPlan[renderPlan.length - 1]?.garmentId;
        trackEvent('try_on_complete', {
          product_id: primaryGarmentId,
        });
        return true;
      } catch (err) {
        if (composeRequestTokenRef.current !== requestToken) return false;
        play('error');
        trackEvent('error', { code: 'compose_failed' });
        setError(getFriendlyErrorMessage(err, 'Failed to compose look layers'));
        return false;
      } finally {
        if (composeRequestTokenRef.current === requestToken) {
          setIsLoading(false);
          setLoadingMessage('');
          isComposeRequestInFlightRef.current = false;
        }
      }
      return false;
    },
    [
      cacheLookSnapshot,
      cancelSideYaw,
      play,
      rememberFramePrimaryStill,
      rememberReadyPhoto,
      startSideYawFrom,
      wardrobeById,
    ],
  );

  const onGarmentSelect = useCallback(
    async (_garmentFile: File, garmentInfo: WardrobeItem) => {
      if (!modelImageRef.current || isLoading || isComposeRequestInFlightRef.current) return;

      if (isLiveSessionRef.current) {
        const currentSlots = activeSlotsRef.current;
        const currentSlot = findSlotByGarmentId(currentSlots, garmentInfo.id);
        if (currentSlot && currentSlots[currentSlot].visible && !displayImageRef.current) {
          return;
        }

        play('tap');
        trackEvent('product_view', {
          product_id: garmentInfo.id,
          category: garmentInfo.category,
        });
        setError(null);
        setVideoError(null);
        setActiveSessionPhotoId(null);
        setDisplayImageUrl(null);
        displayImageRef.current = null;

        const nextSlots = createInitialActiveSlots();
        nextSlots[garmentInfo.category] = { garmentId: garmentInfo.id, visible: true };
        commitSlots(nextSlots);

        const requestToken = composeRequestTokenRef.current + 1;
        composeRequestTokenRef.current = requestToken;
        isComposeRequestInFlightRef.current = true;
        setIsLoading(true);
        setLoadingMessage(`Probando ${garmentInfo.name}…`);

        try {
          // Prefer a Decart-ready file from the dock; otherwise re-fetch/encode.
          const looksDecartReady =
            _garmentFile.size > 0 &&
            _garmentFile.size <= 4.5 * 1024 * 1024 &&
            /image\/(jpeg|png|webp)/i.test(_garmentFile.type);
          const fileToSend = looksDecartReady
            ? _garmentFile
            : await urlToDecartGarmentFile(garmentInfo.url, garmentInfo.name);
          if (composeRequestTokenRef.current !== requestToken) return;
          await setDecartVtonGarment(garmentInfo, fileToSend);
          if (composeRequestTokenRef.current !== requestToken) return;
          play('success');
          trackEvent('try_on_complete', { product_id: garmentInfo.id });
        } catch (err) {
          if (composeRequestTokenRef.current !== requestToken) return;
          play('error');
          commitSlots(currentSlots);
          setError(getFriendlyErrorMessage(err, 'No se pudo cambiar la prenda en vivo'));
        } finally {
          if (composeRequestTokenRef.current === requestToken) {
            setIsLoading(false);
            setLoadingMessage('');
            isComposeRequestInFlightRef.current = false;
          }
        }
        return;
      }

      const currentSlots = activeSlotsRef.current;
      const currentSlot = findSlotByGarmentId(currentSlots, garmentInfo.id);
      if (currentSlot && currentSlots[currentSlot].visible) return;

      play('tap');
      trackEvent('product_view', {
        product_id: garmentInfo.id,
        category: garmentInfo.category,
      });
      setVideoError(null);

      if (garmentInfo.category === 'glasses') {
        cancelEnvironmentRequest();
        setSelectedEnvironmentId('studio');
        setDisplayedEnvironmentId('studio');
      }

      const nextSlots = resolveSlotsForGarmentSelection(currentSlots, garmentInfo);
      commitSlots(nextSlots);

      const composeSucceeded = await runComposePipeline(
        nextSlots,
        `Trying on ${garmentInfo.name}…`
      );
      if (!composeSucceeded) {
        commitSlots(currentSlots);
        return;
      }

      const composedImage = lookSnapshotRef.current[buildVisibleLookSignature(nextSlots)];
      if (composedImage) {
        setOutfitHistory((prevHistory) => [
          ...prevHistory,
          {
            garment: garmentInfo,
            imageUrl: composedImage,
            hidden: false,
            slot: garmentInfo.category,
          },
        ]);
      }

      setWardrobe((prev) => {
        if (prev.find((item) => item.id === garmentInfo.id)) {
          return prev;
        }
        return [...prev, garmentInfo];
      });
    },
    [
      cancelEnvironmentRequest,
      commitSlots,
      isLoading,
      play,
      runComposePipeline,
    ]
  );

  const onToggleSlotVisibility = useCallback(
    async (slot: SlotKey) => {
      const currentSlots = activeSlotsRef.current;
      if (isLoading || !currentSlots[slot].garmentId || isComposeRequestInFlightRef.current) return;

      play('tap');
      setVideoError(null);

      const nextSlots = toggleSlotVisibility(currentSlots, slot);
      commitSlots(nextSlots);
      const visibleSignature = buildVisibleLookSignature(nextSlots);
      const cachedImage =
        lookSnapshotRef.current[visibleSignature] ??
        (visibleSignature === 'base' ? modelImageRef.current : null);
      if (cachedImage) {
        setDisplayImageUrl(cachedImage);
        return;
      }

      const composeSucceeded = await runComposePipeline(
        nextSlots,
        `${nextSlots[slot].visible ? 'Showing' : 'Hiding'} ${slot}...`
      );
      if (!composeSucceeded) {
        commitSlots(currentSlots);
      }
    },
    [commitSlots, isLoading, play, runComposePipeline]
  );

  const runLoopVideoGeneration = useCallback(
    async (sourceUrl: string, origin: 'prefetch' | 'button') => {
      if (
        !isFeatureEnabled('videoLoop') ||
        !canStartLoopVideoJob({
          sourceUrl,
          inFlight: isVideoRequestInFlightRef.current,
        })
      ) {
        return;
      }

      isVideoRequestInFlightRef.current = true;
      prefetchedStillUrlsRef.current.add(sourceUrl);
      if (origin === 'button') play('cta');
      const requestToken = videoRequestTokenRef.current + 1;
      videoRequestTokenRef.current = requestToken;
      setVideoError(null);
      setVideoReadySourceUrl(null);
      setVideoJobSourceUrl(sourceUrl);
      setLoopVideoInFlight(true);
      // Prefetch stays silent — only a user tap shows “Creando vídeo…”.
      if (origin === 'button') {
        setIsVideoGenerating(true);
      }

      const videoId = videoSlotIdForSource(sourceUrl);
      setSessionPhotos((prev) => {
        const without = prev.filter((photo) => photo.id !== videoId);
        return [...without, { id: videoId, kind: 'video', status: 'loading' }];
      });

      const { generateLoopVideoFromImage, generateLocalLoopVideoFromImage } = await import(
        '@/services/geminiService'
      );

      try {
        const videoUrl = await generateLoopVideoFromImage(sourceUrl);
        if (videoRequestTokenRef.current !== requestToken) {
          revokeBlobUrl(videoUrl);
          return;
        }
        play('success');
        storeLoopForSource(sourceUrl, videoUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        // Region blocks + transient Gemini/Veo outages → local Ken Burns so the demo keeps moving.
        const useLocalLoopFallback =
          /not permitted.*country|not available in your country|region/i.test(errorMessage) ||
          /internal server issue|try again in a few minutes|\bINTERNAL\b|\bUNAVAILABLE\b|\b503\b|\b500\b/i.test(
            errorMessage,
          );

        if (useLocalLoopFallback) {
          try {
            const fallbackVideoUrl = await generateLocalLoopVideoFromImage(sourceUrl, 6);
            if (videoRequestTokenRef.current !== requestToken) {
              revokeBlobUrl(fallbackVideoUrl);
              return;
            }
            play('success');
            storeLoopForSource(sourceUrl, fallbackVideoUrl);
            setVideoError(null);
            return;
          } catch (fallbackErr) {
            play('error');
            setSessionPhotos((prev) => removePhotoById(prev, videoId));
            setVideoError(
              getFriendlyErrorMessage(
                fallbackErr,
                'Video generation failed, and local loop fallback failed',
              ),
            );
            return;
          }
        }

        play('error');
        setSessionPhotos((prev) => removePhotoById(prev, videoId));
        setVideoError(getFriendlyErrorMessage(err, 'Failed to create look loop'));
      } finally {
        if (videoRequestTokenRef.current === requestToken) {
          setIsVideoGenerating(false);
          setLoopVideoInFlight(false);
          setVideoJobSourceUrl(null);
          isVideoRequestInFlightRef.current = false;
        }
      }
    },
    [play, revokeBlobUrl, storeLoopForSource, videoSlotIdForSource],
  );

  useEffect(() => {
    runLoopVideoGenerationRef.current = runLoopVideoGeneration;
  }, [runLoopVideoGeneration]);

  useEffect(() => {
    if (!isEligibleLoopStill(displayImageUrl, primaryStillByFrame)) return;
    tryPrefetchLoopForStill(displayImageUrl);
  }, [
    displayImageUrl,
    isVideoGenerating,
    primaryStillByFrame,
    tryPrefetchLoopForStill,
  ]);

  const onGenerateLoopVideo = useCallback(() => {
    if (!isFeatureEnabled('videoLoop') || !hasVisibleGarmentLayers) return;
    const sourceUrl = displayImageRef.current;
    if (!isEligibleLoopStill(sourceUrl, primaryStillByFrameRef.current)) return;
    void runLoopVideoGeneration(sourceUrl, 'button');
  }, [hasVisibleGarmentLayers, runLoopVideoGeneration]);

  const onVideoPlaybackError = useCallback(() => {
    setVideoError(
      'Generated video could not be played in this browser. Please retry loop generation, disable VPN, or switch browser.'
    );
  }, []);

  const createEnvironmentPhoto = useCallback(
    async (environmentId: EnvironmentSceneId) => {
      // Sync guard: React state can lag a frame behind a double-tap.
      const alreadyInFlight = Boolean(envAbortRef.current);
      if (
        !activeFrameId ||
        !studioImageRef.current ||
        !framingProfileRef.current ||
        environmentRequest.kind === 'loading' ||
        alreadyInFlight ||
        isComposeRequestInFlightRef.current
      ) {
        return;
      }

      const cacheKey = buildEnvironmentCacheKey(activeFrameId, environmentId);
      const cached = envCacheRef.current.get(cacheKey);
      if (cached) {
        play('success');
        setDisplayImageUrl(cached);
        displayImageRef.current = cached;
        setDisplayedEnvironmentId(environmentId);
        setEnvironmentRequest({ kind: 'idle' });
        return;
      }

      const copy = getManifest().copy.environmentScenes;
      const label = copy?.labels[environmentId] ?? environmentId;
      const loadingLabel = formatEnvironmentCreatingMessage(
        copy?.creating ?? 'Creando tu foto en {environment}…',
        label,
      );
      const errorMessage =
        copy?.error ??
        'No pudimos crear esta escena. Tu foto de estudio sigue intacta.';

      const requestToken = envRequestTokenRef.current + 1;
      envRequestTokenRef.current = requestToken;
      envAbortRef.current?.abort();
      const abortController = new AbortController();
      envAbortRef.current = abortController;

      setEnvironmentRequest({ kind: 'loading' });
      setLoadingMessage(loadingLabel);
      play('cta');

      try {
        const { generateEnvironmentVariantImage } = await import('@/services/geminiService');
        if (isStaleEnvironmentRequest(envRequestTokenRef.current, requestToken)) return;

        const variant = await generateEnvironmentVariantImage(
          studioImageRef.current,
          environmentId,
          framingProfileRef.current,
          { signal: abortController.signal },
        );

        if (isStaleEnvironmentRequest(envRequestTokenRef.current, requestToken)) return;

        envCacheRef.current.set(cacheKey, variant);
        setCachedEnvKeys((prev) => {
          const next = new Set(prev);
          next.add(cacheKey);
          return next;
        });
        setDisplayImageUrl(variant);
        displayImageRef.current = variant;
        setDisplayedEnvironmentId(environmentId);
        setEnvironmentRequest({ kind: 'idle' });
        rememberReadyPhoto({
          id: nextPhotoId('environment'),
          kind: 'environment',
          status: 'ready',
          imageUrl: variant,
        });
        play('success');
        trackEvent('environment_variant', {
          product_id: activeFrameId,
          environment_id: environmentId,
        });
      } catch (err) {
        if (isStaleEnvironmentRequest(envRequestTokenRef.current, requestToken)) return;
        if (abortController.signal.aborted || (err as Error)?.name === 'AbortError') {
          setEnvironmentRequest({ kind: 'idle' });
          return;
        }
        play('error');
        trackEvent('error', { code: 'environment_failed' });
        setEnvironmentRequest({ kind: 'error', message: errorMessage });
      } finally {
        if (!isStaleEnvironmentRequest(envRequestTokenRef.current, requestToken)) {
          setLoadingMessage('');
          if (envAbortRef.current === abortController) {
            envAbortRef.current = null;
          }
        }
      }
    },
    [activeFrameId, environmentRequest.kind, play, rememberReadyPhoto],
  );

  const restoreStudioEnvironment = useCallback(() => {
    const studio = studioImageRef.current;
    if (studio) {
      setDisplayImageUrl(studio);
      displayImageRef.current = studio;
    }
    setSelectedEnvironmentId('studio');
    setDisplayedEnvironmentId('studio');
    setEnvironmentRequest({ kind: 'idle' });
  }, []);

  const onSelectEnvironment = useCallback(
    (environmentId: EnvironmentId) => {
      // While generating: ignore other scenes; Estudio cancels + restores.
      const isEnvLoading =
        environmentRequest.kind === 'loading' || Boolean(envAbortRef.current);
      if (isEnvLoading) {
        if (environmentId !== 'studio') return;
        cancelEnvironmentRequest();
        setIsLoading(false);
        setLoadingMessage('');
        restoreStudioEnvironment();
        return;
      }

      if (environmentId === 'studio') {
        restoreStudioEnvironment();
        return;
      }

      if (!activeFrameId || !isGeneratedEnvironmentId(environmentId)) return;

      setSelectedEnvironmentId(environmentId);
      setEnvironmentRequest({ kind: 'idle' });

      const cached = envCacheRef.current.get(
        buildEnvironmentCacheKey(activeFrameId, environmentId),
      );
      if (cached) {
        setDisplayImageUrl(cached);
        displayImageRef.current = cached;
        setDisplayedEnvironmentId(environmentId);
        return;
      }

      void createEnvironmentPhoto(environmentId);
    },
    [
      activeFrameId,
      cancelEnvironmentRequest,
      createEnvironmentPhoto,
      environmentRequest.kind,
      restoreStudioEnvironment,
    ],
  );

  /** Retry after error — uses the currently selected scene. */
  const onCreateEnvironmentPhoto = useCallback(async () => {
    if (!isGeneratedEnvironmentId(selectedEnvironmentId)) return;
    await createEnvironmentPhoto(selectedEnvironmentId);
  }, [createEnvironmentPhoto, selectedEnvironmentId]);

  const onCancelEnvironmentPhoto = useCallback(() => {
    cancelEnvironmentRequest();
    setIsLoading(false);
    setLoadingMessage('');
  }, [cancelEnvironmentRequest]);
  const onSaveEnvironmentPhoto = useCallback(() => {
    if (!displayImageRef.current) return;
    play('tap');
    const anchor = document.createElement('a');
    anchor.href = displayImageRef.current;
    const suffix =
      displayedEnvironmentId === 'studio' ? 'studio' : displayedEnvironmentId;
    anchor.download = `eyewear-${suffix}-${Date.now()}.jpg`;
    anchor.click();
  }, [displayedEnvironmentId, play]);

  const onSelectSessionPhoto = useCallback((id: string) => {
    const photo = findReadyPhoto(sessionPhotos, id);
    if (!photo) return;
    play('tap');
    setActiveSessionPhotoId(photo.id);
    setDisplayImageUrl(photo.imageUrl);
    displayImageRef.current = photo.imageUrl;
    if (photo.kind !== 'environment') {
      setSelectedEnvironmentId('studio');
      setDisplayedEnvironmentId('studio');
    }
  }, [play, sessionPhotos]);

  // DEV-only: ?studio=1 (or VITE_DEV_STUDIO_SEED=true) jumps straight into studio UI.
  // Optional: &frame=<wardrobeId> auto-starts a try-on compose for that frame.
  // Note: do not gate with a ref before async — React Strict Mode cancels the
  // first effect pass; a pre-set ref would block the real second pass.
  useEffect(() => {
    if (!shouldSeedStudioSession()) return undefined;
    let cancelled = false;

    const seed = async () => {
      try {
        const { seedSrc, frameId } = readDevStudioQuery();
        const raw = await loadImageAsDataUrl(seedSrc);
        if (cancelled) return;
        const faceFraming = getManifest().features.portraitFraming === 'face';
        const { dataUrl, profile } = await createFramingProfileFromDataUrl(
          raw,
          faceFraming ? FACE_FRAMING_OPTIONS : {},
        );
        if (cancelled) return;
        const sessionToken = onBeginCaptureSession();
        onModelFinalized({ sessionToken, modelUrl: dataUrl, profile });
        console.info(
          `[dev] Studio seeded from ${seedSrc}${frameId ? ` → frame=${frameId}` : ''}`,
        );

        if (!frameId) return;
        const item = getWardrobe().find((entry) => entry.id === frameId);
        if (!item) {
          console.warn(`[dev] Unknown frame id "${frameId}" — wardrobe only`);
          return;
        }
        const file = await urlToGarmentFile(item.url, item.name);
        if (cancelled) return;
        await onGarmentSelect(file, item);
      } catch (err) {
        console.warn('[dev] Studio seed skipped', err);
      }
    };

    void seed();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount for local UX iteration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    modelImageUrl,
    displayImageUrl,
    studioImageUrl,
    isLiveSession,
    localStream,
    remoteStream,
    activeSlots,
    activeGarmentIds,
    activeFrameId,
    hasVisibleGarmentLayers,
    isLoading,
    loadingMessage,
    error,
    safeFaceFitContext,
    isVideoGenerating: isVideoGenerating && videoJobSourceUrl === displayImageUrl,
    isLoopVideoPending:
      loopVideoInFlight && isEligibleLoopStill(displayImageUrl, primaryStillByFrame),
    canGenerateLoopVideo:
      hasVisibleGarmentLayers &&
      isEligibleLoopStill(displayImageUrl, primaryStillByFrame) &&
      !videoLoopsBySource[displayImageUrl ?? ''],
    videoLoopUrl: (() => {
      const active = activeSessionPhotoId
        ? findReadyPhoto(sessionPhotos, activeSessionPhotoId)
        : null;
      const playLoopInWell = active?.kind === 'video';
      return resolveWellVideoUrl({
        loopsBySourceUrl: videoLoopsBySource,
        displayImageUrl,
        playLoopInWell,
      });
    })(),
    videoReadyNotice: videoReadySourceUrl === displayImageUrl,
    videoError,
    wardrobe,
    wardrobeById,
    selectedEnvironmentId,
    displayedEnvironmentId,
    environmentRequest,
    hasCachedSelectedEnvironment,
    onBeginCaptureSession,
    onModelFinalized,
    onStartLiveTryOn,
    onRecordLiveSnapshot,
    onReturnToLiveStream,
    onStartOver,
    onGarmentSelect,
    onToggleSlotVisibility,
    onGenerateLoopVideo,
    onDismissVideoReadyNotice,
    onDismissVideoError,
    onVideoPlaybackError,
    onSelectEnvironment,
    onCreateEnvironmentPhoto,
    onCancelEnvironmentPhoto,
    onSaveEnvironmentPhoto,
    sessionPhotos,
    activeSessionPhotoId,
    onSelectSessionPhoto,
  };
}
