/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side Gemini entry — routes all model calls through the Express backend.
 */

export { generateImageViaApi, generateVideoViaApi } from './gemini-api';
export type { GenerateContentPart } from './gemini-api';
