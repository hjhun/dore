# Dore Development Dashboard

This file is the handoff surface for future sessions.

Update it whenever development state changes.

## Current Focus

- Branch: `codex/add-agent-development-guide`
- Active plan: `docs/plan/ROADMAP.md`
- Active milestone: M2, Scheduler and Telegram MVP
- Current task: extend M2 from pure scheduler/Telegram command foundation to daemon integration

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
- [x] M2 scheduler tests added.
- [x] M2 daily 06:00 KST job registration implemented.
- [x] M2 Telegram allowlist tests added.
- [x] M2 Telegram command skeleton implemented for `/status`, `/briefing`, `/usage`, `/stop`.
- [x] M2 daemon scheduler integration implemented.
- [x] M2 Telegram adapter safety status implemented.
- [ ] M2 Telegram long polling adapter implemented.
- [ ] M2 branch pushed.

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

## M2 Checklist

- [x] `packages/scheduler` exists.
- [x] Scheduler rejects invalid time formats.
- [x] Scheduler registers `daily_briefing_0600_kst` at `06:00` `Asia/Seoul`.
- [x] `packages/telegram` exists.
- [x] Telegram command handler ignores all commands when allowlist is empty.
- [x] Telegram command handler rejects users outside the allowlist.
- [x] Telegram command handler routes `/status`.
- [x] Telegram command handler routes `/briefing`.
- [x] Telegram command handler routes `/usage`.
- [x] Telegram command handler routes `/stop`.
- [x] Daemon exposes scheduled job status.
- [x] Telegram adapter is disabled without token or allowlist.
- [ ] Telegram long polling network loop is wired.

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
- 2026-06-21: M2 TDD red phase confirmed with missing scheduler/telegram implementation files.
- 2026-06-21: `npx --yes pnpm@11.8.0 test` passed, 9 files and 20 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` passed.
- 2026-06-21: M2 daemon scheduler and Telegram adapter safety tests added; `npx --yes pnpm@11.8.0 test` passed, 9 files and 21 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` passed after M2 daemon integration.

## Known Constraints

- `gh` CLI is not installed in the current environment, so automatic PR creation is unavailable.
- WSL does not have a global `pnpm` binary. Verification used `npx --yes pnpm@11.8.0 ...`.
- Broker credentials and detailed securities API information will be supplied later by the user.
- Trading development must expose configuration and capability checks first; real trading remains disabled.

## Next Action

Continue M2 Telegram long polling shell:

1. Add tests for a long polling adapter shell that does not start when disabled.
2. Add adapter start/stop lifecycle without real network calls.
3. Connect adapter status into daemon status.
4. Keep real Telegram network calls out of tests.
