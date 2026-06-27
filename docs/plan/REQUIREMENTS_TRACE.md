# Requirements Trace

Audit date: 2026-06-22

This document maps the product/design drafts in `docs/drafts/` to the active
implementation plan in `docs/plan/ROADMAP.md`.

## Summary

The original `docs/plan/ROADMAP.md` underrepresented the full draft scope. It
covered the implementation foundation through trading gates, but it treated
several foundation slices as if they were complete MVP features.

The corrected plan now separates:

- foundation: M0-M6.
- draft-defined MVP completion: M7-M15.
- blocked post-MVP broker work: M16-M17.
- local product hardening while broker work is blocked: M18-M21.

## Requirement Coverage

| Draft area | Key requirements | Current state | Plan coverage |
| --- | --- | --- | --- |
| Local daemon | local runtime, scheduler, memory, model gateway, approval queue, action log | M7 added generic task/approval stores and daemon endpoints, latest briefing/run endpoints, usage summary, memory index, local request protection, and runtime audit events | M7 accepted; M8-M12 deepen dependent subsystems |
| Runtime contracts | task, approval, briefing, usage, memory, trading, daemon API contracts | task, approval, LLM usage, shared briefing delivery records, and memory write/index/approval semantics exist | M7-M12 accepted |
| Telegram bot | long polling, allowlist, `/status`, `/briefing`, `/usage`, `/stop`, daily briefing push | daemon-backed command context, daemon HTTP client, `/stop` cancellation, daily briefing push, notifications, readiness status, and redacted failure logging exist | M10 accepted |
| Electron app | Dashboard, Approvals, Chat, Logs, Settings; later Memory and Tasks | MVP operating console exists with dashboard metrics, daemon-backed aggregation, approval decision client hook, categorized logs, settings status, chat commands, tasks/schedules, and memory summary; deeper product operations are next | M11 accepted; M18 hardening planned |
| Daily briefing | 06:00 KST schedule, Telegram summary, dashboard detail, memory log, retry/failure log, source freshness | scheduled/manual runs, retry/failure events, source freshness, shared Telegram/dashboard record, latest endpoint, and Telegram push helper exist | M9-M10 accepted |
| Memory | raw/wiki/operations/logs separation, active context, wiki index, sensitive-memory approval, conflict/stale handling | memory writer, raw/wiki separation, operational files, wiki index/search, sensitive approval requests, superseded updates, and stale/conflict marking exist; quality workflows are planned | M12 accepted; M20 hardening planned |
| LLM providers | OpenAI/Claude/Gemini, API key auth, official OpenAI workload identity federation, usage/cost/latency records, monthly limits | API-key provider adapter foundation, provider availability, workload identity auth mode, usage/cost/latency records, missing-credential handling, and cost guard exist; browser OAuth or ChatGPT/Codex login sessions are not reused as API credentials | M8 accepted; WIF hardening accepted |
| Development agent | idea to requirement/design/change/test/review, task logs, memory reflection, tool registry | deterministic intake, route, controlled command/edit foundation, tool registry, workflow steps, review severity ordering, memory reflection, and high-risk approval assessment exist; task observability is planned | M13 accepted; M21 hardening planned |
| Trading watch | Korea/US watchlist, broker capability, signal object, risk checks, dry-run journal | market data freshness/missing/conflict status, strategy templates, deterministic strategy signals, paper journal entries, trading journal summary, and daemon/desktop visibility exist | M14 accepted |
| Safety and permissions | approval for critical work, secret protection, audit logs, trading risk defaults | local auth, approval gates, secret redaction, trading gates, final acceptance audit, eval runbook, and security audit exist | M7-M15 accepted |
| Dashboard metrics | critical strip, today top 3, active work, usage, trading, development, memory updates | dashboard shows critical strip, today top 3, active work, daily briefing, trading watch, development, memory updates, usage, logs, and tasks/schedules | M11 accepted |
| Evaluation | memory, engineering, review, trading, proposal, daily briefing scenarios | automated baseline and manual scenario runbook exist | M15 accepted |
| Hermes compatibility | CLI/TUI parity, sessions, skills, scheduler, subagents, tools, MCP, token/cost | MVP parity checklist, slash command plan, and session lifecycle plan exist; full Hermes parity remains post-MVP | M15 accepted; post-MVP follow-ups |
| Broker/API integration | official broker docs, terms, credentials, paper/sandbox before real, pilot real order | blocked by missing user-provided official broker/API details; M16 input packet and readiness evaluator exist to enforce the start gate | M16, M17 |
| Daemon reliability | local daemon health, scheduler recovery, persistence durability, diagnostics | local daemon and runtime APIs exist; long-running reliability hardening is planned | M19 planned |

## MVP Completion Checklist

The MVP is not complete until all of the following are true:

- M0-M15 are accepted in `ROADMAP.md`. This is currently true for local MVP.
- every section in `docs/drafts/26_ACCEPTANCE_CRITERIA.md` has evidence.
- every MVP failure criterion in `docs/drafts/26_ACCEPTANCE_CRITERIA.md` is
  false.
- a fresh checkout can run the documented verification and local startup steps.
- secret scans and UI/log redaction checks pass.
- real trading remains disabled unless post-MVP M16/M17 prerequisites are
  explicitly satisfied.

## Deferred or Blocked Items

These are intentionally not required for draft-defined MVP:

- real stock orders.
- GUI/RPA order automation.
- external server deployment.
- multi-user accounts.
- mobile app.
- fully automatic strategy optimization.
- guaranteed returns or autonomous trading claims.

These are blocked until external inputs arrive:

- source-cited broker connector implementation.
- official terms/account-permission verification.
- real broker credential validation.
- pilot real order execution.

These can continue while broker work is blocked:

- desktop operations hardening.
- daemon reliability and local persistence hardening.
- memory quality and review workflows.
- development-agent workflow observability.

## Planning Rule

Future plan updates must update this trace when they:

- add, remove, or merge milestones.
- mark an MVP requirement accepted.
- defer a draft requirement out of MVP.
- introduce a broker/order execution path.
