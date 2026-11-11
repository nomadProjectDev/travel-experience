import type { SafeFaceFitContext } from '@/core/face';

export interface FaceFitSessionState {
  token: number;
  context?: SafeFaceFitContext;
}

export const INITIAL_FACE_FIT_SESSION: FaceFitSessionState = { token: 0 };

/** Starts or resets a capture session and invalidates all earlier completions. */
export function startFaceFitSession(
  current: FaceFitSessionState,
): FaceFitSessionState {
  return { token: current.token + 1 };
}

/** Commits only a completion belonging to the currently active capture session. */
export function finalizeFaceFitSession(
  current: FaceFitSessionState,
  token: number,
  context?: SafeFaceFitContext,
): FaceFitSessionState {
  if (token !== current.token) return current;
  return context ? { token, context } : { token };
}
