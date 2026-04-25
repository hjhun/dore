# CEP-06: Quality And Test Strategy

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore quality maintainers
Related: `01_system_architecture.md`, `05_scheduler_and_self_improvement.md`

## 1. Summary

Dore will treat quality as a product capability, not as a post-hoc engineering task.

The user requirement is explicit: unit, integration, smoke, and end-to-end testing must all exist in the development process. Untested code is not acceptable, especially in a system that remembers users and may improve itself.

## 2. Goals

- Make tests mandatory for meaningful features.
- Verify each subsystem at the right layer.
- Prevent self-improvement from bypassing verification.
- Keep the test suite useful, not ceremonial.
- Preserve high confidence as the system evolves.

## 3. Quality Policy

Core rule:

No meaningful feature is complete until the required tests exist and pass.

Additional rules:

- critical regressions require regression tests
- flaky tests are treated as bugs
- smoke coverage is mandatory for main operational flows
- self-improvement without tests is a failed attempt, not a success

## 4. Test Layers

### 4.1 Unit Tests

Purpose:

- verify isolated logic
- keep feedback fast
- enforce edge-case behavior

Primary targets:

- memory parsing and claim merge rules
- digest compilation
- routing and auth policy
- session compaction
- scheduler calculations
- improvement policy guards

### 4.2 Integration Tests

Purpose:

- verify boundary collaboration between modules

Primary targets:

- Telegram adapter into session runtime
- session runtime into provider selection
- task completion into memory update
- scheduler into job creation
- improvement runner into quality gates

### 4.3 Smoke Tests

Purpose:

- prove the main happy paths still boot and run

Initial smoke targets:

- startup plus basic Telegram request handling
- default provider initialization
- memory digest read path
- a scheduled job producing a report

### 4.4 End-To-End Tests

Purpose:

- verify complete user-visible flows

Initial e2e targets:

- learn a user fact, store it, and use it later
- run a scheduled review and send a report
- execute a bounded improvement task with tests and reporting

## 5. Module Coverage Expectations

## `memory`

- page updates
- contradiction detection
- digest correctness
- provenance retention

## `provider`

- OAuth and refresh behavior
- API-key resolution
- fallback policy
- failure classification

## `session`

- context assembly
- compaction
- child session promotion

## `channel::telegram`

- command parsing
- session mapping
- message delivery error handling

## `scheduler`

- trigger calculation
- deduplication
- retry and cooldown behavior

## `improvement`

- candidate creation
- policy enforcement
- report creation
- test gate handling

## `goal`

- goal creation
- priority updates
- review state
- report linkage

## `agent`

- worker assignment
- result promotion
- lease timeout and cancellation

## `skill`

- ClawHub search and install flow
- origin and lockfile persistence
- trust policy and allowlist enforcement
- readiness and security scan results

## 6. Fixture And Mocking Policy

Use explicit fixtures for:

- Telegram updates
- provider responses
- OAuth callback data
- memory pages and digests
- job records
- reports

Mock at the external boundary:

- Telegram API
- remote provider APIs
- local provider HTTP surfaces if needed

Do not mock core domain logic in the tests that are intended to verify it.

## 7. CI And Execution Strategy

Recommended pipeline order:

1. format
2. lint
3. unit tests
4. integration tests
5. smoke tests
6. selected e2e tests

Long-running e2e suites may be split into a separate job, but they must still exist and remain healthy.

## 8. Release And Acceptance Rules

A change is not ready for trust if:

- required test layers are missing
- tests fail
- the report artifact is missing for self-improvement work
- the change affects a critical boundary with no regression coverage

Critical boundaries:

- auth
- memory correctness
- scheduler deduplication
- session continuity
- report integrity

## 9. Observability And Metrics

Track:

- pass/fail rate by layer
- flaky test count
- mean runtime by suite
- regression escapes
- blocked self-improvement attempts
- coverage on critical modules

The point is not vanity metrics. The point is to see whether trust is increasing or eroding.

## 10. Testing In Self-Improvement

Self-improvement runs must declare:

- expected files or modules touched
- required tests
- optional extra validation
- acceptance conditions

If the run cannot satisfy its test gate, it should end as:

- `failed`
- `deferred`
- or `requires_review`

It must not end as `successful`.

## 11. Documentation Requirements

When a change alters:

- user-visible behavior
- commands
- schedule semantics
- memory conventions
- provider configuration

the relevant docs must be updated in the same work item.

## 12. Acceptance Criteria

This CEP is accepted when:

- all critical modules have unit and integration coverage
- smoke tests cover the main operational paths
- e2e flows exist for memory continuity, scheduling, and self-improvement
- quality gates can block unsafe changes
- the project treats untested code as incomplete work

## 13. Open Questions

- Which test harness should be used for Telegram e2e simulation?
- Which minimum coverage thresholds are appropriate for milestone one?
- Should self-improvement runs require both focused tests and a smoke subset by default?
