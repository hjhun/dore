# Dore Development Dashboard

This file is the handoff surface for future sessions.

Update it whenever development state changes.

## Current Focus

- Branch: `codex/add-agent-development-guide`
- Active plan: `docs/plan/ROADMAP.md`
- Active milestone: M0, Repository Bootstrap and Local Core
- Current task: create pnpm TypeScript scaffold and first tested local core slice

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
- [ ] M0 branch pushed.

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

## Verification Log

- 2026-06-21: Docs relative link check passed before plan work.
- 2026-06-21: TDD red phase confirmed with 6 failing suites for missing implementation files.
- 2026-06-21: `npx --yes pnpm@11.8.0 test` passed, 6 files and 13 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` passed.
- 2026-06-21: `npx --yes pnpm@11.8.0 doctor` passed and reported missing credentials without exposing secrets.
- 2026-06-21: daemon `/status` returned app, provider, Telegram, and trading status; endpoint is also covered by inject test.

## Known Constraints

- `gh` CLI is not installed in the current environment, so automatic PR creation is unavailable.
- WSL does not have a global `pnpm` binary. Verification used `npx --yes pnpm@11.8.0 ...`.
- Broker credentials and detailed securities API information will be supplied later by the user.
- Trading development must expose configuration and capability checks first; real trading remains disabled.

## Next Action

Finish M0 publishing:

1. Inspect diff.
2. Commit the plan and scaffold.
3. Push the branch.
4. Mark M0 branch pushed.

Then start M1 manual daily briefing.
