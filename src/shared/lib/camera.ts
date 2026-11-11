/**
 * Shared camera constraints, errors, and capture helpers.
 */

import {
  drawContainedCameraFrame,
  isQuarterTurnRotation,
  resolveCameraRotationDeg,
  type CameraRotationDeg,
} from '@/core/media/cameraRotation';

/** Same as summit-booth-june `startVideo`. */
export const CAMERA_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  facingMode: 'user',
};

/**
 * Optional rotated/mirrored camera layout for sideways-mounted cams.
 * Web demo default is upright; set `VITE_CAMERA_ROTATION_DEG` to a non-zero value to enable.
 */
export function usesSummitMupiCameraLayout(): boolean {
  return resolveCameraRotationDeg() !== 0;
}

// Dev/start server listens on 8080 by default (server/index.ts).
const LOCAL_CAMERA_URL = 'http://localhost:8080';

export type CameraErrorKind = 'unavailable' | 'permission' | 'generic';

export type CameraError = {
  kind: CameraErrorKind;
  message: string;
};

export function isCameraApiAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

function isLocalCameraHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  );
}

function isEmbeddedPreview(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function getUnavailableMessage(): string {
  if (typeof window !== 'undefined') {
    if (isEmbeddedPreview()) {
      return `La vista previa embebida no puede usar la cámara. Abre ${LOCAL_CAMERA_URL} en Chrome y permite el acceso cuando te lo pida.`;
    }
    if (!window.isSecureContext && !isLocalCameraHost(window.location.hostname)) {
      return `El acceso a la cámara está bloqueado en ${window.location.origin}. Chrome solo permite cámara en HTTPS o localhost; abre ${LOCAL_CAMERA_URL} directamente.`;
    }
  }
  return `Este navegador no expone la API de cámara. Abre ${LOCAL_CAMERA_URL} en Chrome y permite el acceso cuando te lo pida.`;
}

function getPermissionMessage(): string {
  return 'El acceso a la cámara fue bloqueado. Permite la cámara en los ajustes del navegador para este sitio y pulsa Reintentar.';
}

export function parseUserMediaError(err: string | DOMException | unknown): CameraError {
  const name =
    typeof err === 'object' && err !== null && 'name' in err ? String((err as DOMException).name) : '';
  const message =
    typeof err === 'string' ? err : err instanceof Error ? err.message : '';
  const combined = `${name} ${message}`.toLowerCase();

  if (
    !isCameraApiAvailable() ||
    combined.includes('not implemented') ||
    combined.includes('notsupported')
  ) {
    return { kind: 'unavailable', message: getUnavailableMessage() };
  }

  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    combined.includes('permission') ||
    combined.includes('not allowed') ||
    combined.includes('denied')
  ) {
    return { kind: 'permission', message: getPermissionMessage() };
  }

  return { kind: 'generic', message: getPermissionMessage() };
}

export function getUnavailableCameraError(): CameraError {
  return { kind: 'unavailable', message: getUnavailableMessage() };
}

export async function requestCameraStream(
  constraints: MediaTrackConstraints = CAMERA_VIDEO_CONSTRAINTS,
): Promise<MediaStream> {
  if (!isCameraApiAvailable()) {
    throw getUnavailableCameraError();
  }
  return navigator.mediaDevices.getUserMedia({
    video: constraints,
    audio: false,
  });
}

export function stopCameraStream(stream: MediaStream | null | undefined): void {
  if (!stream || stoppedCameraStreams.has(stream)) return;
  stoppedCameraStreams.add(stream);
  const managed = managedCameraStreams.get(stream);
  if (managed) {
    managed.dispose();
    managedCameraStreams.delete(stream);
    return;
  }
  stopTracksOnce(stream);
}

type ManagedCameraStream = {
  prepareRotation: (rotationDeg: CameraRotationDeg) => {
    track: MediaStreamTrack;
    commit: () => void;
    rollback: () => void;
  };
  dispose: () => void;
};

const managedCameraStreams = new WeakMap<MediaStream, ManagedCameraStream>();
const stoppedCameraStreams = new WeakSet<MediaStream>();
const stoppedCameraTracks = new WeakSet<MediaStreamTrack>();

function stopTracksOnce(stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    if (stoppedCameraTracks.has(track)) return;
    stoppedCameraTracks.add(track);
    track.stop();
  });
}

export function prepareCameraStreamRotation(
  stream: MediaStream | null | undefined,
  rotationDeg: CameraRotationDeg,
): ReturnType<ManagedCameraStream['prepareRotation']> | null {
  const managed = stream ? managedCameraStreams.get(stream) : undefined;
  return managed?.prepareRotation(rotationDeg) ?? null;
}

function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Camera stream could not be decoded for orientation'));
    };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

/**
 * Produces a model-sized track whose pixels are physically rotated and
 * contained. Build this before Decart connect and leave the angle fixed;
 * replacing the published track mid-session shows two orientations at once.
 */
export async function createOrientedCameraStream(
  sourceStream: MediaStream,
  rotationDeg: CameraRotationDeg,
  options: { width: number; height: number; frameRate: number },
): Promise<MediaStream> {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context || typeof canvas.captureStream !== 'function') {
    if (rotationDeg === 0) return sourceStream;
    stopCameraStream(sourceStream);
    throw new Error('This browser cannot rotate the camera stream for live effects');
  }

  canvas.width = options.width;
  canvas.height = options.height;

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = sourceStream;
  await video.play();
  await waitForVideoMetadata(video);

  let activeRotation = rotationDeg;
  let animationFrame = 0;
  let disposed = false;
  const draw = () => {
    if (disposed) return;
    drawContainedCameraFrame(
      context,
      canvas,
      video,
      video.videoWidth,
      video.videoHeight,
      activeRotation,
    );
    animationFrame = window.requestAnimationFrame(draw);
  };
  draw();

  const outputStream = canvas.captureStream(options.frameRate);
  let activeTrack = outputStream.getVideoTracks()[0];
  if (!activeTrack) {
    video.pause();
    video.srcObject = null;
    stopCameraStream(sourceStream);
    throw new Error('Camera orientation pipeline produced no video track');
  }
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(animationFrame);
    video.pause();
    video.srcObject = null;
    stopTracksOnce(outputStream);
    if (!stoppedCameraStreams.has(sourceStream)) {
      stoppedCameraStreams.add(sourceStream);
      stopTracksOnce(sourceStream);
    }
  };
  managedCameraStreams.set(outputStream, {
    prepareRotation: (nextRotation) => {
      const replacementStream = canvas.captureStream(options.frameRate);
      const replacementTrack = replacementStream.getVideoTracks()[0];
      if (!replacementTrack) {
        throw new Error('Camera rotation produced no replacement video track');
      }
      let settled = false;
      return {
        track: replacementTrack,
        commit: () => {
          if (settled || disposed) return;
          settled = true;
          activeRotation = nextRotation;
          outputStream.removeTrack(activeTrack);
          outputStream.addTrack(replacementTrack);
          if (!stoppedCameraTracks.has(activeTrack)) {
            stoppedCameraTracks.add(activeTrack);
            activeTrack.stop();
          }
          activeTrack = replacementTrack;
        },
        rollback: () => {
          if (settled) return;
          settled = true;
          if (!stoppedCameraTracks.has(replacementTrack)) {
            stoppedCameraTracks.add(replacementTrack);
            replacementTrack.stop();
          }
        },
      };
    },
    dispose,
  });
  return outputStream;
}

/** Canvas capture with full-frame contain semantics (never center-crops). */
export function captureVideoFrame(
  video: HTMLVideoElement,
  quality = 0.92,
  rotationDeg: CameraRotationDeg = resolveCameraRotationDeg(),
): string | null {
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const quarterTurn = isQuarterTurnRotation(rotationDeg);
  canvas.width = quarterTurn ? videoHeight : videoWidth;
  canvas.height = quarterTurn ? videoWidth : videoHeight;
  drawContainedCameraFrame(
    ctx,
    canvas,
    video,
    videoWidth,
    videoHeight,
    rotationDeg,
  );

  return canvas.toDataURL('image/jpeg', quality);
}
