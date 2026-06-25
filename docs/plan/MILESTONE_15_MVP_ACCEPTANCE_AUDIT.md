# M15 MVP Acceptance Audit

Audit date: 2026-06-22

Source criteria: [26_ACCEPTANCE_CRITERIA.md](../drafts/26_ACCEPTANCE_CRITERIA.md)

## Result

MVP scope M0-M15 is accepted for local, non-real-trading operation.

Post-MVP broker connector and pilot real trading remain blocked by M16-M17
prerequisites: official broker/API documentation, terms review, credential
references, and explicit user approval.

## Evidence

| Area | Evidence | Status |
| --- | --- | --- |
| Local Daemon | `apps/daemon` starts locally, exposes `/status`, scheduler jobs, runtime tasks/approvals, memory, logs, usage, and trading status. | Accepted |
| Telegram Bot | Allowlist command handling, daemon-backed `/status`, `/briefing`, `/usage`, `/stop`, briefing push, notifications, and redacted failure logs are tested. | Accepted |
| Electron App | Dashboard, approvals, logs, settings, chat, tasks/schedules, memory summary, and trading state render from daemon-safe state. | Accepted |
| Daily Briefing | Scheduled/manual briefing writes Markdown, JSON, usage records, retry/failure events, Telegram summary, dashboard detail, and source freshness. | Accepted |
| Memory | Raw/wiki/operations/log directories, wiki index/search, active context, sensitive approval flow, source refs, superseded state, and stale/conflict metadata exist. | Accepted |
| LLM Providers | Provider availability, missing credential handling, usage/cost/latency records, soft limits, and hard threshold blocking are tested. | Accepted |
| Development Agent | Intake, requirement/design/change plan, verification records, tool registry, review ordering, controlled edits, and memory reflection exist. | Accepted |
| Trading Watch | Watchlist, broker capability state, signals, risk checks, dry-run journal, market data quality status, strategy templates, and paper journal exist. | Accepted |

## Failure Criteria

| Failure criterion | Evidence that it is false |
| --- | --- |
| Unauthorized Telegram user can access the bot. | Telegram command tests reject non-allowlisted users and ignore empty allowlists. |
| Secret appears in logs or UI. | Tests cover renderer token omission, Telegram redaction, engineering output redaction, and daemon token omission. |
| Real order API is called while disabled. | Real execution is blocked by config gates; paper mode records `broker_order_submitted: false`. No real broker call path exists. |
| Daily briefing is not saved. | Briefing tests verify Markdown and JSON daily logs. |
| Token/cost usage is not recorded. | Model gateway and briefing usage records are written and summarized. |
| Critical work runs without approval. | Runtime approval endpoints exist; sensitive memory and high-risk engineering actions require approval. |
| Raw memory and wiki source tracking are mixed. | Raw source is stored under `memory/raw/inbox` and linked from wiki `source_refs`. |

## Verification

Last M15 verification:

```bash
npx --yes pnpm@11.8.0 test
npx --yes pnpm@11.8.0 build
npx --yes pnpm@11.8.0 build:desktop
```

Docs gate:

```bash
node --input-type=module <docs relative link check>
git diff --check
```
