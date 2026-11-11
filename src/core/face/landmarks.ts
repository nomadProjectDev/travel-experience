/**
 * MediaPipe Face Mesh landmark indices used for optical-style metrics.
 * Requires Face Landmarker with iris refinement (≥ 478 landmarks).
 *
 * @see https://developers.google.com/mediapipe/solutions/vision/face_landmarker
 */

/**
 * Subject-anatomical laterality. Preview mirroring must never change these.
 *
 * MediaPipe's public topology names the 33 contour RIGHT_EYE and the 263
 * contour LEFT_EYE. The Tasks graph appends iris 468–472 to the 33 contour and
 * 473–477 to the 263 contour. Its internal crop arrays use image-oriented
 * `kLeft*` / `kRight*` names, so those internal labels are not anatomical.
 *
 * Sources:
 * - Face Landmarker topology:
 *   https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/python/vision/face_landmarker.py
 * - Iris append mapping:
 *   https://github.com/google-ai-edge/mediapipe/blob/e14840d7/mediapipe/tasks/cc/vision/face_landmarker/tensors_to_face_landmarks_graph.cc
 */
export const LM_SUBJECT_RIGHT_IRIS = 468;
export const LM_SUBJECT_LEFT_IRIS = 473;
export const LM_SUBJECT_RIGHT_OUTER_CANTHUS = 33;
export const LM_SUBJECT_LEFT_OUTER_CANTHUS = 263;

/**
 * Nose-bridge proxies along the midline.
 * 168 ≈ mid-glabella / root; 6 ≈ upper nasal dorsum.
 */
export const LM_NOSE_BRIDGE_TOP = 168;
export const LM_NOSE_BRIDGE_MID = 6;

/** Subject-right cheek / bizygomatic proxy. */
export const LM_SUBJECT_RIGHT_FACE = 234;
/** Subject-left cheek / bizygomatic proxy. */
export const LM_SUBJECT_LEFT_FACE = 454;

/** Minimum landmark count when iris landmarks are present. */
export const FACE_LANDMARK_COUNT_WITH_IRIS = 478;

/** Face oval polyline connections (MediaPipe `FACE_LANDMARKS_FACE_OVAL`). */
export const FACE_OVAL_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [10, 338],
  [338, 297],
  [297, 332],
  [332, 284],
  [284, 251],
  [251, 389],
  [389, 356],
  [356, 454],
  [454, 323],
  [323, 361],
  [361, 288],
  [288, 397],
  [397, 365],
  [365, 379],
  [379, 378],
  [378, 400],
  [400, 377],
  [377, 152],
  [152, 148],
  [148, 176],
  [176, 149],
  [149, 150],
  [150, 136],
  [136, 172],
  [172, 58],
  [58, 132],
  [132, 93],
  [93, 234],
  [234, 127],
  [127, 162],
  [162, 21],
  [21, 54],
  [54, 103],
  [103, 67],
  [67, 109],
  [109, 10],
];

/**
 * Sparse eye-corner / lid segments for a light scan wireframe
 * (subset of MediaPipe left/right eye contours).
 */
export const EYE_SCAN_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // Subject-right eye (image-left when unmirrored)
  [33, 7],
  [7, 163],
  [163, 144],
  [144, 145],
  [145, 153],
  [153, 154],
  [154, 155],
  [155, 133],
  [33, 246],
  [246, 161],
  [161, 160],
  [160, 159],
  [159, 158],
  [158, 157],
  [157, 173],
  [173, 133],
  // Subject-left eye
  [263, 249],
  [249, 390],
  [390, 373],
  [373, 374],
  [374, 380],
  [380, 381],
  [381, 382],
  [382, 362],
  [263, 466],
  [466, 388],
  [388, 387],
  [387, 386],
  [386, 385],
  [385, 384],
  [384, 398],
  [398, 362],
];

/** Iris ring polylines (centers drawn separately). */
export const IRIS_RING_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [469, 470],
  [470, 471],
  [471, 472],
  [472, 469],
  [474, 475],
  [475, 476],
  [476, 477],
  [477, 474],
];
