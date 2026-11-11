# Photo gen — plan de quick wins

**Branch:** `perf/photo-gen-quick-wins` (desde HEAD de `feat/eyewear-studio` + WIP eyewear).  
**Fuente:** [`PHOTO_GENERATION_LATENCY.md`](./PHOTO_GENERATION_LATENCY.md).  
**Regla:** PLAN ONLY aquí; implementación en PRs siguientes.

---

## Goal / métricas de éxito

| Métrica | Target |
|---------|--------|
| **p50 wall clock** (snap → paint try-on) | ≤ actual −20% tras transport/model, **o** hold wall clock |
| **p95 wall clock** | bajar cola (retries/backoff/orphans); telemetría antes de claim |
| **Perceived wait** | browse wardrobe durante generate + crossfade; menos “UI lock” |
| **Calidad (eyewear)** | score face/frame ≥ control −0.3 (bench interno 1–5) |
| **Enabler** | phases correladas client+server por `requestId` (sin esto, A/B = vibes) |

Primario kiosk: `t_decode_paint - t_snap`. Secundario: 2º garment time, cancel rate, $/session.

---

## Prerequisites / nota de branch

- Trabajar en **`perf/photo-gen-quick-wins`**; no mezclar con merge de eyewear salvo rebase consciente.
- **R14 primero** (o en el mismo PR slice #1): sin phases, no validar R1/R3/R7.
- Face path hoy **1400px**; full-body **1280**. No bajar face a 1024 sin side-by-side (aviator/rimless/wire).
- Model switch solo tras bench n≥30; env/flag, **nunca** hard-cutover.

---

## Checklist ordenado

| ID | Qué | Files | Acceptance | Risk | Est |
|----|-----|-------|------------|------|-----|
| **QW1** (R14) | Phase telemetry: `requestId`, timers client, `Server-Timing` / headers server, beacon funnel | `integrations/kiosk-beacon/track.ts`, `src/services/gemini-api.ts`, `server/routes/generate.ts`, canvas/LookStack paint | 1 gen → events: encode, TTFB, `t_gemini_ms`, retry/backoff, decode_paint; client↔server mismo id | Low | S |
| **QW2** (R2/R8) | Unlock wardrobe browse durante generate + crossfade imagen + copy cycling env/generating | `EyewearDock.tsx`, `WardrobePanel.tsx`, `useTryOnSession.ts`, `Canvas.tsx` / `LookStack*`, `config/clients/*/copy.ts` | Dock navegable mid-gen; swap con fade; strings rotan; no compose extra al browse | Low | S |
| **QW3** (R5/R9) | Cache key prenda = URL/content (no `lastModified`); cache session del model transport part | `gemini-image.service.ts`, framing/session helpers, `useTryOnSession.ts` | 2º try misma prenda = cache hit; mismo session no re-downscale/re-encode model | Low | S |
| **QW4** (R3) | Downscale transport inicial (display hi-res intacto); full-body →1024; face medido / opt-in | `src/core/media/framing.ts`, `gemini-image.service.ts` | Bytes↓ en network tab; QA face eyewear OK o face queda ≥1280/1400 | Med (face) | S |
| **QW5** (R6) | Static prompt rules → `systemInstruction`; prompt/request más corto | `gemini-image.prompts.ts`, `gemini-image.service.ts`, `server/routes/generate.ts` | Misma calidad visual spot-check; payload prompt↓; tests prompts verdes | Low | S |
| **QW6** (R7) | Retry backoff base 1500 → ~400–600ms + jitter | `server/routes/generate.ts` | Fallo inyectado: sleep entre retries &lt; antes; `t_backoff_ms` en telemetry | Low | S |
| **QW7** (R1) | Protocolo bench + env opcional `gemini-3.1-flash-lite-image` @ 1K (flag) | `server/routes/generate.ts`, `.env.example`, doc bench corto / script notes | n≥30/variante; p50 phases; quality gate; **status: default switched pending bench** (lite may be weaker on multi-ref glasses) | Med (quality) | S–M |
| **QW8** | Warm `geminiService` earlier; hoist `GoogleGenAI`; abort speculative on retake si cheap | `geminiService.ts`, `generate.ts`, capture (`CameraCapture` / `StartScreen`), session | Menos cold first-hit; retake no deja orphan barato; no crash mid-flight | Low–Med | S |

---

## Secuenciación (antes de model switch)

```
QW1 (telemetry) ──┬──► QW2 (perceived UX)     ← puede paralelizar post-QW1 scaffold
                  ├──► QW3 (caches)
                  ├──► QW5 + QW6 (prompt + backoff)
                  ├──► QW4 (transport dims; face gated)
                  ├──► QW8 (warm / hoist / abort cheap)
                  └──► QW7 (bench → optional flash-lite flag)
                         ▲
                         └── NO ship model default hasta QW1 + bench + quality gate
```

**Must before model switch (QW7 cutover):** QW1 live, bench protocol run, quality ≥ bar. Flag/env OK en paralelo al bench; default model unchanged hasta decisión.

---

## Out of scope (esta semana / estos PRs)

- Pro / 2K en path interactivo  
- `gemini-3.1-flash-image-preview` sin bench fresco (regresión histórica)  
- Object storage / multipart binary completo (R13)  
- Abort end-to-end server Gemini (R4) — next  
- Speculative env post-try-on + cost cap (R12) — next  
- Parallel compose / skip PNG intermediate (R10–R11) — next  
- Admission queue / split API-static (R15–R16)

---

## Slices de PR sugeridos

### PR #1 — instrumentación + perceived + caches
- **QW1, QW2, QW3** (+ scaffold mínimo requestId si hace falta)
- Ship UX en green visual QA; telemetría lista para medir el resto

### PR #2 — transport/server + warm + bench flag
- **QW4, QW5, QW6, QW8**, luego **QW7** (bench + env flag, sin hard-cutover)
- Merge model default solo si p50/quality pasan decision rule del brief

---

## Decision rule (copiado operativo)

Ship UX (QW2) con QA visual. Ship transport/model solo si fidelity eyewear no cae &gt;0.3 vs control. Un cambio por cohort en A/B kiosk.
