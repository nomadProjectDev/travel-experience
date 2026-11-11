# Self-hosted MediaPipe Face Landmarker assets

Used by the optional `faceFitAnalysis` path (Phase 0 spike). Served from Vite `public/` so the browser loads them from this origin — not a CDN-only dependency at runtime.

## Contents

| Path | Role |
|------|------|
| `face_landmarker.task` | MediaPipe Face Landmarker model (float16) |
| `wasm/vision_wasm_internal.{js,wasm}` | SIMD Wasm runtime |
| `wasm/vision_wasm_nosimd_internal.{js,wasm}` | Non-SIMD fallback |

## How these were obtained

1. **Wasm** — copied from the pinned npm package:
   ```bash
   cp -R node_modules/@mediapipe/tasks-vision/wasm/* public/mediapipe/wasm/
   ```
   Package version: `@mediapipe/tasks-vision@0.10.21` (see `package.json`).

2. **Model** — downloaded from Google’s public MediaPipe model bucket:
   ```bash
   curl -fsSL -o public/mediapipe/face_landmarker.task \
     "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
   ```
   Upstream docs: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker

## Refresh checklist

When bumping `@mediapipe/tasks-vision`, re-copy `wasm/` from `node_modules` and re-verify the `.task` still matches the Tasks Vision major line you’re on.
