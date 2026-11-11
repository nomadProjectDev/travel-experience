/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getManifest } from '@config';
import { generateVideoViaApi } from './gemini-client';
import { base64ToBlob } from './media-codec';
import { buildLoopVideoPrompt } from './gemini-video.prompts';

export const generateLoopVideoFromImage = async (modelImageUrl: string): Promise<string> => {
  const faceFraming = getManifest().features.portraitFraming === 'face';
  const prompt = buildLoopVideoPrompt({ faceFraming });
  const { mimeType, data } = await generateVideoViaApi(modelImageUrl, prompt);
  return URL.createObjectURL(base64ToBlob(data, mimeType));
};
