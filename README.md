# مبدع (Mubdi) — AI Design Studio

Integrated AI design studio. Section 1: Social Media Designs.

## Structure
Monorepo (pnpm workspaces): `apps/{desktop,web,api}`, `packages/{core,schemas,psd-engine,renderer,adapters,layout,ui,brand}`.

## Getting started
```
pnpm install
pnpm build
pnpm typecheck
pnpm test:unit
```

## Run desktop (Tier 1)
```
cd apps/desktop && pnpm dev
```

## Run API
```
cd apps/api && pnpm dev
```

## Key capabilities
- Prompt (Arabic/English) -> validated Design Brief -> Design Spec -> 3 variants.
- Layered PSD export (live text, groups, masks, effects) via ag-psd.
- Arabic-correct rendering via Chromium.
- Conversational editing as Spec diffs.
- Adapter router with fallback (Tier 1 native always available).

## Docs
- `docs/discovery-report.md` — Phase 0 decisions & evidence.
- `docs/security/threat-model.md` — STRIDE threat model.
- `docs/architecture/` — architecture notes.

## License
TBD.