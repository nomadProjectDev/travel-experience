/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_CLAY_EFFECT_ID,
  getClayEffect,
  type ClayEffect,
} from '@config/clients/navidad/effects';
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

export type BrickPhase = 'landing' | 'live';
export type BrickStatus = 'idle' | 'connecting' | 'live' | 'switching' | 'error';

const REMOTE_WATCHDOG_MS = 22_000;

function friendlyDecartError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('insufficient credits')) {
    return 'La cuenta de Decart no tiene créditos. Recárgala para ver el efecto en vivo.';
  }
  if (lower.includes('missing decart_api_key') || lower.includes('no apikey')) {
    return 'Falta la clave de Decart en el servidor.';
  }
  if (lower.includes('stale connect')) {
    return 'La conexión se cortó al empezar. Pulsa Reintentar.';
  }
  return message;
}

export function useBrickSession() {
  const copy = getCopy().brickStudio;
  const [phase, setPhase] = useState<BrickPhase>('landing');
  const [status, setStatus] = useState<BrickStatus>('idle');
  const [activeEffectId, setActiveEffectId] = useState(DEFAULT_CLAY_EFFECT_ID);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);

  const runRef = useRef(0);
  const switchRef = useRef(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const errorRef = useRef<string | null>(null);

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

  const leave = useCallback(() => {
    runRef.current += 1;
    switchRef.current += 1;
    clearWatchdog();
    disconnectDecartEffectsSession();
    releaseLocal(localStreamRef.current);
    setLocalStream(null);
    setRemoteStream(null);
    errorRef.current = null;
    setError(null);
    setStatus('idle');
    setPhase('landing');
    setIsOpeningCamera(false);
    setActiveEffectId(DEFAULT_CLAY_EFFECT_ID);
  }, [clearWatchdog, releaseLocal]);

  useEffect(() => {
    return () => {
      runRef.current += 1;
      clearWatchdog();
      disconnectDecartEffectsSession();
      releaseLocal(localStreamRef.current);
    };
  }, [clearWatchdog, releaseLocal]);

  const start = useCallback(async (cameraRotationDeg: CameraRotationDeg = 0) => {
    if (isOpeningCamera) return;
    const run = ++runRef.current;
    const effect = getClayEffect(DEFAULT_CLAY_EFFECT_ID);
    setIsOpeningCamera(true);
    errorRef.current = null;
    setError(null);
    setRemoteStream(null);
    setActiveEffectId(effect.id);

    let rawStream: MediaStream;
    try {
      rawStream = await requestEffectsCameraStream();
    } catch (err) {
      if (run !== runRef.current) return;
      setIsOpeningCamera(false);
      reportError(parseUserMediaError(err).message);
      setPhase('landing');
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
      if (run !== runRef.current) return;
      setIsOpeningCamera(false);
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo orientar la cámara para el efecto en vivo.';
      reportError(message);
      setPhase('landing');
      return;
    }

    if (run !== runRef.current) {
      stopCameraStream(stream);
      return;
    }

    releaseLocal(localStreamRef.current);
    localStreamRef.current = stream;
    setLocalStream(stream);
    setPhase('live');
    setStatus('connecting');
    setIsOpeningCamera(false);
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
  }, [clearWatchdog, copy?.sessionError, isOpeningCamera, releaseLocal, reportError]);

  const selectEffect = useCallback(async (effect: ClayEffect) => {
    if (effect.id === activeEffectId && status !== 'error') return;
    if (status === 'connecting' || status === 'idle') return;
    const ticket = ++switchRef.current;
    setActiveEffectId(effect.id);
    setStatus('switching');
    errorRef.current = null;
    setError(null);
    try {
      await setClayEffectPrompt(effect);
      if (ticket !== switchRef.current) return;
      setStatus('live');
    } catch (err) {
      if (ticket !== switchRef.current) return;
      const message = err instanceof Error ? err.message : 'No se pudo cambiar el efecto.';
      reportError(message);
    }
  }, [activeEffectId, reportError, status]);

  return {
    phase,
    status,
    activeEffectId,
    localStream,
    remoteStream,
    error,
    isOpeningCamera,
    start,
    selectEffect,
    leave,
  };
}
