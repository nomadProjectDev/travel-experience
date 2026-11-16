/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { requireClayEffect, type ClayEffect } from '@config/clients/travel-experience/effects';
import {
  reduceTravelScreen,
  type TravelScreen,
} from '@config/clients/travel-experience/travelFlow';
import { getCopy } from '@config';
import type { CameraRotationDeg } from '@/core/media/cameraRotation';
import {
  createOrientedCameraStream,
  parseUserMediaError,
  stopCameraStream,
} from '@/shared/lib/camera';
import {
  DECART_EFFECTS_STREAM_FORMAT,
  connectDecartEffectsSession,
  disconnectDecartEffectsSession,
  requestEffectsCameraStream,
  setClayEffectPrompt,
} from '@/services/decart-effects.service';

export type BrickStatus = 'idle' | 'connecting' | 'live' | 'switching' | 'error';

const REMOTE_WATCHDOG_MS = 22_000;

function friendlyDecartError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('insufficient credits')) {
    return 'El servicio en vivo no tiene créditos disponibles en este momento.';
  }
  if (lower.includes('missing decart_api_key') || lower.includes('no apikey')) {
    return 'Falta configurar el servicio en vivo en el servidor.';
  }
  if (lower.includes('stale connect')) {
    return 'La conexión se cortó al empezar. Pulsa Reintentar.';
  }
  return message;
}

export function useBrickSession() {
  const copy = getCopy().brickStudio;
  const [screen, setScreen] = useState<TravelScreen>({ name: 'landing' });
  const [status, setStatus] = useState<BrickStatus>('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);

  const screenRef = useRef(screen);
  const runRef = useRef(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const errorRef = useRef<string | null>(null);
  const openingRef = useRef(false);
  const pendingLookRef = useRef<{ effect: ClayEffect; destinationId: string } | null>(null);

  const setTravelScreen = useCallback((next: TravelScreen) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  const reportError = useCallback((message: string) => {
    const next = friendlyDecartError(message);
    const stale = next.startsWith('La conexión se cortó');
    if (stale && errorRef.current) return;
    errorRef.current = next;
    setError(next);
    setStatus('error');
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current != null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const releaseLocal = useCallback((stream: MediaStream | null) => {
    stopCameraStream(stream);
    if (localStreamRef.current === stream) localStreamRef.current = null;
  }, []);

  const stopLive = useCallback(() => {
    runRef.current += 1;
    openingRef.current = false;
    pendingLookRef.current = null;
    clearWatchdog();
    disconnectDecartEffectsSession();
    releaseLocal(localStreamRef.current);
    setRemoteStream(null);
    errorRef.current = null;
    setError(null);
    setStatus('idle');
    setIsOpeningCamera(false);
  }, [clearWatchdog, releaseLocal]);

  const returnToCountries = useCallback(() => {
    stopLive();
    setTravelScreen(reduceTravelScreen(screenRef.current, { type: 'back-to-countries' }));
  }, [setTravelScreen, stopLive]);

  const returnToLanding = useCallback(() => {
    stopLive();
    setTravelScreen(reduceTravelScreen(screenRef.current, { type: 'back-to-landing' }));
  }, [setTravelScreen, stopLive]);

  const openCountryHome = useCallback(() => {
    setTravelScreen(reduceTravelScreen(screenRef.current, { type: 'begin' }));
  }, [setTravelScreen]);

  const chooseDestination = useCallback((destinationId: string) => {
    errorRef.current = null;
    setError(null);
    setTravelScreen(reduceTravelScreen(screenRef.current, { type: 'choose-country', destinationId }));
  }, [setTravelScreen]);

  useEffect(() => {
    return () => {
      runRef.current += 1;
      clearWatchdog();
      disconnectDecartEffectsSession();
      releaseLocal(localStreamRef.current);
    };
  }, [clearWatchdog, releaseLocal]);

  const startLook = useCallback(async (
    effect: ClayEffect,
    cameraRotationDeg: CameraRotationDeg,
    destinationId: string,
  ) => {
    if (openingRef.current) return;
    const run = ++runRef.current;
    openingRef.current = true;
    pendingLookRef.current = { effect, destinationId };
    setIsOpeningCamera(true);
    disconnectDecartEffectsSession();
    releaseLocal(localStreamRef.current);
    errorRef.current = null;
    setError(null);
    setRemoteStream(null);
    setStatus('idle');

    const failBeforeLive = (message: string) => {
      if (run !== runRef.current) return;
      openingRef.current = false;
      pendingLookRef.current = null;
      setIsOpeningCamera(false);
      reportError(message);
      setTravelScreen({ name: 'variant', destinationId });
    };

    let rawStream: MediaStream;
    try {
      rawStream = await requestEffectsCameraStream(cameraRotationDeg);
    } catch (err) {
      failBeforeLive(parseUserMediaError(err).message);
      return;
    }

    if (run !== runRef.current) {
      stopCameraStream(rawStream);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await createOrientedCameraStream(
        rawStream,
        cameraRotationDeg,
        DECART_EFFECTS_STREAM_FORMAT,
      );
    } catch (err) {
      stopCameraStream(rawStream);
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo orientar la cámara para el efecto en vivo.';
      failBeforeLive(message);
      return;
    }

    if (run !== runRef.current) {
      stopCameraStream(stream);
      return;
    }

    releaseLocal(localStreamRef.current);
    localStreamRef.current = stream;
    openingRef.current = false;
    pendingLookRef.current = null;
    setIsOpeningCamera(false);
    setTravelScreen({ name: 'live', destinationId, effectId: effect.id });
    setStatus('connecting');
    clearWatchdog();
    watchdogRef.current = window.setTimeout(() => {
      if (run !== runRef.current || errorRef.current) return;
      reportError(copy?.sessionError ?? 'No pudimos abrir el efecto en vivo.');
    }, REMOTE_WATCHDOG_MS);

    try {
      await connectDecartEffectsSession({
        localStream: stream,
        effect,
        onRemoteStream: (remote) => {
          if (run !== runRef.current) return;
          clearWatchdog();
          errorRef.current = null;
          setRemoteStream(remote);
          setError(null);
          setStatus('live');
        },
        onError: (err) => {
          if (run !== runRef.current) return;
          reportError(err.message || copy?.sessionError || 'No pudimos abrir el efecto en vivo.');
        },
      });
    } catch (err) {
      if (run !== runRef.current) return;
      clearWatchdog();
      const message = err instanceof Error ? err.message : copy?.sessionError;
      reportError(message || 'No pudimos abrir el efecto en vivo.');
    }
  }, [clearWatchdog, copy?.sessionError, releaseLocal, reportError, setTravelScreen]);

  const chooseLook = useCallback((effectId: string, cameraRotationDeg: CameraRotationDeg) => {
    const next = reduceTravelScreen(screenRef.current, { type: 'choose-look', effectId });
    if (next.name !== 'live') return;
    const effect = requireClayEffect(next.effectId);
    void startLook(effect, cameraRotationDeg, next.destinationId);
  }, [startLook]);

  const retry = useCallback((cameraRotationDeg: CameraRotationDeg) => {
    const current = screenRef.current;
    if (current.name !== 'live') return;
    openingRef.current = false;
    const effect = requireClayEffect(current.effectId);
    void startLook(effect, cameraRotationDeg, current.destinationId);
  }, [startLook]);

  const reorient = useCallback((cameraRotationDeg: CameraRotationDeg) => {
    const current = screenRef.current;
    if (current.name === 'live') {
      openingRef.current = false;
      const effect = requireClayEffect(current.effectId);
      void startLook(effect, cameraRotationDeg, current.destinationId);
      return;
    }
    if (openingRef.current && pendingLookRef.current) {
      const pending = pendingLookRef.current;
      openingRef.current = false;
      void startLook(pending.effect, cameraRotationDeg, pending.destinationId);
    }
  }, [startLook]);

  const switchLook = useCallback(async (effectId: string) => {
    const current = screenRef.current;
    if (current.name !== 'live' || current.effectId === effectId) return;
    const run = runRef.current;
    const effect = requireClayEffect(effectId);
    errorRef.current = null;
    setError(null);
    setStatus('switching');
    setTravelScreen({
      name: 'live',
      destinationId: current.destinationId,
      effectId: effect.id,
    });
    try {
      await setClayEffectPrompt(effect);
      if (run !== runRef.current) return;
      setStatus('live');
    } catch (err) {
      if (run !== runRef.current) return;
      const message = err instanceof Error ? err.message : copy?.sessionError;
      reportError(message || 'No pudimos cambiar el vestuario en vivo.');
    }
  }, [copy?.sessionError, reportError, setTravelScreen]);

  return {
    screen,
    status,
    remoteStream,
    error,
    isOpeningCamera,
    openCountryHome,
    chooseDestination,
    chooseLook,
    switchLook,
    returnToCountries,
    returnToLanding,
    retry,
    reorient,
  };
}
