import { describe, expect, it } from 'vitest';
import {
  canStartLoopVideoJob,
  isEligibleLoopStill,
  registerFramePrimaryStill,
  resolveWellVideoUrl,
  shouldPrefetchLoopVideo,
} from './studioVideo';

describe('studioVideo', () => {
  it('does not start a job without a still or while another job is in flight', () => {
    expect(canStartLoopVideoJob({ sourceUrl: null, inFlight: false })).toBe(false);
    expect(canStartLoopVideoJob({ sourceUrl: 'data:still', inFlight: true })).toBe(
      false,
    );
    expect(canStartLoopVideoJob({ sourceUrl: 'data:still', inFlight: false })).toBe(
      true,
    );
  });

  it('registers only the first still per frame', () => {
    const first = registerFramePrimaryStill({}, 'rayban', 'data:rayban-front');
    expect(first.registered).toBe(true);
    expect(first.next).toEqual({ rayban: 'data:rayban-front' });

    const again = registerFramePrimaryStill(first.next, 'rayban', 'data:rayban-later');
    expect(again.registered).toBe(false);
    expect(again.next).toEqual({ rayban: 'data:rayban-front' });

    const other = registerFramePrimaryStill(first.next, 'chanel', 'data:chanel-front');
    expect(other.registered).toBe(true);
    expect(other.next).toEqual({
      rayban: 'data:rayban-front',
      chanel: 'data:chanel-front',
    });
  });

  it('offers video only on registered primary stills, not yaws or scenes', () => {
    const primaryByFrame = {
      rayban: 'data:rayban-front',
      chanel: 'data:chanel-front',
    };
    expect(isEligibleLoopStill('data:rayban-front', primaryByFrame)).toBe(true);
    expect(isEligibleLoopStill('data:chanel-front', primaryByFrame)).toBe(true);
    expect(isEligibleLoopStill('data:rayban-yaw', primaryByFrame)).toBe(false);
    expect(isEligibleLoopStill('data:env-beach', primaryByFrame)).toBe(false);
    expect(isEligibleLoopStill(null, primaryByFrame)).toBe(false);
  });

  it('auto-starts once per primary still, not once per session', () => {
    expect(
      shouldPrefetchLoopVideo({
        videoLoopEnabled: true,
        sourceUrl: 'data:frame-a',
        alreadyPrefetched: false,
        inFlight: false,
      }),
    ).toBe(true);
    expect(
      shouldPrefetchLoopVideo({
        videoLoopEnabled: true,
        sourceUrl: 'data:frame-b',
        alreadyPrefetched: false,
        inFlight: false,
      }),
    ).toBe(true);
    expect(
      shouldPrefetchLoopVideo({
        videoLoopEnabled: true,
        sourceUrl: 'data:frame-a',
        alreadyPrefetched: true,
        inFlight: false,
      }),
    ).toBe(false);
    expect(
      shouldPrefetchLoopVideo({
        videoLoopEnabled: false,
        sourceUrl: 'data:frame-a',
        alreadyPrefetched: false,
        inFlight: false,
      }),
    ).toBe(false);
  });

  it('keeps the loop in the well only when it matches the displayed still', () => {
    const loopsBySourceUrl = {
      'data:look-a': 'blob:loop-a',
      'data:look-b': 'blob:loop-b',
    };
    expect(
      resolveWellVideoUrl({
        loopsBySourceUrl,
        displayImageUrl: 'data:look-a',
        playLoopInWell: true,
      }),
    ).toBe('blob:loop-a');
    expect(
      resolveWellVideoUrl({
        loopsBySourceUrl,
        displayImageUrl: 'data:look-a',
        playLoopInWell: false,
      }),
    ).toBeNull();
    expect(
      resolveWellVideoUrl({
        loopsBySourceUrl,
        displayImageUrl: 'data:look-b',
        playLoopInWell: true,
      }),
    ).toBe('blob:loop-b');
    expect(
      resolveWellVideoUrl({
        loopsBySourceUrl,
        displayImageUrl: 'data:yaw-left',
        playLoopInWell: true,
      }),
    ).toBeNull();
  });
});
