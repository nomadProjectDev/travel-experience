export const CAMERA_ROTATION_STORAGE_KEY = 'web_try_on_camera_rotation_deg';
export const CAMERA_ROTATION_ANGLES = [0, 90, 180, 270] as const;

export type CameraRotationDeg = (typeof CAMERA_ROTATION_ANGLES)[number];

type RotationStorage = Pick<Storage, 'getItem' | 'setItem'>;

function isValidRightAngle(raw: unknown): boolean {
  if (raw === undefined || raw === null) return false;
  const cleaned =
    typeof raw === 'string' ? raw.trim().replace(/deg$/i, '').trim() : raw;
  if (cleaned === '') return false;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return false;
  const normalized = ((Math.round(value) % 360) + 360) % 360;
  return CAMERA_ROTATION_ANGLES.includes(normalized as CameraRotationDeg);
}

export function normalizeCameraRotationDeg(raw: unknown): CameraRotationDeg {
  if (!isValidRightAngle(raw)) return 0;
  const cleaned =
    typeof raw === 'string' ? raw.trim().replace(/deg$/i, '').trim() : raw;
  return (((Math.round(Number(cleaned)) % 360) + 360) %
    360) as CameraRotationDeg;
}

function defaultStorage(explicit?: RotationStorage | null): RotationStorage | null {
  if (explicit !== undefined) return explicit;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveCameraRotationDeg(
  raw: unknown,
  storage?: RotationStorage | null,
): CameraRotationDeg {
  const normalized = normalizeCameraRotationDeg(raw);
  try {
    defaultStorage(storage)?.setItem(
      CAMERA_ROTATION_STORAGE_KEY,
      String(normalized),
    );
  } catch {
    // Kiosk storage can be disabled; retain the in-memory selection.
  }
  return normalized;
}

export function nextCameraRotationDeg(raw: unknown): CameraRotationDeg {
  return ((normalizeCameraRotationDeg(raw) + 90) % 360) as CameraRotationDeg;
}

export function resolveCameraRotationDeg(options?: {
  search?: string;
  storage?: RotationStorage | null;
  envRotation?: unknown;
}): CameraRotationDeg {
  const storage = defaultStorage(options?.storage);
  const search =
    options?.search ??
    (typeof window === 'undefined' ? '' : window.location.search);

  if (search) {
    const params = new URLSearchParams(search);
    const queryRotation =
      params.get('cameraRotation') ?? params.get('camera_rotation');
    if (isValidRightAngle(queryRotation)) {
      return saveCameraRotationDeg(queryRotation, storage);
    }
  }

  try {
    const stored = storage?.getItem(CAMERA_ROTATION_STORAGE_KEY);
    if (isValidRightAngle(stored)) {
      return normalizeCameraRotationDeg(stored);
    }
  } catch {
    // Fall through to the deployment default.
  }

  return normalizeCameraRotationDeg(
    options?.envRotation ?? import.meta.env.VITE_CAMERA_ROTATION_DEG,
  );
}

export function isQuarterTurnRotation(raw: unknown): boolean {
  const rotation = normalizeCameraRotationDeg(raw);
  return rotation === 90 || rotation === 270;
}

/**
 * Display scale for a 1280×720 Decart frame after a 90°/270° contain map.
 *
 * Realtime output is always 16:9. A quarter-turn contain of a 16:9 camera
 * draws the full frame upright into a centered column of height 720 and
 * width 720²/1280 (405). Scale the landscape element by 1280/405 so that
 * column matches the pane width; the pane's overflow clips only the black
 * side padding. Do not use object-fit:cover on the raw 16:9 frame — that
 * zoomed into the face. 0°/180° stay contain and keep the landscape bars.
 */
export function decartRemoteFrameScale(
  frameWidth = 1280,
  frameHeight = 720,
): number {
  const contentWidth = (frameHeight * frameHeight) / frameWidth;
  return frameWidth / contentWidth;
}

export type CameraContainPlan = {
  rotationDeg: CameraRotationDeg;
  radians: number;
  drawWidth: number;
  drawHeight: number;
};

export function computeCameraContainPlan(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  rotationDeg: unknown,
): CameraContainPlan | null {
  if (
    ![sourceWidth, sourceHeight, targetWidth, targetHeight].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  ) {
    return null;
  }

  const normalized = normalizeCameraRotationDeg(rotationDeg);
  const quarterTurn = isQuarterTurnRotation(normalized);
  const rotatedWidth = quarterTurn ? sourceHeight : sourceWidth;
  const rotatedHeight = quarterTurn ? sourceWidth : sourceHeight;
  const scale = Math.min(
    targetWidth / rotatedWidth,
    targetHeight / rotatedHeight,
  );

  return {
    rotationDeg: normalized,
    radians: (normalized * Math.PI) / 180,
    drawWidth: sourceWidth * scale,
    drawHeight: sourceHeight * scale,
  };
}

export function drawContainedCameraFrame(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  rotationDeg: unknown,
): CameraContainPlan | null {
  const plan = computeCameraContainPlan(
    sourceWidth,
    sourceHeight,
    canvas.width,
    canvas.height,
    rotationDeg,
  );
  if (!plan) return null;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(plan.radians);
  context.drawImage(
    source,
    -plan.drawWidth / 2,
    -plan.drawHeight / 2,
    plan.drawWidth,
    plan.drawHeight,
  );
  context.setTransform(1, 0, 0, 1, 0, 0);
  return plan;
}
