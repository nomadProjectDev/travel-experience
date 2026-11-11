/**
 * Video model selection for `/api/generate-video`.
 *
 * - **Omni Flash** (`gemini-omni-flash-preview`): Interactions API, 3–10s clips.
 *   Default on `feat/omni-flash-video` for latency spike.
 * - **Veo 3.1 Fast**: `models.generateVideos`, 4–8s, `allow_adult` for people I2V.
 *
 * Override with `GEMINI_VIDEO_MODEL`.
 */

export const DEFAULT_VIDEO_MODEL = 'gemini-omni-flash-preview';

export const VEO_FAST_VIDEO_MODEL = 'veo-3.1-fast-generate-preview';

export const VIDEO_PERSON_GENERATION = 'allow_adult' as const;

/** Veo minimum legal duration. */
export const VIDEO_DURATION_SECONDS = 4;

/** Omni accepts 3–10s; 3s is the fastest clip. */
export const OMNI_VIDEO_DURATION = '3s' as const;

export const VIDEO_RESOLUTION = '720p' as const;

export type VideoAspectRatio = '9:16' | '16:9';

export type GenerateVideosRequestConfig = {
  numberOfVideos: 1;
  durationSeconds: typeof VIDEO_DURATION_SECONDS;
  aspectRatio: VideoAspectRatio;
  resolution: typeof VIDEO_RESOLUTION;
  personGeneration: typeof VIDEO_PERSON_GENERATION;
  negativePrompt: string;
};

export function resolveVideoModel(
  env: { GEMINI_VIDEO_MODEL?: string } = process.env,
): string {
  return env.GEMINI_VIDEO_MODEL?.trim() || DEFAULT_VIDEO_MODEL;
}

export function isOmniVideoModel(model: string): boolean {
  return /omni/i.test(model);
}

/** Map the session still ratio onto Veo/Omni supported values. */
export function resolveVideoAspectRatio(imageAspect: string): VideoAspectRatio {
  return imageAspect === '16:9' ? '16:9' : '9:16';
}

export function buildGenerateVideosConfig(
  imageAspect = '3:4',
): GenerateVideosRequestConfig {
  return {
    numberOfVideos: 1,
    durationSeconds: VIDEO_DURATION_SECONDS,
    aspectRatio: resolveVideoAspectRatio(imageAspect),
    resolution: VIDEO_RESOLUTION,
    personGeneration: VIDEO_PERSON_GENERATION,
    negativePrompt:
      'cuts, jump cuts, zoom, dolly, pull back to full body, reframing, replacing glasses, different person, extra people, text overlay',
  };
}
