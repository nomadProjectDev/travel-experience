/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stable façade for Gemini/media services. Import from here to avoid churn when
 * implementation modules are split or reorganized.
 */

export type { FramingProfile, ModelImageResult, ComposeSlot } from './gemini-image.service';

export {
  generateModelImage,
  generateVirtualTryOnImage,
  generateEnvironmentVariantImage,
  generateSideYawImage,
} from './gemini-image.service';

export type { EnvironmentVariantOptions, SideYaw } from './gemini-image.service';

export { generateLoopVideoFromImage } from './gemini-video.service';

export { generateLocalLoopVideoFromImage } from './video-fallback.service';
