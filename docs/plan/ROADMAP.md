# Dore Implementation Roadmap

## Source

This roadmap is derived from the product/design drafts in `docs/drafts/`,
especially:

- `docs/drafts/23_PRODUCT_REQUIREMENTS.md`
- `docs/drafts/26_ACCEPTANCE_CRITERIA.md`
- `docs/drafts/28_RUNTIME_CONTRACTS.md`
- `docs/drafts/29_MVP_ENGINEERING_BACKLOG.md`
- `docs/drafts/30_DEVELOPMENT_START_SPEC.md`
- `docs/drafts/06_TECHNICAL_DESIGN.md`
- `docs/drafts/12_ELECTRON_APP_SPEC.md`
- `docs/drafts/13_LLM_PROVIDERS.md`
- `docs/drafts/16_DAILY_BRIEFING_SPEC.md`
- `docs/drafts/21_DASHBOARD_METRICS.md`
- `docs/drafts/24_MEMORY_SCHEMA.md`
- `docs/drafts/07_EVAL_PLAN.md`
- `docs/drafts/09_HERMES_COMPATIBILITY.md`

`docs/plan/REQUIREMENTS_TRACE.md` tracks how those drafts map to milestones.

## Roadmap Interpretation

The first roadmap was useful for starting implementation, but it compressed the
product scope too aggressively. M0-M6 are now classified as the tested
foundation and pre-broker safety preparation, not the full Dore MVP.

Dore reaches draft-defined MVP only after the MVP gap-closure milestones below
are accepted. Real broker orders remain outside MVP and are blocked until the
broker/API prerequisites are satisfied.

## Principles

- Build with TDD.
- Ship small vertical slices that run locally.
- Keep secrets out of files, logs, UI, and commits.
- Keep trading in watch/dry-run/paper mode until official API, risk, and
  approval gates are satisfied.
- Make state visible through `.dev/DASHBOARD.md`, logs, daemon status, and
  desktop UI.
- Prefer deterministic code for trading calculations and safety checks.
- Use LLMs for explanation, summarization, and coding assistance, not for
  unverified order execution.
- Treat draft acceptance criteria as binding unless a later decision document
  explicitly changes them.

## Current State

Status: local MVP complete through M15.

M0-M6 prove the repo can run locally, expose daemon and desktop status, generate
deterministic briefings, enforce Telegram safety defaults, support engineering
workflows, and prepare trading dry-run plus real-trading gates.

M7-M15 close the draft-defined local MVP gaps: daemon runtime APIs, provider
usage/cost tracking, scheduled briefing delivery records, daemon-backed
Telegram operations, desktop operating-console surfaces, memory indexing and
sensitive-memory approvals, development-agent productization, trading
watch/strategy/paper mode, and final MVP acceptance/evaluation/onboarding
documentation.

Known post-MVP gaps:

- broker/API connector design and implementation require user-provided official
  broker/API documentation, account terms, credential references, risk limits,
  and explicit approval.
- pilot real trading remains blocked until M16 planning and M17 pilot
  prerequisites are satisfied.
- while M16-M17 are blocked, local product hardening continues through M18-M21:
  desktop operations, daemon reliability, memory quality, and development-agent
  workflow depth.
- Hermes comparison identified additional agent-loop reliability work for M22:
  loop status, retry guards, mutation proof, no-progress guardrails, finalizer
  diagnostics, and background review cadence.

## Milestones

### M0: Repository Bootstrap and Local Core

Goal:

- Create the implementation skeleton and first tested local runtime foundation.

Status:

- Complete.

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
- `pnpm doctor` reports config, memory, provider credential, Telegram, and
  trading status without exposing secrets.
- daemon `/status` returns a JSON status payload.

### M1: Manual Daily Briefing Foundation

Goal:

- Generate a local briefing manually before scheduler and Telegram automation.

Status:

- Complete as foundation.

Deliverables:

- source collectors for repo, memory, tasks, approvals, usage, and market
  placeholders.
- deterministic fallback briefing when LLM credentials are absent.
- Markdown and JSON output under `memory/logs/daily/`.
- usage record for briefing generation.

Acceptance:

- `pnpm briefing:run` creates `YYYY-MM-DD.md` and `YYYY-MM-DD.json`.
- output includes personal, engineering, Korea market, US market, trading, and
  agent operations sections.
- missing external credentials produce partial briefing, not process failure.

### M2: Scheduler and Telegram Foundation

Goal:

- Establish scheduler registration and safe Telegram command routing.

Status:

- Complete as foundation.

Deliverables:

- daemon scheduler status.
- Telegram long polling adapter lifecycle shell.
- allowlist enforcement.
- command skeleton for `/status`, `/briefing`, `/usage`, `/stop`.

Acceptance:

- unauthenticated users cannot use the bot.
- empty allowlist prevents command handling.
- 06:00 KST job is registered.
- Telegram remains disabled when token or allowlist is missing.

### M3: Electron Dashboard Foundation

Goal:

- Provide the first local UI shell for Dore.

Status:

- Complete as foundation.

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
- pending approvals can be approved or rejected in safe local state.
- secrets are never displayed.

### M4: Development Agent Foundation

Goal:

- Turn user ideas into product/development artifacts and small verified code
  changes.

Status:

- Complete as foundation.

Deliverables:

- project intake workflow.
- requirement draft workflow.
- technical design workflow.
- repo inspection workflow.
- test detection and execution record.
- review summary generator.
- controlled verification command executor.
- controlled exact file-edit executor.

Acceptance:

- a user idea can produce a requirement draft and technical design draft.
- a small repo change can be planned, implemented, tested, and logged.
- executor command output is redacted before it reaches append-only task logs.
- file edits are constrained to the project root and secret-like replacement
  values are rejected.

### M5: Trading Watch and Dry-run Foundation

Goal:

- Prepare safe Korea/US stock watch and dry-run trading without real orders.

Status:

- Complete as foundation.
- Acceptance audit: [MILESTONE_5_ACCEPTANCE_AUDIT.md](MILESTONE_5_ACCEPTANCE_AUDIT.md).

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
- manual dry-run signal route.

Acceptance:

- broker capability status is visible.
- signal and dry-run journal entries are created.
- `real_trading_enabled: false` prevents every real order path.
- risk rule tests pass.
- manual signal creation route rejects real execution mode.

### M6: Pilot Real Trading Gate Foundation

Goal:

- Prepare, but do not enable by default, the gates for future small real orders.

Status:

- Complete for pre-broker gate scaffolding.
- Acceptance audit: [MILESTONE_6_ACCEPTANCE_AUDIT.md](MILESTONE_6_ACCEPTANCE_AUDIT.md).

Deliverables:

- config fields for explicit enablement and broker secret references.
- official API and terms verification gates.
- dry-run history, kill switch, approval, and risk-limit gates.
- approval and kill-switch control routes.
- append-only trading audit events.

Acceptance:

- real trading remains disabled by default.
- enabling real trading requires explicit config, approval, and passing risk
  gates.
- missing official broker API details keep real paths blocked.

### M7: Daemon Runtime API Completion

Goal:

- Bring the daemon API up to the runtime contract required by desktop,
  Telegram, CLI, and scheduler.

Status:

- Complete.
- Generic task and approval endpoints are implemented with local file-backed
  state.
- Latest briefing, briefing run, usage summary, and memory index endpoints are
  implemented.
- Runtime endpoints reject unauthenticated non-local requests.

Draft sources:

- `23_PRODUCT_REQUIREMENTS.md`: Local Daemon.
- `26_ACCEPTANCE_CRITERIA.md`: Local Daemon, Daily Briefing, Development Agent.
- `28_RUNTIME_CONTRACTS.md`: Daemon API.
- `06_TECHNICAL_DESIGN.md`: Local Agent Daemon, Safety Guard, Logger.

Deliverables:

- task store and endpoints: `GET /tasks`, `GET /tasks/:id`, `POST /tasks`,
  `POST /tasks/:id/cancel`.
- approval queue and endpoints: `GET /approvals`,
  `POST /approvals/:id/approve`, `POST /approvals/:id/reject`.
- briefing endpoints: `GET /briefings/latest`, `POST /briefings/run`.
- usage endpoint: `GET /usage/summary`.
- memory endpoint: `GET /memory/index`.
- local daemon auth token or equivalent localhost protection.
- consistent event logging for API mutations.

Acceptance:

- every runtime-contract endpoint exists or has a documented intentional
  replacement.
- unauthenticated non-local requests are rejected.
- task cancel updates task state and is visible in `/status`.
- approval decisions update approval/task records and append audit events.
- endpoint tests cover success, rejection, and redaction paths.

### M8: Model Gateway Provider Integration and Cost Guard

Goal:

- Move from routing-only model gateway to real provider adapters and enforce
  usage/cost policy.

Status:

- Complete for API-key provider adapter foundation.
- Provider registry exposes OpenAI, Claude, and Gemini availability without
  secret values.
- Model gateway calls injected provider clients, records usage/cost/latency,
  handles missing credentials gracefully, and enforces soft/hard cost guard
  behavior.
- OpenAI OAuth remains a later explicit connection flow after API-key mode.

Draft sources:

- `13_LLM_PROVIDERS.md`.
- `18_RISK_AND_COST_DEFAULTS.md`.
- `22_CONFIG_SCHEMA_DRAFT.md`.
- `26_ACCEPTANCE_CRITERIA.md`: LLM Providers.
- `28_RUNTIME_CONTRACTS.md`: Model Selection Request, LLM Usage Record.

Deliverables:

- provider adapter interface with OpenAI, Claude, and Gemini implementations or
  explicit unavailable states.
- API key auth mode for all providers.
- provider/model/auth mode/token/cost/latency usage records.
- monthly soft limit and hard approval threshold calculation.
- dashboard/Telegram warning payloads for soft limit and hard threshold.
- setup-time model id validation path for providers whose model IDs are
  unstable.
- OpenAI OAuth design and gated implementation path after API-key mode.

Acceptance:

- configured providers can run a test prompt when credentials exist.
- missing credentials return unavailable status without crashing.
- every LLM call writes a usage record.
- hard threshold blocks or requires approval for new LLM work.
- secret values never appear in logs, daemon responses, or desktop renderer
  state.

### M9: Daily Briefing End-to-End

Goal:

- Complete the 06:00 KST briefing from scheduler trigger to persisted memory,
  dashboard detail, Telegram summary, retry, and failure logs.

Status:

- Complete for local end-to-end briefing generation.
- Scheduled briefing jobs can execute handlers and report success/failure.
- Briefing runs use retry schedules, write failed-attempt/final-failure events,
  and produce a shared persisted record containing Telegram summary and
  dashboard JSON paths.
- Daemon `POST /briefings/run` supports scheduled trigger semantics and
  `GET /briefings/latest` returns the shared record.
- Live Telegram push and daemon-backed Telegram commands are covered by M10.

Draft sources:

- `16_DAILY_BRIEFING_SPEC.md`.
- `23_PRODUCT_REQUIREMENTS.md`: Daily Briefing.
- `26_ACCEPTANCE_CRITERIA.md`: Daily Briefing.
- `07_EVAL_PLAN.md`: Daily Briefing scenario.

Deliverables:

- scheduler execution of the briefing job, not only job registration.
- retry and failure event logging.
- latest briefing lookup for daemon/desktop/Telegram.
- Telegram summary renderer and delivery path.
- dashboard detail JSON endpoint.
- source freshness metadata for personal, engineering, market, trading, and
  agent ops sections.
- summary cache or diff-based source extraction to reduce token usage.

Acceptance:

- manual and scheduled briefing runs produce Markdown and JSON outputs.
- Telegram summary and dashboard detail are generated from the same briefing
  record.
- failed sources produce a partial briefing and logged failure reason.
- retry behavior is tested.
- briefing usage/cost is recorded.

### M10: Telegram Operational Bot

Goal:

- Turn Telegram from a safe command skeleton into an operational bot connected
  to daemon state.

Status:

- Complete for local daemon-backed Telegram operations.
- Command context can use daemon HTTP endpoints for `/status`, `/briefing`,
  `/usage`, and `/stop`.
- `/stop` selects a running/queued task and calls daemon cancellation.
- Daily briefing summaries can be pushed from the shared briefing delivery
  record.
- Task completion, task failure, and approval notifications are formatted for
  Telegram delivery.
- Telegram delivery failures are logged to JSONL with bot tokens, bearer
  tokens, and secret references redacted.
- Daemon `/status` reflects configured Telegram token/allowlist readiness
  without exposing token values.

Draft sources:

- `23_PRODUCT_REQUIREMENTS.md`: Telegram Bot.
- `26_ACCEPTANCE_CRITERIA.md`: Telegram Bot.
- `09_HERMES_COMPATIBILITY.md`: Telegram Bot requirements.
- `04_TOOLS_AND_DATA.md`: Telegram execution interface.

Deliverables:

- live long-polling loop wired to daemon handlers.
- `/status` backed by daemon status.
- `/briefing` backed by latest briefing.
- `/usage` backed by usage summary.
- `/stop` backed by task cancellation.
- daily briefing push.
- task completion, error, and approval notifications.
- safe message formatting with secret redaction.

Acceptance:

- only allowlisted users receive responses.
- `/stop` cancels or requests cancellation of a running task.
- daily briefing summary is delivered to Telegram when configured.
- Telegram failures are logged without leaking tokens.

### M11: Desktop App Product Screens

Goal:

- Expand the desktop app from dashboard foundation to the MVP operating console.

Status:

- Complete for MVP operating-console coverage.
- First screen shows critical strip, today top 3, active work, daily briefing,
  trading watch, development, memory updates, usage, tasks/schedules, logs, and
  settings.
- Dashboard status aggregation reads daemon `/status`, `/briefings/latest`,
  `/usage/summary`, `/memory/index`, and `/logs/recent`.
- Approval decisions can call daemon-backed approval decision clients.
- Logs can be filtered by action, approval, trading, usage, and error category.
- Chat MVP surface supports local `/usage`, `/status`, `/reset`, and `/new`
  command responses.
- Renderer continues to avoid raw secret values.

Draft sources:

- `12_ELECTRON_APP_SPEC.md`.
- `21_DASHBOARD_METRICS.md`.
- `23_PRODUCT_REQUIREMENTS.md`: Electron App.
- `26_ACCEPTANCE_CRITERIA.md`: Electron App.

Deliverables:

- dashboard metrics: critical strip, today top 3, active work, daily briefing,
  trading watch, development, memory updates, usage.
- real approval queue connected to daemon approval endpoints.
- Logs screen backed by event/action/trading/usage logs.
- Settings screen that shows provider, Telegram, memory, permission, and
  trading setup state without secrets.
- Chat screen for local long-form interaction and basic slash commands.
- Tasks/Schedules screen or MVP-equivalent management surface.
- Memory summary area, with full Memory Explorer deferred to M12 if needed.

Acceptance:

- user can identify critical approvals, failed jobs, current costs, trading
  halt state, and active development work within the first screen.
- approval decisions are persisted through daemon endpoints.
- logs can be filtered by action, approval, trading, usage, and error
  categories.
- renderer receives only narrow preload APIs and no raw secrets.

### M12: Memory Management, Indexing, and Sensitive-Memory Flow

Goal:

- Move from directory bootstrap to usable long-term memory.

Status:

- Complete for MVP memory management.
- Memory writer persists profile, project, topic, decision, routine, trading,
  engineering, and daily log records as Markdown with frontmatter.
- Sensitive or `secret_ref` memory writes create approval requests before wiki
  persistence.
- Raw source notes are stored under `memory/raw/inbox` and linked from wiki
  `source_refs`.
- Record updates mark prior records `superseded` and create new active records.
- Active context, tasks, reminders, open questions, and approvals operational
  files can be persisted.
- Wiki index update/search supports daemon and desktop reads.
- Stale and conflict metadata can be marked and tested.
- Daemon `POST /memory/records` writes normal memory records or queues
  sensitive-memory approvals.

Draft sources:

- `02_MEMORY_KNOWLEDGE.md`.
- `24_MEMORY_SCHEMA.md`.
- `23_PRODUCT_REQUIREMENTS.md`: Memory.
- `26_ACCEPTANCE_CRITERIA.md`: Memory.
- `07_EVAL_PLAN.md`: Memory scenarios.

Deliverables:

- memory record writer for profile, project, topic, decision, routine, trading,
  engineering, and daily log records.
- `operations/active_context.md` persistence.
- `operations/tasks.md`, `reminders.md`, `open_questions.md`, and
  `approvals.md` synchronization or documented replacements.
- `memory/wiki/index.md` update workflow.
- source reference tracking from `memory/raw` to `memory/wiki`.
- sensitive-memory approval request flow.
- stale/conflict detection metadata.
- memory index/search suitable for `GET /memory/index` and desktop Memory
  Explorer.

Acceptance:

- user preferences can be saved, updated, and superseded.
- sensitive information creates an approval request before wiki persistence.
- raw source and wiki summary remain linked but separate.
- memory index is readable by daemon and desktop.
- memory tests cover preference update, superseded state, and conflict/stale
  marking.

### M13: Development Agent Productization

Goal:

- Convert the deterministic engineering foundation into a fuller agent workflow
  with planning, execution, review, memory reflection, and tool registry
  boundaries.

Status:

- Complete for MVP productization layer.
- Default engineering tool registry defines file, command, repo, and
  documentation tools with approval boundaries.
- Development workflow records intake, plan, patch, verify, review, summarize,
  and memory reflection steps against runtime task logs.
- Code-review reports prioritize bugs, regressions, and missing tests before
  style, with file/line references.
- Engineering outcomes can be reflected into project memory and decision
  records.
- Broad file edits, destructive commands, and external mutations require
  approval.

Draft sources:

- `03_WORKFLOWS.md`: development work and code review.
- `06_TECHNICAL_DESIGN.md`: Engineering Engine and Tool Registry.
- `23_PRODUCT_REQUIREMENTS.md`: Software Engineering goals.
- `26_ACCEPTANCE_CRITERIA.md`: Development Agent.
- `07_EVAL_PLAN.md`: Engineering and Review scenarios.

Deliverables:

- task lifecycle integration with M7 task endpoints.
- tool registry entries for allowed file, command, repo, and documentation
  operations.
- multi-step implementation workflow: intake, plan, patch, verify, review,
  summarize.
- code-review workflow with severity ordering and file/line references.
- memory reflection into project pages and decision logs.
- safeguards for larger changes: approval before broad file edits, destructive
  commands, or external mutation.

Acceptance:

- a small feature can move from idea to requirement, design, implementation,
  verification, and memory update.
- review output prioritizes bugs/regressions/missing tests over style.
- every execution step is task-logged and redacted.
- broad or high-risk operations create approval requests.

### M14: Trading Watch, Strategy Lifecycle, and Paper Mode

Goal:

- Expand trading beyond dry-run objects into monitored watchlists, strategy
  lifecycle, market data quality checks, and paper execution.

Status:

- Complete for MVP trading watch expansion.
- Market data source status reports `ok`, `stale`, `missing`, and
  `conflicting` states for Korea/US watchlists.
- Strategy templates exist for momentum, mean reversion, portfolio rebalancing,
  event watch, and long-term thesis tracking.
- Strategy signals are deterministic from recorded market quote inputs.
- Paper-mode journal entries are separate from dry-run entries and never submit
  broker orders.
- Trading journal summary reports dry-run and paper entries.
- Daemon and desktop trading status expose market data source and paper journal
  summaries.

Draft sources:

- `17_TRADING_POLICY_DRAFT.md`.
- `18_RISK_AND_COST_DEFAULTS.md`: Trading Risk Defaults.
- `19_DATA_SOURCES.md`: Broker and market data sources.
- `25_TRADING_STRATEGY_FRAMEWORK.md`.
- `26_ACCEPTANCE_CRITERIA.md`: Trading Watch.
- `07_EVAL_PLAN.md`: Trading scenarios.

Deliverables:

- market data source status for Korea and US watchlists.
- source timestamp/freshness checks.
- strategy templates for momentum watch, mean reversion watch, portfolio
  rebalancing, event watch, and long-term thesis tracking.
- signal review cadence and performance metrics.
- paper execution mode distinct from dry-run and real.
- broker connector evidence records with source references.
- trading journal post-review fields.

Acceptance:

- stale, conflicting, or missing market data blocks signals.
- strategy signals are deterministic and reproducible from recorded inputs.
- paper-mode orders never call real broker order APIs.
- dashboard shows broker/data source state, risk halt state, watchlist signals,
  and dry-run/paper candidates.

### M15: Safety, Evaluation, Hermes Parity, and MVP Release Readiness

Goal:

- Prove the draft-defined MVP is safe, evaluable, and usable as a local product.

Status:

- Complete for local MVP release readiness.
- Final acceptance audit is documented in
  [MILESTONE_15_MVP_ACCEPTANCE_AUDIT.md](MILESTONE_15_MVP_ACCEPTANCE_AUDIT.md).
- Eval runbook is documented in [EVAL_RUNBOOK.md](EVAL_RUNBOOK.md).
- Hermes MVP parity and slash command checklist are documented in
  [HERMES_MVP_PARITY.md](HERMES_MVP_PARITY.md).
- Session lifecycle and recovery plan is documented in
  [SESSION_LIFECYCLE.md](SESSION_LIFECYCLE.md).
- Local onboarding and security audit are documented in
  [LOCAL_ONBOARDING_SECURITY.md](LOCAL_ONBOARDING_SECURITY.md).

Draft sources:

- `05_SAFETY_AND_PERMISSIONS.md`.
- `07_EVAL_PLAN.md`.
- `09_HERMES_COMPATIBILITY.md`.
- `30_DEVELOPMENT_START_SPEC.md`: development stop conditions.
- `26_ACCEPTANCE_CRITERIA.md`: MVP failure criteria.

Deliverables:

- MVP acceptance audit covering all sections of `26_ACCEPTANCE_CRITERIA.md`.
- eval scenario suite or manual eval runbook for memory, engineering, review,
  trading, proposal, and daily briefing.
- Hermes compatibility MVP checklist.
- slash command parity plan for `/new`, `/reset`, `/model`, `/usage`,
  `/skills`, `/stop`, `/status`, and `/sethome`.
- session lifecycle plan for reset/resume/stop, queueing, interruption, and
  crash recovery.
- local packaging/onboarding guide.
- security and secret exposure audit.

Acceptance:

- no MVP failure criterion remains true.
- acceptance audit identifies every deferred item explicitly.
- user can start daemon, run desktop, configure safe credentials, receive a
  briefing, inspect memory/logs, and run a small development task.
- tests and release checklist pass from a clean checkout.

### M16: Broker Connector Planning and Paper Connector

Goal:

- Start broker-specific work only after official source material is available.

Status:

- Blocked until user supplies official broker/API details and account
  constraints.
- Pre-start readiness evaluator exists in `packages/trading` to keep M16
  blocked until official documentation, terms, credential references, risk
  limits, approval policy, and explicit user approval are present.
- `pnpm trading:m16-check <packet.json>` validates file-based input packets
  before broker-specific connector planning starts.

Prerequisites:

- completed
  [M16_BROKER_CONNECTOR_INPUT_PACKET.md](M16_BROKER_CONNECTOR_INPUT_PACKET.md).
- official broker API target and documentation.
- API terms and account permission constraints.
- credential setup through secret references only.
- desired pilot risk limits and approval policy.

Deliverables:

- source-cited broker/API review.
- connector design behind existing M6 gates.
- paper-only connector or sandbox path before real order support.
- tests proving real order paths remain blocked until every gate passes.
- readiness checks proving incomplete M16 input packets remain blocked.

Acceptance:

- connector capabilities are backed by official source references.
- paper/sandbox behavior is tested before real order behavior exists.
- missing or expired credential references block execution.

### M17: Pilot Real Trading

Goal:

- Enable a tightly controlled small real order only after M16 and all pilot
  prerequisites pass.

Status:

- Out of MVP and blocked.

Prerequisites:

- official broker API and terms verified.
- user-provided broker credentials configured through secret references.
- 30 days dry-run/paper journal.
- kill switch verified.
- desktop approval verified.
- risk limits configured and tested.

Acceptance:

- one small order can be placed, confirmed, journaled, and stopped safely.
- rollback/stop procedure is documented and tested.
- loss/risk thresholds halt further real execution.

### M18: Local Product Hardening and Desktop Operations

Goal:

- Make the local desktop app a more complete daily operating console while
  broker work remains blocked.

Status:

- Complete while M16-M17 wait for broker/API inputs.
- Implemented slices: desktop config validation, memory detail records,
  log text/date search, approval risk context, task cancellation, scheduler
  recent run visibility, and daemon memory-index/scheduler/log metadata.

Draft sources:

- `12_ELECTRON_APP_SPEC.md`: Dashboard, Approvals, Chat, Logs, Settings.
- `21_DASHBOARD_METRICS.md`: critical strip, top items, usage, memory,
  development, and trading surfaces.
- `24_MEMORY_SCHEMA.md`: memory browsing and source references.
- `05_SAFETY_AND_PERMISSIONS.md`: approval and secret-safety UX.

Deliverables:

- Settings screen can validate local config and display actionable setup
  problems without exposing secrets.
- Memory Explorer detail view for wiki records, raw source references, stale
  markers, conflict notes, and sensitive approval state.
- Tasks/Schedules detail view for runtime tasks, cancellation, scheduled job
  status, and recent execution history.
- Logs search across action, approval, usage, trading, Telegram, and error
  records with category/date filters.
- Approval UX connects pending approvals to details, risk context, and decision
  audit result.

Acceptance:

- user can inspect and act on config, memory, tasks, schedules, logs, and
  approvals without opening raw files.
- UI still hides raw tokens, API keys, broker secrets, and `secret_ref:` values.
- daemon-backed loading, empty, error, and offline states are tested.
- `pnpm test`, `pnpm build`, and `pnpm build:desktop` pass.

### M19: Daemon Reliability and Local Persistence Hardening

Goal:

- Make the daemon safer for long-running local use.

Status:

- Complete after M18.
- First slice implemented: structured daemon health report, shared doctor
  evaluator, `/status` health summary, desktop health mapping, and Telegram
  `/status` health visibility.
- Scheduler recovery slice implemented: next run, failure count, retry status,
  failed-run detection, and desktop scheduler mapping.
- Runtime persistence slice implemented: reusable core JSON/JSONL persistence
  helpers and atomic replace boundary for runtime task/approval JSON state.
- Runtime backup/recovery and local auth diagnostics are documented in
  [LOCAL_ONBOARDING_SECURITY.md](LOCAL_ONBOARDING_SECURITY.md).

Deliverables:

- structured health/doctor result that can be consumed by desktop and Telegram.
- scheduler restart/recovery state for last run, next run, failure count, and
  retry status.
- atomic JSON/JSONL write helpers or equivalent corruption-resistant local
  persistence boundary.
- runtime state backup/recovery notes for memory, tasks, approvals, and logs.
- local auth/token setup runbook and daemon status diagnostics.

Acceptance:

- daemon can report degraded state without crashing.
- interrupted writes do not leave unreadable core state in normal operation.
- scheduler state survives daemon restart.
- operational failures are visible in daemon status and desktop surfaces.

### M20: Memory Quality, Review, and Knowledge Hygiene

Goal:

- Improve memory usefulness after the raw/wiki/operations foundation.

Status:

- Complete after M19.
- Implemented slices: duplicate memory suggestions, stale review queue,
  conflict review queue, ranked memory search, memory maintenance eval
  scenarios, daemon `GET /memory/quality`, and desktop Memory Explorer quality
  visibility.

Deliverables:

- duplicate memory detection and merge suggestion records.
- stale-memory review queue with source references and last-seen timestamps.
- conflict review workflow for contradictory profile/project/topic records.
- search ranking by type, recency, source quality, and active/stale state.
- memory maintenance eval scenarios.

Acceptance:

- user can identify stale, duplicated, and conflicting memory records.
- memory changes remain auditable and source-linked.
- sensitive records still require approval before wiki persistence.
- memory search tests cover ranking and stale/conflict filters.

### M21: Development Agent Workflow Depth

Goal:

- Make the development-agent workflow more observable and useful from Dore.

Status:

- Complete after M20.
- First slice implemented: development task stage visibility for plan, patch,
  verify, review, summarize, and memory-reflection stages through daemon
  status and the desktop Engineering panel.
- Second slice implemented: failed verification summaries with likely next
  actions and sanitized failure output through daemon status and the desktop
  Engineering panel.
- Third slice implemented: code-review report storage with severity-ordered
  findings, daemon status exposure, and desktop Engineering panel visibility.
- Fourth slice implemented: workflow risk review storage and visibility for
  broad edits, destructive commands, external mutations, and single-file edits.
- Fifth slice implemented: engineering memory reflection now records decisions,
  regressions, and follow-up tasks in decision and engineering follow-up
  records.

Deliverables:

- task view for plan, patch, verify, review, and memory-reflection stages.
- failed test summary and likely next action generation.
- risk review before broad edits, destructive commands, or external mutations.
- code-review report storage and UI exposure with severity ordering.
- engineering memory reflection improvements for decisions, regressions, and
  follow-up tasks.

Acceptance:

- user can follow a development task from request to verification from the app.
- high-risk development actions remain approval-gated.
- failed verification results are summarized without hiding raw failure data.
- completed development tasks write appropriate memory reflections.

### M22: Agent Loop Reliability and Recovery Visibility

Goal:

- Improve Dore's development-agent loop reliability using concrete gaps found
  by comparing against `../ref/hermes-agent`.

Status:

- In progress after M21.
- Comparison source documented in
  [HERMES_AGENT_LOOP_GAP_ANALYSIS.md](HERMES_AGENT_LOOP_GAP_ANALYSIS.md).
- First slice implemented: development-agent loop status exposes iteration
  budget, retry guards, exit reason, and next action through daemon status and
  the desktop Engineering panel.
- Second slice implemented: controlled file edits now include mutation proof
  showing whether the edit landed, target path, status, and non-secret evidence.
- Third slice implemented: repeated verification failures and blocked
  file-mutation no-progress loops can be summarized as deterministic guardrail
  warnings with next actions.
- Fourth slice implemented: finalizer summaries classify normal completion,
  budget exhaustion, and guardrail exits.
- Fifth slice implemented: background review trigger records are generated once
  deterministic loop activity reaches a configured threshold.

Deliverables:

- per-task loop status with iteration budget, remaining budget, exhaustion flag,
  retry guards, exit reason, and next action.
- tool-result proof helper for controlled file mutations.
- repeated failure and no-progress guardrail summaries.
- finalizer summary for abnormal stops such as budget exhaustion or guardrail
  warnings.
- background review trigger record after deterministic loop activity thresholds.

Acceptance:

- daemon `/status.engineering.tasks[].loop_status` explains active, failed, and
  exhausted development-agent loops without exposing secrets.
- desktop Engineering panel renders loop budget, retry guard state, exit reason,
  and next action.
- tests cover loop status for planned, failed-verification, and
  budget-exhausted states.
- mutation-result classification, repeated-failure guardrails, abnormal-stop
  finalizers, and background review triggers are covered by tests before any
  broader autonomous loop behavior is introduced.

## MVP Completion Rule

Draft-defined MVP is complete. M0-M15 are accepted and the MVP failure criteria
in `docs/drafts/26_ACCEPTANCE_CRITERIA.md` are false for local, non-real-trading
operation.

M16-M17 are post-MVP and require user-provided broker/API inputs. They can be
paused without blocking M19-M22 local hardening.

## Next Development Slice

Current next slice: continue M22 with tool-result proof and repeated-failure
guardrail summaries.

M16 remains blocked until user supplies broker/API inputs.

When broker inputs arrive, resume M16 in this order:

1. collect official broker/API target and documentation.
2. fill and verify
   [M16_BROKER_CONNECTOR_INPUT_PACKET.md](M16_BROKER_CONNECTOR_INPUT_PACKET.md).
3. verify API terms and account permission constraints.
4. configure credentials through `secret_ref:` values only.
5. design paper/sandbox connector behind existing gates.
6. prove real order paths remain blocked until every gate passes.

While broker inputs are absent, keep real-trading paths blocked and define a new
local-hardening milestone before additional implementation work.
