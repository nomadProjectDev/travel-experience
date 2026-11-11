/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupportedRecorderMimeType, loadImage } from './media-codec';

export const generateLocalLoopVideoFromImage = async (
  modelImageUrl: string,
  durationSeconds = 6
): Promise<string> => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    throw new Error('Local loop rendering is not supported in this browser environment.');
  }

  const image = await loadImage(modelImageUrl);
  const width = image.naturalWidth || 768;
  const height = image.naturalHeight || 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas context for local loop rendering.');
  }

  const stream = canvas.captureStream(24);
  const mimeType = getSupportedRecorderMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const loopMs = Math.max(5000, Math.min(8000, durationSeconds * 1000));
  const startTime = performance.now();

  await new Promise<void>((resolve, reject) => {
    let rafId = 0;

    const drawFrame = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / loopMs;
      const phase = progress * Math.PI * 2;
      const scale = 1.015 + Math.sin(phase) * 0.01;
      const offsetX = Math.sin(phase * 0.6) * (width * 0.012);
      const offsetY = Math.cos(phase * 0.8) * (height * 0.01);

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
      ctx.scale(scale, scale);
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      ctx.restore();

      if (elapsed < loopMs) {
        rafId = requestAnimationFrame(drawFrame);
      } else {
        recorder.stop();
      }
    };

    recorder.onstop = () => {
      cancelAnimationFrame(rafId);
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      if (blob.size === 0) {
        reject(new Error('Local loop rendering produced an empty video.'));
        return;
      }
      resolve();
    };

    recorder.onerror = () => {
      cancelAnimationFrame(rafId);
      reject(new Error('Local loop rendering failed while recording.'));
    };

    recorder.start();
    rafId = requestAnimationFrame(drawFrame);
  });

  const videoBlob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
  return URL.createObjectURL(videoBlob);
};
