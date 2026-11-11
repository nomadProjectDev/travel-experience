import type { PlatformTheme } from '@config/types';

/** App-wide theme fallback. */
export const APP_THEME = 'lifestyle-sport' as const;

/** Legacy landing dark skin (kept for dark.css token overrides if needed). */
export const LANDING_THEME = 'dark' as const;

export type AppTheme = typeof APP_THEME;
export type LandingTheme = typeof LANDING_THEME;

const LEGACY_THEME_STORAGE_KEY = 'vf-theme';

/** Sets document root theme skin from client manifest. */
export function initAppTheme(theme: PlatformTheme = APP_THEME): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}
