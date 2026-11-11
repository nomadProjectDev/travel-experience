/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getManifest } from '@config';
import {
  FACE_FRAMING_OPTIONS,
  GEMINI_FRAME_ASPECT_RATIO,
  applyFramingProfileToDataUrl,
  buildEnvironmentFramingPromptSuffix,
  buildLockedFramingPromptSuffix,
  buildSideYawFramingPromptSuffix,
  createFramingProfileFromDataUrl,
  downscaleDataUrlForTransport,
  normalizePortraitInputFile,
  type FramingOptions,
  type FramingProfile,
} from '@/core/media/framing';
import { isLikelyCaptureEcho, measureCaptureEcho } from '../core/media/studioEcho';
import type { EnvironmentSceneId } from '@config/types';
import { generateImageViaApi } from './gemini-client';
import { dataUrlToPart, fileToDataUrl } from './media-codec';
import {
  buildEnvironmentVariantPrompt,
  buildModelImagePrompt,
  buildSideYawPrompt,
  buildTryOnPrompt,
  type ComposeSlot,
  type PortraitFramingMode,
  type SideYaw,
} from './gemini-image.prompts';

export type { SideYaw };

export type { FramingProfile, ComposeSlot };

const resolvePortraitFraming = (): PortraitFramingMode =>
  getManifest().features.portraitFraming === 'face' ? 'face' : 'full-body';

/** Face/bust sessions need a taller subject lock so compose rounds stay crop-tight. */
const framingOptionsForPortrait = (portraitFraming: PortraitFramingMode): FramingOptions =>
  portraitFraming === 'face' ? FACE_FRAMING_OPTIONS : {};

export interface ModelImageResult {
  imageUrl: string;
  profile: FramingProfile;
}

type InlineImagePart = ReturnType<typeof dataUrlToPart>;

const logPhaseTimings = (label: string, phases: Record<string, number>): void => {
  if (!import.meta.env.DEV) return;
  const summary = Object.entries(phases)
    .map(([phase, ms]) => `${phase} ${Math.round(ms)}ms`)
    .join(' · ');
  console.info(`[vto-timing] ${label}: ${summary}`);
};

/**
 * Catalog garments are static Files — cache the downscaled transport part per
 * File identity so repeated selections skip the read + canvas re-encode.
 */
const garmentPartCache = new Map<string, Promise<InlineImagePart>>();

const garmentCacheKey = (file: File): string =>
  `${file.name}:${file.size}:${file.lastModified}`;

const getGarmentTransportPart = (garmentImage: File): Promise<InlineImagePart> => {
  const key = garmentCacheKey(garmentImage);
  const cached = garmentPartCache.get(key);
  if (cached) return cached;
  const pending = (async () =>
    dataUrlToPart(await downscaleDataUrlForTransport(await fileToDataUrl(garmentImage))))();
  // Don't memoize failures (e.g. transient decode error).
  pending.catch(() => garmentPartCache.delete(key));
  garmentPartCache.set(key, pending);
  return pending;
};

/** Capture → optical / e-commerce studio portrait (session base before try-on). */
export const generateModelImage = async (userImage: File): Promise<ModelImageResult> => {
  const prepStart = performance.now();
  const portraitFraming = resolvePortraitFraming();
  const normalizedUserImage = await normalizePortraitInputFile(
    userImage,
    framingOptionsForPortrait(portraitFraming),
  );
  const userImagePart = dataUrlToPart(normalizedUserImage);
  const prompt = buildModelImagePrompt(GEMINI_FRAME_ASPECT_RATIO, portraitFraming);
  const apiStart = performance.now();
  let raw = await generateImageViaApi([userImagePart, { text: prompt }]);
  if (portraitFraming === 'face') {
    try {
      const echo = await measureCaptureEcho(normalizedUserImage, raw);
      if (isLikelyCaptureEcho(echo)) {
        if (import.meta.env.DEV) {
          console.info(`[vto] studio echo (${echo.toFixed(3)}), retrying rewrite`);
        }
        raw = await generateImageViaApi([
          userImagePart,
          {
            text: buildModelImagePrompt(GEMINI_FRAME_ASPECT_RATIO, portraitFraming, {
              insistStudio: true,
            }),
          },
        ]);
      }
    } catch {
      // Compare is best-effort — keep the first image.
    }
  }
  const reframeStart = performance.now();
  const { dataUrl, profile } = await createFramingProfileFromDataUrl(
    raw,
    framingOptionsForPortrait(portraitFraming),
  );
  logPhaseTimings('model-image', {
    prep: apiStart - prepStart,
    api: reframeStart - apiStart,
    reframe: performance.now() - reframeStart,
  });
  return { imageUrl: dataUrl, profile };
};

export const generateVirtualTryOnImage = async (
  modelImageUrl: string,
  garmentImage: File,
  profile: FramingProfile,
  slot: ComposeSlot,
): Promise<string> => {
  const prepStart = performance.now();
  // Anti-ratchet: previous round's output is already frame-sized — no pre-send re-encode.
  const stabilizedModelImage = await applyFramingProfileToDataUrl(modelImageUrl, profile, {
    skipReencodeIfFrameSized: true,
  });
  // Transport-only downscale: display/session canvas keeps full resolution.
  // Face busts keep a bit more resolution so eyewear edges stay crisp.
  const portraitFraming = resolvePortraitFraming();
  const transportMax = portraitFraming === 'face' ? 1400 : undefined;
  const [modelImagePart, garmentImagePart] = await Promise.all([
    downscaleDataUrlForTransport(stabilizedModelImage, {
      maxDimension: transportMax,
      quality: portraitFraming === 'face' ? 0.9 : undefined,
    }).then(dataUrlToPart),
    getGarmentTransportPart(garmentImage),
  ]);
  const prompt = buildTryOnPrompt({
    slot,
    lockedFramingSuffix: buildLockedFramingPromptSuffix(profile),
    portraitFraming,
  });
  const apiStart = performance.now();
  const raw = await generateImageViaApi([modelImagePart, garmentImagePart, { text: prompt }]);
  const reframeStart = performance.now();
  const framed = await applyFramingProfileToDataUrl(raw, profile);
  logPhaseTimings(`try-on:${slot}`, {
    prep: apiStart - prepStart,
    api: reframeStart - apiStart,
    reframe: performance.now() - reframeStart,
  });
  return framed;
};

export interface SideYawImageOptions {
  signal?: AbortSignal;
}

/**
 * Slight left/right head yaw from a displayed studio portrait (usually already wearing glasses).
 * Does not delay the source image; caller should fire this in the background.
 * No landmark / yaw-sign gate — accept Gemini output and let the gallery upsert filter echoes.
 */
export const generateSideYawImage = async ({
  sourceImageUrl,
  yaw,
  profile,
  signal,
}: {
  sourceImageUrl: string;
  yaw: SideYaw;
  profile: FramingProfile;
} & SideYawImageOptions): Promise<string> => {
  const prepStart = performance.now();
  const portraitFraming = resolvePortraitFraming();
  const stabilized = await applyFramingProfileToDataUrl(sourceImageUrl, profile, {
    skipReencodeIfFrameSized: true,
  });
  const transportMax = portraitFraming === 'face' ? 1400 : undefined;
  const imagePart = dataUrlToPart(
    await downscaleDataUrlForTransport(stabilized, {
      maxDimension: transportMax,
      quality: portraitFraming === 'face' ? 0.9 : undefined,
    }),
  );
  const prompt = buildSideYawPrompt({
    yaw,
    lockedFramingSuffix: buildSideYawFramingPromptSuffix(profile),
    portraitFraming,
  });
  const apiStart = performance.now();
  const raw = await generateImageViaApi([imagePart, { text: prompt }], {
    signal,
    retryNetwork: false,
  });
  const reframeStart = performance.now();
  const framed = await applyFramingProfileToDataUrl(raw, profile);
  logPhaseTimings(`side-yaw:${yaw}`, {
    prep: apiStart - prepStart,
    api: reframeStart - apiStart,
    reframe: performance.now() - reframeStart,
  });
  return framed;
};

export interface EnvironmentVariantOptions {
  signal?: AbortSignal;
}

/**
 * On-location lifestyle re-photograph of a studio portrait that already wears glasses.
 * Single image + prompt — no garment catalog re-send. No client auto-retry.
 * Post-frame is full-bleed cover only (no bust lock crop); prompt uses lifestyle env framing suffix.
 */
export const generateEnvironmentVariantImage = async (
  studioImageUrl: string,
  environmentId: EnvironmentSceneId,
  profile: FramingProfile,
  options?: EnvironmentVariantOptions,
): Promise<string> => {
  const prepStart = performance.now();
  const stabilized = await applyFramingProfileToDataUrl(studioImageUrl, profile, {
    skipReencodeIfFrameSized: true,
  });
  const portraitFraming = resolvePortraitFraming();
  // Slightly richer transport for env-only: more edge detail helps on-location integration.
  const transportMax = portraitFraming === 'face' ? 1536 : undefined;
  const modelImagePart = dataUrlToPart(
    await downscaleDataUrlForTransport(stabilized, {
      maxDimension: transportMax,
      quality: portraitFraming === 'face' ? 0.92 : undefined,
    }),
  );
  const prompt = buildEnvironmentVariantPrompt({
    environmentId,
    // Lifestyle waist-up / 3/4 framing — never reuse the tight studio bust lock.
    lockedFramingSuffix: buildEnvironmentFramingPromptSuffix(profile),
    portraitFraming,
  });
  const apiStart = performance.now();
  const raw = await generateImageViaApi([modelImagePart, { text: prompt }], {
    signal: options?.signal,
    retryNetwork: false,
  });
  const reframeStart = performance.now();
  // Full-bleed cover into locked canvas — does not re-apply tight bust crop.
  const framed = await applyFramingProfileToDataUrl(raw, profile);
  logPhaseTimings(`environment:${environmentId}`, {
    prep: apiStart - prepStart,
    api: reframeStart - apiStart,
    reframe: performance.now() - reframeStart,
  });
  return framed;
};
