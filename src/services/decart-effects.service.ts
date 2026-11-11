/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lucy 2.6 realtime creative effects (`lucy-2.6`).
 * Sent with `enhance: false` so Lucy does not rewrite the claymation lock.
 *
 * Same connection lessons as the clothing VTON session:
 * - Permanent keys stay server-side. `apiKeyProvider` mints a client token
 *   immediately before every dial.
 * - Do not pass `initialState`. Join-time generation starts before the
 *   camera track is published and the session dies at 0s.
 * - `mirror: "auto"` wraps `facingMode: "user"` tracks and can publish a
 *   live track with zero frames. Keep `mirror: false` and mirror the
 *   local preview in CSS.
 * - `setPrompt` ACK is not a remote track. Wait for `onRemoteStream`.
 */

import {
  createDecartClient,
  models,
  resolveFpsNumber,
  type ConnectionState,
  type RealTimeClient,
} from '@decartai/sdk';
import type { ClayEffect } from '@config/clients/navidad/effects';
import { requestCameraStream, stopCameraStream } from '@/shared/lib/camera';

const effectsModel = models.realtime('lucy-2.6');

const REMOTE_AFTER_PROMPT_MS = 8_000;
const CAMERA_READY_TIMEOUT_MS = 5_000;

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

function devLog(message: string, detail?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  if (detail) {
    console.info(`[decart-effects] ${message}`, detail);
    return;
  }
  console.info(`[decart-effects] ${message}`);
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

let activeRealtimeClient: RealTimeClient | null = null;
let activeLocalStream: MediaStream | null = null;
let sessionEpoch = 0;

export interface ConnectDecartEffectsOptions {
  localStream: MediaStream;
  effect: ClayEffect;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onError?: (err: Error) => void;
}

export async function requestEffectsCameraStream(): Promise<MediaStream> {
  return requestCameraStream(DECART_EFFECTS_VIDEO_CONSTRAINTS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForCameraTrackReady(
  stream: MediaStream,
  timeoutMs = CAMERA_READY_TIMEOUT_MS,
): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) {
    throw new Error('Decart effects require a local video track');
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
  remoteReceived: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  if (remoteReceived()) return true;
  const deadline = Date.now() + timeoutMs;
  while (!remoteReceived() && Date.now() < deadline) {
    await sleep(250);
  }
  return remoteReceived();
}

async function openSession(
  options: ConnectDecartEffectsOptions,
  epoch: number,
  preferredVideoCodec?: 'vp8',
): Promise<{ client: RealTimeClient; remoteReceived: () => boolean }> {
  const useFastMode = import.meta.env.VITE_DECART_SPEED?.trim() === 'fast';
  let remoteReceived = false;
  let suppressErrors = false;

  devLog('connect', {
    effectId: options.effect.id,
    codec: preferredVideoCodec ?? 'default',
    speed: useFastMode ? 'fast' : 'standard',
  });

  const rtClient = await decartClient.realtime.connect(options.localStream, {
    model: effectsModel,
    mirror: false,
    ...(preferredVideoCodec ? { preferredVideoCodec } : {}),
    ...(useFastMode ? { speed: 'fast' as const } : {}),
    onRemoteStream: (remoteStream) => {
      remoteReceived = true;
      if (epoch !== sessionEpoch) return;
      options.onRemoteStream(remoteStream);
    },
    onConnectionChange: (state) => {
      if (epoch === sessionEpoch) options.onConnectionChange?.(state);
    },
  });

  rtClient.on('error', (sdkError) => {
    if (suppressErrors || epoch !== sessionEpoch) return;
    const err =
      sdkError instanceof Error
        ? sdkError
        : new Error(String((sdkError as { message?: string })?.message || 'Decart realtime error'));
    options.onError?.(err);
  });

  if (epoch !== sessionEpoch) {
    suppressErrors = true;
    try {
      rtClient.disconnect();
    } catch {
      /* replaced */
    }
    return { client: rtClient, remoteReceived: () => false };
  }

  activeRealtimeClient = rtClient;
  await rtClient.setPrompt(options.effect.prompt, { enhance: false });
  await waitForRemote(() => remoteReceived, REMOTE_AFTER_PROMPT_MS);

  return {
    client: rtClient,
    remoteReceived: () => remoteReceived,
  };
}

export async function connectDecartEffectsSession(
  options: ConnectDecartEffectsOptions,
): Promise<RealTimeClient> {
  const epoch = ++sessionEpoch;
  disconnectDecartEffectsSession({ keepLocalStream: options.localStream, nextEpoch: epoch });
  activeLocalStream = options.localStream;

  await waitForCameraTrackReady(options.localStream);
  if (epoch !== sessionEpoch) {
    throw new Error('Decart effects connect cancelled');
  }

  const first = await openSession(options, epoch);
  if (first.remoteReceived() || epoch !== sessionEpoch) {
    return first.client;
  }

  devLog('no remote after first connect; retrying with vp8');
  try {
    first.client.disconnect();
  } catch {
    /* ignore */
  }
  if (activeRealtimeClient === first.client) activeRealtimeClient = null;
  await sleep(250);
  if (epoch !== sessionEpoch) {
    throw new Error('Decart effects connect cancelled');
  }

  const second = await openSession(options, epoch, 'vp8');
  return second.client;
}

export async function setClayEffectPrompt(effect: ClayEffect): Promise<void> {
  if (!activeRealtimeClient) {
    throw new Error('No active Decart effects session');
  }
  devLog('setPrompt', { effectId: effect.id, promptChars: effect.prompt.length });
  await activeRealtimeClient.setPrompt(effect.prompt, { enhance: false });
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
  if (activeLocalStream && activeLocalStream !== options?.keepLocalStream) {
    stopCameraStream(activeLocalStream);
  }
  if (!options?.keepLocalStream) {
    activeLocalStream = null;
  }
}
