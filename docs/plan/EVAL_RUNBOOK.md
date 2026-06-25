# MVP Eval Runbook

Use this runbook before release or after a large roadmap change.

## Automated Baseline

```bash
npx --yes pnpm@11.8.0 test
npx --yes pnpm@11.8.0 build
npx --yes pnpm@11.8.0 build:desktop
```

## Manual Scenarios

| Scenario | Steps | Pass criteria |
| --- | --- | --- |
| Memory | Write a normal project memory record, update it, then write a sensitive record. | Normal record appears in `wiki/index.md`; old record is superseded; sensitive record creates approval before persistence. |
| Engineering | Submit an idea through engineering intake, run an allowed verification command, generate review, reflect to memory. | Drafts, task events, verification record, review summary, and memory project/decision records exist. |
| Review | Feed findings with bug, missing test, and style categories into review report. | Bug/regression/missing test findings appear before style with file:line references. |
| Trading | Create watchlist, evaluate market data, create deterministic strategy signal, append paper journal. | Stale/missing/conflicting data blocks readiness; paper journal never submits broker order. |
| Proposal | Use dashboard Today Top 3 and active work summaries. | Pending approvals, running tasks, scheduled briefing, and next actions are visible in first screen. |
| Daily Briefing | Run scheduled briefing endpoint with fixed date/time. | Markdown, JSON, usage, source freshness, retry/failure logs, Telegram summary, and dashboard record are produced. |

## Memory Maintenance Scenarios

Run these scenarios after changing memory writer, index, search, daemon memory
routes, or desktop memory surfaces.

| Scenario | Setup | Pass criteria |
| --- | --- | --- |
| Duplicate review | Write two active wiki records with the same normalized body and different titles/source refs. | `reviewMemoryQuality` and daemon `GET /memory/quality` return a `possible_duplicate` suggestion with both records and `merge_or_supersede` action. |
| Stale review | Mark an active record stale with `markMemoryRecordState`. | Quality review includes the record in `staleQueue` with `sourceRefs` and `lastSeenAt`; desktop Memory Explorer shows stale record count and candidate title. |
| Conflict review | Add a conflict note to a project/topic/profile record. | Quality review includes the record in `conflictQueue` with the contradiction text; desktop Memory Explorer shows conflict record count and candidate title. |
| Ranked search | Search for a term that matches active sourced records and older stale records. | Ranked search returns active/source-linked/recent records ahead of stale or unsourced records and includes score metadata. |
| Sensitive-memory guard | Try to write a `sensitive` or `secret_ref` record without approval. | The record is not persisted to wiki; an approval request is created and quality review does not bypass the approval gate. |

## Recording

Record each run in `memory/logs/daily/YYYY-MM-DD.md` or an engineering task log
with:

- date/time.
- commands run.
- scenario results.
- failures and follow-up task IDs.

## Stop Conditions

Stop release if any MVP failure criterion in
[MILESTONE_15_MVP_ACCEPTANCE_AUDIT.md](MILESTONE_15_MVP_ACCEPTANCE_AUDIT.md)
becomes true.
