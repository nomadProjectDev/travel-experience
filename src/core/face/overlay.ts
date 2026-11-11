/**
 * Pure canvas helpers for a live face-scan overlay (clear red wireframe).
 * Landmark coordinates are MediaPipe-normalized (0–1) in video frame space.
 */

import {
  EYE_SCAN_CONNECTIONS,
  FACE_OVAL_CONNECTIONS,
  IRIS_RING_CONNECTIONS,
  LM_NOSE_BRIDGE_MID,
  LM_NOSE_BRIDGE_TOP,
  LM_SUBJECT_LEFT_IRIS,
  LM_SUBJECT_LEFT_OUTER_CANTHUS,
  LM_SUBJECT_RIGHT_IRIS,
  LM_SUBJECT_RIGHT_OUTER_CANTHUS,
} from './landmarks';
import type { FaceFitAnalysisOutcome, FaceLandmark } from './types';

export interface LandmarkCanvasMapOptions {
  canvasWidth: number;
  canvasHeight: number;
  videoWidth: number;
  videoHeight: number;
  /**
   * When true, flip X in canvas space (use when the preview is CSS-mirrored
   * but this canvas is not, or the reverse relative to landmark space).
   */
  mirrored?: boolean;
}

export interface CanvasPoint {
  x: number;
  y: number;
}

/** A current single-face detection is drawable even before quality/stability passes. */
export function hasCurrentSingleFaceLandmarks(
  outcome: Extract<FaceFitAnalysisOutcome, { ok: true }>,
): boolean {
  return outcome.result.quality.faceCount === 1 && outcome.landmarks.length > 0;
}

/**
 * Map a normalized landmark into canvas pixels under `object-fit: cover`.
 */
export function landmarkToCanvasPoint(
  lm: Pick<FaceLandmark, 'x' | 'y'>,
  options: LandmarkCanvasMapOptions,
): CanvasPoint {
  const {
    canvasWidth,
    canvasHeight,
    videoWidth,
    videoHeight,
    mirrored = false,
  } = options;

  if (canvasWidth <= 0 || canvasHeight <= 0 || videoWidth <= 0 || videoHeight <= 0) {
    return { x: 0, y: 0 };
  }

  const scale = Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight);
  const drawnW = videoWidth * scale;
  const drawnH = videoHeight * scale;
  const offsetX = (canvasWidth - drawnW) / 2;
  const offsetY = (canvasHeight - drawnH) / 2;
  const nx = mirrored ? 1 - lm.x : lm.x;

  return {
    x: offsetX + nx * drawnW,
    y: offsetY + lm.y * drawnH,
  };
}

/** Default stroke/fill for live scan — high-visibility red. */
export const FACE_FIT_OVERLAY_WIRE = 'rgba(255, 36, 36, 0.95)';
export const FACE_FIT_OVERLAY_ACCENT = 'rgba(255, 55, 55, 1)';

export interface DrawFaceScanOverlayOptions extends LandmarkCanvasMapOptions {
  /** Stroke alpha 0–1. Default ~0.85 so red reads clearly on camera. */
  opacity?: number;
  /** Accent color for irises / bridge. */
  accent?: string;
  /** Wire color for oval / eyes. */
  wire?: string;
}

function strokeConnections(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceLandmark[],
  connections: ReadonlyArray<readonly [number, number]>,
  map: LandmarkCanvasMapOptions,
): void {
  ctx.beginPath();
  for (const [aIdx, bIdx] of connections) {
    const a = landmarks[aIdx];
    const b = landmarks[bIdx];
    if (!a || !b) continue;
    const pa = landmarkToCanvasPoint(a, map);
    const pb = landmarkToCanvasPoint(b, map);
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
  }
  ctx.stroke();
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceLandmark[],
  index: number,
  map: LandmarkCanvasMapOptions,
  radius: number,
): void {
  const lm = landmarks[index];
  if (!lm) return;
  const p = landmarkToCanvasPoint(lm, map);
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a light scanning wireframe: face oval, eye contours, iris points, nose bridge.
 * Clears the canvas first. No-op when landmarks are empty.
 */
export function drawFaceScanOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceLandmark[],
  options: DrawFaceScanOverlayOptions,
): void {
  const {
    canvasWidth,
    canvasHeight,
    opacity = 0.85,
    accent = FACE_FIT_OVERLAY_ACCENT,
    wire = FACE_FIT_OVERLAY_WIRE,
    ...mapRest
  } = options;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (landmarks.length === 0 || canvasWidth <= 0 || canvasHeight <= 0) return;

  const map: LandmarkCanvasMapOptions = {
    canvasWidth,
    canvasHeight,
    ...mapRest,
  };

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = wire;
  ctx.lineWidth = 1.6;
  strokeConnections(ctx, landmarks, FACE_OVAL_CONNECTIONS, map);

  ctx.lineWidth = 1.35;
  ctx.globalAlpha = opacity * 0.9;
  strokeConnections(ctx, landmarks, EYE_SCAN_CONNECTIONS, map);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.45;
  ctx.globalAlpha = opacity;
  strokeConnections(ctx, landmarks, IRIS_RING_CONNECTIONS, map);

  // Nose bridge
  const bridgeTop = landmarks[LM_NOSE_BRIDGE_TOP];
  const bridgeMid = landmarks[LM_NOSE_BRIDGE_MID];
  if (bridgeTop && bridgeMid) {
    const a = landmarkToCanvasPoint(bridgeTop, map);
    const b = landmarkToCanvasPoint(bridgeMid, map);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.fillStyle = accent;
  drawDot(ctx, landmarks, LM_SUBJECT_LEFT_IRIS, map, 2.8);
  drawDot(ctx, landmarks, LM_SUBJECT_RIGHT_IRIS, map, 2.8);
  drawDot(ctx, landmarks, LM_SUBJECT_LEFT_OUTER_CANTHUS, map, 2);
  drawDot(ctx, landmarks, LM_SUBJECT_RIGHT_OUTER_CANTHUS, map, 2);
  drawDot(ctx, landmarks, LM_NOSE_BRIDGE_TOP, map, 1.8);

  ctx.restore();
}

/** Clear the overlay canvas. */
export function clearFaceScanOverlay(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}

/** Soft frontal coaching when absolute yaw exceeds this (degrees). */
export const FACE_FIT_YAW_HINT_DEG = 18;
