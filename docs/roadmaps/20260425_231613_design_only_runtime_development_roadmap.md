# Design-Only Runtime Development Roadmap

Status: Proposed
Created: 2026-04-25 23:16:13 UTC
Basis: `docs/designs/20260425_231613_design_only_runtime_architecture.md`

## 1. Roadmap Goal

Build the first executable Dore runtime slice as a local Rust CLI that performs
design-only planning. The runtime reads a goal, loads previous state and design
artifacts, selects context, requests typed LLM output, validates it, writes
reviewable Markdown, requests human approval, checkpoints the result, and
resumes cleanly in a later run.

The roadmap intentionally avoids autonomous code edits, shell execution, skill
execution, daemon scheduling, and complex DAG orchestration until the
design-only loop is reliable.

## 2. Non-Goals

- No source file modification by the runtime in MVP milestones.
- No shell command execution from generated plans in MVP milestones.
- No ClawHub or external skill execution before metadata, policy, and sandbox
  phases.
- No Telegram channel before the CLI workflow is stable.
- No daemon scheduler, file watcher, or queue before the linear run loop is
  tested.
- No complex DAG workflow engine before durable checkpoints and transition
  validation work.
- No untyped LLM output accepted into trusted runtime state.

## 3. Implementation Order

1. Finalize schema structs and transition rules from the design document.
2. Scaffold the Rust CLI and file artifact store.
3. Implement goal loading, state loading, and context manifest creation.
4. Implement mock provider, prompt packet creation, typed output validation,
   and bounded retry.
5. Implement draft, review, risk, approval, checkpoint, and run-history
   artifacts.
6. Implement approval and resume commands.
7. Add tests and CLI smoke flows.
8. Prepare later extension points for tool metadata, scheduler, policy, and
   provider integrations without implementing them in the MVP.

## 4. Phase 0: Design Foundation

### Objective

Make the design-only runtime implementable by fixing artifact ownership,
schemas, state transitions, validation, approval, CLI UX, and MVP boundaries.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P0.M1 Existing document analysis | Summary of relevant CEPs, prompts, previous synthesis, and roadmap conclusions | Design document states which previous decisions are retained, deferred, or refined |
| P0.M2 Artifact ownership decision | Split between `.dev/` operational state and `docs/` durable documentation | Draft, checkpoint, run history, approval, and promoted docs have clear homes |
| P0.M3 State machine | Design-only lifecycle and transition table | Every state has entry input, exit output, guard, and resumability classification |
| P0.M4 Schema set | Goal, state, context manifest, plan, LLM output, draft, decision, risk, approval, checkpoint, run history | Each schema has a version and maps cleanly to Rust `serde` structs |
| P0.M5 Validation and retry design | Layered validation flow and finite retry policy | Invalid output cannot loop forever and failure artifacts are specified |
| P0.M6 Approval gate design | Approval-required actions and structured approval records | Markdown review cannot be the only approval source of truth |
| P0.M7 CLI UX design | MVP and later command set | Normal run, approval pause, rejection, and resume are covered |

### Test And Verification Plan

- Review schemas for typed deserialization feasibility.
- Table-test state transitions on paper before implementation.
- Check all required prompt capabilities against the design sections.
- Confirm no MVP command implies code modification, shell execution, or skill
  execution.

### Documentation Tasks

- Keep the design document under `docs/designs/`.
- Link the roadmap to the design document.
- Defer Korean mirror updates until implementation details stabilize.

### Risks And Dependencies

- Depends on the existing CEPs and prior roadmap synthesis.
- Risk: schemas become too broad. Mitigation: require strict core fields and
  allow only explicit optional metadata.
- Risk: `.dev/` and `docs/` responsibilities blur. Mitigation: implement
  promotion rules and approval checks.

## 5. Phase 1: Minimal Local CLI Runtime

### Objective

Implement a runnable local CLI that performs a complete design-only run with
mock provider output and file-backed state.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P1.M1 Rust scaffold | `Cargo.toml`, `src/`, `tests/`, formatter and linter setup, root automation entry point | `cargo fmt`, `cargo clippy`, and `cargo test` are runnable from the repository root |
| P1.M2 CLI skeleton | `init`, `goal set`, `run`, `status`, `review`, `approve`, `reject`, `resume` | Commands parse arguments and return typed errors |
| P1.M3 Artifact store | File-backed JSON/Markdown read-write, atomic write, directory initialization | State root can be created and repeated writes do not corrupt files |
| P1.M4 Core schemas | Rust structs for goal, runtime state, plan, design output, risk, approval, checkpoint, run history | Valid fixtures deserialize; unsupported schema versions are rejected |
| P1.M5 State transitions | Transition validator and terminal/resumable state handling | Invalid transitions fail with typed errors and append audit/run events |
| P1.M6 Goal loading | Goal from `goal.md`, external file, or CLI text | Goal is normalized into `goal.json` and linked to runtime state |
| P1.M7 Context manifest | Deterministic scan of `.dev/` and selected `docs/` files | Manifest records included and excluded artifacts with reasons |

### Test And Verification Plan

- Unit tests for schema loading and unsupported versions.
- Unit tests for artifact path handling and atomic writes.
- Unit tests for state transitions.
- Integration test for `init` plus `goal set`.
- CLI smoke test for `status` on a fresh state root.

### Documentation Tasks

- Document state root initialization.
- Update repository guidance if real `src/` and `tests/` directories are added.
- Document artifact file names and schema versions.

### Risks And Dependencies

- Depends on Phase 0 schema decisions.
- Risk: CLI grows too quickly. Mitigation: keep provider and scheduler behind
  traits but implement only mock provider in this phase.

## 6. Phase 2: Structured Design Loop

### Objective

Complete the core design-only planning loop from prompt assembly through typed
validation, retry, draft rendering, review document creation, approval request,
and checkpoint.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P2.M1 Prompt packet builder | Prompt JSON/Markdown packet with schema contract and selected context | Prompt packet is saved under `.dev/prompts/` before provider call |
| P2.M2 Mock provider | Valid, invalid, and retry-success fixture providers | Tests can exercise success, retry, and failure without external network |
| P2.M3 Output validator | JSON extraction, typed deserialization, schema version check, semantic checks, MVP policy checks | Invalid output produces structured validation errors |
| P2.M4 Bounded retry | Persistent retry counter and retry prompt | Runtime stops at configured limit and writes a failure report |
| P2.M5 Draft renderer | Design draft/change proposal JSON plus Markdown | Markdown is readable and linked to source context |
| P2.M6 Risk and decision renderer | `risks.json`, `risks.md`, decision records | Risks include severity and mitigation; decisions include rationale |
| P2.M7 Review and approval request | Review Markdown and approval JSON | Run enters `waiting_approval` when promotion or major decision requires approval |
| P2.M8 Checkpoint and run history | Checkpoint JSON and append-only event log | Resume can find last valid checkpoint and pending approval |

### Test And Verification Plan

- Unit tests for validation failures and retry prompts.
- Unit tests for markdown rendering from typed structures.
- Integration tests for valid mock provider complete flow.
- Integration tests for invalid mock provider reaching failed state.
- Snapshot tests for review Markdown if output stability is useful.

### Documentation Tasks

- Document prompt packet structure.
- Document validation errors and retry behavior.
- Document review document format.

### Risks And Dependencies

- Depends on Phase 1 artifact store, schemas, and transition validator.
- Risk: model formatting issues are mistaken for semantic failures. Mitigation:
  keep error classes separate: parse, schema, semantic, policy, storage.

## 7. Phase 3: Approval, Resume, And Replanning

### Objective

Make human approval and pause/resume behavior reliable enough for real design
iteration.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3.M1 Approval commands | `approve <id>` and `reject <id>` update structured records | Approval state cannot be changed twice without explicit override |
| P3.M2 Resume after approval | `resume` continues from `waiting_approval` through checkpoint and completion | Approved artifacts are promoted only when policy allows |
| P3.M3 Resume after rejection | Rejection comment becomes replan input | Runtime returns to `planned` with a new plan revision |
| P3.M4 Blocked state handling | Missing input or context creates blocker report | `status` explains what input is needed |
| P3.M5 Cancellation | User cancellation writes cancellation event and report | Cancelled run is terminal unless explicitly cloned into a new run |
| P3.M6 Replanning support | Plan revisions and links to previous plan | Replanned steps preserve previous run history |
| P3.M7 Final report | Completed, failed, blocked, cancelled reports | Every terminal or waiting state has a human-readable summary |

### Test And Verification Plan

- Integration test for approval pause, approve, resume, completion.
- Integration test for rejection and replanning.
- Integration test for blocked state and status output.
- Unit tests for approval immutability and cancellation transitions.

### Documentation Tasks

- Document approval workflow examples.
- Document resume semantics and resumable states.
- Document replanning behavior.

### Risks And Dependencies

- Depends on Phase 2 review and checkpoint artifacts.
- Risk: approval becomes ambiguous when multiple runs exist. Mitigation:
  include run ID, goal ID, and requested action in every approval record.

## 8. Phase 4: Safety And Sandboxing Boundary

### Objective

Turn design-only policy assumptions into enforceable runtime boundaries before
any future tool, skill, shell, or source-modification capability is allowed.
This phase may add a restricted command runner and fixture-only sandbox tests,
but design-only planning remains the default user-facing workflow.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P4.M1 Policy engine | Policy file parser and decision API for deny, dry-run, approval, allow | Every proposed action receives a policy decision before execution is possible |
| P4.M2 Capability model | File read/write, process spawn, network, env, secrets, temp workspace, resource limits | Capabilities are explicit and least-privilege by default |
| P4.M3 Approval enforcement | Approval checks for sensitive transitions and capability grants | Always-approval actions cannot proceed without approval record |
| P4.M4 Audit log | Append-only audit events with actor, action, decision, and artifact links | Security-relevant events are inspectable and do not leak secrets |
| P4.M5 Guardrail pipeline | Input, output, tool-result, redaction, and prompt-injection quarantine checks | Unsafe content cannot silently enter trusted runtime state |
| P4.M6 Sandbox MVP | Restricted command runner, temp workspace, env filtering, command allowlist, network default deny | Approved fixture commands run with reduced context and captured reports |
| P4.M7 Fixture skill execution | Reviewed local fixture skill under policy and sandbox limits | Safe fixture runs; unsafe fixtures are blocked with reports |

### Test And Verification Plan

- Unit tests for policy decisions, capability matching, approval checks,
  redaction, and audit event creation.
- Integration tests for restricted fixture execution and audit logging.
- Security tests for unsafe paths, environment leaks, prompt injection markers,
  and network-deny behavior.
- Regression tests confirming design-only mode still blocks source edits, shell
  execution, and external skill execution by default.

### Documentation Tasks

- Document threat model and trust boundaries.
- Document policy file schema and approval matrix.
- Document audit log schema.
- Document sandbox MVP guarantees and non-guarantees.
- Document the fixture-only skill execution workflow.

### Risks And Dependencies

- Depends on Phase 2 metadata foundations and Phase 3 durable workflow state.
- Risk: policy bypass through direct module calls. Mitigation: route all future
  execution through one executor boundary.
- Risk: overclaiming sandbox strength. Mitigation: document exact guarantees
  and keep default behavior deny, dry-run, or approval-required.

## 9. Phase 5: Performance And Production Hardening

### Objective

Prepare the design-only CLI and workflow engine for real use with benchmarks,
observability, regression suites, compatibility checks, packaging, and release
readiness. This phase may also add an optional real provider boundary, but mock
provider tests remain the required deterministic release gate.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P5.M1 Benchmark suite | Startup, memory, state load/save, validation, render, and catalog-load benchmarks | Baselines are recorded and regressions are detectable |
| P5.M2 Observability | Structured logs, run IDs, artifact links, workflow timing, provider/tool timing hooks | Failed runs can be debugged from logs and artifacts |
| P5.M3 Trace export | Optional trace export for workflow steps, validation, approval, and policy decisions | Traces contain no raw secrets |
| P5.M4 Regression suite | End-to-end flows for design-only run, retry failure, approval, rejection, resume, scheduler preview, policy deny | Release cannot pass with broken critical flows |
| P5.M5 Compatibility tests | ClawHub metadata fixtures, schema migration fixtures, provider mock fixtures | Compatibility regressions are caught before release |
| P5.M6 Packaging | Install scripts or package metadata, quickstart, release notes | A clean checkout can run the mock design-only workflow |
| P5.M7 Optional real provider seam | Provider trait, config references, typed provider errors, structured request mode | Real provider smoke is optional; deterministic tests use mock provider |

### Test And Verification Plan

- Benchmark runs for startup and memory.
- Full CLI smoke test from `init` to final report.
- Failure recovery integration tests.
- Compatibility fixture tests for schema versions and ClawHub metadata.
- Redaction tests for provider configuration and traces.
- Documentation command examples verified against the CLI.

### Documentation Tasks

- Write user-facing CLI quickstart.
- Write artifact reference.
- Write troubleshooting guide.
- Document benchmark baselines.
- Document release checklist and packaging process.
- Update repository guidelines after source and test layout exists.

### Risks And Dependencies

- Depends on all prior design-only runtime phases.
- Risk: hardening expands into new runtime features. Mitigation: release only
  documented design-only behavior and defer broader execution features.

## 10. Capability Coverage Matrix

| Required Capability | Primary Milestone |
| --- | --- |
| Goal Definition | P1.M6 |
| Goal Decomposition | P2.M1, P2.M2, P2.M3 |
| Goal Lifecycle | P1.M4, P1.M5, P3.M4 |
| Task Planning | P1.M4, P2.M1 |
| Step-by-Step Planning | P2.M1, P2.M5 |
| Replanning | P3.M3, P3.M6 |
| Design Iteration | P2.M5, P3.M6 |
| Decision Recording | P2.M6 |
| Structured Output Validation | P2.M3 |
| Retry on Invalid Output | P2.M4 |
| Versioned Schema | P1.M4 |
| Review Document | P2.M7 |
| Pause and Resume | P2.M8, P3.M1, P3.M2 |

## 11. Release Readiness Checklist

- `cargo fmt`, `cargo clippy`, and `cargo test` pass.
- CLI smoke flow passes with mock provider.
- Invalid output retry limit is tested.
- Approval pause, approval resume, rejection, and replanning are tested.
- Checkpoint recovery after interruption is tested.
- No MVP path executes shell commands, edits source files, runs skills, or uses
  network unless explicitly in optional provider smoke mode.
- State, prompts, logs, and reports exclude raw secrets.
- Artifact schema versions are documented.
- Review Markdown is readable without inspecting JSON.
- `docs/` promotion requires approval record.
- Known limitations and future phases are documented.
