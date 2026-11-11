/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure helpers for eyewear environment-scene cache + request identity.
 */

import type { EnvironmentId, EnvironmentSceneId } from '@config/types';

export type { EnvironmentId, EnvironmentSceneId };

export type EnvironmentRequestState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string };

export type EnvironmentChip = {
  id: EnvironmentId;
  label: string;
};

export const ENVIRONMENT_SCENE_IDS = [
  'beach',
  'mountain',
  'city',
  'sunset-cafe',
] as const satisfies ReadonlyArray<EnvironmentSceneId>;

export const isGeneratedEnvironmentId = (
  id: EnvironmentId,
): id is EnvironmentSceneId => id !== 'studio';

export const buildEnvironmentCacheKey = (
  frameId: string,
  environmentId: EnvironmentSceneId,
): string => `${frameId}:${environmentId}`;

export const isStaleEnvironmentRequest = (
  currentToken: number,
  requestToken: number,
): boolean => currentToken !== requestToken;

/** In-memory LRU cache for environment variants (session only). */
export class EnvironmentVariantCache {
  private readonly maxSize: number;
  private readonly map = new Map<string, string>();

  constructor(maxSize = 8) {
    this.maxSize = maxSize;
  }

  get size(): number {
    return this.map.size;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  get(key: string): string | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: string): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  clear(): void {
    this.map.clear();
  }
}

export const formatEnvironmentCreatingMessage = (
  template: string,
  environmentLabel: string,
): string =>
  template.includes('{environment}')
    ? template.replace('{environment}', environmentLabel)
    : `${template} ${environmentLabel}`;
