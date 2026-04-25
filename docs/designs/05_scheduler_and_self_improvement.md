# CEP-05: Scheduler And Self-Improvement

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore automation maintainers
Related: `01_system_architecture.md`, `06_quality_and_test_strategy.md`, `07_goal_management_and_reporting.md`, `08_multi_agent_and_a2a.md`

## 1. Summary

Dore must do more than react to messages. It must run scheduled work, review its own gaps, propose or implement improvements, and report outcomes back to the user.

This CEP defines a bounded autonomy model: scheduled work and self-improvement are product features, but they operate under explicit policy, goal state, and test gates.

## 2. Goals

- Support cron, interval, daily, and weekly execution.
- Represent scheduled work as durable goals or jobs.
- Let Dore inspect its own weaknesses and improvement points.
- Keep self-improvement observable, bounded, and test-gated.
- Align automation with user value rather than background churn.

## 3. Non-Goals

- Unrestricted autonomous code editing
- Silent changes with no report trail
- Mixing scheduling logic into Telegram or provider modules
- Treating every observation as an automatic implementation task

## 4. Scheduler Model

The scheduler is responsible only for time computation and enqueueing. It does not perform business work directly.

Supported trigger types:

- cron expressions
- fixed intervals
- daily windows
- weekly windows

Each scheduled definition should include:

- schedule ID
- trigger type
- next run time
- cooldown policy
- retry policy
- target task type
- linked goal or objective
- approval policy

## 5. Job Model

When a trigger fires, the scheduler creates or resumes a job record.

Each job should track:

- job ID
- originating schedule ID
- target goal ID
- status
- attempt count
- start and finish timestamps
- linked session ID
- report reference
- failure classification if any

## 6. Supported Scheduled Task Classes

Initial scheduled tasks should include:

- memory lint
- digest rebuild
- provider health check
- goal review
- weekly report generation
- improvement backlog review
- project research review

This list should stay deliberately small in milestone one.

## 7. Improvement Sources

Dore may identify improvement candidates from:

- repeated user friction
- provider failures
- token budget regressions
- stale memory or digest drift
- test failures or flaky tests
- missing commands or workflows
- repeated manual interventions by the user

## 8. Improvement Workflow

The controlled workflow is:

1. observe
2. analyze
3. register an improvement candidate
4. classify risk and required approval
5. create a bounded plan
6. execute in a dedicated session or worker
7. run required tests
8. generate a report
9. apply, defer, or reject according to policy

Each stage must leave an artifact.

## 9. Policy Classes

Improvement actions should be divided into policy classes:

- `report_only`
- `safe_auto_apply`
- `requires_user_approval`
- `forbidden`

Examples:

- updating a stale digest may be `safe_auto_apply`
- changing provider routing defaults likely `requires_user_approval`
- exfiltrating secrets is always `forbidden`

## 10. Bounded Execution Rules

Self-improvement tasks must obey these hard rules:

- narrow write scope
- explicit objective
- explicit test plan
- explicit rollback or failure handling path
- report generation is mandatory

If a task cannot describe its write scope or test plan, it should not execute automatically.

## 11. Session Integration

Scheduled work and improvement work should run in:

- a system session for low-risk maintenance
- a child session for delegated work under a user or goal context
- a worker session when using external coding agents or peers

This keeps the audit trail consistent with conversational work.

## 12. Reporting Requirements

Every significant run should produce a report containing:

- reason for execution
- input goal or schedule
- actions taken
- files or artifacts changed
- tests run
- pass/fail status
- recommended follow-up

Reports should be short in Telegram and detailed in durable artifacts.

## 13. Failure Handling

On failure, Dore must:

- classify the failure
- capture relevant evidence
- apply backoff or cooldown policy
- notify the user if the failure is material
- avoid infinite retry loops

Failure classes should include:

- dependency failure
- auth failure
- test failure
- policy rejection
- timeout
- conflicting state

## 14. Observability

Track at minimum:

- jobs created
- jobs completed
- jobs failed
- retries used
- improvement candidates opened
- improvement candidates accepted
- changes blocked by policy
- changes blocked by tests

These metrics support both debugging and self-improvement prioritization.

## 15. Testing Requirements

- Unit tests for schedule math, cooldown logic, and policy evaluation
- Integration tests for trigger-to-job creation and job-to-session execution
- Smoke tests for a scheduled task producing a user-visible report
- End-to-end tests for a full improvement cycle with mandatory test gates

## 16. Acceptance Criteria

This CEP is accepted when:

- scheduled jobs run predictably
- scheduled work becomes auditable job or goal records
- improvement tasks remain bounded and policy-aware
- no self-improvement result is accepted without tests
- the user can understand why Dore acted and what changed

## 17. Open Questions

- Which schedule definitions should ship in milestone one by default?
- Which improvement classes should remain manual-only even after strong tests exist?
- Should weekly reviews be pure reports first, or report-plus-proposal from the start?
