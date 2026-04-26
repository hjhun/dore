# Durable Workflow State And Scheduler

Status: Proposed
Created: 2026-04-26 01:46:15 UTC
Scope: Rust AI Agent / Workflow Engine durable execution, workflow orchestration, and daemon scheduling
Source Prompt: `docs/prompts/20260425_221546_workflow_state_scheduler.md`
Related:

- `docs/designs/01_system_architecture.md`
- `docs/designs/05_scheduler_and_self_improvement.md`
- `docs/designs/07_goal_management_and_reporting.md`
- `docs/designs/20260425_231613_design_only_runtime_architecture.md`
- `docs/roadmaps/20260425_235154_rust_agent_workflow_engine_milestone_roadmap.md`

## 1. Existing Design Analysis

The existing design set already establishes the important boundaries for this
document:

- `01_system_architecture.md` defines scheduled work as part of the same
  session and goal model as interactive work. The scheduler should enqueue
  work; it should not execute business logic directly.
- `05_scheduler_and_self_improvement.md` requires cron, interval, daily, and
  weekly scheduling, durable job records, retry and cooldown policy, bounded
  self-improvement, reports, and observable failure classes.
- `07_goal_management_and_reporting.md` makes goals and reports durable first
  class records. Scheduled runs should therefore link to goals and reports
  rather than exist as hidden daemon activity.
- `20260425_231613_design_only_runtime_architecture.md` already defines a
  design-only lifecycle, operational `.dev/` state, checkpoints, approval
  records, and append-only run history. This document keeps that foundation but
  simplifies the public workflow lifecycle around the required states:
  `created`, `planned`, `waiting_approval`, `running`, `blocked`,
  `completed`, `failed`, and `cancelled`.
- `20260425_235154_rust_agent_workflow_engine_milestone_roadmap.md` places the
  durable workflow engine in Phase 3, after the local design-only runtime and
  tool/skill metadata foundation. This design preserves that order.

The design-only runtime uses a richer internal model such as `loaded_context`,
`prompt_ready`, `validating`, `drafted`, and `checkpointed`. Those remain useful
as step names and checkpoint phases, but they should not become the top-level
public lifecycle. The workflow engine should expose a small stable lifecycle and
record finer progress inside checkpoint and run-history artifacts.

Important refinements made here:

- Use one explicit state machine for runs and jobs, with typed transition
  validation.
- Treat checkpointing as the durability contract after every irreversible or
  expensive step.
- Make idempotency a property of each step definition, not an informal coding
  convention.
- Use file-backed queue, lock, heartbeat, run history, and schedule state for
  the first implementation.
- Support interval, cron-like, and file watcher triggers through one scheduler
  enqueue path.
- Defer complex DAG execution from the MVP. The MVP supports a linear ordered
  step list with optional skipped and blocked steps.

## 2. Purpose

Dore needs a durable workflow runtime that can run periodically like
`dormammu`: read the goal, inspect prior state, decide the next action, execute
one safe step or run segment, checkpoint, and stop or continue. If interrupted,
the runtime must resume from the last valid checkpoint. If the same step is
retried, it must be safe through idempotency keys and artifact existence checks.

The daemon scheduler is responsible for creating or resuming queued workflow
runs from time-based and file-based triggers. It does not own business logic.
Business work runs through the workflow engine and records its state in the
same files used by CLI-initiated runs.

## 3. Goals

- Provide an explicit workflow state machine.
- Persist checkpoints and append-only run history.
- Resume safely after interruption, timeout, daemon restart, or machine reboot.
- Make every step idempotent or explicitly non-retryable.
- Support retry, timeout, cancellation, partial result recovery, and blocked
  states.
- Start with file-backed state, queue, locks, and heartbeats.
- Support interval schedules, cron-like schedules, and file watcher triggers.
- Prevent duplicate execution by combining queue dedupe, run locks, and step
  idempotency.
- Keep an upgrade path toward richer queue backends and DAG execution.

## 4. Non-Goals

- No distributed scheduler in the MVP.
- No multi-worker parallel execution in the MVP.
- No complex DAG planner or dependency graph executor in the MVP.
- No exactly-once execution guarantee. The target is at-least-once run attempts
  with idempotent steps and duplicate suppression.
- No database dependency in the first implementation.
- No daemonized background service manager integration in the first slice. The
  daemon starts as a foreground process that can later be wrapped by systemd,
  launchd, or a container supervisor.

## 5. File Layout

Operational state remains under the configured state root. In the current
workflow this is the managed `.dev` directory, not necessarily repository-root
`.dev/`.

```text
.dev/
  state.json
  queue/
    pending/
    leased/
    done/
    dead/
  schedules/
    schedules.json
    cursors/
  workflows/
    <workflow_id>/
      run.json
      checkpoints/
      history.jsonl
      steps/
      reports/
      locks/
  locks/
    daemon.lock
    queue.lock
  heartbeats/
    daemon.json
    runs/
  watchers/
    cursors.json
```

Durable, reviewed project documentation remains under `docs/`. Runtime state is
not promoted to `docs/` unless a workflow explicitly generates an approved
design, roadmap, ADR, or report intended for repository documentation.

## 6. Public Workflow Lifecycle

The public lifecycle uses the required states and adds only two optional
design-only-friendly states: `queued` and `checkpointed`.

| State | Meaning | Resumable | Terminal |
| --- | --- | --- | --- |
| `created` | Workflow record exists, but no executable plan has been persisted. | yes | no |
| `planned` | Ordered steps, retry policy, approval policy, and idempotency keys are persisted. | yes | no |
| `queued` | Planned run is waiting in the queue for a worker or daemon tick. | yes | no |
| `waiting_approval` | Human approval is required before continuing. | yes | no |
| `running` | A worker owns the run lease and is executing or about to execute a step. | yes, after lease expiry | no |
| `checkpointed` | A safe resume point was written after a step or run segment. | yes | no |
| `blocked` | Runtime cannot continue without external input, dependency recovery, or policy decision. | yes | no |
| `completed` | Workflow met success criteria and wrote final report. | no | yes |
| `failed` | Workflow exhausted retry or hit unrecoverable error. | no by default | yes |
| `cancelled` | User or shutdown policy stopped the run and wrote a cancellation record. | no by default | yes |

`checkpointed` is optional in user-facing UX. It is useful internally because a
daemon can stop after checkpointing and later advance the run from a known safe
point.

## 7. Workflow State Transition Table

| From | To | Trigger | Guard | Durable Write | Audit Event |
| --- | --- | --- | --- | --- | --- |
| none | `created` | `workflow create` or scheduler enqueue request | goal or task input is valid | `run.json` | `workflow.created` |
| `created` | `planned` | planner completes | plan schema valid; step IDs unique | `run.json`, plan artifact | `workflow.planned` |
| `planned` | `queued` | enqueue | queue item does not already exist for dedupe key | queue item | `queue.enqueued` |
| `queued` | `running` | worker lease acquired | queue lease and run lock acquired | lease file, run lock, heartbeat | `run.started` |
| `planned` | `running` | direct CLI run | run lock acquired | run lock, heartbeat | `run.started` |
| `running` | `checkpointed` | step finishes and checkpoint succeeds | step result validated | checkpoint, run history | `checkpoint.created` |
| `checkpointed` | `running` | next step selected | run lock still valid; no cancellation | `run.json` | `step.started` |
| `checkpointed` | `waiting_approval` | next step requires approval | approval request persisted | approval artifact | `approval.requested` |
| `waiting_approval` | `queued` | approval granted | approval record valid and current | queue item | `approval.granted` |
| `waiting_approval` | `blocked` | approval rejected with revision required | blocker or replan reason persisted | blocker report | `approval.rejected` |
| `running` | `blocked` | dependency unavailable or policy denies continuation | retry policy says do not retry now | blocker report, checkpoint if possible | `run.blocked` |
| `running` | `queued` | retryable failure | attempts below max; backoff computed | queue item with `not_before` | `run.retry_scheduled` |
| `running` | `failed` | unrecoverable failure or attempts exhausted | failure classified | failure report | `run.failed` |
| `checkpointed` | `completed` | no remaining steps | success criteria satisfied | final report | `run.completed` |
| any non-terminal | `cancelled` | user cancel or shutdown cancellation policy | cancellation token current | cancellation record, report | `run.cancelled` |
| `running` | `queued` | daemon shutdown with resumable checkpoint | checkpoint exists or step is idempotent | queue item | `run.requeued_on_shutdown` |
| `running` | `failed` | daemon shutdown and active step is non-resumable | non-resumable step started without safe result | failure report | `run.failed_on_shutdown` |

Invalid transitions fail with typed errors and append a rejected transition
event to run history when a run ID is known.

## 8. Step Model And Idempotency

Each workflow has an ordered list of steps. The MVP step runner executes one
current step at a time.

Required step fields:

- `step_id`
- `name`
- `kind`
- `status`
- `input_refs`
- `output_refs`
- `idempotency_key`
- `idempotency_strategy`
- `retry_policy_id`
- `timeout_policy_id`
- `approval_policy_id`
- `started_at`
- `finished_at`

Idempotency strategies:

- `artifact_exists`: before executing, check whether the expected output
  artifact already exists and passes validation.
- `operation_key`: record an operation key in run history before side effects;
  repeated attempts detect the same key and reuse or verify the prior result.
- `compare_and_swap`: update a state file only if the previous version matches.
- `manual_only`: non-idempotent step that cannot be retried automatically and
  must transition to `blocked` or `failed` after interruption.

The MVP should prefer `artifact_exists` and `compare_and_swap`. Any step that
cannot declare an idempotency strategy is rejected at plan validation time.

## 9. Checkpoint Schema

Checkpoints are immutable JSON files written with temp-file plus atomic rename.
They contain enough information to choose the next step without replaying the
entire run history.

```json
{
  "schema_version": "checkpoint.v1",
  "checkpoint_id": "chk_20260426_014615_0003",
  "workflow_id": "wf_20260426_014615",
  "run_id": "run_20260426_014615",
  "goal_id": "goal_20260426_014615",
  "state": "checkpointed",
  "previous_state": "running",
  "current_step_id": "write_design_doc",
  "completed_step_ids": [
    "load_context",
    "plan",
    "write_design_doc"
  ],
  "pending_step_ids": [
    "write_roadmap",
    "final_report"
  ],
  "retry_state": {
    "attempt": 1,
    "max_attempts": 3,
    "next_not_before": null
  },
  "partial_results": [
    {
      "artifact_id": "artifact_design_doc",
      "path": "docs/designs/20260426_014615_durable_workflow_state_scheduler.md",
      "kind": "design_doc",
      "validation": "passed"
    }
  ],
  "resume": {
    "mode": "next_step",
    "resume_from_step_id": "write_roadmap",
    "requires_approval_id": null
  },
  "lock_epoch": 4,
  "created_at": "2026-04-26T01:46:15Z"
}
```

Checkpoint validation rules:

- `schema_version`, `checkpoint_id`, `run_id`, and `state` are required.
- `completed_step_ids` must be a prefix of the MVP linear step list unless a
  step was explicitly skipped.
- Every `partial_results` path must be under an allowed artifact root.
- `resume.mode` must be one of `same_step`, `next_step`, `approval`,
  `blocked`, or `none`.
- A checkpoint must reference the lock epoch that owned the write.

## 10. Run History Schema

Run history is append-only JSON Lines. It is the audit trail; checkpoints are
the resume index.

```json
{
  "schema_version": "run_event.v1",
  "event_id": "evt_20260426_014615_0007",
  "workflow_id": "wf_20260426_014615",
  "run_id": "run_20260426_014615",
  "timestamp": "2026-04-26T01:46:15Z",
  "actor": {
    "kind": "daemon",
    "id": "daemon_local_001"
  },
  "event_type": "checkpoint.created",
  "state_before": "running",
  "state_after": "checkpointed",
  "step_id": "write_design_doc",
  "attempt": 1,
  "artifact_links": [
    "workflows/wf_20260426_014615/checkpoints/chk_20260426_014615_0003.json"
  ],
  "failure": null,
  "redacted_message": "Checkpoint created after design document write."
}
```

Required event classes:

- lifecycle: `workflow.created`, `workflow.planned`, `run.started`,
  `run.completed`, `run.failed`, `run.cancelled`
- queue: `queue.enqueued`, `queue.leased`, `queue.completed`,
  `queue.dead_lettered`
- step: `step.started`, `step.succeeded`, `step.failed`, `step.skipped`
- retry: `run.retry_scheduled`, `retry.exhausted`
- approval: `approval.requested`, `approval.granted`, `approval.rejected`
- recovery: `checkpoint.created`, `run.resumed`, `partial_result.recovered`
- scheduler: `schedule.fired`, `schedule.skipped_duplicate`,
  `watcher.changed`
- locking: `lock.acquired`, `lock.released`, `lock.stale_recovered`,
  `heartbeat.updated`

## 11. Retry, Timeout, And Cancellation

Retry policy fields:

- `max_attempts`
- `backoff_kind`: `none`, `fixed`, or `exponential`
- `initial_delay_ms`
- `max_delay_ms`
- `jitter`: `none` or `bounded`
- `retryable_failure_classes`
- `on_exhausted`: `failed` or `blocked`

Failure classes:

- `validation_error`
- `provider_error`
- `dependency_unavailable`
- `timeout`
- `policy_denied`
- `approval_rejected`
- `lock_conflict`
- `storage_error`
- `cancelled`
- `unknown`

Timeout policy fields:

- `step_timeout_ms`
- `run_timeout_ms`
- `heartbeat_timeout_ms`
- `on_step_timeout`: `retry`, `blocked`, or `failed`
- `on_run_timeout`: `cancel`, `blocked`, or `failed`

Cancellation rules:

- Cancellation is requested by writing a cancellation token under the workflow
  state directory and appending a history event when possible.
- The runner checks cancellation before each step, after each provider/tool
  call, before promotion, and before queue re-enqueue.
- If a step is idempotent and has no committed result yet, cancellation writes a
  checkpoint with `resume.mode = "same_step"` and transitions to `cancelled`.
- If a step already committed a valid result, cancellation checkpoints the
  partial result before transitioning to `cancelled`.

## 12. Partial Result Recovery

Partial result recovery is deterministic:

1. Load `run.json`.
2. Load the latest valid checkpoint by creation time and sequence.
3. Validate all artifacts listed in `partial_results`.
4. Rebuild the completed-step set from checkpoint plus verified run-history
   events.
5. If an expected output exists but was not recorded, validate it and append
   `partial_result.recovered`.
6. Resume according to `resume.mode`.

Unverified partial files are quarantined under the run report area and are not
treated as trusted workflow output.

## 13. Queue Management

The MVP queue is file-backed and single-worker-by-lock, but its record shape
should support a future database or broker.

Queue item schema:

```json
{
  "schema_version": "queue_item.v1",
  "queue_id": "q_default",
  "item_id": "item_20260426_014615",
  "dedupe_key": "schedule:weekly_goal_review:2026-04-26T01:46:00Z",
  "workflow_id": "wf_20260426_014615",
  "run_id": "run_20260426_014615",
  "priority": 50,
  "status": "pending",
  "not_before": "2026-04-26T01:46:15Z",
  "attempt": 0,
  "max_attempts": 3,
  "leased_by": null,
  "lease_expires_at": null,
  "created_at": "2026-04-26T01:46:15Z"
}
```

Queue directories:

- `pending/`: ready or delayed work.
- `leased/`: work currently owned by a runner.
- `done/`: completed queue records retained for audit and dedupe.
- `dead/`: exhausted or invalid queue records.

Duplicate prevention layers:

- Queue-level `dedupe_key` suppresses repeated enqueue for the same schedule
  tick, file change, or explicit request.
- Run-level lock prevents two workers from executing the same run.
- Step-level `idempotency_key` prevents repeated side effects if a worker
  crashes after commit but before checkpoint.

## 14. Scheduler Model

Scheduler definitions are durable JSON records. The scheduler computes due
triggers and enqueues workflow runs.

Supported trigger types:

- `interval`: fixed delay between runs, such as every 30 minutes.
- `cron`: five-field cron-like expression in the configured timezone.
- `file_watch`: one or more paths or globs watched for changes.
- `manual`: explicit CLI enqueue, useful for testing and one-off work.

Schedule fields:

- `schedule_id`
- `enabled`
- `trigger`
- `timezone`
- `target_goal_id`
- `workflow_template_id`
- `approval_policy_id`
- `retry_policy_id`
- `dedupe_window_ms`
- `cooldown_ms`
- `next_fire_at`
- `last_fire_at`
- `last_enqueued_run_id`

Cron-like MVP constraints:

- Support minute, hour, day-of-month, month, and day-of-week fields.
- Support `*`, numeric values, ranges, lists, and step expressions.
- Do not support seconds, calendar exceptions, or missed-run replay in the MVP.

File watcher MVP constraints:

- Polling watcher is acceptable for the first implementation.
- Cursors store path, last modified time, size, and optional content hash.
- A burst of changes coalesces into one queue item per schedule and dedupe
  window.

## 15. Lock And Heartbeat Strategy

Locks are files created with exclusive create semantics. A lock contains enough
metadata to detect stale owners.

Lock file schema:

```json
{
  "schema_version": "lock.v1",
  "lock_id": "lock_run_20260426_014615",
  "resource": "workflow:wf_20260426_014615",
  "owner_id": "daemon_local_001",
  "process_id": 12345,
  "hostname": "local",
  "epoch": 4,
  "acquired_at": "2026-04-26T01:46:15Z",
  "expires_at": "2026-04-26T01:51:15Z",
  "heartbeat_path": ".dev/heartbeats/runs/run_20260426_014615.json"
}
```

Heartbeat schema:

```json
{
  "schema_version": "heartbeat.v1",
  "owner_id": "daemon_local_001",
  "resource": "workflow:wf_20260426_014615",
  "epoch": 4,
  "state": "running",
  "step_id": "write_design_doc",
  "updated_at": "2026-04-26T01:46:30Z",
  "message": "Executing step"
}
```

Rules:

- The daemon holds `daemon.lock`; queue mutation holds `queue.lock`; each active
  workflow holds a run lock.
- Heartbeats update at least every `heartbeat_interval_ms`.
- A lock is stale only when both `expires_at` has passed and the heartbeat is
  older than `heartbeat_timeout_ms`.
- Stale recovery increments the lock epoch and writes `lock.stale_recovered`.
- A recovering worker must validate the latest checkpoint before resuming.
- Lock stealing is never silent; it always writes a recovery event.

## 16. Daemon Process Lifecycle

Lifecycle:

1. Parse config and locate repo root and state root.
2. Acquire `daemon.lock`.
3. Write daemon heartbeat.
4. Load schedule definitions and queue state.
5. Recover stale leased queue items and stale run locks.
6. Enter tick loop.
7. On each tick, evaluate schedules and watchers, enqueue due work, lease ready
   queue item, run one step or bounded run segment, checkpoint, update heartbeat.
8. On shutdown signal, stop taking new leases, request cancellation for active
   non-interruptible work if policy requires it, checkpoint if possible, release
   locks, and write shutdown event.
9. On restart, perform the same stale lease and checkpoint recovery before
   executing new work.

Graceful shutdown should be bounded by `shutdown_grace_ms`. If the runner cannot
checkpoint before the grace period expires, the next daemon uses stale lock
recovery and idempotency checks.

## 17. Scheduler Command UX

Initial CLI commands:

```text
dore workflow create --goal <goal-id> --template <template-id>
dore workflow status <workflow-id>
dore workflow resume <workflow-id>
dore workflow cancel <workflow-id> [--reason <text>]

dore queue list [--status pending|leased|done|dead]
dore queue enqueue --workflow <workflow-id> [--dedupe-key <key>]
dore queue retry <item-id>
dore queue dead-letter <item-id> --reason <text>

dore schedule list
dore schedule add interval --id <id> --every 30m --goal <goal-id>
dore schedule add cron --id <id> --expr "0 9 * * 1" --goal <goal-id>
dore schedule add watch --id <id> --path docs/prompts --goal <goal-id>
dore schedule enable <id>
dore schedule disable <id>
dore schedule run-now <id>
dore schedule next <id>

dore daemon run [--foreground] [--tick 30s] [--once]
dore daemon status
dore daemon stop
```

UX principles:

- `daemon run --once` is the integration-test and debugging path: evaluate due
  work, process at most one queue item, then exit.
- `schedule run-now` creates a queue item with a manual trigger and a dedupe key.
- `status` should report state, current step, last checkpoint, pending approval,
  retry/backoff, lock owner, and latest report path.
- Commands that mutate queue, schedule, or workflow state must acquire the
  relevant lock.

## 18. Failure Recovery Behavior

| Failure | Detection | Recovery |
| --- | --- | --- |
| Process crash before step starts | leased item heartbeat expires | return item to `pending` if attempts remain |
| Crash after side effect before checkpoint | stale run lock, missing checkpoint | run idempotency recovery for current step before retry |
| Partial checkpoint write | temp file or invalid JSON | ignore invalid checkpoint, use previous valid checkpoint |
| Corrupt `run.json` | schema validation fails | move run to `blocked` if history can reconstruct; otherwise `failed` with storage error |
| Provider timeout | step timeout | retry with backoff if class is retryable |
| Approval not granted | run remains `waiting_approval` | no automatic retry; scheduler may report pending approvals |
| Duplicate schedule tick | same dedupe key exists | skip enqueue and write `schedule.skipped_duplicate` |
| Stale daemon lock | expired lock and heartbeat | recover lock, append event, resume from checkpoints |
| File watcher burst | multiple path changes in dedupe window | coalesce into one queue item |
| Shutdown during run | signal received | checkpoint current safe point, requeue if non-terminal |

## 19. MVP에서 제외할 복잡한 DAG 기능

The MVP intentionally excludes these DAG features:

- Parallel branches.
- Fan-out and fan-in joins.
- Conditional graph routing beyond simple skipped steps.
- Dynamic graph mutation during execution.
- Cross-workflow dependency scheduling.
- Distributed workers competing for DAG nodes.
- Compensation transactions and saga orchestration.
- Visual DAG editor or graph query layer.
- Per-node resource scheduling.

The future extension point is the step model: a later `workflow_graph.v1` can
replace the MVP ordered step list while preserving run state, checkpoints, run
history, locks, queue items, and scheduler triggers.

## 20. Test Requirements

- Unit tests for state transitions, invalid transitions, retry policy, timeout
  policy, cancellation, schedule math, watcher cursor diffing, lock expiry, and
  heartbeat staleness.
- Integration tests for enqueue/dequeue, duplicate suppression, checkpoint
  recovery, stale lease recovery, approval pause/resume, daemon `--once`, and
  graceful shutdown.
- Failure tests for partial writes, corrupt JSON, timeout, cancellation,
  process interruption, and stale lock recovery.
- Smoke test for interval schedule to queued workflow to completed report.

## 21. Acceptance Criteria

This design is implemented enough for the durable workflow milestone when:

- Every run has a validated lifecycle state and append-only history.
- Every successful step writes or references a checkpoint.
- Interrupted runs resume from the latest valid checkpoint or produce a clear
  blocked/failed report.
- Duplicate schedule ticks and duplicate run attempts are suppressed.
- The daemon can run in foreground, process scheduled work, heartbeat, shut down
  gracefully, and restart without corrupting state.
- Complex DAG behavior remains explicitly out of scope for the MVP.
