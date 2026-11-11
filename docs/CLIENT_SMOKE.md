# Client smoke — eyewear web demo

```bash
npm run verify-clients
npm run build
# or: VITE_CLIENT_ID=eyewear npm run build
```

Dev:

```bash
npm run dev
```

Checks:

1. Eyewear PDP loads with "Probador virtual".
2. Wardrobe URLs under `/garments/eyewear/`.
3. Capture → generate → studio dock (`Continuar`).
4. No `data-display='mupi'` on `<html>`; `localStorage.vf-display` is cleared on boot.
