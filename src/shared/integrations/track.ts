/** Product-facing analytics facade — no-op until an adapter is wired. */
export type TrackPayload = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(_eventName: string, _payload?: TrackPayload): void {
  /* intentional no-op for the web demo */
}
