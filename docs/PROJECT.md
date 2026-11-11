# virtualFit Project Specification

> **Last updated**: 2026-05-29 — see [ARCHITECTURE.md](ARCHITECTURE.md) (layout), [STYLING.md](STYLING.md) (CSS rules), [TEMPLATE_BLUEPRINT.md](TEMPLATE_BLUEPRINT.md) (new client).

## Purpose

`virtualFit` is a sports virtual try-on web app. The product goal is a fast, clean journey:

1. User captures a photo via device camera.
2. Gemini generates a studio-ready model image.
3. User applies garments from the catalog and builds a multi-garment outfit.

This document is the **single source of truth** for architecture, UX, API behavior, and edit rules. Read it before changing anything.

---

## Non-Goals

- No pose-switching UX in v1.
- No broad experimental redesigns without an approved plan.
- No hidden refactors mixed with bug fixes.
- No model changes without speed benchmarking (see [SPEED-ANALYSIS.md](SPEED-ANALYSIS.md)).

---

## Core User Journey

### Phase 1 — Capture

| Component | Role |
|---|---|
| `src/features/capture/StartScreen.tsx` | Entry screen, camera trigger, model generation handoff |
| `src/features/capture/CameraCapture.tsx` | Full-screen camera with guide overlay, capture, preview, confirm/retake |

**Flow**: User taps "Start try-on" → camera opens → capture → confirm → `generateModelImage` → on success, auto-advances to studio.

### Phase 2 — Try-On Studio

| Component | Role |
|---|---|
| `src/app/App.tsx` | Layout shell; session via `src/features/studio/useTryOnSession.ts` |
| `config/` | Client manifest (`getManifest()`), feature flags, display defaults |
| `src/features/studio/Canvas.tsx` | Hero image, loading overlay, recapture, loop preview when enabled |
| `src/features/studio/LookStack.tsx` | Applied garment layers with visibility toggle |
| `src/features/studio/WardrobePanel.tsx` | Category rail + garment grid |
| `src/shared/components/Footer.tsx` | Brand footer + SFX mute toggle |

---

## File Inventory

### App & features

| Path | Purpose |
|---|---|
| `src/main.tsx` | React entry |
| `src/app/App.tsx` | Root layout & phase routing |
| `src/features/capture/*` | StartScreen, CameraCapture, `useCameraStream` |
| `src/features/studio/*` | Canvas, WardrobePanel, LookStack, `useTryOnSession` |
| `src/core/look/lookComposition.ts` | Slot rules, render plan |
| `src/core/media/framing.ts`, `garmentFile.ts` | Image framing & wardrobe file helpers |

### Shared UI & lib

| Path | Purpose |
|---|---|
| `src/shared/ui/*` | KioskShell, BrandMasthead, Button, GarmentTile, … |
| `src/shared/components/*` | Footer, Spinner, icons, ErrorBoundary |
| `src/shared/lib/*` | display, theme, utils, camera, sfx |
| `src/shared/types/index.ts` | `OutfitLayer` (re-exports `WardrobeItem` from config) |

### Services, config, server

| Path | Purpose |
|---|---|
| `src/services/geminiService.ts` | Client façade → `/api/generate` |
| `src/services/gemini-api.ts` | Browser → Express proxy |
| `server/routes/generate.ts` | Gemini image + video on server |
| `config/clients/*.manifest.ts` | Per-client manifest |
| `config/index.ts` | `getManifest()`, `isFeatureEnabled()` |
| `config/wardrobe.ts` | Default garment catalog |

### Styles

| Path | Purpose |
|---|---|
| `src/styles/index.css` | Token + theme + kiosk imports (see [STYLING.md](STYLING.md)) |
| `src/app/globals.css` | Tailwind + global animations |
| `src/styles/tokens/*`, `src/styles/themes/*` | Design tokens & skins |

### Documentation

| File | Purpose |
|---|---|
| `docs/PROJECT.md` | This file |
| `docs/TEMPLATE_BLUEPRINT.md` | Template / new client |
| `docs/ARCHITECTURE.md` | Repo map |
| `docs/STYLING.md` | CSS architecture |
| `docs/SPEED-ANALYSIS.md` | Model speed comparison |
| `docs/STABILITY-PASS.md` | **Historical** 2026-05-13 audit |
| `docs/deploy.md` | Production deploy |

---

## State Contract

Session state lives in `src/features/studio/useTryOnSession.ts` (model image, composited display, slots, wardrobe, video loop, loading/error). `src/app/App.tsx` wires layout and manifest-driven display/features.

### Types (`config/types.ts` + `src/shared/types`)

```typescript
interface WardrobeItem {
  id: string;
  name: string;
  url: string;
  category: 'tops' | 'bottoms' | 'kits' | 'hats';
}

interface OutfitLayer {
  garment: WardrobeItem | null;  // null = base model
  imageUrl: string;
}
```

### Derived State

- `activeGarmentIds` — from `getAllActiveGarmentIds(activeSlots)`; used to disable already-selected items.
- `visibleActiveGarmentIds` — from `getVisibleActiveGarmentIds(activeSlots)`; drives render plan/signature.
- `hasVisibleGarmentLayers` — `visibleActiveGarmentIds.length > 0`; used by `features.videoLoop` session logic (generate CTA not in UI yet).

### Request Locks

- `isComposeRequestInFlightRef` / `isVideoRequestInFlightRef` (`useTryOnSession`) — duplicate API guard.
- `isModelRequestInFlightRef` (StartScreen) — duplicate model generation guard.

All are `useRef<boolean>` locks, not state, to avoid re-render race conditions.

---

## Layout Specification

### Shell Structure

```
div.h-screen.flex.flex-col.overflow-hidden
├── AnimatePresence
│   ├── [start-screen] flex-1 centered
│   └── [main-app] flex-1
│       └── main.flex-row
│           ├── div.flex-1.min-h-0 (canvas column, full bleed)
│           │   └── Canvas (absolute inset-0)
│           └── aside.flex-shrink-0 (sidebar, 280-320px / md:1/3)
│               ├── error alert
│               ├── OutfitStack
│               └── WardrobeModal
└── Footer (always visible, static)
```

### Canvas Image Rules

- Canvas root is `absolute inset-0` inside a `relative flex-1 min-h-0` column so the preview **fills the entire left pane** (no inset card, no fixed 3:4 box).
- Image: `absolute inset-0 w-full h-full object-cover object-center` — scales to cover the pane; edges may crop if the returned image aspect ratio differs from the viewport (expected for a full-bleed hero).
- Overlays (“New Photo”, loading, error toast) sit above the image with z-index.

### Sidebar

- Fixed width on small screens (`w-[280px]` / `sm:w-[320px]`), fluid on medium+ (`md:w-1/3 md:max-w-sm`).
- `overflow-y-auto` for scrollable content.

### Footer

- `<footer>` with brand line and SFX mute toggle (`SFX on` / `SFX off`).
- Always visible at the bottom of the viewport.

---

## Gemini API Contract

### Current Config (services/geminiService.ts)

```
Model:    gemini-2.5-flash-image
Config:   responseModalities: [IMAGE, TEXT]
          imageConfig: { aspectRatio: '3:4', imageSize: '2K' }
          safetySettings: BLOCK_ONLY_HIGH (all 4 categories)
Post:     Both endpoints pass the raw API image through `lib/imageResize.ts`
          → `normalizeStudioImageDataUrl()` (768×1024, object-cover) so every
          studio and try-on bitmap matches; UI framing stays stable.
```

`thinkingConfig` is not used (optional on newer models only).

### Functions

| Function | Input | Output |
|---|---|---|
| `generateModelImage(userImage: File)` | Camera capture file | Normalized studio model JPEG (data URL) |
| `generateVirtualTryOnImage(modelImageUrl: string, garmentImage: File)` | Current display image + garment file | Normalized try-on JPEG (data URL) |

### Response Handling

1. Check `promptFeedback.blockReason` → throw if blocked.
2. Scan candidates for `inlineData` image part → return as data URL.
3. Check `finishReason` / `finishMessage` → throw with context if not `STOP`.
4. Fallback → throw "no image returned" with any text feedback from model.

### Error Handling

- All API errors go through `getFriendlyErrorMessage()` in `lib/utils.ts`.
- Errors surface in both the sidebar alert AND an inline toast on the Canvas.
- Request locks prevent wasted calls during loading.

---

## Theme architecture

See **[STYLING.md](STYLING.md)** for full rules (tokens vs modules vs Tailwind).

1. **Primitives** (`src/styles/tokens/primitives.css`)
2. **Semantic** (`src/styles/tokens/semantic.css`)
3. **Theme skins** (`src/styles/themes/*.css`)
4. **Bootstrap** (`src/main.tsx` + `src/shared/lib/theme.ts`) — `APP_THEME` = `lifestyle-sport`
5. **Landing scope** (`src/shared/ui/KioskShell.tsx`) — scoped `LANDING_THEME` (`dark`)

Tailwind (`tooling/tailwind.config.js`) maps semantic vars to utilities (`bg-bg0`, `text-text-muted`).

### Build-time theme

Theme is no longer configurable by environment variable. Runtime uses fixed `APP_THEME`, with landing-only scoped `LANDING_THEME`.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | `.env.local` | Server Gemini auth (`server/routes/generate.ts`) |
| `GEMINI_API_KEY_BACKUP` | server | Failover on 429 |
| `PORT` | server | Default `8080` |
| `VITE_CLIENT_ID` | client build | Manifest client id (`nomad` default) |
| `VITE_DISPLAY` | client build | `mupi` \| `desktop` override |
| `VITE_WARDROBE_FEED` | client build | `true` merges demo remote tops |
| `VITE_FRAME_ASPECT_RATIO` | client + server | Portrait aspect for Gemini |

See [.env.example](../.env.example) and `config/clients/`.

## Gemini API — server proxy

**Status:** Browser calls `src/services/gemini-api.ts` → `POST /api/generate` (and `/api/generate-video`). Keys live in `.env.local` on the server only — **not** in the Vite client bundle.

Default dev: `npm run dev` (single process: Express + Vite middleware on port 8080).

## Visual System

### Design tokens (layered)

Primitives and semantic tokens live under `src/styles/tokens/` and theme files under `src/styles/themes/`. Key primitives include:

| Token | Role |
|---|---|
| `--vf-bg-0` / `--vf-bg-1` | Page background stack |
| `--vf-surface-1` / `--vf-surface-2` | Cards, panels |
| `--vf-rail` | Sidebar rail |
| `--vf-text-strong` / `--vf-text-muted` | Typography |
| `--vf-accent` | Primary CTA |
| `--vf-danger` | Errors |
| `--vf-surface-glow` | Studio canvas radial glow (`.studio-surface-glow`) |

### Animations

| Class | Effect |
|---|---|
| `.animate-fade-in` | Fade + slide up (0.42s), premium ease |
| `.animate-zoom-in` | Scale 0.95→1 + fade (0.55s), premium ease |

### Copy Tone

- Premium fashion language: "Capture Portrait", "Curate wardrobe", "Your look", "Recapture"
- Avoid: "mirror", "neural", "booth", sci-fi gimmicks
- Brand: "Powered by no-madproject"

---

## Editing Rules

1. **Read this document first** before changing UX, layout, or core logic.
2. **One objective per change set** — layout OR API OR copy OR bugfix. Never mix.
3. **No shotgun edits** — don't touch files unrelated to the objective.
4. **Preserve request locks** on all generation actions.
5. **After edits**, check lints: `npm run lint`
6. **If changing Gemini config/prompt/model**, benchmark speed and record rationale.
7. **If changing layout**, verify on both wide (desktop) and narrow (phone-width) viewports.

## Testing

Automated E2E (Playwright) is not wired in CI. Manual smoke before release:

1. `npm run lint` && `npm run eslint` && `GEMINI_API_KEY=… npm run build`
2. `npm run dev` — start screen loads, footer SFX toggle responds, and landing renders dark shell over attract loop
3. Capture flow → model generation → studio layout (canvas full-bleed, sidebar scroll)
4. Apply garment → undo layer → error surfaces in sidebar `Alert` and canvas toast

## Follow-ups

- Look-loop **generate** CTA removed from UI until product ships; `features.videoLoop` + `useTryOnSession` pipeline retained.
- Creative loader / sponsored moments → `integrations/creative-loader/` (see `integrations/README.md`).

## Definition of Done

- Behavior matches documented user journey.
- Studio composition remains side-by-side on all screen shapes.
- Canvas image fills the left pane edge-to-edge (`object-cover`); minor edge crop is acceptable for a full-bleed hero.
- Footer always visible.
- No loading/error flicker.
- Type check clean (`npm run lint`), ESLint clean (`npm run eslint`).
- PROJECT.md updated if architecture changed.
