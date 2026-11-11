# Integrations (optional adapters)

Modules that **must not** live in `src/features/` core. Each adapter exposes `init(manifest)` + optional `dispose()` and registers through the shared registry.

## Pattern

```
integrations/
  registry.ts              # initAllIntegrations(manifest), disposeAllIntegrations()
  <adapter-id>/
    index.ts               # init(manifest), dispose
    …                      # adapter-specific modules
src/shared/integrations/
  track.ts                 # thin facade for product code (currently a no-op)
```

### Contract

```ts
export interface PlatformIntegration {
  id: string;
  init(manifest: PlatformManifest): void | Promise<void | (() => void)>;
  dispose?(): void;
}
```

### Rules

| Rule | Detail |
|------|--------|
| Manifest gate | `manifest.features.<flag>` |
| Optional config | `manifest.<adapter>` block |
| Registry | `initAllIntegrations` uses **dynamic `import()`** per enabled flag |
| Product code | Import facades from `src/shared/integrations/*` only — no SDK globals in features |
| Core | No adapter imports in `App.tsx` body except shared facades (`trackEvent`, etc.) |

## Current state (web demo)

No adapters are enabled. `trackEvent` is a no-op.

## Future slots

| Slot | Purpose | Status |
|------|---------|--------|
| `creative-loader/` | Sponsored moments during generate/try-on loading | Stub |
| `crm/` | Lead capture, store associate handoff | Stub |
| `payments/` | Checkout deep links | Out of try-on core |
| `analytics/` | Generic analytics | Wire through `trackEvent` |

## Rules for agents

- No integration SDK imports under `src/features/` or direct `window.*` SDK globals.
- No new core dependencies for ads, CRM, or analytics.
- Document new slots here before implementing.
