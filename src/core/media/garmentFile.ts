/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Decart Lucy VTON recommends ≥512px and keeping reference images under ~5MB. */
const DECART_GARMENT_MAX_LONG_SIDE = 1024;
const DECART_GARMENT_MAX_BYTES = 4.5 * 1024 * 1024;
const DECART_ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function ensureFilenameExtension(filename: string, mimeType: string): string {
  const base = filename.trim() || 'garment';
  if (/\.(jpe?g|png|webp)$/i.test(base)) return base;
  if (mimeType === 'image/png') return `${base}.png`;
  if (mimeType === 'image/webp') return `${base}.webp`;
  return `${base}.jpg`;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.setAttribute('crossOrigin', 'anonymous');
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image from URL: ${url}`));
    image.src = url;
  });
}

function canvasToJpegFile(
  image: CanvasImageSource,
  width: number,
  height: number,
  filename: string,
  quality = 0.85,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context.'));
      return;
    }
    ctx.drawImage(image, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed.'));
          return;
        }
        const type = blob.type || 'image/jpeg';
        resolve(new File([blob], ensureFilenameExtension(filename, type), { type }));
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Decode via canvas and emit PNG. Used by the static Gemini compose path.
 */
export const urlToGarmentFile = (url: string, filename: string): Promise<File> =>
  loadImageElement(url).then((image) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return Promise.reject(new Error('Could not get canvas context.'));
    }
    ctx.drawImage(image, 0, 0);
    return new Promise<File>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed.'));
          return;
        }
        const mimeType = blob.type || 'image/png';
        resolve(
          new File([blob], ensureFilenameExtension(filename, mimeType), { type: mimeType }),
        );
      }, 'image/png');
    });
  });

/**
 * Prepare a garment reference for Decart Lucy VTON realtime `set({ image })`.
 *
 * Prefer the original JPEG/PNG/WebP bytes when they are already within Decart's
 * guidance. Otherwise downscale to a ≤1024px JPEG — catalog WebPs re-encoded
 * through canvas→PNG balloon to 2–4MB and routinely crash inference
 * (`generationEnded` reason=`error` at 0s) even though `set_image_ack` succeeds.
 */
export async function urlToDecartGarmentFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch garment image (${response.status}): ${url}`);
  }
  const blob = await response.blob();
  const mimeType = (blob.type || '').toLowerCase();

  if (DECART_ACCEPTED_MIME.has(mimeType) && blob.size > 0 && blob.size <= DECART_GARMENT_MAX_BYTES) {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await loadImageElement(objectUrl);
      const longSide = Math.max(image.naturalWidth, image.naturalHeight);
      if (longSide > 0 && longSide <= DECART_GARMENT_MAX_LONG_SIDE * 1.5) {
        return new File([blob], ensureFilenameExtension(filename, mimeType), { type: mimeType });
      }
      const scale = DECART_GARMENT_MAX_LONG_SIDE / longSide;
      return canvasToJpegFile(
        image,
        Math.max(1, Math.round(image.naturalWidth * scale)),
        Math.max(1, Math.round(image.naturalHeight * scale)),
        filename,
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const image = await loadImageElement(url);
  const longSide = Math.max(image.naturalWidth, image.naturalHeight) || 1;
  const scale = Math.min(1, DECART_GARMENT_MAX_LONG_SIDE / longSide);
  return canvasToJpegFile(
    image,
    Math.max(1, Math.round(image.naturalWidth * scale)),
    Math.max(1, Math.round(image.naturalHeight * scale)),
    filename,
  );
}
