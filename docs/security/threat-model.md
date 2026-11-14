# Threat Model (STRIDE) — Mubdi

## Scope
Desktop app (Electron) + cloud backend (Fastify) + local adapters (Photoshop/Illustrator/ImageMagick) + AI provider gateway. Data: user accounts, workspaces, brand kits, projects, assets, prompts, generated designs, audit logs.

## Assets
- User credentials & sessions (tokens, passkeys)
- Brand kits & proprietary assets
- Project/design files (PSD) and version history
- AI provider API keys (server-side only)
- Adapter command channels (local app control)
- Audit logs

## STRIDE

### Spoofing
- Stolen/leaked access tokens -> short-lived JWT (15 min) + rotating refresh tokens, device sessions list + remote revoke.
- Phishing of login -> OIDC-style login, passkeys/WebAuthn preferred, CSRF protection, secure cookies.
- Adapter impersonation -> main process validates adapter channel; only whitelisted adapters registered.

### Tampering
- Client-side data mutation -> server-side authorization on every route; RLS in DB.
- PSD/file import tampering -> parse in sandboxed worker with memory/time limits; type sniffing; reject decompression bombs.
- Prompt injection -> LLM outputs structured JSON validated by schema; no tool/shell/file access to model; brand text treated as untrusted.

### Repudiation
- Missing audit trail -> audit log for auth, data access, adapter actions, computer-control actions; request IDs in logs.

### Information Disclosure
- Cross-tenant data leak -> RLS + per-route authz tests (automated matrix).
- Secrets in repo/logs -> pre-commit secret scan, log redaction, OS keychain on desktop, secrets manager on server.
- Asset URL leakage -> signed short-lived URLs.
- Metadata (EXIF) in uploads -> strip metadata.

### Denial of Service
- Oversized uploads -> size limits, type sniffing, decompression-bomb protection.
- Rate abuse -> per user/IP/workspace rate limits, quotas, bot protection on public endpoints.
- Heavy renders -> BullMQ job queue, cancellable jobs, resource limits.

### Elevation of Privilege
- Renderer -> main process escape -> contextIsolation, nodeIntegration off, sandboxed renderer, minimal preload, validated channels, navigation lockdown.
- Shell injection via adapter commands -> whitelisted wrapper with validated args, no string concatenation, path traversal protection.
- Computer-control misuse -> opt-in per session, visible indicator, kill-switch, app whitelist, forbidden zones, confirmation for destructive actions, action log.
- RBAC bypass -> deny-by-default, server-side enforcement on every route.

## Mitigations (summary)
See SECURITY section of project spec. Each control maps to a test in CI (authz matrix, fuzzing, SAST, dependency audit).
