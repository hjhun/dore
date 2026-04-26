# AI Agent Technology Classification Roadmap

Status: Proposed
Created: 2026-04-26 00:43:08 UTC
Basis: `docs/designs/20260426_004308_ai_agent_technology_classification.md`

## 1. Roadmap Goal

This roadmap decomposes the 25 technology categories required for a Rust AI
Agent / Workflow Engine into Phase 0-5 milestones. The purpose is to prevent
the project from trying to implement every agent capability at once. The early
target is a low-memory, fast-start Rust CLI with a design-only foundation and
file-backed state.

The MVP is not autonomous execution. It is a goal-driven design loop. The
runtime should read a goal, build a context manifest, assemble a prompt packet,
validate structured output, write review artifacts and approval requests, and
resume from checkpoints.

## 2. Non-Goals

- The MVP does not mutate source files, execute shell commands, or run network
  tools.
- The MVP does not execute ClawHub skills.
- The MVP does not implement a daemon, cron scheduler, or complex DAG engine.
- The MVP does not require embedding or vector retrieval.
- The MVP does not implement a full multi-agent runtime.
- The project should not claim sandbox guarantees before Phase 4.

## 3. Implementation Order

1. Freeze the technology classification and Phase mapping as a design decision.
2. Finalize schema, artifact layout, state transitions, and approval semantics.
3. Implement the Rust CLI scaffold and file-backed state root.
4. Connect goal loading, context manifest, prompt packet, and mock provider.
5. Implement structured output validation, bounded retry, review Markdown, and
   approval JSON.
6. Stabilize checkpoint, resume, rejection, and replan behavior.
7. Add skill and ClawHub metadata plus dry-run install planning.
8. Put policy, audit, guardrails, and sandbox boundaries in front of future
   execution paths.
9. Add benchmarks, observability, regression suites, and packaging release
   gates.

## 4. Phase 0: Classification And Design Foundation

### Objective

Finalize technology category applicability and priority. Document schemas and
state boundaries at a level that can be translated into tests before
implementation begins.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P0.M1 Existing design review | Summary of retained, deferred, and refined decisions from existing architecture, design-only runtime, security, ClawHub, and roadmap documents. | The new design document explicitly records which prior decisions remain binding. |
| P0.M2 Technology classification | Table covering applicability, MVP inclusion, Phase, priority, difficulty, crate candidates, initial scope, and later scope for all 25 categories. | No required category is missing. |
| P0.M3 MVP boundary decision | Clear Phase 0-2 MVP scope and explicit exclusion list. | The MVP is clearly design-only, file-state based, and approval-first. |
| P0.M4 Schema catalog draft | Goal, state, context manifest, prompt packet, structured output, approval, checkpoint, and report schemas. | Required fields are precise enough to become Rust `serde` structs. |
| P0.M5 State machine and approval design | Transition table, resumable and terminal states, approval record model. | Approval is represented as a structured transition, not Markdown text. |
| P0.M6 Policy and execution boundary draft | `deny`, `dry_run`, `requires_approval`, and `allow` decision enum; no-execution MVP rule. | Future tool and skill execution cannot bypass the policy boundary. |

### Verification

- Confirm that the classification table and roadmap milestones are traceable to
  each other.
- Check that Phase 0-2 contains no autonomous execution.
- Review whether each schema can be implemented as Rust types with versioned
  JSON artifacts.

## 5. Phase 1: Minimal Local CLI And File State

### Objective

Make goals and workflow state usable through a local CLI without calling an
external provider or executing tools.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P1.M1 Rust project scaffold | `Cargo.toml`, `src/`, `tests/`, formatter, linter, and test commands. | `cargo fmt`, `cargo clippy`, and `cargo test` run from the repository root. |
| P1.M2 CLI bootstrap | `init`, `goal set`, `status`, `run`, `review`, `approve`, `reject`, and `resume` skeletons. | Command parsing works and typed errors are displayed. |
| P1.M3 Config and state root | Repo root detection, `--state-root`, and config file loading. | Managed operational `.dev` paths and repo-local `.dev` paths can be distinguished. |
| P1.M4 Artifact store | Atomic JSON and Markdown writes, path validation, directory initialization. | Repeated writes do not corrupt artifacts. |
| P1.M5 Core schema implementation | Goal, runtime state, plan, approval, checkpoint, and report structs. | Valid fixtures deserialize and unsupported versions are rejected. |
| P1.M6 State transition validator | Guards for `created`, `loaded_context`, `planned`, `waiting_approval`, `completed`, `failed`, and related states. | Invalid transitions return typed errors and append audit events. |
| P1.M7 Context manifest v1 | Deterministic scan of operational state and `docs/` using filename, metadata, and keyword selection. | Include and exclude reasons are recorded in the manifest. |

### Verification

- Unit tests cover schema versions, path normalization, atomic writes, and
  transition guards.
- Integration tests cover `init`, `goal set`, and `status`.
- A smoke test verifies that a fresh state root can run up to the point before a
  model call.

## 6. Phase 2: Structured Design-Only Loop

### Objective

Run the design-only loop end to end with a mock provider. The core concerns are
structured output, validation, bounded retry, review artifacts, and basic
approval gates.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P2.M1 Prompt asset manager | Versioned prompt templates, prompt packet JSON, prompt packet Markdown archive. | The prompt packet is stored before provider invocation. |
| P2.M2 Mock provider | Success, invalid, and retry-success fixtures. | Success, retry, and failure paths are reproducible without network access. |
| P2.M3 Structured output validator | JSON extraction, schema validation, semantic validation, policy precheck. | Invalid output is classified as parse, schema, semantic, or policy failure. |
| P2.M4 Bounded retry | Retry counter, retry prompt, failure report. | Exceeding the retry limit produces a terminal failed state. |
| P2.M5 Design draft renderer | Design proposal JSON and Markdown, decision records, risk records. | Reviewable Markdown and machine-readable JSON are generated together. |
| P2.M6 Basic approval gate | Approval request JSON plus connected `review`, `approve`, and `reject` commands. | Promotions that require approval stop in `waiting_approval`. |
| P2.M7 Checkpoint and run history | Checkpoint JSON and append-only run event log. | `resume` locates the last valid checkpoint and pending approval. |
| P2.M8 Skill metadata placeholder | Local skill metadata schema and visible snapshot draft with no execution. | Metadata compatibility can be tested without running skills. |
| P2.M9 ClawHub dry-run basis | Origin/lock schema draft and inspect/dry-run install plan artifact. | Compatibility fixtures can be written without install or execution. |

### Verification

- Mock provider integration test completes a design-only run.
- Invalid output integration test retries and then enters failed state.
- Approval integration test reaches `waiting_approval`.
- Snapshot tests cover review Markdown, prompt packets, and failure reports.
- Fixture tests cover local skill metadata and ClawHub origin/lock schemas.

## 7. Phase 3: Durable Workflow And Replanning

### Objective

Strengthen the MVP loop so it can handle repeated real work. Approval, resume,
rejection, replanning, blocked state, and cancellation should have explicit
state and artifact behavior.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3.M1 Robust approval records | Immutable approval and rejection records with run, goal, and action IDs. | Approval state cannot be changed twice without an explicit override. |
| P3.M2 Resume after approval | Approved artifact promotion and checkpoint continuation. | Only approved artifacts are promoted to `docs/`. |
| P3.M3 Rejection and replan | Rejection comment as replan input, plan revision link. | A rejected run creates a new plan without losing the previous plan. |
| P3.M4 Blocked and cancelled states | Blocker report and cancellation report. | `status` explains the next required human input or terminal state. |
| P3.M5 Run locking | File lock plus stale lock detection design and implementation. | Concurrent runs cannot corrupt the same state. |
| P3.M6 Queue preview | Single-machine queue data model, with no daemon yet. | Future scheduler job records are defined. |
| P3.M7 Role-specific handoff templates | Planner, reviewer, and security roles as prompt templates. | Specialist vocabulary exists without a multi-agent runtime. |

### Verification

- Integration tests cover approve-resume-complete, reject-replan,
  blocked-status, and cancellation.
- Concurrency tests cover lock acquisition failure and stale lock handling.
- Regression tests confirm that design-only mode still performs no execution.

## 8. Phase 4: Policy, Guardrails, And Sandbox Boundary

### Objective

Before the project permits future execution, every dangerous action must pass
through policy, approval, guardrail, audit, and sandbox boundaries.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P4.M1 Policy engine | Policy file parser and `deny`/`dry_run`/`requires_approval`/`allow` decision API. | Every executable action intent receives a policy decision. |
| P4.M2 Capability model | File read/write, process spawn, network, env, secret, temp workspace, and resource limit capabilities. | Action intents declare least-privilege capabilities. |
| P4.M3 Guardrail pipeline | Input, output, and tool-result validation; redaction; quarantine marker. | Untrusted instructions do not silently become trusted state. |
| P4.M4 Audit log | Security event schema, action decision logs, artifact links. | Policy and action history can be traced without exposing secrets. |
| P4.M5 Restricted command runner | Allowlisted command execution, temp workspace, env filtering, timeout, output limit. | Fixture commands run only inside the restricted context. |
| P4.M6 Sandbox MVP documentation | Guarantees, non-guarantees, and platform support matrix. | The documented sandbox strength is not overstated. |
| P4.M7 Fixture skill execution | Reviewed local fixture skill under policy and sandbox controls. | Safe fixture execution succeeds and unsafe fixtures produce block reports. |

### Verification

- Unit tests cover policy matching, capability checks, redaction, and audit
  event schema.
- Security tests cover path escape, symlink escape, env leakage, network denial,
  and unsafe prompt-injection markers.
- Integration tests cover restricted fixture commands and blocked unsafe skills.
- Regression tests confirm that the default design-only run still executes
  nothing.

## 9. Phase 5: Hardening, Compatibility, And Release

### Objective

Measure the Rust CLI's fast-start and low-memory requirements, then turn the
regression suite and compatibility fixtures into release readiness gates.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P5.M1 Benchmark suite | Startup, memory, state load/save, validation, and render benchmarks. | Baselines are recorded and regression thresholds are configured. |
| P5.M2 Observability | Structured logs, run IDs, artifact links, timing spans. | A failed run can be reconstructed from logs and artifacts. |
| P5.M3 Trace export | Optional JSON trace export and redaction checks. | Traces contain no raw secrets. |
| P5.M4 Regression suite | Design run, invalid retry, approval, rejection, resume, policy deny, fixture skill. | Critical flows are automatically verified before release. |
| P5.M5 ClawHub compatibility suite | Metadata fixtures, origin/lock fixtures, migration checks. | ClawHub/OpenClaw compatibility regressions are detected. |
| P5.M6 Provider adapter pilot | Mock-required tests plus optional real provider smoke. | Deterministic tests continue to use the mock provider. |
| P5.M7 Packaging and quickstart | Install metadata/scripts, CLI quickstart, troubleshooting. | A clean checkout can run the mock design-only flow. |

### Verification

- `cargo fmt`, `cargo clippy`, and `cargo test`.
- Full CLI smoke test from `init` to final report.
- Benchmark run with stored baseline.
- Compatibility fixture suite.
- Documentation command examples verified against the CLI.

## 10. Milestone Coverage Matrix

| Technology Category | Primary Milestones |
| --- | --- |
| Goal Management | P0.M4, P1.M5 |
| Planning and Reasoning | P2.M1, P2.M5, P3.M3 |
| Tool Calling | P2.M8, P4.M1, P4.M5 |
| Structured Output | P0.M4, P2.M3 |
| Memory and State Management | P1.M3, P1.M4, P2.M7 |
| Durable Execution | P1.M6, P2.M7, P3.M1-P3.M5 |
| Workflow Orchestration | P1.M6, P3.M6 |
| Human-in-the-Loop | P0.M5, P2.M6, P3.M1 |
| Guardrails and Validation | P2.M3, P4.M3 |
| Skill / Plugin System | P2.M8, P4.M7 |
| ClawHub / OpenClaw Compatibility | P2.M9, P5.M5 |
| Context Management | P1.M7, P2.M1 |
| Retrieval and Indexing | P1.M7, P5.M4 |
| Prompt Engineering and Prompt Asset Management | P2.M1 |
| Agent Runtime | P1.M2, P1.M6, P2.M7 |
| Multi-Agent / Specialist Handoff | P3.M7 |
| Security Model | P0.M6, P4.M1-P4.M4 |
| Sandboxing | P4.M5, P4.M6 |
| Observability | P2.M7, P5.M2, P5.M3 |
| Evaluation and Benchmarking | P2 verification, P5.M1, P5.M4 |
| Configuration and Policy | P1.M3, P4.M1 |
| CLI UX | P1.M2, P2.M6, P3.M4 |
| Daemon and Scheduler | P3.M6, post-Phase 5 daemon work |
| Repository and Artifact Management | P1.M4, P2.M5, P3.M2 |
| Model Provider Abstraction | P2.M2, P5.M6 |

## 11. Release Readiness Checklist

- Every MVP category maps to a Phase 0-2 milestone.
- The MVP path contains no source mutation, shell execution, or external skill
  execution.
- Approval requests and approval records are separate from Markdown review
  documents.
- Structured output validation and retry limits are tested.
- `resume` can locate checkpoints and pending approvals.
- The promotion rule from operational `.dev` state to durable `docs`
  documentation is implemented.
- ClawHub compatibility is tested first at the metadata and dry-run level.
- Policy, audit, and sandbox boundaries gate execution before release.
- Startup and memory benchmark baselines exist.
- Documentation CLI examples match actual commands.
