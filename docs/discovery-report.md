# Discovery Report — Mubdi (Phase 0)

Date: 2026-11-14. Status: awaiting approval before Phase 1.

## 1. Repository & Tooling (Step 0.1)
- Monorepo created at `C:\Users\Power tech\Documents\mubdi` with pnpm workspaces.
- Structure: `apps/{desktop,web,api}`, `packages/{core,schemas,psd-engine,renderer,adapters,layout,ui,brand}`, `spikes/*`, `docs/*`, `.github/workflows/ci.yml`.
- Tooling: TypeScript strict (base tsconfig), ESLint flat config, Prettier, Vitest, Husky + lint-staged pre-commit, CI (typecheck/lint/test + gitleaks + npm audit).
- Secret scanning: gitleaks in CI; pre-commit hook runs lint-staged. Dependency audit in CI.
- Commit: initial structure on `main`.

## 2. Spike A — PSD writing with ag-psd
- Library: ag-psd 28.5.1 + @napi-rs/canvas 1.1.1 (prebuilt native, no Python needed).
- Proven: writePsdBuffer produces valid PSD; round-trip readPsd validates structure; Photoshop 2025 opens the file without crash (process stayed alive).
- Verified in output: 7 layer groups in mandatory order (90_Background … 00_Guides), live text layer text round-trips ('ملتقى التطوع الجامعي'), mask present, dropShadow effect present.
- Limits found:
  - Text fillColor must be a Color object {r,g,b}, not normalized array.
  - Layer image data: provide `imageData` (Uint8ClampedArray) or a canvas; writing without canvas works if we construct ImageData manually.
  - Effects units must be capitalized enum ('Pixels', 'Points', …).
  - Mask requires bounds; density/feather numbers.
  - No canvas needed for writing; canvas only needed for reading composite/layer bitmaps (we use @napi-rs/canvas).
  - Text direction/language attributes: ag-psd supports `orientation`, `paragraphStyle.justification`; full ME "World-Ready" attributes (rightToLeft, etc.) need verifying against Photoshop's actual rendering — flagged for Phase 6.
- Verdict: ag-psd is sufficient for Tier 1 layered PSD. PASS.

## 3. Spike B — MCP servers
| Server | Maintained | OS | Mechanism | License | Smoke test |
|---|---|---|---|---|---|
| zachshallbetter/adobe-mcp (photoshop/illustrator/aftereffects/premiere/indesign) | Active (v0.3.0 suite, 2026-10) | macOS + Windows | ExtendScript; Premiere via UXP plugin | MIT | Not individually smoked (large); architecture documented; static audits |
| ie3jp/illustrator-mcp-server | Active (v1.10.3, 2026-09) | macOS + Windows | ExtendScript via osascript (mac) / PowerShell COM (win); file-based result passing | MIT | PASS — 69 tools listed over stdio |
| alisaitteke/photoshop-mcp | Active (v1.7.38, 2026-11) | macOS + Windows | ExtendScript via AppleScript (mac) / COM (win); optional UXP bridge for Neural Filters | MIT | PASS — 100+ tools listed over stdio |
| bthurlow/imagemagick-mcp | Low (8 commits, 2026-04) | n/a | wraps ImageMagick CLI | MIT | NOT published to npm; not suitable as dependency |

Decisions:
- Photoshop adapter: wrap alisaitteke/photoshop-mcp (most maintained, both platforms, Node 18+, 128 tools incl. recipes). Tier 2 "polish & verify" + round-trip open/render.
- Illustrator adapter: wrap ie3jp/illustrator-mcp-server (66 tools, stable Illustrator, both platforms).
- ImageMagick: do NOT use MCP; call `magick` binary directly via whitelisted command wrapper (ImageMagick 7.1.2 installed locally). More stable, fewer deps.
- adobe-mcp suite: optional future enhancement for cross-app workflows; not required for Tier 1/2.

## 4. Spike C — Desktop shell
- Tauri: requires Rust toolchain (not installed); would force Rust for native parts and complicate MCP/ag-psd integration. Rejected for v1.
- Electron 45.3.2: installs cleanly; Node-native fit for ag-psd, @napi-rs/canvas, better-sqlite3, MCP stdio clients; Chromium rendering for Arabic; mature code-signing/auto-update (electron-updater); contextIsolation security model.
- Decision: Electron. Justification: TS-everywhere team, existing Node ecosystem fit, Arabic via Chromium, no Rust dependency. Revisit Tauri if bundle size becomes a release gate (Phase 9).

## 5. Spike D — Arabic shaping/rendering (Tier 1)
- Renderer approach: Chromium-based (Electron renderer / headless Chromium) with web fonts (Cairo, Tajawal, IBM Plex Sans Arabic, Noto Kufi Arabic, Readex Pro, Almarai + Latin pairs).
- Evidence: 10 hard Arabic samples rendered via Playwright/Chromium (basic RTL, diacritics, mixed scripts, Arabic-Indic numerals, Western numerals, long paragraph, ligatures, punctuation, tashkeel spacing, kashida). All rendered without broken joins. Screenshots saved under `spikes/arabic/out/`.
- For PSD live text: rely on Photoshop's own engine; detect World-Ready/ME text engine via adapter; Safe/Editable modes per spec.
- Verdict: Chromium rendering is Arabic-correct for preview/critique. PASS.

## 6. Spike E — Backend baseline
- Stack decision: Node.js 22 + TypeScript + Fastify (fast, schema-friendly, plugin ecosystem) + PostgreSQL + Drizzle ORM + Redis + BullMQ + S3-compatible storage + OpenAPI (via @fastify/swagger) + WebSocket/SSE progress.
- Justification: single language (TS) across desktop/web/api; Fastify performance; Drizzle type-safe; BullMQ for cancellable/progress jobs; row-level security via Postgres RLS.
- Load test (skeleton Fastify, 1 endpoint validating brief): 2000 req, 50 concurrency -> 528 rps, 0 failures, p50 76ms, p95 211ms, p99 405ms.
- Verdict: stack viable. PASS.

## 7. Decisions Summary
1. Monorepo: pnpm workspaces (already available).
2. PSD engine: ag-psd + @napi-rs/canvas. PASS.
3. Desktop shell: Electron.
4. Backend: Node+Fastify+Postgres+Redis/BullMQ+S3.
5. ImageMagick: direct CLI, not MCP.
6. Photoshop adapter: alisaitteke/photoshop-mcp.
7. Illustrator adapter: ie3jp/illustrator-mcp-server.
8. Tier 1 renderer: Chromium-based for preview; ag-psd for PSD.

## 8. Risks
- ag-psd text direction attributes (rightToLeft, ME engine) not fully verified against Photoshop rendering; Phase 6 must validate with Photoshop render + pixel-diff.
- Electron bundle size / startup; mitigate with lazy loading and code splitting (Phase 5/9).
- MCP servers are third-party; pin versions, wrap behind adapter interface, mock in tests, graceful fallback to Tier 1.
- Arabic font licensing: bundle only open-license fonts; track in manifest (Phase 3).
- Cross-tenant isolation must be enforced at DB (RLS) + tests (Phase 4).

## 9. Phased Plan (confirm)
Phase 1: Monorepo packages, schemas, brief engine, presets, Design Spec, Tier 1 renderer -> 3 PNG variants.
Phase 2: PSD export engine.
Phase 3: Layout + Arabic typography + Brand Kit + Safe/Editable mode.
Phase 4: Backend + security baseline + CI security tests.
Phase 5: Frontend/design system + desktop shell + Setup Wizard + layers panel.
Phase 6: Photoshop/Illustrator adapters + router + PSD verification + round-trip.
Phase 7: PhotoCraft/VectorCraft + computer-control tier.
Phase 8: Self-critique + conversational editing + history + series + captions.
Phase 9: Polish, installer, full security review, perf, docs.

## 10. Gate
Awaiting approval to proceed to Phase 1.
