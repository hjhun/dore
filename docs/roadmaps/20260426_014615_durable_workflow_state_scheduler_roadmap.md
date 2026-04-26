# Durable Workflow State And Scheduler Roadmap

Status: Proposed
Created: 2026-04-26 01:46:15 UTC
Basis: `docs/designs/20260426_014615_durable_workflow_state_scheduler.md`

## 1. Roadmap Goal

Build the durable workflow engine and daemon scheduler for the Rust AI Agent /
Workflow Engine after the local design-only runtime is stable. The runtime must
start with file-backed state, explicit state transitions, checkpoint/resume,
idempotent steps, retry/timeout/cancellation policy, queue management, interval
and cron-like schedules, file watcher triggers, locks, heartbeats, and graceful
restart behavior.

The roadmap connects to the existing milestone roadmap by expanding Phase 3:
Durable Workflow Engine. It assumes Phase 1 has already delivered the CLI,
artifact store, schema validation, reports, and basic retry/resume, and Phase 2
has delivered tool and skill metadata foundations.

## 2. Existing Design And New Design Summary

Existing design decisions retained:

- Local-first, readable file state is the first storage backend.
- Scheduled work creates or resumes durable goals, jobs, workflows, sessions,
  and reports rather than running hidden daemon logic.
- Structured JSON artifacts are source of truth; Markdown is the review and
  reporting surface.
- Approval is a typed state transition, not a Markdown-only convention.
- Complex DAG, distributed queue, and unrestricted autonomous execution are not
  MVP requirements.

New decisions from the durable scheduler design:

- Public run lifecycle is centered on `created`, `planned`, `queued`,
  `waiting_approval`, `running`, `checkpointed`, `blocked`, `completed`,
  `failed`, and `cancelled`.
- Checkpoints are the resume index; run history is the append-only audit trail.
- Every step must declare an idempotency strategy before it can run.
- Duplicate prevention uses queue dedupe keys, run locks, and step idempotency
  keys together.
- The daemon begins as a foreground process with `--once` support for tests and
  debugging.
- Interval, cron-like, file watcher, and manual triggers enqueue work through
  the same queue path.

## 3. Milestone Connection

This roadmap maps into the broader project sequence:

| Broader Phase | Connection |
| --- | --- |
| Phase 0: Design-only foundation | This document finalizes the durable state, queue, lock, heartbeat, and scheduler design inputs. |
| Phase 1: Minimal local runtime | Provides CLI, artifact store, basic state, validation, reports, and simple resume used by this roadmap. |
| Phase 2: Tool and skill foundation | Provides metadata and policy hooks that future workflow steps can reference without executing unsafe capabilities. |
| Phase 3: Durable workflow engine | Main implementation target for this roadmap. |
| Phase 4: Safety and sandboxing | Hardens any future executable steps that go beyond design-only artifacts. |
| Phase 5: Production hardening | Adds observability, packaging, service integration, and optional non-file backends. |

## 4. Implementation Order

1. Freeze schemas and transition validation for workflow, step, checkpoint, run
   event, queue item, schedule, lock, and heartbeat.
2. Implement file-backed atomic storage and recovery helpers for the new
   artifacts.
3. Build the state transition engine and idempotent step runner around the
   existing design-only run loop.
4. Add checkpoint and run-history append behavior after every important
   transition.
5. Add retry, timeout, cancellation, and partial result recovery.
6. Add file-backed queue and duplicate prevention.
7. Add interval, cron-like, manual, and file watcher enqueue triggers.
8. Add foreground daemon lifecycle, locks, heartbeats, stale recovery, graceful
   shutdown, and restart behavior.
9. Add tests and smoke flows before considering DAG expansion.

## 5. Phase 3A: State Machine And Schemas

### Objective

Turn the design into Rust schema types and transition validation.

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3A.M1 Workflow schema | `workflow_run.v1`, public lifecycle enum, step list model | Fixtures deserialize; unsupported versions are rejected |
| P3A.M2 Transition engine | typed transition table and guard evaluation | Invalid transitions return typed errors and never mutate state |
| P3A.M3 Step schema | step status, idempotency key, retry/timeout/approval policy IDs | Plans without idempotency are rejected |
| P3A.M4 Run event schema | append-only `run_event.v1` writer | Lifecycle and rejected transitions are auditable |
| P3A.M5 CLI status integration | status shows state, current step, retry, approval, checkpoint | Users can understand where a run stopped |

### Verification

- Unit tests for every valid transition.
- Unit tests for representative invalid transitions.
- Fixture round-trip tests for workflow, step, and run-event schemas.

## 6. Phase 3B: Checkpoint And Resume

### Objective

Make interruption recovery reliable before adding queue and daemon behavior.

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3B.M1 Checkpoint writer | immutable checkpoint files with atomic rename | Partial writes are ignored during recovery |
| P3B.M2 Resume selector | latest valid checkpoint discovery and validation | Resume chooses the correct step without replaying full history |
| P3B.M3 Partial result recovery | artifact validation and `partial_result.recovered` events | Existing valid outputs prevent duplicate side effects |
| P3B.M4 Approval resume | `waiting_approval` resumes after approval into queued or running | Approval cannot be applied to stale run revisions |
| P3B.M5 Cancellation record | cancellation token and terminal cancellation report | Cancelled runs do not continue accidentally |

### Verification

- Integration test for crash simulation after a step result but before
  checkpoint.
- Integration test for corrupt newest checkpoint falling back to prior valid
  checkpoint.
- Integration test for waiting approval, approve, resume, complete.

## 7. Phase 3C: Retry, Timeout, And Idempotent Step Runner

### Objective

Execute ordered steps with finite retry, timeout, and idempotency guarantees.

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3C.M1 Idempotency checks | `artifact_exists`, `operation_key`, `compare_and_swap`, `manual_only` | Retried steps reuse or validate existing results |
| P3C.M2 Retry policy | fixed/exponential backoff, max attempts, retryable classes | Retry never loops forever |
| P3C.M3 Timeout policy | step/run/heartbeat timeout handling | Timeout transitions match policy |
| P3C.M4 Failure classification | typed failure classes and failure reports | Failed and blocked states explain cause and next action |
| P3C.M5 Step runner smoke path | run one bounded segment and checkpoint | A run can stop and resume after each step |

### Verification

- Unit tests for retry backoff and exhaustion.
- Unit tests for idempotency strategy decisions.
- Failure tests for provider timeout, policy denied, storage error, and
  cancellation.

## 8. Phase 3D: File-Backed Queue

### Objective

Add durable queue management and duplicate suppression while still supporting a
single local worker.

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3D.M1 Queue schema | `queue_item.v1`, pending/leased/done/dead directories | Queue items survive process restart |
| P3D.M2 Enqueue/dequeue | lock-protected enqueue and lease operations | Ready work is leased once |
| P3D.M3 Dedupe keys | schedule/manual/watch dedupe key handling | Duplicate schedule ticks do not create duplicate runs |
| P3D.M4 Lease recovery | expired leases return to pending or dead | Crashed workers do not strand queue items |
| P3D.M5 Queue CLI | list, enqueue, retry, dead-letter | Operators can inspect and repair queue state |

### Verification

- Integration tests for enqueue, lease, complete, retry, dead-letter.
- Duplicate enqueue tests for identical dedupe keys.
- Stale lease recovery tests.

## 9. Phase 3E: Scheduler Triggers

### Objective

Implement interval, cron-like, manual, and file watcher triggers that enqueue
workflow runs through the same queue path.

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3E.M1 Schedule schema | schedule definitions, cursors, next-fire state | Schedule state is durable and versioned |
| P3E.M2 Interval trigger | fixed interval computation with cooldown | Due interval schedules enqueue once per tick window |
| P3E.M3 Cron-like trigger | five-field cron parser and next time computation | Cron schedules compute expected next fire times |
| P3E.M4 Manual trigger | `schedule run-now` path | Manual runs use explicit dedupe and audit events |
| P3E.M5 File watcher | polling watcher cursors and coalescing | File changes enqueue one item per dedupe window |
| P3E.M6 Schedule CLI | list, add, enable, disable, next, run-now | Schedule UX is testable without daemonizing |

### Verification

- Unit tests for interval math, cron expression variants, cooldown, timezone
  handling, and watcher cursor changes.
- Integration tests for schedule run-now and due schedule enqueue.
- Burst-change test for watcher coalescing.

## 10. Phase 3F: Daemon, Locks, Heartbeats, Restart

### Objective

Run the scheduler and workflow engine in a foreground daemon that can shut down
and restart safely.

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3F.M1 Lock files | daemon, queue, and run locks with epochs | Concurrent processes do not mutate the same state |
| P3F.M2 Heartbeats | daemon and run heartbeat writers | Stale owners can be detected |
| P3F.M3 Daemon loop | `daemon run --foreground`, `--tick`, `--once` | Daemon evaluates schedules and processes bounded work |
| P3F.M4 Stale recovery | stale lock and stale lease recovery | Restart resumes from checkpoints without corruption |
| P3F.M5 Graceful shutdown | signal handling, checkpoint/requeue, lock release | Shutdown leaves recoverable state |
| P3F.M6 Daemon status/stop | operator commands | Users can inspect and request daemon shutdown |

### Verification

- Smoke test: `daemon run --once` processes one due schedule to report.
- Integration test for shutdown during a resumable step.
- Integration test for stale daemon lock recovery.
- Lock conflict test with concurrent CLI mutation attempts.

## 11. Phase 3G: Documentation And Operator UX

### Objective

Make the durable runtime understandable and supportable.

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3G.M1 Workflow reference | states, transitions, checkpoint, history, queue schemas | Docs match implemented schema names and examples |
| P3G.M2 Scheduler reference | interval, cron-like, watcher, command UX | Users can add and inspect schedules from docs |
| P3G.M3 Recovery guide | stale lock, failed run, dead queue item, corrupt checkpoint | Operators have safe repair commands |
| P3G.M4 AGENTS update | build/test commands and new source layout if implementation exists | Repository guide is not stale |

### Verification

- Run all documented commands in a smoke environment.
- Confirm examples do not rely on complex DAG behavior.

## 12. MVP Exclusions

Do not implement these before the above phases pass:

- Parallel DAG branches and joins.
- Distributed workers or broker-backed queues.
- Cross-workflow dependency scheduling.
- Dynamic workflow graph mutation.
- Compensation transactions.
- Service-manager packaging as the only supported daemon path.
- Automatic executable tool or skill steps that bypass Phase 4 policy and
  sandboxing.

## 13. Release Gate

The durable workflow and scheduler MVP is ready when:

- A workflow can be created, planned, queued, run, checkpointed, resumed,
  completed, failed, blocked, and cancelled through typed transitions.
- Queue dedupe, run locks, and idempotency prevent duplicate execution from
  corrupting state.
- Interval, cron-like, manual, and file watcher triggers enqueue work through
  one path.
- The daemon can run foreground and `--once`, heartbeat, recover stale leases,
  shut down gracefully, and restart from checkpoints.
- Tests cover transition validation, checkpoint recovery, queue recovery,
  scheduler math, lock/heartbeat staleness, cancellation, timeout, and duplicate
  prevention.
