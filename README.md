# Travel Experience

Portrait MUPI for NO.MAD LAB Travel Experience. Cloned from the navidad effects
kiosk and detached from that remote. The camera still feeds Decart Lucy 2.6.
The rail lists the delivered destination looks. The six-card landing and the
per-country picker are not built yet.

## Quick start

```bash
npm install
cp .env.example .env.local   # set DECART_API_KEY
npm run dev
```

Open **http://localhost:8080** in Chrome. Camera needs localhost or HTTPS.
Port busy? `PORT=8081 npm run dev`.

Plain `npm run dev` lands on the **travel-experience** pack.

## The flow

1. **Landing** — approved plate, "NO.MAD LAB / Travel Experience", then **Comenzar experiencia**.
2. **Live** — camera plus Lucy 2.6. The first look is México · Hombre.
3. **Rail** — twelve delivered looks. Tapping one calls `setPrompt` and sends that look's reference still. The person stays recognizable.

## Environment

See [.env.example](.env.example). Gemini runs **server-side** only — keys stay in `.env.local` and
never reach the browser bundle.

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Server Gemini auth |
| `VITE_CLIENT_ID` | Active client pack — defaults to `travel-experience` |
| `API_KEY` | Server `/api/*` gate (**required** when `NODE_ENV=production`) |
| `VITE_KIOSK_API_KEY` | Browser → `/api/*`; must match `API_KEY` in production (legacy name) |
| `GEMINI_IMAGE_MODEL` / `GEMINI_IMAGE_SIZE` | Image model + size, latency-first defaults |
| `PORT` | Server port (default 8080) |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (Express + Vite, port 8080) |
| `npm run build` | Production static build |
| `npm run start` | Production server + `dist/` |
| `npm run lint` | TypeScript (`tsc --noEmit`) |
| `npm run eslint` | ESLint |
| `npm test` | Vitest |
| `npm run verify-clients` | Client pack filesystem checks |
| `npm run test:e2e` | Playwright smoke (build + `API_KEY` first) |

## Docs

| Doc | Content |
|-----|---------|
| [AGENTS.md](AGENTS.md) | Product scope and boundaries |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Repo map |
| [docs/TEMPLATE_BLUEPRINT.md](docs/TEMPLATE_BLUEPRINT.md) | Client-pack architecture |
| [docs/STYLING.md](docs/STYLING.md) | Tokens, CSS modules |
| [docs/deploy.md](docs/deploy.md) | Production deploy notes |
| [docs/research/PHOTO_GENERATION_LATENCY.md](docs/research/PHOTO_GENERATION_LATENCY.md) | Generation latency findings |
