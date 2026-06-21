# Dore Implementation Roadmap

## Source

This roadmap is derived from:

- `docs/drafts/23_PRODUCT_REQUIREMENTS.md`
- `docs/drafts/26_ACCEPTANCE_CRITERIA.md`
- `docs/drafts/28_RUNTIME_CONTRACTS.md`
- `docs/drafts/29_MVP_ENGINEERING_BACKLOG.md`
- `docs/drafts/30_DEVELOPMENT_START_SPEC.md`

## Principles

- Build with TDD.
- Ship small vertical slices that run locally.
- Keep secrets out of files, logs, UI, and commits.
- Keep trading in watch/dry-run mode until official API, risk, and approval gates are satisfied.
- Make state visible through `.dev/DASHBOARD.md`, logs, and daemon status.
- Prefer deterministic code for trading calculations and safety checks.
- Use LLMs for explanation, summarization, and coding assistance, not for unverified order execution.

## Milestones

### M0: Repository Bootstrap and Local Core

Goal:

- Create the implementation skeleton and first tested local runtime foundation.

Deliverables:

- pnpm workspace.
- TypeScript configuration.
- `packages/contracts`.
- `packages/config`.
- `packages/memory`.
- `packages/core`.
- `packages/model-gateway`.
- `apps/daemon`.
- `configs/dore.config.example.yaml`.
- root scripts: `build`, `test`, `lint`, `doctor`, `dev:daemon`.

Acceptance:

- `pnpm install` succeeds.
- `pnpm test` passes.
- `pnpm build` passes.
- `pnpm doctor` reports config, memory, provider credential, Telegram, and trading status without exposing secrets.
- daemon `/status` returns a JSON status payload.

### M1: Manual Daily Briefing

Goal:

- Generate a local briefing manually before scheduler and Telegram automation.

Status:

- Implemented in `packages/briefing` with deterministic fallback generation and `pnpm briefing:run`.
- Market and broker data are placeholders until the user supplies securities/API details.
- LLM credentials are optional; missing credentials produce a partial local briefing.

Deliverables:

- source collectors for repo, memory, tasks, approvals, usage, and market placeholders.
- deterministic fallback briefing when LLM credentials are absent.
- Markdown and JSON output under `memory/logs/daily/`.
- usage record for briefing generation.

Acceptance:

- `pnpm briefing:run` creates `YYYY-MM-DD.md` and `YYYY-MM-DD.json`.
- output includes personal, engineering, Korea market, US market, trading, and agent operations sections.
- missing external credentials produce partial briefing, not process failure.

### M2: Scheduler and Telegram MVP

Goal:

- Send the daily 06:00 KST briefing through Telegram and support basic commands.

Status:

- Scheduler foundation is implemented in `packages/scheduler`.
- Telegram command authorization and command routing are implemented in `packages/telegram`.
- Daemon `/status` exposes the default daily briefing scheduled job.
- Telegram adapter safety status is implemented so it stays disabled without token or allowlist.
- Telegram long polling lifecycle shell is implemented with start/stop tests and no real network calls.

Deliverables:

- daemon scheduler.
- Telegram long polling adapter.
- allowlist enforcement.
- `/status`, `/briefing`, `/usage`, `/stop`.

Acceptance:

- unauthenticated users cannot use the bot.
- empty allowlist prevents command handling.
- 06:00 KST job is registered.
- briefing retry and failure logs are written.

### M3: Electron Dashboard MVP

Goal:

- Provide the primary local UI for Dore.

Status:

- Electron, Vite, and React workspace shell is in place under `apps/desktop`.
- Dashboard renderer smoke tests cover daemon, scheduler, Telegram, and trading status sections.
- Renderer avoids displaying token/secret detail.
- Dashboard now maps daemon `/status` payloads and falls back to an offline state when the daemon cannot be reached.
- Approvals, Logs, and Settings panels render safe mock/default state.
- Approval approve/reject interactions record safe decision logs.
- M3 acceptance is implemented; next work is M4 Development Agent MVP.

Deliverables:

- Electron + React + Vite app.
- Dashboard.
- Approvals panel.
- Logs view.
- Settings status.
- daemon connection state.

Acceptance:

- app opens to Dashboard.
- daemon status is visible.
- pending approvals can be approved or rejected.
- secrets are never displayed.

### M4: Development Agent MVP

Goal:

- Turn user ideas into product/development artifacts and small verified code changes.

Status:

- `packages/engineering` provides a deterministic project intake workflow.
- Project intake can generate requirement and technical design drafts, a change plan, verification command detection, and secret-redacted test execution records.
- Repo inspection can read branch, dirty state, and changed files.
- Engineering intake can be recorded as a safe append-only task event.
- Requirement, technical design, and change-plan drafts can be persisted under `memory/operations/engineering`.
- Review summaries can classify verification failures and residual repo risks.
- `pnpm engineering:intake` provides a local CLI entrypoint for generating drafts and event logs.
- Remaining work is daemon route/task wrapper integration and recording implementation/test outcomes against task logs.

Deliverables:

- project intake workflow.
- requirement draft workflow.
- technical design workflow.
- repo inspection workflow.
- test detection and execution record.

Acceptance:

- a user idea can produce a requirement draft and technical design draft.
- a small repo change can be planned, implemented, tested, and logged.

### M5: Trading Watch and Dry-run

Goal:

- Prepare safe Korea/US stock watch and dry-run trading without real orders.

Deliverables:

- watchlist store.
- broker capability registry.
- Toss candidate connector placeholder.
- Shinhan candidate connector placeholder.
- Samsung read-only/manual policy.
- market data adapter interface.
- signal object.
- risk manager.
- dry-run journal.

Acceptance:

- broker capability status is visible.
- signal and dry-run journal entries are created.
- `real_trading_enabled: false` prevents every real order path.
- risk rule tests pass.

### M6: Pilot Real Trading Preparation

Goal:

- Prepare, but do not enable by default, the gates for future small real orders.

Prerequisites:

- official broker API and terms verified.
- user-provided broker credentials configured through secret references.
- 30 days dry-run journal.
- kill switch.
- approval flow.
- risk limits.

Acceptance:

- real trading remains disabled by default.
- enabling real trading requires explicit config, approval, and passing risk gates.

## First Development Slice

Start with M0.

Implement in this order:

1. workspace scaffold.
2. contracts and tests.
3. config schema and tests.
4. memory bootstrap and tests.
5. event log and tests.
6. model routing and tests.
7. daemon `/status` and tests.
8. doctor command and manual verification.
