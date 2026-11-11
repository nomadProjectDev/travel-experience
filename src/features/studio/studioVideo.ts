/**
 * Studio Veo loop: one in-flight job, one auto-prefetch per frame primary still,
 * and the well only plays a loop that matches the still on screen.
 */

export function canStartLoopVideoJob(input: {
  sourceUrl: string | null | undefined;
  inFlight: boolean;
}): boolean {
  return Boolean(input.sourceUrl) && !input.inFlight;
}

/** First studio still for a frame wins; later looks of the same frame are ignored. */
export function registerFramePrimaryStill(
  primaryByFrame: Readonly<Record<string, string>>,
  frameId: string,
  imageUrl: string,
): { next: Record<string, string>; registered: boolean } {
  if (!frameId || !imageUrl || primaryByFrame[frameId]) {
    return { next: { ...primaryByFrame }, registered: false };
  }
  return {
    next: { ...primaryByFrame, [frameId]: imageUrl },
    registered: true,
  };
}

/** Crear vídeo / prefetch only for a frame’s first generated studio still. */
export function isEligibleLoopStill(
  displayImageUrl: string | null | undefined,
  primaryByFrame: Readonly<Record<string, string>>,
): displayImageUrl is string {
  if (!displayImageUrl) return false;
  return Object.values(primaryByFrame).includes(displayImageUrl);
}

export function shouldPrefetchLoopVideo(input: {
  videoLoopEnabled: boolean;
  sourceUrl: string | null | undefined;
  alreadyPrefetched: boolean;
  inFlight: boolean;
}): boolean {
  return (
    input.videoLoopEnabled &&
    !input.alreadyPrefetched &&
    canStartLoopVideoJob({
      sourceUrl: input.sourceUrl,
      inFlight: input.inFlight,
    })
  );
}

/** Overlay the loop only when the user picked a video gallery item. */
export function resolveWellVideoUrl(input: {
  loopsBySourceUrl: Readonly<Record<string, string>>;
  displayImageUrl: string | null;
  /** When false, keep the still in the well even if a loop exists for it. */
  playLoopInWell?: boolean;
}): string | null {
  if (!input.playLoopInWell || !input.displayImageUrl) return null;
  return input.loopsBySourceUrl[input.displayImageUrl] ?? null;
}
