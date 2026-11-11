/**
 * Detect when Gemini returns the capture instead of a studio rewrite.
 * Flash-lite often echoes the snapshot if the prompt allows a "light polish".
 */

/** Mean abs RGB difference below this (0–1) is treated as an echo of the input. */
export const STUDIO_ECHO_MAX_MEAN_ABS_DIFF = 0.085;

const SAMPLE_WIDTH = 48;
const SAMPLE_HEIGHT = 64;

export function isLikelyCaptureEcho(meanAbsDiff: number): boolean {
  return meanAbsDiff < STUDIO_ECHO_MAX_MEAN_ABS_DIFF;
}

/**
 * Mean absolute RGB difference in 0–1. Same-size ImageData only;
 * mismatched sizes return 1 (treat as not an echo).
 */
export function meanAbsDiffFromImageData(a: ImageData, b: ImageData): number {
  if (a.width !== b.width || a.height !== b.height) return 1;
  const bytes = a.data.length;
  const pixelCount = bytes / 4;
  if (pixelCount <= 0) return 1;

  let sum = 0;
  for (let i = 0; i < bytes; i += 4) {
    sum += Math.abs(a.data[i] - b.data[i]);
    sum += Math.abs(a.data[i + 1] - b.data[i + 1]);
    sum += Math.abs(a.data[i + 2] - b.data[i + 2]);
  }
  return sum / (pixelCount * 3) / 255;
}

const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode image for studio-echo check.'));
    image.src = dataUrl;
  });

const sampleCover = async (dataUrl: string): Promise<ImageData> => {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not create canvas context for studio-echo check.');
  }
  const scale = Math.max(SAMPLE_WIDTH / image.width, SAMPLE_HEIGHT / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  ctx.drawImage(image, (SAMPLE_WIDTH - drawW) / 2, (SAMPLE_HEIGHT - drawH) / 2, drawW, drawH);
  return ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
};

/** Best-effort: compare capture vs Gemini output. Throws only on decode/canvas failure. */
export async function measureCaptureEcho(
  inputDataUrl: string,
  outputDataUrl: string,
): Promise<number> {
  const [inputSample, outputSample] = await Promise.all([
    sampleCover(inputDataUrl),
    sampleCover(outputDataUrl),
  ]);
  return meanAbsDiffFromImageData(inputSample, outputSample);
}
