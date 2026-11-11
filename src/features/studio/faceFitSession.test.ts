import { describe, expect, it } from 'vitest';
import type { SafeFaceFitContext } from '@/core/face';
import {
  INITIAL_FACE_FIT_SESSION,
  finalizeFaceFitSession,
  startFaceFitSession,
} from './faceFitSession';

const context: SafeFaceFitContext = {
  schemaVersion: 2,
  status: 'valid',
  ipdToFaceWidth: 0.37,
  outerCanthiToFaceWidth: 0.61,
};

describe('face-fit studio session state', () => {
  it('propagates the current safe context and clears it on reset', () => {
    const started = startFaceFitSession(INITIAL_FACE_FIT_SESSION);
    const finalized = finalizeFaceFitSession(started, started.token, context);
    expect(finalized.context).toEqual(context);

    const reset = startFaceFitSession(finalized);
    expect(reset).toEqual({ token: started.token + 1 });
    expect(reset.context).toBeUndefined();
  });

  it('does not let a stale capture completion overwrite the current session', () => {
    const first = startFaceFitSession(INITIAL_FACE_FIT_SESSION);
    const current = startFaceFitSession(first);
    expect(finalizeFaceFitSession(current, first.token, context)).toBe(current);
    expect(current.context).toBeUndefined();
  });

  it('keeps current behavior when accepted analysis is unavailable', () => {
    const started = startFaceFitSession(INITIAL_FACE_FIT_SESSION);
    expect(finalizeFaceFitSession(started, started.token)).toEqual({
      token: started.token,
    });
  });
});
