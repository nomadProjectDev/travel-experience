import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RealTimeClient, SetInput } from '@decartai/sdk';
import { CLAY_EFFECTS, requireClayEffect } from '@config/clients/travel-experience/effects';
import * as garmentFileModule from '@/core/media/garmentFile';
import {
  DECART_EFFECTS_VIDEO_CONSTRAINTS,
  DECART_LIVE_MODEL_NAME,
  applyClayEffect,
  clearGarmentFileCache,
  connectDecartEffectsSession,
  disconnectDecartEffectsSession,
  loadCachedGarmentFile,
  resolveClayEffectSetInput,
  resolveEffectsVideoConstraints,
  setClayEffectPrompt,
  type ClayEffectImageLoader,
  type ClayEffectSetClient,
  type RealtimeConnectFn,
} from './decart-effects.service';

function makeMockLocalStream(): MediaStream {
  const track = {
    id: 'local-video-1',
    readyState: 'live',
    enabled: true,
    muted: false,
    stop: vi.fn(),
    getSettings: () => ({ width: 1280, height: 720, frameRate: 30 }),
  } as unknown as MediaStreamTrack;

  return {
    getVideoTracks: () => [track],
    getAudioTracks: () => [],
    getTracks: () => [track],
  } as unknown as MediaStream;
}

function makeMockRemoteStream(id = 'remote-vton-stream'): MediaStream {
  return {
    id,
    getVideoTracks: () => [{ id: `${id}-video` }],
    getAudioTracks: () => [],
    getTracks: () => [{ id: `${id}-video` }],
  } as unknown as MediaStream;
}

function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Decart Lucy VTON 3.6 travel session lifecycle', () => {
  beforeEach(() => {
    disconnectDecartEffectsSession();
    clearGarmentFileCache();
    vi.restoreAllMocks();
  });

  it('targets lucy-vton-3.6 (never lucy-2.6) and sends clean garment plates for all 12 looks', async () => {
    expect(DECART_LIVE_MODEL_NAME).toBe('lucy-vton-3.6');

    const loadImage = vi.fn<ClayEffectImageLoader>(async (src) => {
      return new File([`garment:${src}`], src.split('/').pop() || 'garment.webp', {
        type: 'image/webp',
      });
    });
    const set = vi.fn<ClayEffectSetClient['set']>().mockResolvedValue(undefined);
    const client = { set } satisfies ClayEffectSetClient;

    for (const effect of CLAY_EFFECTS) {
      const resolved = await resolveClayEffectSetInput(effect, loadImage);
      expect(resolved.prompt).toBe(effect.prompt);
      expect(resolved.enhance).toBe(false);
      expect(resolved.image).toBeInstanceOf(Blob);

      await applyClayEffect(client, effect, loadImage);
    }

    expect(loadImage).toHaveBeenCalledTimes(CLAY_EFFECTS.length * 2);
    for (const call of loadImage.mock.calls) {
      expect(call[0]).toMatch(/^\/brand\/travel-experience\/garments\/.+\.webp$/);
      expect(call[0]).not.toContain('/effects/');
    }

    expect(set).toHaveBeenCalledTimes(CLAY_EFFECTS.length);
    for (const [index, effect] of CLAY_EFFECTS.entries()) {
      const arg = set.mock.calls[index]?.[0];
      expect(arg?.prompt).toBe(effect.prompt);
      expect(arg?.enhance).toBe(false);
      expect(arg?.image).toBeInstanceOf(File);
      expect((arg?.image as File).name).toBe(`${effect.id}.webp`);
    }
  });

  it('connects bare with lucy-vton-3.6 and gates remote video until rtClient.set({ prompt, image, enhance: false }) completes', async () => {
    const effect = requireClayEffect('mexico-hombre');
    const garmentFile = new File(['mexico-garment'], 'mexico-hombre.webp', {
      type: 'image/webp',
    });
    const loadImage = vi.fn<ClayEffectImageLoader>().mockResolvedValue(garmentFile);

    const setDeferred = createDeferred<void>();
    const setMock = vi.fn<(input: SetInput) => Promise<void>>(() => setDeferred.promise);
    const disconnectMock = vi.fn();

    let capturedModelName: string | undefined;
    let capturedInitialState: unknown = 'UNSET';
    let capturedMirror: unknown;

    const earlyRemoteStream = makeMockRemoteStream('early-passthrough');
    const realtimeConnect = vi.fn<RealtimeConnectFn>(async (_stream, connectOpts) => {
      capturedModelName = connectOpts.model.name;
      capturedInitialState = connectOpts.initialState;
      capturedMirror = connectOpts.mirror;

      // Simulate LiveKit delivering a remote stream BEFORE rtClient.set() completes:
      connectOpts.onRemoteStream(earlyRemoteStream);

      return {
        set: setMock,
        disconnect: disconnectMock,
        on: vi.fn(),
        off: vi.fn(),
        isConnected: () => true,
        getConnectionState: () => 'connected',
      } as unknown as RealTimeClient;
    });

    const onRemoteStream = vi.fn();
    const connectPromise = connectDecartEffectsSession({
      localStream: makeMockLocalStream(),
      effect,
      loadImage,
      realtimeConnect,
      onRemoteStream,
      remoteAfterSetTimeoutMs: 50,
    });

    // Let camera ready + connect resolve up to the pending rtClient.set() call
    await vi.waitFor(() => {
      expect(setMock).toHaveBeenCalledTimes(1);
    });

    expect(capturedModelName).toBe('lucy-vton-3.6');
    expect(capturedInitialState).toBeUndefined();
    expect(capturedMirror).toBe(false);
    expect(setMock).toHaveBeenCalledWith({
      prompt: effect.prompt,
      image: garmentFile,
      enhance: false,
    });

    // CRITICAL: remote video MUST NOT be revealed before rtClient.set() resolves!
    expect(onRemoteStream).not.toHaveBeenCalled();

    setDeferred.resolve();
    await connectPromise;

    expect(onRemoteStream).toHaveBeenCalledTimes(1);
    expect(onRemoteStream).toHaveBeenCalledWith(earlyRemoteStream);
  });

  it('switches looks on an active session by sending the new look prompt and clean garment file with enhance: false', async () => {
    const firstEffect = requireClayEffect('colombia-arriero');
    const secondEffect = requireClayEffect('puerto-rico-azul-verde');

    const loadImage = vi.fn<ClayEffectImageLoader>(async (src) => {
      const name = src.split('/').pop() || 'garment.webp';
      return new File([`bytes:${name}`], name, { type: 'image/webp' });
    });

    const setMock = vi.fn<(input: SetInput) => Promise<void>>().mockResolvedValue(undefined);
    const remoteStream = makeMockRemoteStream('vton-live');

    const realtimeConnect = vi.fn<RealtimeConnectFn>(async (_stream, connectOpts) => {
      const client = {
        set: async (input: SetInput) => {
          await setMock(input);
          connectOpts.onRemoteStream(remoteStream);
        },
        disconnect: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        isConnected: () => true,
        getConnectionState: () => 'generating',
      } as unknown as RealTimeClient;
      return client;
    });

    const onRemoteStream = vi.fn();
    await connectDecartEffectsSession({
      localStream: makeMockLocalStream(),
      effect: firstEffect,
      loadImage,
      realtimeConnect,
      onRemoteStream,
      remoteAfterSetTimeoutMs: 50,
    });

    expect(onRemoteStream).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock.mock.calls[0]?.[0]).toMatchObject({
      prompt: firstEffect.prompt,
      enhance: false,
    });
    expect((setMock.mock.calls[0]?.[0].image as File).name).toBe('colombia-arriero.webp');

    await setClayEffectPrompt(secondEffect, loadImage);

    expect(setMock).toHaveBeenCalledTimes(2);
    expect(setMock.mock.calls[1]?.[0]).toMatchObject({
      prompt: secondEffect.prompt,
      enhance: false,
    });
    expect((setMock.mock.calls[1]?.[0].image as File).name).toBe(
      'puerto-rico-azul-verde.webp',
    );
  });

  it('normalizes via urlToDecartGarmentFile and caches the File in memory per garment path', async () => {
    const spy = vi
      .spyOn(garmentFileModule, 'urlToDecartGarmentFile')
      .mockImplementation(async (_url, filename) => {
        return new File(['normalized-webp'], filename, { type: 'image/webp' });
      });

    const pathA = '/brand/travel-experience/garments/chile-hombre.webp';
    const pathB = '/brand/travel-experience/garments/chile-mujer.webp';

    const [firstA, secondA, firstB] = await Promise.all([
      loadCachedGarmentFile(pathA),
      loadCachedGarmentFile(pathA),
      loadCachedGarmentFile(pathB),
    ]);

    expect(firstA).toBe(secondA);
    expect(firstA.name).toBe('chile-hombre.webp');
    expect(firstB.name).toBe('chile-mujer.webp');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, pathA, 'chile-hombre.webp');
    expect(spy).toHaveBeenNthCalledWith(2, pathB, 'chile-mujer.webp');
  });

  it('requests native portrait constraints at 0° on portrait viewports and explicit 1280×720 for rotated MUPI cameras', () => {
    try {
      vi.stubGlobal('window', { innerWidth: 1080, innerHeight: 1920 });

      const uprightPortrait = resolveEffectsVideoConstraints(0);
      expect(uprightPortrait.facingMode).toBe('user');
      expect(uprightPortrait).not.toHaveProperty('width');
      expect(uprightPortrait).not.toHaveProperty('height');

      expect(resolveEffectsVideoConstraints(90)).toEqual(DECART_EFFECTS_VIDEO_CONSTRAINTS);
      expect(resolveEffectsVideoConstraints(180)).toEqual(DECART_EFFECTS_VIDEO_CONSTRAINTS);
      expect(resolveEffectsVideoConstraints(270)).toEqual(DECART_EFFECTS_VIDEO_CONSTRAINTS);

      vi.stubGlobal('window', { innerWidth: 1440, innerHeight: 900 });
      expect(resolveEffectsVideoConstraints(0)).toEqual(DECART_EFFECTS_VIDEO_CONSTRAINTS);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
