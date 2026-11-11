import type { PlatformManifest } from '../config/types';

type IntegrationDispose = () => void;

const disposers: IntegrationDispose[] = [];
let initPromise: Promise<void> | null = null;

/**
 * Boot optional integrations declared on the active client manifest.
 * Eyewear web demo currently ships no adapters — registry stays for future slots (QR, etc.).
 */
export async function initAllIntegrations(_manifest: PlatformManifest): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = Promise.resolve();
  return initPromise;
}

/** Tear down integrations (tests, HMR). */
export function disposeAllIntegrations(): void {
  while (disposers.length > 0) {
    const dispose = disposers.pop();
    dispose?.();
  }
  initPromise = null;
}
