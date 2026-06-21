# Dore Development Dashboard

This file is the handoff surface for future sessions.

Update it whenever development state changes.

## Current Focus

- Branch: `codex/add-agent-development-guide`
- Active plan: `docs/plan/ROADMAP.md`
- Active milestone: M4, Development Agent MVP
- Current task: connect M4 engineering intake to executable workflows and task logs

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
- [x] M2 Telegram long polling adapter lifecycle implemented.
- [x] M2 branch pushed.
- [x] M3 Electron/Vite/React workspace shell added.
- [x] M3 Dashboard renderer smoke tests added.
- [x] M3 Dashboard renders daemon, scheduler, Telegram, and trading status from mocked data.
- [x] M3 Dashboard avoids rendering token/secret detail.
- [x] M3 Dashboard connects to daemon status API.
- [x] M3 Dashboard handles daemon offline state.
- [x] M3 Approvals panel implemented.
- [x] M3 Logs view implemented.
- [x] M3 Settings status implemented.
- [x] M3 approval decisions implemented.
- [x] M3 branch pushed.
- [x] M4 deterministic engineering intake package created.
- [x] M4 project intake workflow implemented.
- [x] M4 requirement draft workflow implemented.
- [x] M4 technical design draft workflow implemented.
- [x] M4 test command detection implemented.
- [x] M4 test execution record implemented with secret-like output redaction.
- [x] M4 repo inspection workflow implemented.
- [x] M4 engineering intake event logging implemented.
- [x] M4 review summary generator implemented.
- [x] M4 requirement/design/change-plan draft persistence implemented.
- [x] M4 engineering intake CLI entrypoint implemented.
- [x] M4 engineering intake daemon route implemented.
- [x] M4 review summary can be logged as task completion event.

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
- [x] Telegram long polling lifecycle shell is wired without real network calls.

## M3 Checklist

- [x] `apps/desktop` exists.
- [x] Electron main process skeleton exists.
- [x] Electron preload exposes only a narrow `dore` object.
- [x] Vite renderer shell exists.
- [x] React Dashboard component exists.
- [x] Renderer smoke test covers daemon section.
- [x] Renderer smoke test covers scheduler section.
- [x] Renderer smoke test covers Telegram section.
- [x] Renderer smoke test covers trading section.
- [x] Renderer smoke test confirms token-like detail is not rendered.
- [x] `pnpm build:desktop` succeeds.
- [x] Dashboard reads daemon status from local daemon API.
- [x] Dashboard maps daemon `/status` payload into renderer state.
- [x] Dashboard shows daemon offline fallback when fetch fails.
- [x] Approvals panel can show pending approval mock data.
- [x] Logs view can show action log mock data.
- [x] Settings status can show provider/Telegram/memory/trading setup state.
- [x] Pending approvals can be approved or rejected.

## M4 Checklist

- [x] `packages/engineering` exists.
- [x] Project intake workflow exists.
- [x] Requirement draft workflow exists.
- [x] Technical design workflow exists.
- [x] Repo inspection workflow exists.
- [x] Change plan generator exists.
- [x] Test detection and execution record exists.
- [x] Engineering intake can be logged through append-only event logs.
- [x] Review summary generator exists.
- [x] Requirement/design/change-plan drafts can be persisted under `memory/operations/engineering`.
- [x] `pnpm engineering:intake` CLI entrypoint exists.
- [x] `POST /engineering/intake` daemon route exists.
- [x] Review summary outcomes can be recorded in append-only task logs.
- [ ] Small repo change can be planned, implemented, tested, and logged through daemon/task logs.

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
- 2026-06-21: M2 scheduler and Telegram foundations pushed to `origin/codex/add-agent-development-guide` at commit `0200e9a`.
- 2026-06-21: M2 Telegram long polling lifecycle tests added; `npx --yes pnpm@11.8.0 test` passed, 9 files and 23 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` passed after Telegram lifecycle shell.
- 2026-06-21: M2 Telegram polling lifecycle shell pushed to `origin/codex/add-agent-development-guide` at commit `2d67882`.
- 2026-06-21: M3 Dashboard TDD red phase confirmed when TSX tests were not included, then missing `Dashboard.tsx` failed correctly after Vitest include fix.
- 2026-06-21: `npx --yes pnpm@11.8.0 test` passed, 10 files and 25 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` passed.
- 2026-06-21: `npx --yes pnpm@11.8.0 build:desktop` passed.
- 2026-06-21: M3 Electron dashboard foundation pushed to `origin/codex/add-agent-development-guide` at commit `736584a`.
- 2026-06-21: M3 daemon status mapper and offline fallback tests added; `npx --yes pnpm@11.8.0 test` passed, 11 files and 28 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` and `npx --yes pnpm@11.8.0 build:desktop` passed after daemon-connected dashboard work.
- 2026-06-21: M3 daemon-connected dashboard pushed to `origin/codex/add-agent-development-guide` at commit `6cce905`.
- 2026-06-21: M3 Approvals, Logs, and Settings panel tests added; TDD red phase confirmed for missing panels.
- 2026-06-21: `npx --yes pnpm@11.8.0 test` passed, 11 files and 29 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` passed.
- 2026-06-21: `npx --yes pnpm@11.8.0 build:desktop` passed.
- 2026-06-21: M3 dashboard panels pushed to `origin/codex/add-agent-development-guide` at commit `f07c68f`.
- 2026-06-21: M3 approval decision tests added; TDD red phase confirmed for missing approve/reject buttons.
- 2026-06-21: `npx --yes pnpm@11.8.0 test` passed, 11 files and 31 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` passed after approval decision implementation.
- 2026-06-21: `npx --yes pnpm@11.8.0 build:desktop` passed after approval decision implementation.
- 2026-06-21: M3 approval decisions pushed to `origin/codex/add-agent-development-guide` at commit `dcb4f6b`.
- 2026-06-21: M4 engineering intake tests added; TDD red phase confirmed for missing `packages/engineering/src/index.ts`.
- 2026-06-21: `npx --yes pnpm@11.8.0 test` passed, 12 files and 35 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` passed after M4 intake foundation.
- 2026-06-21: M4 engineering intake foundation pushed to `origin/codex/add-agent-development-guide` at commit `7a35343`.
- 2026-06-21: M4 repo inspection and intake event logging tests added; TDD red phase confirmed for missing `inspectRepository` and `appendProjectIntakeEvent`.
- 2026-06-21: `npx --yes pnpm@11.8.0 test` passed, 12 files and 38 tests.
- 2026-06-21: `npx --yes pnpm@11.8.0 build` passed after M4 repo inspection and logging.
- 2026-06-21: `npx --yes pnpm@11.8.0 build:desktop` passed after M4 repo inspection and logging.
- 2026-06-21: M4 repo inspection and intake event logging pushed to `origin/codex/add-agent-development-guide` at commit `68ff91b`.
- 2026-06-22: M4 review summary, draft persistence, and CLI tests added; TDD red phase confirmed for missing `createReviewSummary`, `persistProjectIntakeDrafts`, `runEngineeringIntake`, and CLI module.
- 2026-06-22: `npx --yes pnpm@11.8.0 test` passed, 13 files and 44 tests.
- 2026-06-22: `npx --yes pnpm@11.8.0 build` passed after M4 review summary, persistence, and CLI work.
- 2026-06-22: `npx --yes pnpm@11.8.0 build:desktop` passed after M4 review summary, persistence, and CLI work.
- 2026-06-22: `DORE_MEMORY_ROOT=/tmp/dore-engineering-cli-test DORE_NOW=2026-06-22T00:00:00.000Z npx --yes pnpm@11.8.0 engineering:intake "Add review summary CLI"` wrote requirements, technical design, change plan, intake JSON, and event JSONL.
- 2026-06-22: M4 review summary, draft persistence, and CLI entrypoint pushed to `origin/codex/add-agent-development-guide` at commit `f8e723c`.
- 2026-06-22: M4 daemon route and review task log tests added; TDD red phase confirmed for missing `POST /engineering/intake` and `appendReviewSummaryEvent`.
- 2026-06-22: `npx --yes pnpm@11.8.0 test` passed, 14 files and 47 tests.
- 2026-06-22: `npx --yes pnpm@11.8.0 build` passed after M4 daemon route and review task log work.
- 2026-06-22: `npx --yes pnpm@11.8.0 build:desktop` passed after M4 daemon route and review task log work.

## Known Constraints

- `gh` CLI is not installed in the current environment, so automatic PR creation is unavailable.
- WSL does not have a global `pnpm` binary. Verification used `npx --yes pnpm@11.8.0 ...`.
- Broker credentials and detailed securities API information will be supplied later by the user.
- Trading development must expose configuration and capability checks first; real trading remains disabled.

## Next Action

Start M4 Development Agent MVP:

1. Add execution workflow that records implementation/test outcomes against the task log.
2. Connect review summaries to the generated intake artifacts.
3. Expose M4 task status in daemon `/status` or desktop dashboard.
