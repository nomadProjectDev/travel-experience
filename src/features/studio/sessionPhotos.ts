/**
 * Session-generated portraits / clips shown in the eyewear dock galleries.
 * Discriminated by `status` so loading thumbs cannot be treated as displayable.
 */

export type SessionPhotoKind =
  | 'front'
  | 'yaw-left'
  | 'yaw-right'
  | 'look'
  | 'environment'
  | 'video';

type SessionPhotoBase = {
  readonly id: string;
  readonly kind: SessionPhotoKind;
};

export type SessionPhoto =
  | (SessionPhotoBase & { readonly status: 'loading' })
  | (SessionPhotoBase & {
      readonly status: 'ready';
      /** Still / poster shown in the thumb. */
      readonly imageUrl: string;
      /** Present for `kind: 'video'` — blob or data URL for the well. */
      readonly videoUrl?: string;
    });

export type ReadySessionPhoto = Extract<SessionPhoto, { status: 'ready' }>;

export const isStillGalleryPhoto = (photo: SessionPhoto): boolean =>
  photo.kind !== 'video';

export const isVideoGalleryPhoto = (photo: SessionPhoto): boolean =>
  photo.kind === 'video';

export const isYawPhoto = (photo: SessionPhoto): boolean =>
  photo.kind === 'yaw-left' || photo.kind === 'yaw-right';

export const dropLoadingPhotos = (photos: readonly SessionPhoto[]): SessionPhoto[] =>
  photos.filter((photo) => photo.status !== 'loading');

/**
 * Drop in-flight left/right yaw placeholders only.
 * Ready side stills from prior looks stay in the gallery — a new pair must not wipe history.
 */
export const dropLoadingYawPhotos = (photos: readonly SessionPhoto[]): SessionPhoto[] =>
  photos.filter((photo) => !(isYawPhoto(photo) && photo.status === 'loading'));

export type UpsertReadyPhotoResult = {
  readonly photos: SessionPhoto[];
  /** False when the still matched an existing imageUrl (rejected — no sibling copy). */
  readonly accepted: boolean;
};

/**
 * Insert or promote a ready photo. Still gallery entries must keep distinct imageUrls:
 * a yaw that echoes the front (or its sibling) is rejected and its slot removed —
 * never leave a spinner and never display the other side's blob under this id.
 */
export const upsertReadyPhotoResult = (
  photos: readonly SessionPhoto[],
  next: ReadySessionPhoto,
): UpsertReadyPhotoResult => {
  const duplicate = photos.find(
    (photo) =>
      photo.status === 'ready' &&
      photo.kind !== 'video' &&
      next.kind !== 'video' &&
      photo.imageUrl === next.imageUrl,
  );
  if (duplicate) {
    return {
      photos: photos.filter((photo) => photo.id !== next.id),
      accepted: false,
    };
  }

  // One ready video slot per poster still.
  if (next.kind === 'video') {
    const byPoster = photos.findIndex(
      (photo) =>
        photo.kind === 'video' &&
        ((photo.status === 'ready' && photo.imageUrl === next.imageUrl) ||
          photo.status === 'loading'),
    );
    if (byPoster >= 0) {
      const copy = [...photos];
      copy[byPoster] = next;
      return { photos: copy, accepted: true };
    }
  }

  const byId = photos.findIndex((photo) => photo.id === next.id);
  if (byId >= 0) {
    const copy = [...photos];
    copy[byId] = next;
    return { photos: copy, accepted: true };
  }
  return { photos: [...photos, next], accepted: true };
};

export const upsertReadyPhoto = (
  photos: readonly SessionPhoto[],
  next: ReadySessionPhoto,
): SessionPhoto[] => upsertReadyPhotoResult(photos, next).photos;

export const removePhotoById = (
  photos: readonly SessionPhoto[],
  id: string,
): SessionPhoto[] => photos.filter((photo) => photo.id !== id);

export const findReadyPhoto = (
  photos: readonly SessionPhoto[],
  id: string,
): ReadySessionPhoto | null => {
  const photo = photos.find((entry) => entry.id === id);
  if (!photo || photo.status !== 'ready') return null;
  return photo;
};

/** Stable id for the video gallery slot tied to a primary still. */
export const videoPhotoIdForSource = (sourceUrl: string): string =>
  `video-${sourceUrl.slice(0, 48)}`;
