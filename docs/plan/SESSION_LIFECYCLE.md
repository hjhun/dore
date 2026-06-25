# Session Lifecycle Plan

## Lanes

Dore separates interaction lanes:

- desktop local chat.
- Telegram commands.
- daemon runtime tasks.
- scheduled jobs.

All lanes share long-term memory under `memory/` and append-only logs under
`memory/logs/`.

## Commands

| Command | MVP behavior |
| --- | --- |
| reset | Clear local chat context or create a new task context; durable memory is not deleted. |
| resume | Read runtime tasks, active context, and recent logs from daemon state. |
| stop | Cancel running/queued runtime task through `/tasks/:id/cancel`. |
| queue | Persist task records under runtime task store before execution. |
| interrupt | Mark task cancelled and append runtime event. |

## Crash Recovery

On daemon restart:

1. Load runtime tasks and approvals from `memory/data/runtime`.
2. Restore engineering task history from `memory/operations/engineering` and
   event logs.
3. Read active context from `memory/operations/active_context.md`.
4. Show recent failures from `/logs/recent`.

## Cost Tracking

Provider calls and briefing runs write usage JSONL. Desktop and Telegram read
summaries through `/usage/summary`.

## Stop Procedure

1. User issues Telegram `/stop` or uses desktop task controls.
2. Daemon updates task state to `cancelled`.
3. Runtime event log records the cancellation reason.
4. Downstream workflows must check task state before starting another risky
   action.
