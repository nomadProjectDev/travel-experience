/**
 * Platform manifest types — client deployments override via env + per-client manifests.
 */

import type { PublishedFrame } from '../src/core/face/frameFit';

/** Optional optical attributes — used by the eyewear stylist recommender. */
export type EyewearShape =
  | 'rectangle'
  | 'square'
  | 'round'
  | 'oval'
  | 'aviator'
  | 'cat-eye'
  | 'geometric'
  | 'browline';

export type EyewearMaterial = 'acetate' | 'metal' | 'titanium' | 'mixed' | 'rimless';
export type EyewearWeight = 'light' | 'medium' | 'bold';

export interface EyewearMeta {
  shape: EyewearShape;
  material: EyewearMaterial;
  weight: EyewearWeight;
  /** Short stylist line shown when this frame is recommended. */
  stylistReason?: string;
}

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
  category: 'tops' | 'bottoms' | 'kits' | 'hats' | 'glasses';
  /** Present on eyewear catalog items for smarter recommendations. */
  eyewear?: EyewearMeta;
  /** Optional shop PDP price label, e.g. `49 €`. */
  priceLabel?: string;
  /** Optional short product blurb for the shop PDP details block. */
  description?: string;
  /**
   * Optional English virtual try-on prompt for Decart `lucy-vton-3.6` / `lucy-vton-latest`
   * (~20–30 words, starting with "Substitute the upper body garment with..." or
   * "Substitute the lower body garment with..."). When present, sent with `enhance: false`.
   */
  vtonPrompt?: string;
}

/** Studio chrome: side rail (apparel) vs bottom bar (eyewear / face-first). */
export type StudioChrome = 'side-rail' | 'bottom-bar';

/**
 * Studio portrait crop requested from Gemini.
 * - `full-body`: apparel lookbook (head-to-toe)
 * - `face`: optical / eyewear bust (head and shoulders)
 */
export type PortraitFraming = 'full-body' | 'face';

/** Document `data-theme` skin — maps to `src/styles/themes/<name>.css`. */
export type PlatformTheme =
  | 'default'
  | 'lifestyle-sport'
  | 'dark'
  | 'eyewear'
  | 'navidad'
  | 'travel-experience';

export interface PlatformDisplay {
  mode: 'mupi';
  targetWidth: 1080;
  targetHeight: 1920;
}

export interface PlatformFeatures {
  videoLoop: boolean;
  wardrobeFeed: boolean;
  /** Studio wardrobe chrome. Defaults to `side-rail` when omitted. */
  studioChrome?: StudioChrome;
  /** Model portrait framing. Defaults to `full-body` when omitted. */
  portraitFraming?: PortraitFraming;
  /** Dock stylist tip that recommends frames (eyewear). */
  stylistAssistant?: boolean;
  /** Mic → Web Speech → keyword prefs for eyewear dock pills. */
  voiceStylist?: boolean;
  /**
   * Background music + SFX mute toggles (Canvas / Footer).
   * Defaults to on when omitted; set `false` to strip audio UX (eyewear).
   */
  backgroundAudio?: boolean;
  /** Post-selection environment photo variants (eyewear). */
  environmentScenes?: boolean;
  /**
   * MediaPipe face-fit analysis before Gemini (Phase 0 spike).
   * Default off — enable via eyewear `features` or `VITE_FACE_FIT_ANALYSIS=true`.
   */
  faceFitAnalysis?: boolean;
  /**
   * Reserved kill switch for future validated face-fit recommendations.
   * Currently has no ranking or UI effect; independently off by default.
   */
  faceFitRecommendations?: boolean;
}

/** Generated environment scene ids — studio is a non-generated restore. */
export type EnvironmentSceneId = 'beach' | 'mountain' | 'city' | 'sunset-cafe';

export type EnvironmentId = 'studio' | EnvironmentSceneId;

export interface EnvironmentScenePreset {
  id: EnvironmentSceneId;
}

export interface EnvironmentScenesConfig {
  presets: EnvironmentScenePreset[];
}

export interface PlatformBrand {
  productName: string;
  /** Public URL path, e.g. `/brand/eyewear/logo.png` under `public/`. */
  logoSrc: string;
  logoAlt: string;
  poweredBy?: string;
  /** Landing image under `public/`. */
  landingSrc?: string;
  /**
   * The landing image is a finished campaign plate.
   * BrickStudio keeps the real CTA and skips the HTML hero so the plate
   * is not titled twice.
   */
  landingPlate?: boolean;
  /** Accessible name when the plate already contains its title. */
  landingAlt?: string;
}

/**
 * Campaign still on the generating wait overlay.
 * Keep this list data-only so a third slide is an append, not a layout rewrite.
 */
export interface GeneratingWaitSlide {
  imageSrc: string;
  imageAlt: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

/** Per-client UI strings — landing, capture flow, footer. */
export interface PlatformCopy {
  landing: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    privacyNote: string;
    microEdition: string;
    microIssue: string;
    microRail: string;
    statusLines: string[];
    ctaLabel: string;
    ctaBusyLabel: string;
  };
  generating: {
    statusLines: string[];
    eyebrow: string;
    eyebrowError: string;
    title: string;
    titleError: string;
    subtitle: string;
    retryLabel: string;
    /**
     * Campaign stills on the eyewear wait overlay.
     * Append another object to add a slide; omit the array to hide the carousel.
     */
    waitSlides?: GeneratingWaitSlide[];
    /** Carousel label for the campaign stills (a11y). */
    waitSlidesLabel?: string;
  };
  /**
   * Soft capture quality gate (extreme dark / blur). Optional per pack.
   * Prefer warn + continue; CTA labels should match locale.
   */
  captureQuality?: {
    darkWarn: string;
    blurWarn: string;
    continueLabel: string;
    recaptureLabel: string;
  };
  /** Camera chrome labels (locale). Optional — English defaults in CameraCapture. */
  captureChrome?: {
    closeAria: string;
    shutterAria: string;
    timerOff: string;
    timerSecondsAria: string;
    retry: string;
    retake: string;
    confirm: string;
    capturedAlt: string;
    faceHint?: string;
    /** Face-fit flag: expandable estimated relative-analysis panel. */
    faceFitPanel?: {
      toggleLabel: string;
      toggleAria: string;
      closeAria: string;
      title: string;
      caveat: string;
      preliminaryLabel: string;
      states: {
        initializing: string;
        searching: string;
        singleFace: string;
        poseUnavailable: string;
        moveCloser: string;
        moveFarther: string;
        lookFront: string;
        improveLighting: string;
        holdSteady: string;
        stabilizing: string;
        ready: string;
        limited: string;
        runtimeFailure: string;
      };
      metrics: {
        ipd: { label: string; explain: string };
        outerCanthi: { label: string; explain: string };
        faceWidth: { label: string; explain: string };
        ipdRatio: { label: string; explain: string };
        canthiRatio: { label: string; explain: string };
        yaw: { label: string; explain: string };
        pitch: { label: string; explain: string };
      };
      /** DEV-only local calibration collector copy. */
      calibration?: {
        eyebrow: string;
        title: string;
        warning: string;
        simpleHint: string;
        widthHint: string;
        widthPlaceholder: string;
        incompleteExport: string;
        readyToExport: string;
        privacy: string;
        consent: string;
        participantId: string;
        participantPlaceholder: string;
        sessionId: string;
        sessionPlaceholder: string;
        split: string;
        splits: { calibration: string; test: string };
        deviceLabel: string;
        devicePlaceholder: string;
        groundTruthFaceWidth: string;
        groundTruthMethod: string;
        groundTruthMethods: {
          'bizygomatic-caliper': string;
          'maximum-face-width-tape': string;
          other: string;
        };
        groundTruthTool: string;
        groundTruthToolPlaceholder: string;
        groundTruthRepeats: string;
        distance: string;
        distances: { near: string; target: string; far: string };
        lighting: string;
        lightingStates: { even: string; challenging: string };
        pose: string;
        poses: {
          frontal: string;
          'yaw-left-10': string;
          'yaw-right-10': string;
          'yaw-left-20': string;
          'yaw-right-20': string;
          'pitch-up': string;
          'pitch-down': string;
        };
        eyewearPresent: string;
        quality: string;
        qualityStates: { valid: string; limited: string; rejected: string };
        noCapture: string;
        rawUnavailable: string;
        previous: string;
        next: string;
        export: string;
        exporting: string;
        exported: string;
        exportError: string;
        stepProgress: string;
        simpleRepeatProgress: string;
        labProtocolToggle: string;
        sandboxToggle: string;
        sandboxTitle: string;
        sandboxEstimate: string;
        sandboxCaveat: string;
        sandboxRejected: string;
        blockedReasons: {
          noCapture: string;
          analyzing: string;
          noLandmarks: string;
          consent: string;
          invalidWidth: string;
          missingIdentity: string;
          exporting: string;
        };
        steps: {
          frontal1: string;
          frontal2: string;
          frontal3: string;
          near: string;
          target: string;
          far: string;
          yawLeft10: string;
          yawRight10: string;
          yawLeft20: string;
          yawRight20: string;
          pitchUp: string;
          pitchDown: string;
          lightingEven: string;
          lightingChallenging: string;
        };
      };
    };
  };
  footer: {
    line: string;
  };
  /**
   * Optical shop PDP entry (eyewear packs with `studioChrome: 'bottom-bar'`).
   * When present, StartScreen opens on a featured product page.
   */
  productPage?: {
    /** Small collection / category line above the title. */
    brandEyebrow: string;
    otherFrames: string;
    /** Overlay CTA on the product image (Multiopticas-style). */
    ctaLabel: string;
    ctaBusyLabel: string;
    /** Secondary commerce button in the info column (demo / non-cart). */
    addLabel: string;
    detailsTitle: string;
    trustShipping: string;
    trustShippingDetail: string;
    trustReturns: string;
    trustFreeShip: string;
    trustWarranty: string;
    /** Fallback blurb when wardrobe item has no description. */
    tryOnBlurb?: string;
    materialLabel?: string;
    shapes: Partial<Record<EyewearShape, string>>;
    materials: Partial<Record<EyewearMaterial, string>>;
  };
  /** Optional optical stylist strip (eyewear packs). */
  stylist?: {
    idleTip: string;
    idleCta: string;
    loading: string;
    apply: string;
    applied: string;
    refresh: string;
    dismissAria: string;
  };
  /**
   * Eyewear studio sidebar + top bar copy (frame grid, filters, Escena).
   */
  eyewearDock?: {
    otherStyles: string;
    recommended: string;
    alsoFits: string;
    /** Eyebrow on the dedicated selected-frame slot (PDP entry / current try-on). */
    chosenLabel?: string;
    /** Studio top-bar title. */
    lookTitle?: string;
    filterRecommended?: string;
    /** Overflow environment chip. */
    moreScenes?: string;
    /** Selected-frame card title (PDP rail). */
    chosenSectionTitle?: string;
    /** Top-bar back link (return to product / restart). */
    backToProduct?: string;
    /** Floating control on the try-on well → recapture. */
    changeModel?: string;
    /** Compact gallery of session-generated portraits. */
    galleryTitle?: string;
    galleryVideosTitle?: string;
    galleryFront?: string;
    gallerySideLeft?: string;
    gallerySideRight?: string;
    galleryLook?: string;
    galleryScene?: string;
    galleryVideo?: string;
    galleryLoading?: string;
    saveLook: string;
    /** Primary CTA — cart / continue (demo). */
    continue: string;
    onYou: string;
  };
  /** On-demand studio motion loop (Veo). Optional per pack. */
  videoLoop?: {
    generateLabel: string;
    generatingLabel: string;
    /** Toast when the first (or later) loop is ready to play in the well. */
    readyLabel?: string;
    errorTitle: string;
    dismissLabel: string;
    dismissAria: string;
  };
  /** Escena chip strip copy (when `features.environmentScenes`). */
  environmentScenes?: {
    /** Aria / accessibility label for the chip strip. */
    title: string;
    studio: string;
    /** Use `{environment}` for the selected scene label. */
    creating: string;
    cancel: string;
    retry: string;
    error: string;
    labels: Record<EnvironmentSceneId, string>;
  };
  /** Portrait kiosk of live Decart creative effects (claymation characters). */
  brickStudio?: {
    liveBadge: string;
    connecting: string;
    switching: string;
    restylesTitle: string;
    railHint: string;
    restart: string;
    retry: string;
    /** Use `{name}` for the effect label. */
    applyEffect: string;
    sessionError: string;
    /** Country-home heading. Travel pack only. */
    destinationsTitle?: string;
    /** Live control that leaves the camera and returns to the look picker. */
    changeLook?: string;
    /** Variant screen back control (travel MUPI). */
    variantBackLabel?: string;
  };
  /** Portrait kiosk studio copy. */
  mupiStudio?: {
    wardrobeTitle: string;
    wardrobeHint: string;
    tops: string;
    bottoms: string;
    topSlot: string;
    bottomSlot: string;
    noItemSelected: string;
    chooseFromWardrobe: string;
    visible: string;
    hidden: string;
    selected: string;
    saveLook: string;
    continue: string;
    restart: string;
    loadError: string;
  };
}

export interface PlatformManifest {
  clientId: string;
  theme: PlatformTheme;
  /** Deployment form factor. Clothing MUPI declares this explicitly. */
  display?: PlatformDisplay;
  features: PlatformFeatures;
  brand: PlatformBrand;
  wardrobe: WardrobeItem[];
  copy: PlatformCopy;
  /** Cited measurements with explicit exact/analogue catalog classification. */
  frameMeasurements?: readonly PublishedFrame[];
  /** Present when `features.environmentScenes` is enabled. */
  environmentScenes?: EnvironmentScenesConfig;
}
