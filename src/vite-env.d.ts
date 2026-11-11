/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Deployment client id — defaults to eyewear. */
  readonly VITE_CLIENT_ID?: string;
  /** Merge FakeStore demo tops into wardrobe when `true`. */
  readonly VITE_WARDROBE_FEED?: string;
  readonly VITE_FRAME_ASPECT_RATIO?: string;
  readonly VITE_SUBJECT_HEIGHT_TARGET?: string;
  readonly VITE_SUBJECT_TOP_MARGIN_TARGET?: string;
  /** Live preview + capture rotation in degrees — 0, 90, -90, 180 (sideways mounts). */
  readonly VITE_CAMERA_ROTATION_DEG?: string;
  /** DEV: seed studio session on boot (same as `?studio=1`). */
  readonly VITE_DEV_STUDIO_SEED?: string;
  /**
   * MediaPipe face-fit before Gemini. `true` enables; default off
   * (also overridable via `features.faceFitAnalysis` on the client pack).
   */
  readonly VITE_FACE_FIT_ANALYSIS?: string;
  /** Reserved future capability; currently has no ranking or UI effect. */
  readonly VITE_FACE_FIT_RECOMMENDATIONS?: string;
  /** DEV-only consent-gated calibration dataset export capability. */
  readonly VITE_FACE_FIT_FIXTURE_EXPORT?: string;
  /** DEV-only absolute-size and public-frame validation sandbox. */
  readonly VITE_FACE_FIT_SIZE_SANDBOX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
