# Project Status Audit

Audit date: 2026-06-22

Scope: the current Dore development objective:

- move product/design material under `docs/drafts/`.
- derive an implementation roadmap under `docs/plan/`.
- create agent development rules in `AGENTS.md`.
- create a resumable development dashboard in `.dev/DASHBOARD.md`.
- proceed with TDD implementation from the plan.
- prepare securities/trading configuration and safety gates for later
  user-provided broker/API details.

## Result

The current objective is satisfied for the local draft-defined MVP scope.

Dore now has the planning documents, agent operating manual, resumable
development dashboard, and tested implementation slices through M15. The system
can run locally, expose daemon and desktop status, generate deterministic
briefings, enforce Telegram safety defaults, support engineering workflows,
persist/search memory, run trading watch/dry-run/paper flows, and document MVP
release readiness without enabling real orders.

The updated roadmap classifies M0-M6 as foundation work and M7-M15 as local MVP
completion work. M0-M15 are now complete in [ROADMAP.md](ROADMAP.md), with
requirement coverage tracked in
[REQUIREMENTS_TRACE.md](REQUIREMENTS_TRACE.md).

Future broker connector work is post-MVP and requires user-provided official
broker/API details, terms, credentials through secret references, approval, and
risk gates. The required input shape is documented in
[M16_BROKER_CONNECTOR_INPUT_PACKET.md](M16_BROKER_CONNECTOR_INPUT_PACKET.md),
and `packages/trading` includes a readiness evaluator that keeps M16 blocked
until those inputs are complete. The same gate is available through
`pnpm trading:m16-check <packet.json>`.

Because M16-M17 are blocked by external inputs, the active roadmap continued
through local hardening milestones. M18 desktop operations, M19 daemon
reliability hardening, M20 memory quality hardening, and M21 development-agent
workflow depth are implemented locally. M21 now covers development task stage
visibility, failed verification summaries, code-review report visibility,
workflow risk review visibility, and engineering memory reflection records for
decisions, regressions, and follow-up tasks.

## Requirement Evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| Draft documents live under `docs/drafts/`. | `docs/drafts/` contains the product, memory, workflow, safety, Electron, LLM, trading, runtime contract, backlog, and development-start drafts. | Accepted |
| Development plan is under `docs/plan/`. | `docs/plan/README.md`, `ROADMAP.md`, `REQUIREMENTS_TRACE.md`, `QUALITY_GATES.md`, milestone bootstrap doc, M5/M6 audits, and M15 release-readiness docs exist. | Accepted |
| `AGENTS.md` directs future agents to follow the plan and TDD. | `AGENTS.md` defines source-of-truth docs, TDD rules, patch discipline, skill usage, safety rules, and completion checklist. | Accepted |
| `.dev/DASHBOARD.md` enables resumable development. | Dashboard records current focus, milestone checklist, verification log, known constraints, and next action. | Accepted |
| Actual development proceeded from the plan. | Implemented packages/apps include contracts, config, memory, core event log, model gateway, daemon, briefing, scheduler, Telegram, desktop, engineering, and trading. | Accepted |
| Development is TDD-backed. | Dashboard records red/green cycles; current verification reports 17 test files and 167 passing tests plus M16 input-gate checks. | Accepted through M21 memory reflection slice |
| Securities work is configurable before broker details arrive. | `configs/dore.config.example.yaml` and config schema include broker candidates and pilot gate settings with `secret_ref:` credential references. | Accepted |
| Real trading remains blocked without official broker/API details. | M5/M6 tests and audits show dry-run only routes, explicit real gate checks, approval/kill-switch controls, and no real order route. | Accepted |
| Local worktree contains the current roadmap work. | Current branch is `codex/add-agent-development-guide`; M7-M15 work is present locally and has not been pushed in this session. | Accepted locally |

## Remaining Blocked Post-MVP Evidence

| Draft requirement area | Gap | Planned milestone |
| --- | --- | --- |
| Broker/API connector | Official broker/API documents, terms, and credentials have not been supplied; input packet, readiness evaluator, and `trading:m16-check` CLI exist to collect and validate them. | M16 blocked |

## Implemented Foundation Milestones

- M0: repository bootstrap and local core.
- M1: manual daily briefing.
- M2: scheduler and Telegram MVP foundation.
- M3: Electron dashboard MVP foundation.
- M4: development agent MVP foundation.
- M5: trading watch and dry-run.
- M6: pilot real-trading gate foundation for pre-broker scope.
- M7: daemon runtime API completion.
- M8: model gateway provider integration and cost guard foundation.
- M9: daily briefing end-to-end local generation, retry/failure logging, and shared delivery record.
- M10: Telegram daemon-backed commands, briefing push, notifications, and redacted failure logging.
- M11: desktop operating console metrics, daemon aggregation, categorized logs, approval client hook, chat, and task/schedule surfaces.
- M12: memory writer, raw/wiki linkage, operational files, wiki index/search, sensitive approvals, superseded updates, and stale/conflict metadata.
- M13: engineering tool registry, workflow steps, review severity ordering, memory reflection, and high-risk approval assessment.
- M14: market data status/freshness, strategy templates, deterministic strategy signals, paper journal, and daemon/desktop trading visibility.
- M15: MVP acceptance audit, eval runbook, Hermes parity checklist, session lifecycle plan, onboarding guide, and security audit.
- M18: desktop config validation, memory details, task/schedule details, log search, approval risk context, and daemon-backed operating-console metadata.
- M19: structured daemon health report, shared doctor evaluator, `/status` health summary, desktop health mapping, Telegram `/status` health visibility, scheduler recovery status, runtime JSON/JSONL persistence helpers, and local backup/recovery/auth diagnostics.
- M20: duplicate memory suggestions, stale review queue, conflict review queue, ranked memory search, memory maintenance eval scenarios, daemon `GET /memory/quality`, and desktop Memory Explorer quality visibility.
- M21: development task stage visibility, failed verification summaries with likely next actions, code-review report storage and UI exposure, workflow risk review visibility, and engineering memory reflections for decisions, regressions, and follow-up tasks.

## Verification Commands

Last verified on 2026-06-23:

```bash
npx --yes pnpm@11.8.0 test
npx --yes pnpm@11.8.0 build
npx --yes pnpm@11.8.0 build:desktop
```

Additional checks:

- docs relative link check passed.
- `trading:m16-check` example packet returned blocked with exit code 1 as expected.
- changed-file and audit-file secret-like scan found no plaintext secret values.
- `git status --short --branch` was inspected.

## Next Work

No additional local-hardening milestone is currently defined after M21. Resume
M16 only after user supplies broker/API inputs:

1. completed [M16_BROKER_CONNECTOR_INPUT_PACKET.md](M16_BROKER_CONNECTOR_INPUT_PACKET.md).
2. official broker/API target and documentation.
3. API terms and account permission constraints.
4. credential setup using `secret_ref:` values only.
5. desired pilot risk limits and approval policy.

## External Inputs Still Needed For Post-MVP Broker Work

Future connector work requires the user to provide:

- official broker/API target and documentation.
- API terms and account permission constraints.
- credential setup using secret references, not raw secrets.
- desired pilot risk limits and approval policy.
- explicit approval before any real order path is introduced.

Until then, all real broker/order paths must remain blocked.
