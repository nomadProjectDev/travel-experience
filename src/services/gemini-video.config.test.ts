import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIDEO_MODEL,
  OMNI_VIDEO_DURATION,
  VEO_FAST_VIDEO_MODEL,
  VIDEO_PERSON_GENERATION,
  buildGenerateVideosConfig,
  isOmniVideoModel,
  resolveVideoAspectRatio,
  resolveVideoModel,
} from './gemini-video.config';

describe('gemini-video.config', () => {
  it('defaults to Omni Flash preview for the latency spike branch', () => {
    expect(DEFAULT_VIDEO_MODEL).toBe('gemini-omni-flash-preview');
    expect(resolveVideoModel({})).toBe('gemini-omni-flash-preview');
    expect(isOmniVideoModel(DEFAULT_VIDEO_MODEL)).toBe(true);
  });

  it('lets GEMINI_VIDEO_MODEL override the default', () => {
    expect(resolveVideoModel({ GEMINI_VIDEO_MODEL: VEO_FAST_VIDEO_MODEL })).toBe(
      VEO_FAST_VIDEO_MODEL,
    );
    expect(isOmniVideoModel(VEO_FAST_VIDEO_MODEL)).toBe(false);
  });

  it('ignores blank GEMINI_VIDEO_MODEL', () => {
    expect(resolveVideoModel({ GEMINI_VIDEO_MODEL: '  ' })).toBe(DEFAULT_VIDEO_MODEL);
  });

  it('keeps Veo Fast config shape for allow_adult people shots', () => {
    const config = buildGenerateVideosConfig('3:4');
    expect(VIDEO_PERSON_GENERATION).toBe('allow_adult');
    expect(config.personGeneration).toBe('allow_adult');
    expect(config.durationSeconds).toBe(4);
    expect(config.resolution).toBe('720p');
    expect(config.numberOfVideos).toBe(1);
    expect(OMNI_VIDEO_DURATION).toBe('3s');
  });

  it('maps portrait session ratios to 9:16 because Veo/Omni have no 3:4', () => {
    expect(resolveVideoAspectRatio('3:4')).toBe('9:16');
    expect(resolveVideoAspectRatio('9:16')).toBe('9:16');
    expect(resolveVideoAspectRatio('2:3')).toBe('9:16');
    expect(resolveVideoAspectRatio('16:9')).toBe('16:9');
    expect(buildGenerateVideosConfig('3:4').aspectRatio).toBe('9:16');
  });
});
