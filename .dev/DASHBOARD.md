# Dore Development Dashboard

This file is the handoff surface for future sessions.

Update it whenever development state changes.

## Current Focus

- Branch: `codex/add-agent-development-guide`
- Active plan: `docs/plan/ROADMAP.md`
- Active milestone: M2, Scheduler and Telegram MVP
- Current task: add scheduler and Telegram command foundation after completing manual daily briefing

## Milestone Progress

- [x] Product/design drafts prepared under `docs/drafts/`.
- [x] Development plan prepared under `docs/plan/`.
- [x] Agent development rules prepared in `AGENTS.md`.
- [x] Development dashboard created.
- [x] pnpm workspace scaffolded.
- [x] Runtime contracts implemented with tests.
- [x] Config schema and loader implemented with tests.
- [x] Memory bootstrap implemented with tests.
- [x] Append-only event log implemented with tests.
- [x] Model routing implemented with tests.
- [x] Daemon `/status` implemented with tests.
- [x] `doctor` command implemented and manually verified.
- [x] M0 `pnpm test` passes.
- [x] M0 `pnpm build` passes.
- [x] M0 branch pushed.
- [x] M1 briefing tests added.
- [x] M1 deterministic fallback briefing implemented.
- [x] M1 `pnpm briefing:run` writes Markdown and JSON daily logs.
- [x] M1 usage JSONL record written.
- [x] M1 branch pushed.

## M0 Checklist

- [x] `package.json` workspace scripts exist.
- [x] `pnpm-workspace.yaml` exists.
- [x] `tsconfig.base.json` exists.
- [x] `packages/contracts` exists.
- [x] `packages/config` exists.
- [x] `packages/memory` exists.
- [x] `packages/core` exists.
- [x] `packages/model-gateway` exists.
- [x] `apps/daemon` exists.
- [x] `configs/dore.config.example.yaml` exists.
- [x] Tests cover `real_trading_enabled: false` default.
- [x] Tests cover same-provider low/high model routing.
- [x] Tests cover memory directory bootstrap.
- [x] Tests cover event JSONL append.
- [x] Tests cover daemon status payload.

## M1 Checklist

- [x] `packages/briefing` exists.
- [x] Tests cover deterministic fallback without LLM credentials.
- [x] Tests cover required dashboard sections.
- [x] Tests cover Markdown output.
- [x] Tests cover JSON dashboard output.
- [x] Tests cover usage JSONL output.
- [x] `pnpm briefing:run` writes under `memory/logs/daily/` by default.
- [x] `DORE_MEMORY_ROOT` can redirect briefing output for tests/manual verification.
- [x] Market data remains placeholder/not configured until user supplies broker/data details.
- [x] Real trading remains disabled.

## Verification Log

- 2026-06-21: Docs relative link check passed before plan work.
- 2026-06-21: TDD red phase confirmed with 6 failing suites for missing implementation files.
- 2026-06-21: `npx --yes pnpm@11.8.0 test` passed, 6 files and 13 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` passed.
- 2026-06-21: `npx --yes pnpm@11.8.0 doctor` passed and reported missing credentials without exposing secrets.
- 2026-06-21: daemon `/status` returned app, provider, Telegram, and trading status; endpoint is also covered by inject test.
- 2026-06-21: M0 scaffold pushed to `origin/codex/add-agent-development-guide` at commit `9c6018c`.
- 2026-06-21: M1 TDD red phase confirmed with missing `packages/briefing/src/index.ts`.
- 2026-06-21: `npx --yes pnpm@11.8.0 test` passed, 7 files and 15 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` passed.
- 2026-06-21: `DORE_MEMORY_ROOT=/tmp/dore-briefing-test npx --yes pnpm@11.8.0 briefing:run` created Markdown, JSON, and usage JSONL outputs.
- 2026-06-21: M1 manual daily briefing pushed to `origin/codex/add-agent-development-guide` at commit `81b4fba`.

## Known Constraints

- `gh` CLI is not installed in the current environment, so automatic PR creation is unavailable.
- WSL does not have a global `pnpm` binary. Verification used `npx --yes pnpm@11.8.0 ...`.
- Broker credentials and detailed securities API information will be supplied later by the user.
- Trading development must expose configuration and capability checks first; real trading remains disabled.

## Next Action

Start M2 scheduler and Telegram foundation:

1. Add scheduler tests for 06:00 KST job registration.
2. Add Telegram allowlist tests.
3. Implement daemon scheduler module.
4. Implement Telegram command skeleton for `/status`, `/briefing`, `/usage`, and `/stop`.
