# Clothing MUPI deployment

This project targets a 1080×1920 portrait touch display. The clothing manifest declares
the MUPI display contract and `src/main.tsx` applies `data-display="mupi"` before React
mounts. Display mode is not exposed in customer UI.

## Run locally

```bash
npm install
PORT=8082 npm run dev
```

Open `http://localhost:8082`. Use a portrait browser viewport for layout verification.

The page and static studio UI build without secrets. A live Lucy VTON session requires
`DECART_API_KEY` in `.env.local`; the key remains server-side and must never use a
`VITE_` prefix.

## Camera mounting

The safe default is an upright webcam:

```bash
VITE_CAMERA_ROTATION_DEG=0
```

For a camera physically mounted sideways, set one of:

```bash
VITE_CAMERA_ROTATION_DEG=-90
VITE_CAMERA_ROTATION_DEG=90
```

Use `180` only for an upside-down mount. Preview geometry and captured frames share the
same rotation setting.

## Display shell

- Studio canvas: 70% of the portrait width.
- Glass wardrobe rail: 30%.
- Primary touch targets: at least 56 CSS pixels, with 64 pixels preferred on coarse input.
- Safe-area insets are applied to edge content.
- Landscape shows an orientation message instead of compressing the portrait controls.

The attract loop and kiosk idle reset are intentionally absent because this product pack
does not include approved campaign assets or session-reset requirements.
