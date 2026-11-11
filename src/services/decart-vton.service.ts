/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side Decart Realtime Virtual Try-On (`lucy-vton-3.6` / `lucy-vton-latest`)
 * WebRTC session manager.
 *
 * Permanent API keys (`dct_...`) stay server-side; this service requests a
 * short-lived client token from `POST /api/realtime-token` right before every
 * connect and reconnect via `apiKeyProvider`.
 *
 * Connection lifecycle note (SDK `@decartai/sdk` 0.2.x):
 * - `realtime.connect()` resolves when LiveKit is connected and local tracks
 *   are published (`connectionChange: "connected"`).
 * - `onRemoteStream` fires later, only on LiveKit `TrackSubscribed` for a
 *   remote participant whose identity starts with `inference-server-`.
 * - Join without prompt/image sets `passthrough: true`. Lucy VTON still needs
 *   an applied prompt (and usually image) before the inference server publishes
 *   a transformed track — without that, LiveKit stays "connected" forever with
 *   no `onRemoteStream`.
 * - Do NOT pass garment via `initialState` at connect: join-time generation
 *   starts before local camera tracks are published, and Lucy VTON dies with
 *   `generationEnded { reason: "error", seconds: 0 }`. Official pattern for
 *   this app: connect bare, then `set({ prompt, image })` after publish.
 * - `set()` ACK ≠ generation success. Watch `generationEnded` / `onRemoteStream`.
 * - `mirror: "auto"` flips whenever `facingMode === "user"`. Our camera
 *   constraints request `facingMode: "user"`, so Chrome desktop often reports
 *   that setting and the SDK wraps the track in MediaStreamTrackProcessor /
 *   Generator. A silent pipeline failure publishes a live track with zero
 *   frames; the inference server never emits a remote video track even though
 *   `set()` / `set_image_ack` still succeed. Keep `mirror: false` and mirror
 *   the local preview in CSS if needed.
 */

import {
  createDecartClient,
  models,
  type ConnectionState,
  type RealTimeClient,
} from '@decartai/sdk';
import type { WardrobeItem } from '@config/types';
import { requestCameraStream, stopCameraStream } from '@/shared/lib/camera';
import { buildDecartVtonPrompt, type DecartVtonPromptSpec } from './decart-vton.prompts';

const vtonModel = models.realtime('lucy-vton-3.6');

/** How long after a successful set() we wait before trying prompt-only fallback. */
const REMOTE_AFTER_SET_MS = 8_000;
/** Extra wait after prompt-only fallback before declaring remote missing. */
const REMOTE_AFTER_PROMPT_MS = 4_000;
const CAMERA_READY_TIMEOUT_MS = 5_000;

export const DECART_VTON_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: 'user',
  frameRate: vtonModel.fps,
  width: { ideal: vtonModel.width },
  height: { ideal: vtonModel.height },
};

function decartDevLog(message: string, detail?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  if (detail) {
    console.info(`[decart-vton] ${message}`, detail);
    return;
  }
  console.info(`[decart-vton] ${message}`);
}

function serializeUnknown(value: unknown): Record<string, unknown> {
  if (value == null) return { value: String(value) };
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return {
      type: Object.prototype.toString.call(value),
      message: typeof record.message === 'string' ? record.message : undefined,
      name: typeof record.name === 'string' ? record.name : undefined,
      stack: typeof record.stack === 'string' ? record.stack : undefined,
      keys: Object.keys(record).slice(0, 20),
      string: (() => {
        try {
          return String(value);
        } catch {
          return '[unstringifiable]';
        }
      })(),
    };
  }
  return { value: String(value) };
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
let removeLiveKitRoomProbe: (() => void) | null = null;
let removeWorkerErrorHook: (() => void) | null = null;

export interface ConnectDecartVtonOptions {
  localStream: MediaStream;
  initialGarment?: {
    item: WardrobeItem;
    file: File;
  };
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onCapacityWait?: (wait: { retryAfterMs: number }) => void;
  onError?: (err: Error) => void;
  onSessionEnded?: (reason: string) => void;
}

export async function requestDecartCameraStream(): Promise<MediaStream> {
  return requestCameraStream(DECART_VTON_VIDEO_CONSTRAINTS);
}

function assertGarmentFile(file: File): void {
  if (!(file instanceof Blob) || file.size <= 0) {
    throw new Error(
      `Invalid garment file for Decart set() (size=${file && 'size' in file ? String(file.size) : 'n/a'})`,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function describeLocalVideoTrack(stream: MediaStream): Record<string, unknown> {
  const track = stream.getVideoTracks()[0];
  if (!track) {
    return { hasVideo: false, audioTracks: stream.getAudioTracks().length };
  }
  let settings: Record<string, unknown>;
  try {
    settings = track.getSettings() as Record<string, unknown>;
  } catch (err) {
    settings = { settingsError: serializeUnknown(err) };
  }
  return {
    hasVideo: true,
    id: track.id,
    label: track.label,
    readyState: track.readyState,
    enabled: track.enabled,
    muted: track.muted,
    facingMode: settings.facingMode ?? null,
    width: settings.width ?? null,
    height: settings.height ?? null,
    frameRate: settings.frameRate ?? null,
    audioTracks: stream.getAudioTracks().length,
  };
}

/**
 * LiveKit publish needs non-zero track settings. Connecting immediately after
 * getUserMedia often logs "could not determine track dimensions, using defaults"
 * and Lucy VTON ends generation with reason=`error` at 0s.
 */
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
    if (track.readyState === 'live' && width > 0 && height > 0) {
      decartDevLog('camera track ready', describeLocalVideoTrack(stream));
      return;
    }
    await sleep(50);
  }

  const late = track.getSettings();
  if ((late.width ?? 0) > 0 && (late.height ?? 0) > 0) {
    decartDevLog('camera track ready (late)', describeLocalVideoTrack(stream));
    return;
  }

  throw new Error(
    `Camera track has no dimensions after ${timeoutMs}ms (${JSON.stringify(describeLocalVideoTrack(stream))})`,
  );
}

function installDevWorkerErrorHook(): () => void {
  if (!import.meta.env.DEV || typeof window === 'undefined' || typeof Worker === 'undefined') {
    return () => {};
  }

  const OriginalWorker = window.Worker;
  window.Worker = class DecartInstrumentedWorker extends OriginalWorker {
    constructor(scriptURL: string | URL, options?: WorkerOptions) {
      super(scriptURL, options);
      const url = String(scriptURL);
      if (!url.includes('frame-metadata')) return;

      this.addEventListener('error', (ev: ErrorEvent) => {
        decartDevLog('frame-metadata worker error detail', {
          url,
          message: ev.message,
          filename: ev.filename,
          lineno: ev.lineno,
          colno: ev.colno,
          error: serializeUnknown(ev.error),
        });
      });
      this.addEventListener('messageerror', () => {
        decartDevLog('frame-metadata worker messageerror', { url });
      });
    }
  } as typeof Worker;

  return () => {
    window.Worker = OriginalWorker;
  };
}

type LiveKitRoomLike = {
  remoteParticipants: Map<
    string,
    {
      identity: string;
      trackPublications: Map<
        string,
        {
          kind?: string;
          trackName?: string;
          isSubscribed?: boolean;
          isMuted?: boolean;
          trackSid?: string;
        }
      >;
    }
  >;
  localParticipant?: {
    identity?: string;
    trackPublications: Map<
      string,
      {
        kind?: string;
        trackName?: string;
        isMuted?: boolean;
        track?: { mediaStreamTrack?: MediaStreamTrack } | null;
      }
    >;
  };
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
};

function snapshotRoom(room: LiveKitRoomLike): Record<string, unknown> {
  const remotes = [...room.remoteParticipants.values()].map((participant) => ({
    identity: participant.identity,
    publications: [...participant.trackPublications.values()].map((pub) => ({
      kind: pub.kind,
      trackName: pub.trackName,
      trackSid: pub.trackSid,
      subscribed: pub.isSubscribed,
      muted: pub.isMuted,
    })),
  }));
  const localPubs = [...(room.localParticipant?.trackPublications.values() ?? [])].map((pub) => {
    const mst = pub.track?.mediaStreamTrack;
    return {
      kind: pub.kind,
      trackName: pub.trackName,
      muted: pub.isMuted,
      readyState: mst?.readyState,
      enabled: mst?.enabled,
      mutedTrack: mst?.muted,
    };
  });
  return {
    localIdentity: room.localParticipant?.identity ?? null,
    localPublications: localPubs,
    remoteCount: remotes.length,
    remotes,
    inferenceRemotes: remotes.filter((r) => r.identity.startsWith('inference-server-')),
  };
}

async function installDevLiveKitRoomProbe(): Promise<() => void> {
  if (!import.meta.env.DEV) return () => {};

  try {
    const livekit = await import('livekit-client');
    const Room = livekit.Room as unknown as {
      prototype: {
        connect: (...args: unknown[]) => Promise<unknown>;
      };
    };
    const RoomEvent = livekit.RoomEvent as Record<string, string>;
    const originalConnect = Room.prototype.connect;

    Room.prototype.connect = async function patchedConnect(
      this: LiveKitRoomLike,
      ...args: unknown[]
    ) {
      const result = await originalConnect.apply(this, args);

      const logSnapshot = (reason: string) => {
        try {
          decartDevLog('livekit room snapshot', {
            reason,
            ...snapshotRoom(this),
          });
        } catch (err) {
          decartDevLog('livekit room snapshot failed', serializeUnknown(err));
        }
      };

      this.on(RoomEvent.ParticipantConnected, (participant) => {
        const identity =
          participant && typeof participant === 'object' && 'identity' in participant
            ? String((participant as { identity?: string }).identity)
            : String(participant);
        decartDevLog('LiveKit ParticipantConnected', { identity });
        logSnapshot('participant-connected');
      });

      this.on(RoomEvent.TrackPublished, (publication, participant) => {
        const pub = publication as {
          kind?: string;
          trackName?: string;
          trackSid?: string;
        };
        const identity =
          participant && typeof participant === 'object' && 'identity' in participant
            ? String((participant as { identity?: string }).identity)
            : String(participant);
        decartDevLog('LiveKit TrackPublished', {
          identity,
          kind: pub.kind,
          trackName: pub.trackName,
          trackSid: pub.trackSid,
        });
        logSnapshot('track-published');
      });

      this.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        const tr = track as { kind?: string };
        const pub = publication as { trackName?: string; trackSid?: string };
        const identity =
          participant && typeof participant === 'object' && 'identity' in participant
            ? String((participant as { identity?: string }).identity)
            : String(participant);
        decartDevLog('LiveKit TrackSubscribed', {
          identity,
          kind: tr.kind,
          trackName: pub.trackName,
          trackSid: pub.trackSid,
        });
        logSnapshot('track-subscribed');
      });

      this.on(RoomEvent.TrackSubscriptionFailed, (trackSid, participant, reason) => {
        const identity =
          participant && typeof participant === 'object' && 'identity' in participant
            ? String((participant as { identity?: string }).identity)
            : String(participant);
        decartDevLog('LiveKit TrackSubscriptionFailed', {
          identity,
          trackSid: String(trackSid),
          reason: serializeUnknown(reason),
        });
      });

      logSnapshot('connect-done');
      window.setTimeout(() => logSnapshot('t+2s'), 2_000);
      window.setTimeout(() => logSnapshot('t+6s'), 6_000);

      return result;
    };

    return () => {
      Room.prototype.connect = originalConnect;
    };
  } catch (err) {
    decartDevLog('livekit room probe install failed', serializeUnknown(err));
    return () => {};
  }
}

async function probeConnectivity(): Promise<void> {
  if (!import.meta.env.DEV) return;
  try {
    const report = await decartClient.realtime.checkConnectivity();
    decartDevLog('checkConnectivity', {
      quality: report.quality,
      transport: report.metrics?.transport,
      rttMs: report.metrics?.rttMs,
      reasons: report.reasons,
    });
  } catch (err) {
    decartDevLog('checkConnectivity failed', serializeUnknown(err));
  }
}

async function applyPromptOnly(
  client: RealTimeClient,
  spec: DecartVtonPromptSpec,
  reason: string,
): Promise<void> {
  decartDevLog('setPrompt start (fallback)', {
    reason,
    promptChars: spec.prompt.length,
    enhance: true,
  });
  // Force enhance on fallback so a catalog/model-worn prompt still has a chance
  // without a usable flat-lay reference image.
  await client.setPrompt(spec.prompt, { enhance: true });
  decartDevLog('setPrompt end (fallback)');
}

async function waitForRemote(
  remoteReceived: () => boolean,
  timeoutMs: number,
  label: string,
): Promise<boolean> {
  if (remoteReceived()) return true;
  decartDevLog(`waiting for onRemoteStream (${label})`, { timeoutMs });
  const deadline = Date.now() + timeoutMs;
  while (!remoteReceived() && Date.now() < deadline) {
    await sleep(250);
  }
  if (remoteReceived()) {
    decartDevLog(`onRemoteStream arrived (${label})`);
    return true;
  }
  return false;
}

/**
 * Apply garment atomically. On image/set failure, fall back to prompt-only so
 * generation (and thus the inference remote track) can still start.
 */
async function applyGarmentOrPromptFallback(
  client: RealTimeClient,
  item: WardrobeItem,
  garmentFile: File,
  remoteReceived: () => boolean,
  onError?: (err: Error) => void,
): Promise<void> {
  const spec = buildDecartVtonPrompt(item);
  assertGarmentFile(garmentFile);

  decartDevLog('set({prompt,image}) start', {
    itemId: item.id,
    promptChars: spec.prompt.length,
    enhance: spec.enhance,
    fileName: garmentFile.name,
    fileSize: garmentFile.size,
    fileType: garmentFile.type || '(empty)',
  });

  try {
    await client.set({
      prompt: spec.prompt,
      image: garmentFile,
      enhance: spec.enhance,
    });
    decartDevLog('set({prompt,image}) end ok');
  } catch (err) {
    const error =
      err instanceof Error
        ? err
        : new Error(String(err) || 'No se pudo aplicar la prenda inicial');
    decartDevLog('set({prompt,image}) failed', { message: error.message });
    onError?.(error);
    try {
      await applyPromptOnly(client, spec, 'set_image_failed');
      await waitForRemote(remoteReceived, REMOTE_AFTER_PROMPT_MS, 'after set failure prompt');
    } catch (promptErr) {
      const promptError =
        promptErr instanceof Error
          ? promptErr
          : new Error(String(promptErr) || 'Prompt-only fallback failed');
      decartDevLog('setPrompt fallback failed', { message: promptError.message });
      onError?.(promptError);
    }
    return;
  }

  if (await waitForRemote(remoteReceived, REMOTE_AFTER_SET_MS, 'after set(image)')) {
    return;
  }

  decartDevLog('no remote after set(image); trying prompt-only fallback');
  try {
    await applyPromptOnly(client, spec, 'no_remote_after_set_image');
    await waitForRemote(remoteReceived, REMOTE_AFTER_PROMPT_MS, 'after prompt-only fallback');
  } catch (promptErr) {
    const promptError =
      promptErr instanceof Error
        ? promptErr
        : new Error(String(promptErr) || 'Prompt-only fallback failed');
    decartDevLog('setPrompt fallback failed', { message: promptError.message });
    onError?.(promptError);
  }
}

type OpenRealtimeSessionResult = {
  client: RealTimeClient;
  remoteReceived: () => boolean;
  beginQuietTeardown: () => void;
};

async function openRealtimeSession(
  options: ConnectDecartVtonOptions,
  connectExtras: {
    preferredVideoCodec?: 'h264' | 'vp8' | 'vp9';
    attempt: number;
  },
): Promise<OpenRealtimeSessionResult> {
  const useFastMode = import.meta.env.VITE_DECART_SPEED?.trim() === 'fast';
  const initialGarment = options.initialGarment;
  const initialSpec = initialGarment
    ? buildDecartVtonPrompt(initialGarment.item)
    : null;
  let suppressTerminalCallbacks = false;

  if (initialGarment) {
    assertGarmentFile(initialGarment.file);
    decartDevLog('connect then set() garment (no initialState)', {
      attempt: connectExtras.attempt,
      itemId: initialGarment.item.id,
      promptChars: initialSpec?.prompt.length,
      enhance: initialSpec?.enhance,
      fileSize: initialGarment.file.size,
      fileType: initialGarment.file.type || '(empty)',
      speed: useFastMode ? 'fast' : 'standard',
      mirror: false,
      preferredVideoCodec: connectExtras.preferredVideoCodec ?? 'default(h264)',
      localVideo: describeLocalVideoTrack(options.localStream),
    });
  } else {
    decartDevLog('connect without garment', {
      attempt: connectExtras.attempt,
      speed: useFastMode ? 'fast' : 'standard',
      mirror: false,
      preferredVideoCodec: connectExtras.preferredVideoCodec ?? 'default(h264)',
      localVideo: describeLocalVideoTrack(options.localStream),
    });
  }

  let remoteReceived = false;
  let generationSeen = false;

  // mirror:false — see file header. Do not use "auto" while facingMode:"user"
  // is requested; that path wraps desktop cams and can starve the inference
  // server of frames while set()/acks still succeed.
  // No initialState — join-time generation races ahead of local track publish.
  const rtClient = await decartClient.realtime.connect(options.localStream, {
    model: vtonModel,
    mirror: false,
    ...(connectExtras.preferredVideoCodec
      ? { preferredVideoCodec: connectExtras.preferredVideoCodec }
      : {}),
    ...(useFastMode ? { speed: 'fast' as const } : {}),
    onRemoteStream: (remoteStream) => {
      remoteReceived = true;
      decartDevLog('onRemoteStream', {
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
      });
      options.onRemoteStream(remoteStream);
    },
    onConnectionChange: (state) => {
      decartDevLog('connectionChange', { state });
      if (!suppressTerminalCallbacks) {
        options.onConnectionChange?.(state);
      }
    },
    onCapacityWait: (wait) => {
      decartDevLog('capacityWait', { retryAfterMs: wait.retryAfterMs });
      options.onCapacityWait?.({ retryAfterMs: wait.retryAfterMs });
    },
  });

  rtClient.on('error', (sdkError) => {
    const err =
      sdkError instanceof Error
        ? sdkError
        : new Error(
            String((sdkError as { message?: string })?.message || 'Decart realtime error'),
          );
    decartDevLog('sdk error event', { message: err.message });
    if (!suppressTerminalCallbacks) {
      options.onError?.(err);
    }
  });

  rtClient.on('sessionEnded', (evt) => {
    decartDevLog('sessionEnded', {
      reason: evt.reason,
      suppressed: suppressTerminalCallbacks,
    });
    if (!suppressTerminalCallbacks) {
      options.onSessionEnded?.(evt.reason);
    }
  });

  rtClient.on('generationTick', (evt) => {
    generationSeen = true;
    decartDevLog('generationTick', { seconds: evt.seconds });
  });

  rtClient.on('generationEnded', (evt) => {
    decartDevLog('generationEnded', {
      seconds: evt.seconds,
      reason: evt.reason,
      // Spread any extra SDK/server fields — set() ACK hides these.
      ...serializeUnknown(evt),
    });
  });

  activeRealtimeClient = rtClient;
  decartDevLog('connect() resolved (LiveKit up; remote may still be pending)', {
    connectionState: rtClient.getConnectionState(),
    sessionId: rtClient.sessionId,
    attempt: connectExtras.attempt,
  });

  if (initialGarment) {
    await applyGarmentOrPromptFallback(
      rtClient,
      initialGarment.item,
      initialGarment.file,
      () => remoteReceived,
      options.onError,
    );
  }

  if (!remoteReceived) {
    decartDevLog('still no remote after garment/prompt path', {
      attempt: connectExtras.attempt,
      connectionState: rtClient.getConnectionState(),
      generationSeen,
      sessionId: rtClient.sessionId,
    });
  }

  return {
    client: rtClient,
    remoteReceived: () => remoteReceived,
    beginQuietTeardown: () => {
      suppressTerminalCallbacks = true;
    },
  };
}

export async function connectDecartVtonSession(
  options: ConnectDecartVtonOptions,
): Promise<RealTimeClient> {
  disconnectDecartVtonSession({ keepLocalStream: options.localStream });
  activeLocalStream = options.localStream;

  removeWorkerErrorHook?.();
  removeWorkerErrorHook = installDevWorkerErrorHook();
  removeLiveKitRoomProbe?.();
  removeLiveKitRoomProbe = await installDevLiveKitRoomProbe();

  await waitForCameraTrackReady(options.localStream);
  await probeConnectivity();

  const first = await openRealtimeSession(options, { attempt: 1 });
  if (first.remoteReceived() || !options.initialGarment) {
    return first.client;
  }

  // set()/prompt acked but inference never published — reconnect once with VP8
  // in case H264 + frame-metadata encode path is breaking upstream frames.
  decartDevLog('no remote after first connect; reconnecting with preferredVideoCodec=vp8');
  first.beginQuietTeardown();
  try {
    first.client.disconnect();
  } catch {
    // ignore
  }
  activeRealtimeClient = null;
  await sleep(250);

  const second = await openRealtimeSession(options, {
    attempt: 2,
    preferredVideoCodec: 'vp8',
  });
  return second.client;
}

export async function setDecartVtonGarment(
  item: WardrobeItem,
  garmentFile: File,
): Promise<void> {
  if (!activeRealtimeClient) {
    throw new Error('No active Decart VTON realtime session');
  }
  const { prompt, enhance } = buildDecartVtonPrompt(item);
  assertGarmentFile(garmentFile);
  decartDevLog('setDecartVtonGarment', {
    itemId: item.id,
    promptChars: prompt.length,
    enhance,
    fileSize: garmentFile.size,
    fileType: garmentFile.type || '(empty)',
  });
  await activeRealtimeClient.set({
    prompt,
    image: garmentFile,
    enhance,
  });
  decartDevLog('setDecartVtonGarment ok');
}

export function isDecartVtonConnected(): boolean {
  return Boolean(activeRealtimeClient?.isConnected());
}

export function disconnectDecartVtonSession(options?: {
  keepLocalStream?: MediaStream | null;
}): void {
  if (activeRealtimeClient) {
    try {
      activeRealtimeClient.disconnect();
    } catch {
      // Ignore disconnect errors on cleanup
    }
    activeRealtimeClient = null;
  }
  removeLiveKitRoomProbe?.();
  removeLiveKitRoomProbe = null;
  removeWorkerErrorHook?.();
  removeWorkerErrorHook = null;
  if (activeLocalStream && activeLocalStream !== options?.keepLocalStream) {
    stopCameraStream(activeLocalStream);
  }
  if (!options?.keepLocalStream) {
    activeLocalStream = null;
  }
}
