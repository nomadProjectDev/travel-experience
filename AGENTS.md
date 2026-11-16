# AGENTS.md — travel experience MUPI

Guidance for AI agents and developers working in this repo.

## What this is

**NO.MAD LAB Travel Experience**: a portrait, touch-first 1080×1920 MUPI cloned from
the navidad effects kiosk. The live path is still Decart **Lucy 2.6** creative effects
(restyle). The delivery is a design pack: an approved landing plate, six destination
screens, and reference stills for México, Perú, Colombia, Argentina, Chile, and
Puerto Rico.

Flow today: landing plate → camera permission → live Lucy session → character rail.
Tapping a look calls `setPrompt` on the open session and sends that reference still.
The destination grid and the per-country picker from the mockups are not built yet.

The active client pack is **`travel-experience`**. Navidad, clothing, and eyewear
remain in the tree and are not the default. `data-display="mupi"` comes from the manifest.

## Boundaries — do not cross

| Area | Rule |
|------|------|
| `tooling/` | Build pipeline only. No product logic. |
| `config/clients/` | **Data** per brand (manifest + wardrobe + copy). Eyewear is registered; `_template` is scaffolding only. |
| `src/features/` | Product UI flows (`capture`, `studio`). |
| `src/core/` | Domain logic, no React. |
| `integrations/` | Optional adapters — never imported from `App.tsx` without a manifest flag. Registry is currently empty. |
| `server/` | API proxy + auth. Gemini keys stay server-side, never in `VITE_*`. |

Do **not** hardcode brand strings in TSX; use `getManifest().copy` / `getWardrobe()`.

## Where the web flow lives

| Piece | File |
|-------|------|
| PDP entry | `src/features/capture/EyewearProductPage.tsx` |
| Featured / alternate frame picks for the PDP | `src/features/capture/eyewearShop.ts` |
| Capture + generation orchestration | `src/features/capture/StartScreen.tsx`, `CameraCapture.tsx` |
| Live Decart effects | `src/features/effects/BrickStudio.tsx`, `useBrickSession.ts`, `src/services/decart-effects.service.ts` |
| Effect catalog | `config/clients/travel-experience/effects.ts` |
| Portrait display CSS | `src/styles/kiosk-display.css`, `src/styles/themes/travel-experience.css` |
| Camera rotation | `src/shared/lib/camera.ts`, `VITE_CAMERA_ROTATION_DEG` |

## Client pack contract (`PlatformManifest`)

- `clientId`, `theme`, `features`, `brand`
- `wardrobe: WardrobeItem[]` — static import from `config/clients/<id>/wardrobe.ts`
- `copy: PlatformCopy` — landing, product page, generating, cross-sell, footer strings

Resolve at runtime with `getManifest()`, `getWardrobe()`, `getCopy()` from `@config`.

Builds import **one** pack via the Vite alias `@client-manifest` → `config/clients/<id>/manifest.ts`.
The default is **`travel-experience`** (`tooling/vite.config.ts`); `VITE_CLIENT_ID` still overrides it.
The full registry (`config/registry.ts`) is used only by tests and `verify-clients`.

## Commands

```bash
npm run dev              # Express + Vite, port 8080 (PORT=8081 to move it)
npm run build            # Vite production — defaults to eyewear
npm run start            # Serve dist + /api
npm run lint             # tsc --noEmit
npm run eslint
npm test                 # Vitest (domain + client pack)
npm run verify-clients   # Filesystem pack checks
npm run test:e2e         # Playwright (build first, API_KEY for server)
```

`npm run dev` needs `DECART_API_KEY` in a local environment file for live effects. Never commit,
copy, print, or expose that key. See `docs/MUPI_DEPLOYMENT.md` for portrait and camera setup.

## Agent skills

- MediaPipe / Face Landmarker / face-fit → use **mediapipeSKILLS**: read `SKILL.md`, then **one** reference (eyewear → 11+10; optical metrics → 12). Do not dump all refs.

## Docs

- [docs/TEMPLATE_BLUEPRINT.md](docs/TEMPLATE_BLUEPRINT.md) — inherited architecture
- [docs/STYLING.md](docs/STYLING.md) — CSS modules + tokens
- [docs/research/PHOTO_GENERATION_LATENCY.md](docs/research/PHOTO_GENERATION_LATENCY.md) — generation latency work
