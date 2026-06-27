# Developer Progress

## Status

- State: complete
- Last updated: 2026-06-27 14:49 KST

## Inputs Reviewed

- `.dev/DASHBOARD.md`
- `docs/plan/ROADMAP.md`
- `docs/plan/REQUIREMENTS_TRACE.md`
- `apps/daemon/src/server.ts`
- `packages/contracts/src/index.ts`
- `packages/core/src/index.ts`
- `packages/telegram/src/index.ts`
- `packages/telegram/src/telegram.test.ts`
- `apps/daemon/src/status.test.ts`
- `apps/daemon/src/runtime-api.test.ts`
- `apps/desktop/src/renderer/Dashboard.tsx`
- `apps/desktop/src/renderer/Dashboard.test.tsx`
- `apps/desktop/src/renderer/daemon-status.ts`
- `apps/desktop/src/renderer/daemon-status.test.ts`
- `packages/memory/src/index.ts`
- `packages/memory/src/bootstrap.test.ts`
- `packages/engineering/src/index.ts`
- `packages/engineering/src/intake.test.ts`
- `packages/trading/src/index.ts`
- `packages/trading/src/trading.test.ts`
- `docs/drafts/23_PRODUCT_REQUIREMENTS.md`
- `docs/drafts/26_ACCEPTANCE_CRITERIA.md`
- `docs/drafts/09_HERMES_COMPATIBILITY.md`
- `docs/drafts/04_TOOLS_AND_DATA.md`
- `packages/config/src/index.ts`
- `packages/config/src/config.test.ts`
- `packages/model-gateway/src/index.ts`
- `packages/model-gateway/src/routing.test.ts`
- `apps/daemon/src/health.ts`
- `apps/daemon/src/status.test.ts`
- Official OpenAI docs for API key auth, Codex auth, and workload identity federation
- `apps/daemon/src/engineering-route.test.ts`
- Local Codex CLI help and local Codex OAuth auth metadata

## Current Work

- Completed M10 Telegram Operational Bot.
- Completed M11 Desktop App Product Screens.
- Completed M12 Memory Management, Indexing, and Sensitive-Memory Flow.
- Completed M13 Development Agent Productization.
- Completed M14 Trading Watch, Strategy Lifecycle, and Paper Mode.
- Completed M15 Safety, Evaluation, Hermes Parity, and MVP Release Readiness.
- Added M16 broker connector input packet so the blocked broker/API prerequisites can be collected in a structured way.
- Added M16 broker connector readiness evaluator for the input packet start gate.
- Added M16 broker connector input packet file loader and CLI validator.
- Updated roadmap to keep M16/M17 blocked and continue with M18-M21 local hardening.
- Completed first M18 desktop operations slice.
- Completed M18 task/schedule actions slice.
- Completed M18 log date-filter slice.
- Completed M19 structured health/doctor slice.
- Completed M19 scheduler recovery status slice.
- Completed M19 runtime persistence boundary slice.
- Completed M19 backup/recovery and local auth diagnostics documentation.
- Completed M20 memory quality primitives slice.
- Completed M20 memory maintenance evals and daemon/desktop visibility.
- Completed M21 development task stage visibility slice.
- Completed M21 failed verification summary and likely-next-action slice.
- Completed M21 code-review report storage and desktop visibility slice.
- Completed M21 workflow risk review visibility slice.
- Completed M21 engineering memory-reflection improvements.
- Current implementation slice: OpenAI workload identity authentication support for Dore.
- Current implementation slice: Codex OAuth-backed local runner integration.
- M16/M17 remain blocked on broker/API inputs.

## 2026-06-27 OpenAI Workload Identity Auth Slice

- Added TDD coverage for OpenAI workload identity config, provider status, daemon health, usage records, token exchange, and token-exchange failure handling.
- Implemented `llm.providers.openai.auth_mode: workload_identity` config parsing with env-name based WIF inputs.
- Added model-gateway support for `OPENAI_AUTH_MODE=workload_identity`, official token exchange against `https://auth.openai.com/oauth/token`, and secret-safe usage records.
- Added daemon health/status visibility for workload identity readiness without exposing subject tokens or access tokens.
- Updated config example and LLM/runtime draft docs to replace the old browser-OAuth assumption with official API key and workload identity modes.

## 2026-06-27 Codex OAuth-backed Runner Slice

- Added Codex runner readiness metadata from the local Codex CLI and
  `auth.json` without exposing access or refresh token values.
- Added `runCodexAgentTask` to invoke `codex exec --cd <project> --json`
  through an injected executor and reuse the existing redacted execution record.
- Added `appendCodexAgentRunEvent` so Codex runner outcomes are logged without
  token fields or token values.
- Added daemon `/status.engineering.codex_runner` and
  `POST /engineering/tasks/:id/codex-run`.
- Verified real local `codex exec` succeeds with the existing Codex OAuth
  session and that daemon status exposes only token-presence booleans.

## Tests And Verification

- Red phase: `npx --yes pnpm@11.8.0 test -- packages/contracts/src/contracts.test.ts apps/daemon/src/runtime-api.test.ts` failed as expected.
- Missing behavior: `ApprovalRequestSchema` is undefined and M7 daemon endpoints return 404.
- Green phase: same targeted command passed after adding `ApprovalRequestSchema`, file-backed runtime task/approval state, daemon runtime endpoints, local/non-local request protection, and read endpoints for latest briefing, usage summary, and memory index.
- Full verification passed:
  - `npx --yes pnpm@11.8.0 test`
  - `npx --yes pnpm@11.8.0 build`
  - `npx --yes pnpm@11.8.0 build:desktop`
- Pending M8 red phase tests.
- M8 red phase: `npx --yes pnpm@11.8.0 test -- packages/model-gateway/src/routing.test.ts` failed because `createModelGateway`, `createBudgetGuard`, and `createProviderRegistry` are not implemented.
- M8 contract red phase: targeted contracts/model-gateway tests failed because `LlmUsageRecordSchema` and soft-limit warning payload were not implemented.
- M8 daemon status red phase: targeted daemon status test failed because provider auth mode and missing credential reason were not exposed.
- M8 green phase: targeted model-gateway/contracts/status tests pass after provider registry, gateway generate flow, usage records, budget guard, soft-limit warning, and status provider details were implemented.
- Full verification passed after M8:
  - `npx --yes pnpm@11.8.0 test`
  - `npx --yes pnpm@11.8.0 build`
  - `npx --yes pnpm@11.8.0 build:desktop`
- M9 red phase: `npx --yes pnpm@11.8.0 test -- packages/briefing/src/briefing.test.ts` failed because `runBriefingJob` is not implemented.
- M9 scheduler red phase: targeted scheduler test failed because `executeScheduledJob` is not implemented.
- M9 daemon red phase: targeted runtime API test failed because scheduled `/briefings/run` used manual trigger semantics.
- M9 green phase: targeted briefing/scheduler/daemon tests pass after scheduled briefing execution, retry/failure logs, shared delivery records, and daemon scheduled trigger semantics.
- Full verification passed after M9:
  - `npx --yes pnpm@11.8.0 test`
  - `npx --yes pnpm@11.8.0 build`
  - `npx --yes pnpm@11.8.0 build:desktop`
- Pending M10 red phase tests.
- M10 red phase: `npx --yes pnpm@11.8.0 test -- packages/telegram/src/telegram.test.ts` failed because `createDaemonTelegramContext`, `pushDailyBriefingSummary`, `notifyTelegramUsers`, and `redactTelegramSecrets` are not implemented.
- M10 green phase: targeted Telegram/status tests pass after daemon command context, HTTP daemon client, briefing push, notifications, readiness status, and redacted failure logging.
- Full verification passed after M10:
  - `npx --yes pnpm@11.8.0 test`
  - `npx --yes pnpm@11.8.0 build`
  - `npx --yes pnpm@11.8.0 build:desktop`
- M11 red phase: targeted desktop/runtime tests failed because `/logs/recent`, product dashboard sections, daemon status aggregation, approval client hook, log filters, and chat surface were not implemented.
- M11 green phase: targeted desktop/runtime tests pass after `/logs/recent`, dashboard metrics, status aggregation, approval client hook, categorized log filters, settings status, chat commands, and task/schedule surfaces.
- Full verification passed after M11:
  - `npx --yes pnpm@11.8.0 test`
  - `npx --yes pnpm@11.8.0 build`
  - `npx --yes pnpm@11.8.0 build:desktop`
- M12 red phase: targeted memory/runtime tests failed because memory writer, sensitive approval flow, operational memory writer, index/search, stale/conflict marking, and daemon memory route were not implemented.
- M12 green phase: targeted memory/runtime tests pass after Markdown memory writer, raw/wiki linkage, sensitive approval queueing, operational files, wiki search, stale/conflict marking, and daemon `POST /memory/records`.
- Full verification passed after M12:
  - `npx --yes pnpm@11.8.0 test`
  - `npx --yes pnpm@11.8.0 build`
  - `npx --yes pnpm@11.8.0 build:desktop`
- M13 red phase: targeted engineering tests failed because tool registry, workflow steps, review ordering, memory reflection, and high-risk approval assessment were not implemented.
- M13 green phase: targeted engineering tests pass after adding tool registry, development workflow, code review ordering, engineering memory reflection, and high-risk approval assessment.
- Full verification passed after M13:
  - `npx --yes pnpm@11.8.0 test`
  - `npx --yes pnpm@11.8.0 build`
  - `npx --yes pnpm@11.8.0 build:desktop`
- M14 red phase: targeted trading/status/desktop tests failed because market data source status, strategy templates, paper journal, trading journal summary, and dashboard visibility were not implemented.
- M14 green phase: targeted tests pass after adding market data quality status, strategy templates, deterministic signals, paper journal entries, trading journal summary, and daemon/desktop status mapping.
- Full verification passed after M14:
  - `npx --yes pnpm@11.8.0 test`
  - `npx --yes pnpm@11.8.0 build`
  - `npx --yes pnpm@11.8.0 build:desktop`
- M15 documentation gate completed:
- OpenAI workload identity red phase: targeted tests failed for missing config provider schema, missing provider WIF status, missing daemon health/status support, and unhandled token exchange failure.
- OpenAI workload identity green phase:
  - `npx --yes pnpm@11.8.0 test -- packages/config/src/config.test.ts packages/model-gateway/src/routing.test.ts apps/daemon/src/status.test.ts` passed, 17 files and 177 tests.
  - `npx --yes pnpm@11.8.0 test -- packages/config/src/config.test.ts packages/model-gateway/src/routing.test.ts packages/contracts/src/contracts.test.ts apps/daemon/src/status.test.ts` passed, 17 files and 178 tests.
  - `npx --yes pnpm@11.8.0 test -- packages/model-gateway/src/routing.test.ts` passed after token-exchange failure handling, 17 files and 179 tests.
- OpenAI workload identity broader verification:
  - `git diff --check` passed.
  - `npx --yes pnpm@11.8.0 test` passed, 17 files and 179 tests.
  - `npx --yes pnpm@11.8.0 build` passed.
  - `npx --yes pnpm@11.8.0 build:desktop` passed.
  - `npx --yes pnpm@11.8.0 doctor` passed with expected default API-key-mode OpenAI credential warning.
  - `OPENAI_AUTH_MODE=workload_identity ... npx --yes pnpm@11.8.0 doctor` passed with OpenAI workload identity readiness OK and no token value output.
  - WIF-mode daemon smoke on port 3199 passed; `/status` returned OpenAI `auth_mode: workload_identity`, configured true, and `trading.real_trading_enabled: false`.
  - Final auth contract cleanup removed stale `oauth` usage-record auth mode.
  - Final verification passed: `git diff --check`, `npx --yes pnpm@11.8.0 test`, `npx --yes pnpm@11.8.0 build`, `npx --yes pnpm@11.8.0 build:desktop`, and `npx --yes pnpm@11.8.0 doctor`.
- Codex runner red phase: targeted tests failed for missing
  `createCodexRunnerStatus`, `runCodexAgentTask`,
  `appendCodexAgentRunEvent`, daemon Codex runner status, and daemon
  `codex-run` route.
- Codex runner green phase:
  - `npx --yes pnpm@11.8.0 test -- packages/engineering/src/intake.test.ts apps/daemon/src/engineering-route.test.ts` passed, 17 files and 184 tests.
  - `codex exec --cd /home/hjhun/samba/workspace/dore --json 'Return only the word ready.'` passed with the local OAuth session.
  - Daemon smoke on port 3198 returned `engineering.codex_runner.available: true`, `auth_mode: chatgpt`, and no token values.
  - Full verification passed: `git diff --check`, `npx --yes pnpm@11.8.0 test`, `npx --yes pnpm@11.8.0 build`, `npx --yes pnpm@11.8.0 build:desktop`, and `npx --yes pnpm@11.8.0 doctor`.
  - `docs/plan/MILESTONE_15_MVP_ACCEPTANCE_AUDIT.md`
  - `docs/plan/EVAL_RUNBOOK.md`
  - `docs/plan/HERMES_MVP_PARITY.md`
  - `docs/plan/SESSION_LIFECYCLE.md`
  - `docs/plan/LOCAL_ONBOARDING_SECURITY.md`
  - roadmap/status docs updated to mark M0-M15 local MVP complete and M16-M17 post-MVP blocked.
- Full verification passed after M15:
  - docs/plan relative link check, 27 links checked.
  - `git diff --check`
  - `npx --yes pnpm@11.8.0 test`
  - `npx --yes pnpm@11.8.0 build`
  - `npx --yes pnpm@11.8.0 build:desktop`
- M16 preparation:
  - added `docs/plan/M16_BROKER_CONNECTOR_INPUT_PACKET.md`.
  - linked the input packet from `docs/plan/README.md`, `docs/plan/ROADMAP.md`, `docs/plan/PROJECT_STATUS_AUDIT.md`, and `.dev/DASHBOARD.md`.
  - docs/plan relative link check passed, 33 links checked.
  - `git diff --check` passed.
  - `npx --yes pnpm@11.8.0 test` passed, 16 files and 135 tests.
  - `npx --yes pnpm@11.8.0 build` passed.
  - `npx --yes pnpm@11.8.0 build:desktop` passed.
- M16 readiness evaluator:
  - red phase: `npx --yes pnpm@11.8.0 test -- packages/trading/src/trading.test.ts` failed because `assessBrokerConnectorInputPacket` was missing.
  - green phase: same command passed after adding readiness checks for official docs, terms, `secret_ref:` credentials, paper/sandbox status, risk limits, approval policy, and explicit user approval.
  - docs/plan relative link check passed, 33 links checked.
  - `git diff --check` passed.
  - `npx --yes pnpm@11.8.0 test` passed, 16 files and 138 tests.
  - `npx --yes pnpm@11.8.0 build` passed.
  - `npx --yes pnpm@11.8.0 build:desktop` passed.
- M16 CLI validator:
  - red phase: `npx --yes pnpm@11.8.0 test -- packages/trading/src/trading.test.ts apps/daemon/src/trading-m16-check.test.ts` failed because the JSON loader and CLI file were missing.
  - green phase: same command passed after adding `loadBrokerConnectorInputPacketFile`, `trading-m16-check.ts`, and root `trading:m16-check` script.
  - manual blocked check passed: `npx --yes pnpm@11.8.0 trading:m16-check configs/m16-broker-input.example.json` returned exit code 1.
  - docs/plan relative link check passed, 33 links checked.
  - `git diff --check` passed.
  - `npx --yes pnpm@11.8.0 test` passed, 17 files and 142 tests.
  - `npx --yes pnpm@11.8.0 build` passed.
  - `npx --yes pnpm@11.8.0 build:desktop` passed.
- Roadmap update:
  - added M18-M21 sequence for desktop operations, daemon reliability, memory quality, and development-agent workflow depth.
  - updated README, requirement trace, project audit, and dashboard current focus to M18.
- M18 desktop operations:
  - red phase: desktop tests failed for missing Config Validation, Memory Explorer details, log text search, approval action context, and mapper detail fields.
  - green phase: `npx --yes pnpm@11.8.0 test -- apps/desktop/src/renderer/Dashboard.test.tsx apps/desktop/src/renderer/daemon-status.test.ts` passed after adding the UI and mapper updates.
  - red phase: runtime API test failed because `/memory/index` did not expose frontmatter/source/conflict metadata.
  - green phase: `npx --yes pnpm@11.8.0 test -- apps/daemon/src/runtime-api.test.ts` passed after adding daemon memory-index metadata parsing.
  - red phase: desktop/runtime API tests failed for missing runtime task cancellation UI, daemon task client, scheduler run mapping, and daemon scheduler recent-run status.
  - green phase: `npx --yes pnpm@11.8.0 test -- apps/desktop/src/renderer/Dashboard.test.tsx apps/desktop/src/renderer/daemon-status.test.ts apps/daemon/src/runtime-api.test.ts` passed after adding desktop cancellation and scheduler recent-run visibility, 17 files and 146 tests.
  - red phase: desktop tests failed for missing log date input and missing `/logs/recent` time metadata mapping.
  - green phase: `npx --yes pnpm@11.8.0 test -- apps/desktop/src/renderer/Dashboard.test.tsx apps/desktop/src/renderer/daemon-status.test.ts` passed after adding log date filtering and log time mapping, 17 files and 147 tests.
  - docs/plan relative link check passed, 32 links checked.
  - `git diff --check` passed.
  - `npx --yes pnpm@11.8.0 test` passed, 17 files and 147 tests.
  - `npx --yes pnpm@11.8.0 build` passed.
  - `npx --yes pnpm@11.8.0 build:desktop` passed.
- M19 health/doctor:
  - red phase: `npx --yes pnpm@11.8.0 test -- apps/daemon/src/status.test.ts` failed because `/health`, `/status.health`, and `runDoctor` were missing.
  - green phase: same command passed after adding `apps/daemon/src/health.ts`, `/health`, `/status.health`, and shared doctor integration, 17 files and 150 tests.
  - red phase: desktop and Telegram tests failed because daemon health was not mapped into desktop state or Telegram `/status`.
  - green phase: `npx --yes pnpm@11.8.0 test -- apps/desktop/src/renderer/daemon-status.test.ts` passed after desktop health mapping, 17 files and 150 tests.
  - green phase: `npx --yes pnpm@11.8.0 test -- packages/telegram/src/telegram.test.ts` passed after Telegram health status text, 17 files and 150 tests.
  - full verification passed:
    - `npx --yes pnpm@11.8.0 test`
    - `npx --yes pnpm@11.8.0 build`
    - `npx --yes pnpm@11.8.0 build:desktop`
    - `git diff --check`
    - docs/plan relative link check, 32 links checked
    - `npx --yes pnpm@11.8.0 doctor`
- M19 scheduler recovery:
  - red phase: targeted daemon and desktop tests failed because scheduled jobs did not expose `next_run_at`, `failure_count`, `retry_status`, or desktop mapped fields.
  - green phase: `npx --yes pnpm@11.8.0 test -- apps/daemon/src/runtime-api.test.ts` passed after daemon recovery fields, 17 files and 150 tests.
  - green phase: `npx --yes pnpm@11.8.0 test -- apps/desktop/src/renderer/daemon-status.test.ts` passed after desktop scheduler recovery mapping, 17 files and 150 tests.
  - green phase: `npx --yes pnpm@11.8.0 test -- apps/daemon/src/status.test.ts` passed after failed briefing recovery coverage, 17 files and 151 tests.
  - full verification passed:
    - `npx --yes pnpm@11.8.0 test`
    - `npx --yes pnpm@11.8.0 build`
    - `npx --yes pnpm@11.8.0 build:desktop`
    - `git diff --check`
    - docs/plan relative link check, 32 links checked
    - `npx --yes pnpm@11.8.0 doctor`
- M19 persistence boundary:
  - red phase: `npx --yes pnpm@11.8.0 test -- packages/core/src/event-log.test.ts` failed because reusable atomic JSON/JSONL helpers were missing.
  - green phase: same command passed after adding core persistence helpers and moving runtime task/approval/event writes through them, 17 files and 153 tests.
  - full verification passed:
    - `npx --yes pnpm@11.8.0 test`
    - `npx --yes pnpm@11.8.0 build`
    - `npx --yes pnpm@11.8.0 build:desktop`
- M20 quality visibility:
  - red phase: targeted daemon/desktop tests failed because `GET /memory/quality`, desktop quality mapping, and Memory Explorer quality summary were missing.
  - green phase: `npx --yes pnpm@11.8.0 test -- apps/daemon/src/runtime-api.test.ts apps/desktop/src/renderer/daemon-status.test.ts apps/desktop/src/renderer/Dashboard.test.tsx` passed, 17 files and 156 tests.
  - full verification passed:
    - `npx --yes pnpm@11.8.0 test`
    - `npx --yes pnpm@11.8.0 build`
    - `npx --yes pnpm@11.8.0 build:desktop`
    - `git diff --check`
    - docs/plan relative link check, 28 checked links in current status docs
    - `npx --yes pnpm@11.8.0 doctor`
- M21 stage visibility:
  - red phase: targeted engineering/desktop tests failed because engineering task stages were missing from daemon status, desktop mapping, and the Engineering panel.
  - green phase: `npx --yes pnpm@11.8.0 test -- packages/engineering/src/intake.test.ts apps/daemon/src/engineering-route.test.ts apps/desktop/src/renderer/daemon-status.test.ts apps/desktop/src/renderer/Dashboard.test.tsx` passed, 17 files and 157 tests.
  - full verification passed:
    - `npx --yes pnpm@11.8.0 test`
    - `npx --yes pnpm@11.8.0 build`
    - `npx --yes pnpm@11.8.0 build:desktop`
    - `git diff --check`
    - docs/plan relative link check, 28 checked links in current status docs
    - `npx --yes pnpm@11.8.0 doctor`
- M21 failed verification summary:
  - red phase: targeted engineering/desktop tests failed because failed verification summary generation, daemon `failed_verification`, desktop mapping, and Engineering panel rendering were missing.
  - green phase: `npx --yes pnpm@11.8.0 test -- packages/engineering/src/intake.test.ts apps/daemon/src/engineering-route.test.ts apps/desktop/src/renderer/daemon-status.test.ts apps/desktop/src/renderer/Dashboard.test.tsx` passed, 17 files and 160 tests.
  - full verification passed:
    - `npx --yes pnpm@11.8.0 test`
    - `npx --yes pnpm@11.8.0 build`
    - `npx --yes pnpm@11.8.0 build:desktop`
    - `git diff --check`
    - docs/plan relative link check, 28 checked links in current status docs
    - `npx --yes pnpm@11.8.0 doctor`
- M21 code-review report visibility:
  - red phase: targeted engineering/desktop tests failed because code-review report event persistence, daemon review-report route, desktop mapping, and Engineering panel rendering were missing.
  - green phase: `npx --yes pnpm@11.8.0 test -- packages/engineering/src/intake.test.ts apps/daemon/src/engineering-route.test.ts apps/desktop/src/renderer/daemon-status.test.ts apps/desktop/src/renderer/Dashboard.test.tsx` passed, 17 files and 163 tests.
  - full verification passed:
    - `npx --yes pnpm@11.8.0 test`
    - `npx --yes pnpm@11.8.0 build`
    - `npx --yes pnpm@11.8.0 build:desktop`
    - `git diff --check`
    - docs/plan relative link check, 28 checked links in current status docs
    - `npx --yes pnpm@11.8.0 doctor`
- M21 workflow risk visibility:
  - red phase: targeted engineering/desktop tests failed because workflow risk review creation, daemon risk-review route, desktop mapping, and Engineering panel rendering were missing.
  - green phase: `npx --yes pnpm@11.8.0 test -- packages/engineering/src/intake.test.ts apps/daemon/src/engineering-route.test.ts apps/desktop/src/renderer/daemon-status.test.ts apps/desktop/src/renderer/Dashboard.test.tsx` passed, 17 files and 166 tests.
  - full verification passed:
    - `npx --yes pnpm@11.8.0 test`
    - `npx --yes pnpm@11.8.0 build`
    - `npx --yes pnpm@11.8.0 build:desktop`
    - `git diff --check`
    - docs/plan relative link check, 28 checked links in current status docs
    - `npx --yes pnpm@11.8.0 doctor`
- M21 memory reflection:
  - red phase: `npx --yes pnpm@11.8.0 test -- packages/engineering/src/intake.test.ts` failed because engineering memory reflection records did not include explicit decisions, regressions, and follow-up task sections.
  - green phase: same command passed after adding decision sections and engineering follow-up records, 17 files and 167 tests.
  - full verification passed:
    - `npx --yes pnpm@11.8.0 test`
    - `npx --yes pnpm@11.8.0 build`
    - `npx --yes pnpm@11.8.0 build:desktop`
    - `git diff --check`
    - docs/plan relative link check, 31 links checked
    - `npx --yes pnpm@11.8.0 doctor`
    - `git diff --check`
    - docs/plan relative link check, 32 links checked
    - `npx --yes pnpm@11.8.0 doctor`
- M19 runbook documentation:
  - added runtime state backup/recovery and local auth/token diagnostics to `docs/plan/LOCAL_ONBOARDING_SECURITY.md`.
  - full verification passed:
    - `npx --yes pnpm@11.8.0 test`
    - `npx --yes pnpm@11.8.0 build`
    - `npx --yes pnpm@11.8.0 build:desktop`
    - `git diff --check`
    - docs/plan relative link check, 33 links checked
    - `npx --yes pnpm@11.8.0 doctor`
- M20 memory quality:
  - red phase: `npx --yes pnpm@11.8.0 test -- packages/memory/src/bootstrap.test.ts` failed because `reviewMemoryQuality` and ranked search metadata were missing.
  - green phase: same command passed after adding duplicate/stale/conflict review queues and ranked memory search, 17 files and 155 tests.
  - full verification passed:
    - `npx --yes pnpm@11.8.0 test`
    - `npx --yes pnpm@11.8.0 build`
    - `npx --yes pnpm@11.8.0 build:desktop`
    - `git diff --check`
    - docs/plan relative link check, 33 links checked
    - `npx --yes pnpm@11.8.0 doctor`

## Decisions

- Keep M7 storage local and file-backed under `memory/data/runtime/` to match the existing JSON/JSONL persistence style.
- Keep existing engineering/trading routes intact and add generic runtime endpoints alongside them.
- Protect runtime endpoints for non-local requests while allowing localhost development and authenticated remote requests.
- Implement M8 provider adapters behind an injected client interface so tests do not require network credentials.
- Treat missing credentials as a normal unavailable provider state that still produces a redacted usage record.
- Keep OpenAI OAuth as an explicit later connection flow; M8 completes API-key provider foundation.
- Implement scheduled briefing execution inside `packages/briefing` first so daemon, Telegram, and desktop can consume the same persisted daily record.
- Keep live Telegram push and daemon-backed Telegram commands in M10; M9 produces the shared delivery record they will consume.
- Implement M10 primarily in `packages/telegram` with injected daemon and outbound sender interfaces so tests do not require Telegram network access.
- Keep Telegram network I/O behind injected sender/fetch interfaces; M10 verifies operational behavior without requiring a real bot token.
- Read Telegram readiness from configured token env and allowlist count, but never expose token values in daemon status.
- Keep M11 desktop data reads daemon-backed through narrow JSON endpoints, and keep approval persistence behind an injected client so renderer tests do not require a live daemon.
- Implement `/logs/recent` as a read-only local JSONL aggregator for MVP; deeper log search/indexing can be revisited after M12 memory indexing.
- Keep M12 memory records human-readable Markdown with minimal frontmatter parsing instead of introducing a database.
- Treat sensitive and `secret_ref` memory writes as approval-required by default; normal writes remain local-only and audited.
- Keep M13 productization as deterministic orchestration primitives around the existing engineering executor; avoid introducing autonomous execution outside existing approval boundaries.
- Keep M14 paper mode explicitly local and non-brokered; `broker_order_submitted` is always false for paper journal entries.
- Treat M15 as a documentation and release-readiness acceptance gate; no product code changes were required after the M14 implementation.
- Do not start M16 broker connector work without official broker/API documentation, terms/account constraints, credential references, desired risk limits, and explicit approval policy.
- Use `docs/plan/M16_BROKER_CONNECTOR_INPUT_PACKET.md` as the required intake artifact before any broker-specific implementation.
- Keep M16 readiness evaluation broker-agnostic until official source material is provided.
- Use `trading:m16-check` for file-based validation before starting broker-specific implementation.
- Continue with M19 while M16/M17 wait for broker/API inputs.
- Keep M18 changes inside existing Dashboard aggregation until a larger desktop routing/navigation split becomes necessary.
- Keep M19 health checks status-oriented and value-redacted; expose check state and environment variable names, not credential values.
- Keep M19 persistence changes focused on runtime core state first; broader package-specific write paths can be hardened in later slices if needed.
- Keep M20 memory quality primitives Markdown/frontmatter-based until daemon or desktop surfaces require a broader index.
- Keep M21 memory reflection Markdown/frontmatter-based and use the existing `engineering` memory record type for follow-up tasks.
- Do not reuse browser OAuth, ChatGPT, or Codex login sessions as Dore OpenAI API credentials; use official API key mode or official workload identity federation mode.
- Use the local Codex CLI as the boundary for ChatGPT/Codex OAuth-backed work;
  Dore records runner status and output, but does not read or log raw token
  values.

## Blockers

- M16/M17 broker connector and pilot real trading work are blocked on user-provided official broker/API inputs.

## 2026-06-27 M22 Agent Loop Reliability

- State: in_progress
- Inputs reviewed: `.dev/DASHBOARD.md`, `docs/plan/ROADMAP.md`, `../ref/hermes-agent/agent/conversation_loop.py`, `../ref/hermes-agent/agent/iteration_budget.py`, `../ref/hermes-agent/agent/turn_retry_state.py`, `../ref/hermes-agent/agent/turn_finalizer.py`, `../ref/hermes-agent/agent/tool_result_classification.py`, `../ref/hermes-agent/agent/tool_guardrails.py`, and `../ref/hermes-agent/website/docs/developer-guide/agent-loop.md`.
- Current work: documented Hermes agent-loop gaps and implemented the first M22 slice for development-agent loop status.
- Targeted verification: `npx --yes pnpm@11.8.0 test -- packages/engineering/src/intake.test.ts apps/daemon/src/engineering-route.test.ts apps/desktop/src/renderer/daemon-status.test.ts apps/desktop/src/renderer/Dashboard.test.tsx` passed, 17 files and 168 tests.
- Full verification: `npx --yes pnpm@11.8.0 test`, `npx --yes pnpm@11.8.0 build`, `npx --yes pnpm@11.8.0 build:desktop`, `npx --yes pnpm@11.8.0 doctor`, `git diff --check`, docs/plan relative link check, and changed-file secret-like scan passed.
- Decision: model loop status as a deterministic summary over the existing development workflow instead of introducing a new autonomous executor.
- Remaining M22 work: tool-result proof, repeated-failure/no-progress guardrails, abnormal-stop finalizer summary, and background review trigger records.

## 2026-06-27 M22 Tool-result Proof

- State: in_progress
- Current work: implemented controlled file mutation proof based on the Hermes `tool_result_classification.py` gap.
- Red phase: targeted tests failed for missing `createFileMutationProof`, missing edit event `mutation_proof`, and missing daemon edit route proof response.
- Green phase: `npx --yes pnpm@11.8.0 test -- packages/engineering/src/intake.test.ts apps/daemon/src/engineering-route.test.ts` passed, 17 files and 169 tests.
- Decision: keep proof additive in the existing edit event and route response instead of changing file-edit execution semantics.
- Remaining M22 work: repeated-failure/no-progress guardrails, abnormal-stop finalizer summary, and background review trigger records.

## 2026-06-27 M22 Guardrail Summaries

- State: in_progress
- Current work: implemented repeated verification failure and blocked file-mutation no-progress guardrail summaries.
- Red phase: targeted engineering test failed for missing `createEngineeringLoopGuardrailSummary`.
- Green phase: `npx --yes pnpm@11.8.0 test -- packages/engineering/src/intake.test.ts` passed, 17 files and 170 tests.
- Decision: start with deterministic warnings and next actions before adding any hard-stop behavior.
- Remaining M22 work: abnormal-stop finalizer summary and background review trigger records.

## 2026-06-27 M22 Finalizer And Background Review

- State: complete
- Current work: implemented abnormal-stop finalizer summaries and deterministic background review trigger records.
- Red phase: targeted engineering test failed for missing `createEngineeringLoopFinalizerSummary`, `createEngineeringBackgroundReviewTrigger`, and `appendEngineeringBackgroundReviewTriggerEvent`.
- Green phase: `npx --yes pnpm@11.8.0 test -- packages/engineering/src/intake.test.ts` passed, 17 files and 172 tests.
- Decision: keep background review as an auditable trigger record; actual background worker execution can remain a later runtime concern.
- Remaining M22 work: none in the current roadmap checklist.
