# Photo generation latency — CTO brief

**Date:** 2026-08-11  
**Scope:** Interactive try-on path (capture → studio model → garment/env compose).  
**Sources:** Gemini, server/transport, UX perceived, architecture councils (merged).  
**Related:** [`docs/SPEED-ANALYSIS.md`](../SPEED-ANALYSIS.md) (May 2026 model regression note).

---

## 1. Executive summary

Wall clock on a typical try-on is ~10s. Most of that is Gemini inference. The rest is avoidable tax we pay twice in some places and never measure in others.

What dominates:

| Bucket | Share (order of magnitude) | Notes |
|--------|----------------------------|--------|
| Gemini inference | ~70–85% | Model + image tokens in/out. Default `gemini-2.5-flash-image` (`server/routes/generate.ts`). |
| Payload / encode | ~10–20% | Base64 JSON over `/api`, face path at 1400px, garments via PNG intermediate + double decode. |
| Client compose / UI lock | ~5–15% | Serial compose, dock locked during generate, no abort on speculative work, weak garment cache keys. |

Opinionated take: do not chase Pro/2K quality on the interactive path. Win perceived latency first (browse while generating, crossfade). Then cut transport and retries. Then bet on speculative env after a solid try-on, behind flags and beacon.

Older note: `gemini-3.1-flash-image-preview` was slower than 2.5 Flash (see SPEED-ANALYSIS). Re-benchmark before any model swap; do not assume “newer = faster.”

---

## 2. Current path map

```
Capture (CameraCapture / StartScreen)
  → optional speculative portrait (no abort on discard)
  → stabilize + session canvas (full res)
  → downscaleDataUrlForTransport (framing.ts: default 1280; face 1400)
  → POST /api JSON { imageDataUrl base64, … }  (gemini-api.ts → generate.ts)
  → new GoogleGenAI() per request + retry backoff 1500ms base
  → Gemini IMAGE_MODEL (env override) @ imageSize 1K
  → response image → studio Canvas
  → wardrobe select → garment load/cache → compose (often serial)
  → eyewear: env overlay gen (second image call; cache quirks)
```

Key files: `src/services/gemini-image.service.ts`, `src/services/gemini-image.prompts.ts`, `src/services/gemini-api.ts`, `server/routes/generate.ts`, `src/core/media/framing.ts`, `src/features/studio/useTryOnSession.ts`, `src/features/studio/EnvironmentOverlay.tsx`, `src/features/studio/EyewearDock.tsx`.

---

## 3. Ranked recommendations

| ID | Change | Impact | Effort | Risk | Owner |
|----|--------|--------|--------|------|-------|
| R1 | Benchmark models: keep 2.5 Flash vs try `gemini-3.1-flash-lite-image` @ 1K | High | S | Med (quality) | Server / Gemini |
| R2 | Unlock wardrobe browse during generate (dock locked today) | High perceived | S | Low | Studio UX |
| R3 | Face/full transport: 1024 default; keep face quality budget explicit | Med–High | S | Med (face blur) | Client media |
| R4 | Real cancel + idempotency; kill orphaned retries | Med | M | Low | API + client |
| R5 | Garment cache key: content hash or URL, not `file.lastModified` | Med | S | Low | `gemini-image.service` |
| R6 | `systemInstruction` for static rules; shrink per-request prompt | Med | S | Low | Prompts |
| R7 | Lower retry backoff base (1500ms → ~400–600ms + jitter) | Low–Med | S | Low | `generate.ts` |
| R8 | Crossfade on image swap + cycling env/generating copy | Med perceived | S | Low | Studio UX |
| R9 | Session-scoped model transport cache (no re-downscale/re-encode) | Med | S | Low | Client media |
| R10 | Skip double-decode / PNG garment intermediate; reuse `loadImage` | Med | M | Low | Client media |
| R11 | Parallel compose where deps allow; wardrobe tile prefetch | Med | M | Low | Look / studio |
| R12 | Speculative env after successful try-on (+ abort) | High (eyewear) | M | Med (cost) | Studio + API |
| R13 | Multipart/binary or object URLs instead of base64 JSON | Med | L | Med | Server |
| R14 | Phase telemetry (capture→encode→TTFB→decode→paint) | Enables all | S | Low | Beacon + API |
| R15 | Admission control / queue under load | Med at scale | M | Med | Server |
| R16 | Split API process from static/Vite serving | Low now | L | Med | Ops |

Impact = wall clock or kiosk-perceived wait. Effort: S ≤1–2d, M ≤1 week, L multi-week.

---

## 4. Quick wins (this week) vs bets (next)

### This week

1. **R14** — phase timers + beacon events (`integrations/kiosk-beacon/track.ts`). Without this, A/Bs are vibes.
2. **R2 + R8** — browse during generate; crossfade; rotate env loading strings from `copy.ts`.
3. **R1** — fixed prompt/payload bench: 2.5 Flash vs flash-lite-image @ 1K (n≥30 each).
4. **R5 + R9** — fix garment cache key; cache model transport part per session.
5. **R6 + R7** — static rules → `systemInstruction`; cut backoff base.
6. **R3** — try 1024 on full-body; keep face path measured (eyewear may stay higher briefly).

### Next

- **R4** — AbortSignal end-to-end; client cancel must stop server Gemini work or mark request disposable.
- **R12** — Speculative env frames after try-on settles, flag + cost cap; abort on look change.
- **R10–R11** — compose/preload cleanup from architecture F-list.
- **R13 / R15** — binary transport and admission when payload or concurrency shows up in telemetry.

---

## 5. Instrumentation plan

Emit once per generation request (client + server correlate by `requestId`):

| Phase | Where | Metric |
|-------|--------|--------|
| `t_snap` | Capture | User snap |
| `t_encode_done` | `downscaleDataUrlForTransport` | Payload bytes, maxDimension |
| `t_req_start` / `t_ttfb` / `t_body_done` | `gemini-api.ts` | Network + wait |
| `t_gemini_ms` | `generate.ts` | Pure upstream (exclude our backoff sleep) |
| `t_retry_count` / `t_backoff_ms` | Server | Wasted wait |
| `t_decode_paint` | Canvas / LookStack | Perceived finish |
| `cancel` / `orphan` | Both | User left mid-flight |

Beacon: funnel events with durations, not just counts. Sample 100% on kiosk; sample if needed on web. Dashboard: p50/p90 by `clientId`, framing (`face` vs full), model id, env-on/off.

---

## 6. Eyewear-specific notes

- Face transport is already special-cased at **1400** in `gemini-image.service.ts` (`portraitFraming === 'face'`). Full-body default is **1280** in `framing.ts`. Do not blindly drop face to 1024 without a side-by-side on frames (aviator, rimless, thin wire).
- Env scenes (`EnvironmentOverlay`, `environmentState.ts`) are a **second** image generation. Speculative env after try-on is the right bet; speculative env before confirm burns money.
- Dock lock during generate hurts eyewear more: many SKUs, browse is the product. Unlock browse first.
- Voice stylist / recommend paths must not trigger extra Gemini image calls on the hot path.

---

## 7. What not to do

- Do not put **Pro** or **2K** on the interactive try-on path. Offline lookbooks only.
- Do not switch to `gemini-3.1-flash-image-preview` without a fresh bench (prior regression).
- Do not add speculative generation without **abort** and a per-session cost ceiling.
- Do not “optimize” prompts by length alone while still shipping huge static rule blobs every request. Move static rules to `systemInstruction`.
- Do not trust garment cache keyed on `lastModified` for static catalog Files.
- Do not treat UI polish (spinners) as a substitute for unlock-browse + crossfade.
- Do not split API/static (R16) before measuring; inference still dominates.

---

## 8. A/B and benchmark protocol

**Lab bench (pre-prod)**  
Fixed seed portrait + 3 garments (incl. 1 eyewear frame). Same `GEMINI_IMAGE_SIZE=1K`, same region/key. For each variant: n≥30, record phases from §5. Variants: model id, transport maxDimension {1024,1280,1400}, backoff base, systemInstruction on/off.

**Kiosk A/B (prod flag)**  
One change per cohort. Primary: time from CTA/snap to first paintable try-on (`t_decode_paint - t_snap`). Secondary: completion rate, second-garment time, env apply time, cancel rate, $/session. Run ≥1 full day or ≥200 sessions per arm.

**Success bars (suggested)**  
- p50 interactive try-on ≤ current − 20% after model/transport wins, or hold wall clock and cut perceived wait via R2/R8.  
- Orphan retry rate → near zero with R4.  
- Env path: speculative hit rate >50% with abort on look change, cost per session within budget.

**Decision rule**  
Ship UX unlocks on green visual QA. Ship model/transport only if quality score (internal 1–5 face/frame fidelity) does not drop >0.3 vs control on the eyewear set.
