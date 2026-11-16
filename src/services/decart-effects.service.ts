/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Decart Lucy VTON (`lucy-vton-3.6`) realtime virtual try-on session for
 * NO.MAD LAB Travel Experience (`enhance: false`).
 *
 * Proven `@decartai/sdk` 0.2.14 connection lifecycle:
 * - Permanent keys stay server-side; `apiKeyProvider` mints a short-lived
 *   client token right before every dial.
 * - Wait for non-zero local camera track dimensions before dialling LiveKit.
 * - Connect bare (`mirror: false`, NO `initialState`): in `@decartai/sdk`,
 *   `signaling.openAndJoin({ initialState })` runs before `media.publishLocalTracks()`,
 *   which starts join-time VTON generation before camera frames exist and
 *   terminates `lucy-vton-3.6` with `generationEnded { reason: "error", seconds: 0 }`.
 * - Immediately after `realtime.connect()` resolves, call
 *   `await rtClient.set({ prompt, image: garmentFile, enhance: false })` using
 *   the clean ghost-mannequin garment plate normalized via `urlToDecartGarmentFile`.
 * - Gate `onRemoteStream` until `rtClient.set(...)` has completed so the UI
 *   remains in its connecting state and never flashes raw untransformed camera video.
 */

import {
  createDecartClient,
  models,
  resolveFpsNumber,
  type ConnectionState,
  type RealTimeClient,
  type RealTimeClientConnectOptions,
  type SetInput,
} from '@decartai/sdk';
import type { ClayEffect } from '@config/clients/travel-experience/effects';
import type { CameraRotationDeg } from '@/core/media/cameraRotation';
import { urlToDecartGarmentFile } from '@/core/media/garmentFile';
import { requestCameraStream, stopCameraStream } from '@/shared/lib/camera';

export const DECART_LIVE_MODEL_NAME = 'lucy-vton-3.6' as const;

const effectsModel = models.realtime(DECART_LIVE_MODEL_NAME);

const REMOTE_AFTER_SET_MS = 8_000;
const CAMERA_READY_TIMEOUT_MS = 5_000;

export const DECART_EFFECTS_MAX_PROMPT_CHARS = 400;
export const DECART_EFFECTS_MAX_PROMPT_WORDS = 55;

export const DECART_EFFECTS_STREAM_FORMAT = {
  width: effectsModel.width,
  height: effectsModel.height,
  frameRate: resolveFpsNumber(effectsModel.fps),
} as const;

export const DECART_EFFECTS_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: 'user',
  frameRate: effectsModel.fps,
  width: { ideal: DECART_EFFECTS_STREAM_FORMAT.width },
  height: { ideal: DECART_EFFECTS_STREAM_FORMAT.height },
};

/**
 * Portrait phones & mobile browsers at 0° rotation must NOT be forced to
 * landscape 1280×720: requesting `{ facingMode: "user" }` on portrait viewports
 * lets iOS Safari / Android Chrome deliver a native portrait camera track so
 * Lucy VTON infers 9:16 (`720×1280`) automatically. Sideways-mounted MUPI
 * cameras (`cameraRotationDeg !== 0`) keep explicit 1280×720 constraints.
 */
export function resolveEffectsVideoConstraints(
  cameraRotationDeg: CameraRotationDeg = 0,
): MediaTrackConstraints {
  if (
    cameraRotationDeg === 0 &&
    typeof window !== 'undefined' &&
    window.innerHeight > window.innerWidth
  ) {
    return {
      facingMode: 'user',
      frameRate: effectsModel.fps,
    };
  }
  return DECART_EFFECTS_VIDEO_CONSTRAINTS;
}

function devLog(message: string, detail?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  if (detail) {
    console.info(`[decart-vton-travel] ${message}`, detail);
    return;
  }
  console.info(`[decart-vton-travel] ${message}`);
}

function apiAuthHeaders(): Record<string, string> {
  const kioskKey = import.meta.env.VITE_KIOSK_API_KEY?.trim();
  if (!kioskKey) return {};
  return { 'X-API-Key': kioskKey };
}

async function fetchRealtimeToken(): Promise<string> {
  const res = await fetch('/api/realtime-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...apiAuthHeaders(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { apiKey?: string };
  if (!data.apiKey) {
    throw new Error('Decart token endpoint returned no apiKey');
  }
  return data.apiKey;
}

const decartClient = createDecartClient({
  apiKeyProvider: fetchRealtimeToken,
});

const garmentFileCache = new Map<string, Promise<File>>();

let activeRealtimeClient: RealTimeClient | null = null;
let activeLocalStream: MediaStream | null = null;
let activePublishedCloneStream: MediaStream | null = null;
let sessionEpoch = 0;

function stopClonedStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  }
}

function cloneStreamForPublish(stream: MediaStream): MediaStream {
  if (typeof MediaStream === 'undefined') return stream;
  const tracks = stream.getTracks();
  if (tracks.some((track) => typeof track.clone !== 'function')) {
    return stream;
  }
  return new MediaStream(tracks.map((track) => track.clone()));
}

export interface ClayEffectSetClient {
  set(input: SetInput): Promise<void>;
}

export type ClayEffectImageLoader = (src: string) => Promise<Blob>;

export type RealtimeConnectFn = (
  stream: MediaStream,
  options: RealTimeClientConnectOptions<MediaStream>,
) => Promise<RealTimeClient>;

export interface ConnectDecartEffectsOptions {
  localStream: MediaStream;
  effect: ClayEffect;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onError?: (err: Error) => void;
  loadImage?: ClayEffectImageLoader;
  realtimeConnect?: RealtimeConnectFn;
  remoteAfterSetTimeoutMs?: number;
}

export async function requestEffectsCameraStream(
  cameraRotationDeg: CameraRotationDeg = 0,
): Promise<MediaStream> {
  return requestCameraStream(resolveEffectsVideoConstraints(cameraRotationDeg));
}

function filenameFromPath(src: string): string {
  const clean = src.split('?')[0]?.split('#')[0] ?? '';
  const tail = clean.split('/').filter(Boolean).pop();
  return tail || 'garment.webp';
}

export function loadCachedGarmentFile(garmentImagePath: string): Promise<File> {
  const cached = garmentFileCache.get(garmentImagePath);
  if (cached) return cached;

  const pending = urlToDecartGarmentFile(
    garmentImagePath,
    filenameFromPath(garmentImagePath),
  ).catch((err) => {
    garmentFileCache.delete(garmentImagePath);
    throw err;
  });

  garmentFileCache.set(garmentImagePath, pending);
  return pending;
}

export function clearGarmentFileCache(): void {
  garmentFileCache.clear();
}

function assertNonEmptyBlob(blob: Blob, src: string): void {
  if (!(blob instanceof Blob) || blob.size <= 0) {
    throw new Error(`Invalid garment reference image for "${src}"`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function waitForCameraTrackReady(
  stream: MediaStream,
  timeoutMs = CAMERA_READY_TIMEOUT_MS,
): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) {
    throw new Error('Decart VTON requires a local video track');
  }
  if (track.readyState === 'ended') {
    throw new Error('Camera track ended before Decart connect');
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const settings = track.getSettings();
    const width = settings.width ?? 0;
    const height = settings.height ?? 0;
    if (track.readyState === 'live' && width > 0 && height > 0) return;
    await sleep(50);
  }

  const late = track.getSettings();
  if ((late.width ?? 0) > 0 && (late.height ?? 0) > 0) return;

  throw new Error(`Camera track has no dimensions after ${timeoutMs}ms`);
}

async function waitForRemote(
  remoteDelivered: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  if (remoteDelivered()) return true;
  const deadline = Date.now() + timeoutMs;
  while (!remoteDelivered() && Date.now() < deadline) {
    await sleep(50);
  }
  return remoteDelivered();
}

export function buildClayEffectSetInput(
  effect: ClayEffect,
  image: Blob | null = null,
): SetInput {
  const prompt = effect.prompt.trim();
  const wordCount = prompt ? prompt.split(/\s+/).length : 0;
  if (
    prompt.length > DECART_EFFECTS_MAX_PROMPT_CHARS ||
    wordCount > DECART_EFFECTS_MAX_PROMPT_WORDS
  ) {
    throw new Error(
      `Decart effect "${effect.id}" prompt exceeds the realtime budget ` +
        `(${prompt.length}/${DECART_EFFECTS_MAX_PROMPT_CHARS} chars, ` +
        `${wordCount}/${DECART_EFFECTS_MAX_PROMPT_WORDS} words)`,
    );
  }
  return {
    prompt,
    enhance: false,
    image,
  };
}

export async function fetchClayEffectImage(src: string): Promise<Blob> {
  const response = await fetch(src, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Reference image request failed with HTTP ${response.status}`);
  }
  const image = await response.blob();
  if (image.size === 0) {
    throw new Error('Reference image response was empty');
  }
  return image;
}

export async function resolveClayEffectSetInput(
  effect: ClayEffect,
  loadImage?: ClayEffectImageLoader,
): Promise<SetInput> {
  if (effect.garmentImagePath) {
    const loader = loadImage ?? loadCachedGarmentFile;
    const garment = await loader(effect.garmentImagePath);
    assertNonEmptyBlob(garment, effect.garmentImagePath);
    return buildClayEffectSetInput(effect, garment);
  }

  let image: Blob | null = null;
  if (effect.referenceImage) {
    const loader = loadImage ?? fetchClayEffectImage;
    try {
      image = await loader(effect.referenceImage.src);
    } catch (error) {
      devLog('reference image unavailable; using prompt only', {
        effectId: effect.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return buildClayEffectSetInput(effect, image);
}

export async function applyClayEffect(
  client: ClayEffectSetClient,
  effect: ClayEffect,
  loadImage?: ClayEffectImageLoader,
): Promise<void> {
  const input = await resolveClayEffectSetInput(effect, loadImage);
  await client.set(input);
}

interface OpenSessionAttemptOptions {
  options: ConnectDecartEffectsOptions;
  epoch: number;
  initialInput: SetInput;
  attempt: number;
  preferredVideoCodec?: 'h264' | 'vp8' | 'vp9';
}

async function openSessionAttempt({
  options,
  epoch,
  initialInput,
  attempt,
  preferredVideoCodec,
}: OpenSessionAttemptOptions): Promise<{
  client: RealTimeClient;
  remoteDelivered: () => boolean;
  beginQuietTeardown: () => void;
}> {
  const useFastMode = import.meta.env.VITE_DECART_SPEED?.trim() === 'fast';
  const connectFn: RealtimeConnectFn =
    options.realtimeConnect ??
    ((stream, connectOpts) => decartClient.realtime.connect(stream, connectOpts));

  let garmentApplied = false;
  let latestRemoteStream: MediaStream | null = null;
  let delivered = false;
  let suppressCallbacks = false;

  const deliverRemoteIfReady = () => {
    if (!garmentApplied || !latestRemoteStream || delivered || suppressCallbacks) {
      return;
    }
    if (epoch !== sessionEpoch) return;
    delivered = true;
    options.onRemoteStream(latestRemoteStream);
  };

  devLog('connect bare then set({ prompt, image, enhance: false })', {
    effectId: options.effect.id,
    model: effectsModel.name,
    attempt,
    speed: useFastMode ? 'fast' : 'standard',
    preferredVideoCodec: preferredVideoCodec ?? 'default(h264)',
    hasGarmentImage: initialInput.image instanceof Blob,
    promptChars: initialInput.prompt?.length ?? 0,
  });

  // Clone tracks per LiveKit room because LiveKit's room.disconnect() stops
  // published tracks by default; keeping localStream alive prevents dead tracks
  // on codec fallback retries.
  if (activePublishedCloneStream && activePublishedCloneStream !== options.localStream) {
    stopClonedStream(activePublishedCloneStream);
  }
  const publishStream = cloneStreamForPublish(options.localStream);
  activePublishedCloneStream = publishStream === options.localStream ? null : publishStream;

  const rtClient = await connectFn(publishStream, {
    model: effectsModel,
    mirror: false,
    ...(preferredVideoCodec ? { preferredVideoCodec } : {}),
    ...(useFastMode ? { speed: 'fast' as const } : {}),
    onRemoteStream: (remoteStream) => {
      latestRemoteStream = remoteStream;
      deliverRemoteIfReady();
    },
    onConnectionChange: (state) => {
      if (!suppressCallbacks && epoch === sessionEpoch) {
        options.onConnectionChange?.(state);
      }
    },
  });

  rtClient.on('error', (sdkError) => {
    if (suppressCallbacks || epoch !== sessionEpoch) return;
    const err =
      sdkError instanceof Error
        ? sdkError
        : new Error(
            String((sdkError as { message?: string })?.message || 'Decart realtime error'),
          );
    options.onError?.(err);
  });

  if (epoch !== sessionEpoch) {
    suppressCallbacks = true;
    try {
      rtClient.disconnect();
    } catch {
      /* replaced */
    }
    return {
      client: rtClient,
      remoteDelivered: () => false,
      beginQuietTeardown: () => {
        suppressCallbacks = true;
      },
    };
  }

  activeRealtimeClient = rtClient;

  try {
    await rtClient.set(initialInput);
  } catch (err) {
    suppressCallbacks = true;
    if (activeRealtimeClient === rtClient) {
      activeRealtimeClient = null;
    }
    try {
      rtClient.disconnect();
    } catch {
      /* cleanup */
    }
    throw err;
  }

  if (epoch !== sessionEpoch) {
    suppressCallbacks = true;
    if (activeRealtimeClient === rtClient) {
      activeRealtimeClient = null;
    }
    try {
      rtClient.disconnect();
    } catch {
      /* replaced */
    }
    return {
      client: rtClient,
      remoteDelivered: () => false,
      beginQuietTeardown: () => {
        suppressCallbacks = true;
      },
    };
  }

  garmentApplied = true;
  deliverRemoteIfReady();

  const waitMs = options.remoteAfterSetTimeoutMs ?? REMOTE_AFTER_SET_MS;
  await waitForRemote(() => delivered, waitMs);

  return {
    client: rtClient,
    remoteDelivered: () => delivered,
    beginQuietTeardown: () => {
      suppressCallbacks = true;
    },
  };
}

export async function connectDecartEffectsSession(
  options: ConnectDecartEffectsOptions,
): Promise<RealTimeClient> {
  const epoch = ++sessionEpoch;
  disconnectDecartEffectsSession({ keepLocalStream: options.localStream, nextEpoch: epoch });
  activeLocalStream = options.localStream;

  const initialInputPromise = resolveClayEffectSetInput(
    options.effect,
    options.loadImage,
  );
  await waitForCameraTrackReady(options.localStream);
  if (epoch !== sessionEpoch) {
    throw new Error('Decart VTON connect cancelled');
  }

  const initialInput = await initialInputPromise;
  if (epoch !== sessionEpoch) {
    throw new Error('Decart VTON connect cancelled');
  }

  const first = await openSessionAttempt({
    options,
    epoch,
    initialInput,
    attempt: 1,
  });

  if (first.remoteDelivered() || epoch !== sessionEpoch) {
    return first.client;
  }

  devLog('no remote stream after first set(); retrying with preferredVideoCodec=vp8', {
    effectId: options.effect.id,
  });
  first.beginQuietTeardown();
  try {
    first.client.disconnect();
  } catch {
    /* ignore */
  }
  if (activeRealtimeClient === first.client) {
    activeRealtimeClient = null;
  }
  if (activePublishedCloneStream && activePublishedCloneStream !== options.localStream) {
    stopClonedStream(activePublishedCloneStream);
    activePublishedCloneStream = null;
  }
  await sleep(200);
  if (epoch !== sessionEpoch) {
    throw new Error('Decart VTON connect cancelled');
  }

  const second = await openSessionAttempt({
    options,
    epoch,
    initialInput,
    attempt: 2,
    preferredVideoCodec: 'vp8',
  });
  return second.client;
}

export async function setClayEffectPrompt(
  effect: ClayEffect,
  loadImage?: ClayEffectImageLoader,
): Promise<void> {
  if (!activeRealtimeClient) {
    throw new Error('No active Decart VTON session');
  }
  devLog('setGarmentLook', {
    effectId: effect.id,
    garmentImagePath: effect.garmentImagePath ?? null,
    promptChars: effect.prompt.length,
  });
  await applyClayEffect(activeRealtimeClient, effect, loadImage);
}

export function disconnectDecartEffectsSession(options?: {
  keepLocalStream?: MediaStream | null;
  nextEpoch?: number;
}): void {
  sessionEpoch = options?.nextEpoch ?? sessionEpoch + 1;
  if (activeRealtimeClient) {
    try {
      activeRealtimeClient.disconnect();
    } catch {
      /* cleanup */
    }
    activeRealtimeClient = null;
  }
  if (activePublishedCloneStream && activePublishedCloneStream !== options?.keepLocalStream) {
    stopClonedStream(activePublishedCloneStream);
    activePublishedCloneStream = null;
  }
  if (activeLocalStream && activeLocalStream !== options?.keepLocalStream) {
    stopCameraStream(activeLocalStream);
  }
  if (!options?.keepLocalStream) {
    activeLocalStream = null;
  }
}
