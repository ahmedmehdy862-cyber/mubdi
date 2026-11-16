# مبدع (Mubdi) — AI Design Studio

Desktop AI design studio. Section 1: Social Media Designs.
Arabic/English prompt → 3 editable, layered PSD variants → conversational editing → Photoshop/Illustrator round-trip.

**Download (Windows, portable):** [Mubdi-win32.zip](https://github.com/ahmedmehdy862-cyber/mubdi/releases/latest) — unzip and run `Mubdi.exe`; no install and no network required.

## What it does

- **Prompt → Brief → Spec → 3 variants.** A deterministic Tier 1 engine always works, with no Photoshop, LLM, or network required.
- **Real layered PSDs.** Live text, vector shapes, masked images, logo, layer effects, named and grouped layers — a flattened image is never an output.
- **Arabic is a release gate.** Correct shaping, RTL flow, diacritics, Arabic-Indic numerals, Cairo/Almarai type.
- **Design intelligence.** Every variant is generated against measured rules (colour theory, type scales, 8pt grid, composition archetypes, art directions), then scored and auto-fixed.
- **Conversational editing.** Requests become Spec diffs, so edits stay undoable and reversible.

## Structure

pnpm monorepo:

| Path | Responsibility |
|---|---|
| `apps/desktop` | Electron shell (Tier 1, offline) |
| `apps/api` | Fastify + Zod API (JWT, tenants, rate-limit) |
| `apps/web` | Marketing/landing surface |
| `packages/schemas` | Zod schemas + platform presets (single source of truth) |
| `packages/core` | Brief parser, Spec generation, critique, auto-fix, conversational edits |
| `packages/design-knowledge` | Design curriculum: colour, typography, grid, composition, art directions, rubric, coach, creativity |
| `packages/renderer` | Canvas PNG renderer with Arabic shaping |
| `packages/psd-engine` | Layered PSD write/validate/import (`ag-psd`) |
| `packages/adapters` | Photoshop / Illustrator adapters behind one interface |
| `packages/brand` | Brand kit |
| `packages/layout`, `packages/ui` | Layout scoring stub, shared UI |

## Getting started

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test:unit
```

## Run desktop (Tier 1)

```bash
cd apps/desktop && pnpm dev
```

Build the portable Windows app:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-desktop.ps1 -OutDir F:\Mubdi
```

## Run API

```bash
cd apps/api && pnpm dev
```

## Design intelligence

`packages/design-knowledge` is the engine's design brain — 10 skill areas, 28
principles, 10 art directions, 11 composition archetypes, 10 concept paths, and a
weighted rubric with hard score caps:

- **Generation:** accessible palettes (contrast-guaranteed), modular type scales,
  RTL-aware 8pt grids, measured composition, safe-area clamping.
- **Diversity:** direction families (clean/bold/elegant/organic) plus archetype
  rotation guarantee three genuinely different ideas, not three colour swaps.
- **Critique:** 9 weighted categories, critical-finding caps (1 critical → 79,
  2+ → 62, 3 majors → 84), Arabic art-director report.
- **Auto-fix:** conservative loop (contrast, Arabic tracking, font floor, type
  ladder, spacing rhythm, alignment, safe areas) that keeps the best result and
  reverts regressions.

Full curriculum, thresholds, and extension guide: [`docs/design-intelligence.md`](docs/design-intelligence.md).

## Tests

`pnpm test:unit` runs 6 suites / 40 tests, including the design-knowledge suite
(palette contrast, type floor, RTL grid, hierarchy, measured composition,
good-vs-broken rubric comparison, ink-density, colour counting, auto-fix, variant
diversity, brand logo, knowledge snapshot, creativity).

Generate a demo set (PNG + PSD + Arabic report):

```bash
node packages/psd-engine/dist/design-demo.mjs
```

Outputs to `out/design-demo/` — each PSD passes `validatePsd` (named groups, live
text, logo, safe zones).

End-to-end check of the installed app (needs `--remote-debugging-port=9222`):

```bash
node scripts/verify-desktop.mjs 9222
```

It drives the real UI, then verifies 3 distinct directions/archetypes, non-trivial
PNG previews, PSD export → re-import → merge, and the auto-fix path.

## Docs

- [`docs/design-intelligence.md`](docs/design-intelligence.md) — design curriculum, rubric, thresholds, extension guide.
- [`docs/discovery-report.md`](docs/discovery-report.md) — Phase 0 decisions & evidence.
- [`docs/security/threat-model.md`](docs/security/threat-model.md) — STRIDE threat model.

## License

TBD.
