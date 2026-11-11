import { describe, expect, it } from 'vitest';
import {
  dropLoadingPhotos,
  dropLoadingYawPhotos,
  findReadyPhoto,
  isStillGalleryPhoto,
  isVideoGalleryPhoto,
  removePhotoById,
  upsertReadyPhoto,
  upsertReadyPhotoResult,
  type SessionPhoto,
} from './sessionPhotos';

const front: SessionPhoto = {
  id: 'front-1',
  kind: 'front',
  status: 'ready',
  imageUrl: 'data:front',
};

const yawLoading: SessionPhoto = {
  id: 'yaw-left-2',
  kind: 'yaw-left',
  status: 'loading',
};

const priorYawLeft: SessionPhoto = {
  id: 'yaw-left-1',
  kind: 'yaw-left',
  status: 'ready',
  imageUrl: 'data:prior-left',
};

const priorYawRight: SessionPhoto = {
  id: 'yaw-right-1',
  kind: 'yaw-right',
  status: 'ready',
  imageUrl: 'data:prior-right',
};

describe('sessionPhotos', () => {
  it('drops in-flight placeholders without touching ready shots', () => {
    expect(dropLoadingPhotos([front, yawLoading])).toEqual([front]);
  });

  it('drops only loading yaw slots so prior looks keep their side stills', () => {
    const yawReady: SessionPhoto = {
      id: 'yaw-right-3',
      kind: 'yaw-right',
      status: 'ready',
      imageUrl: 'data:right',
    };
    expect(dropLoadingYawPhotos([front, priorYawLeft, yawLoading, yawReady])).toEqual([
      front,
      priorYawLeft,
      yawReady,
    ]);
  });

  it('lets a new yaw pair start without wiping historical side stills', () => {
    const leftLoading: SessionPhoto = {
      id: 'yaw-left-9',
      kind: 'yaw-left',
      status: 'loading',
    };
    const rightLoading: SessionPhoto = {
      id: 'yaw-right-10',
      kind: 'yaw-right',
      status: 'loading',
    };
    const next = [
      ...dropLoadingYawPhotos([front, priorYawLeft, priorYawRight, yawLoading]),
      leftLoading,
      rightLoading,
    ];
    expect(next).toEqual([
      front,
      priorYawLeft,
      priorYawRight,
      leftLoading,
      rightLoading,
    ]);
  });

  it('restores a cached yaw pair without deleting other looks’ yaws', () => {
    let next = dropLoadingYawPhotos([front, priorYawLeft, priorYawRight, yawLoading]);
    next = upsertReadyPhoto(next, {
      id: 'yaw-left-20',
      kind: 'yaw-left',
      status: 'ready',
      imageUrl: 'data:cached-left',
    });
    next = upsertReadyPhoto(next, {
      id: 'yaw-right-21',
      kind: 'yaw-right',
      status: 'ready',
      imageUrl: 'data:cached-right',
    });
    expect(next).toEqual([
      front,
      priorYawLeft,
      priorYawRight,
      {
        id: 'yaw-left-20',
        kind: 'yaw-left',
        status: 'ready',
        imageUrl: 'data:cached-left',
      },
      {
        id: 'yaw-right-21',
        kind: 'yaw-right',
        status: 'ready',
        imageUrl: 'data:cached-right',
      },
    ]);
  });

  it('skips re-adding a cached yaw that is already in the gallery', () => {
    let next = dropLoadingYawPhotos([front, priorYawLeft, priorYawRight]);
    next = upsertReadyPhoto(next, {
      id: 'yaw-left-30',
      kind: 'yaw-left',
      status: 'ready',
      imageUrl: 'data:prior-left',
    });
    next = upsertReadyPhoto(next, {
      id: 'yaw-right-31',
      kind: 'yaw-right',
      status: 'ready',
      imageUrl: 'data:prior-right',
    });
    expect(next).toEqual([front, priorYawLeft, priorYawRight]);
  });

  it('does not duplicate the same generated imageUrl for stills', () => {
    const again: SessionPhoto = {
      id: 'look-9',
      kind: 'look',
      status: 'ready',
      imageUrl: 'data:front',
    };
    expect(upsertReadyPhoto([front], again)).toEqual([front]);
  });

  it('rejects a yaw that echoes an existing still and removes its loading slot', () => {
    const leftReady: SessionPhoto = {
      id: 'yaw-left-2',
      kind: 'yaw-left',
      status: 'ready',
      imageUrl: 'data:left',
    };
    const rightLoading: SessionPhoto = {
      id: 'yaw-right-3',
      kind: 'yaw-right',
      status: 'loading',
    };
    const result = upsertReadyPhotoResult([front, leftReady, rightLoading], {
      id: 'yaw-right-3',
      kind: 'yaw-right',
      status: 'ready',
      imageUrl: 'data:left',
    });
    expect(result.accepted).toBe(false);
    expect(result.photos).toEqual([front, leftReady]);
  });

  it('rejects a yaw that echoes the frontal still', () => {
    const result = upsertReadyPhotoResult([front, yawLoading], {
      id: 'yaw-left-2',
      kind: 'yaw-left',
      status: 'ready',
      imageUrl: 'data:front',
    });
    expect(result.accepted).toBe(false);
    expect(result.photos).toEqual([front]);
  });

  it('promotes a loading slot to ready by id', () => {
    const ready: SessionPhoto = {
      id: 'yaw-left-2',
      kind: 'yaw-left',
      status: 'ready',
      imageUrl: 'data:left',
    };
    expect(upsertReadyPhoto([front, yawLoading], ready)).toEqual([front, ready]);
  });

  it('finds only ready photos for canvas display', () => {
    expect(findReadyPhoto([front, yawLoading], 'yaw-left-2')).toBeNull();
    expect(findReadyPhoto([front], 'front-1')).toEqual(front);
  });

  it('removes a failed in-flight slot', () => {
    expect(removePhotoById([front, yawLoading], 'yaw-left-2')).toEqual([front]);
  });

  it('keeps video clips in a separate gallery bucket', () => {
    const videoLoading: SessionPhoto = {
      id: 'video-1',
      kind: 'video',
      status: 'loading',
    };
    const videoReady: SessionPhoto = {
      id: 'video-1',
      kind: 'video',
      status: 'ready',
      imageUrl: 'data:front',
      videoUrl: 'blob:loop',
    };
    const withVideo = upsertReadyPhoto([front, videoLoading], videoReady);
    expect(withVideo.filter(isStillGalleryPhoto)).toEqual([front]);
    expect(withVideo.filter(isVideoGalleryPhoto)).toEqual([videoReady]);
  });
});
