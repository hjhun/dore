# Rust Agent Workflow Engine Roadmap

Status: Proposed
Created: 2026-04-25 22:31:58 UTC
Basis: `docs/designs/20260425_223158_existing_design_review_and_roadmap_basis.md`

## 1. Roadmap Goal

Build Dore as a Rust-based AI Agent / Workflow Engine in a dependency-safe
order. The first product slice is not an autonomous code-editing agent. The
first product slice is a local, file-backed, design-only workflow engine that
can read goals, maintain state, produce design proposals, request human
approval, checkpoint progress, and resume later.

Existing CEP decisions remain valid, but their implementation order is rebased:
local CLI, file state, design artifacts, structured validation, and approval
gates come before Telegram, ClawHub skill execution, sandbox completion,
multi-agent delegation, and DAG orchestration.

## 2. Non-Goals

- No autonomous file modification in Phase 0.
- No external skill execution before Phase 4 policy enforcement.
- No complex DAG execution before the durable workflow engine is stable.
- No Telegram-first implementation in the MVP.
- No completed OS sandbox promise before policy semantics and audit events are
  implemented.
- No opaque database-only state as the first storage backend.
- No production release without benchmark, regression, and compatibility gates.

## 3. Implementation Order

1. Define design-only artifact schemas and approval semantics.
2. Implement local CLI goal loading and file-backed state.
3. Add structured LLM output validation, bounded retry, and run summaries.
4. Add tool and skill metadata models without execution.
5. Add ClawHub metadata parsing, inspect, cache, and dry-run install.
6. Implement durable workflow state, checkpoints, locks, queue, and scheduler.
7. Implement policy engine, capability model, audit log, and restricted command
   runner.
8. Add sandbox strategy, prompt injection defenses, and guarded execution paths.
9. Add observability, benchmarks, regression suites, packaging, and release
   readiness checks.

## 4. Phase 0: Design-Only Foundation

### Objective

Create the architecture and document foundation for a local, design-only
workflow engine. No runtime should be trusted to execute tools yet.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P0.M1 Technology classification | Technology classification table, MVP inclusion map, Phase 0-5 priority map, Rust difficulty notes | Each required technology area is classified with MVP status and phase |
| P0.M2 Artifact model | Schemas for goal, plan, design proposal, risk summary, ADR, approval request, run report, checkpoint | Schemas are versioned and can be represented as Rust `serde` structs |
| P0.M3 State machine design | Design-only lifecycle with `created`, `planned`, `waiting_approval`, `running`, `blocked`, `completed`, `failed`, `cancelled` | Every transition has owner, input, output, and failure behavior |
| P0.M4 CLI UX draft | Command design for `init`, `goal`, `plan`, `review`, `approve`, `resume`, `status`, `policy show` | CLI examples cover normal run, invalid output retry, approval pause, and resume |
| P0.M5 Policy and approval draft | Approval matrix, safe defaults, dry-run-only action list, audit event list | Dangerous actions default to blocked or approval-required |
| P0.M6 ClawHub scope draft | Metadata-only compatibility scope, lifecycle separation, dry-run install output design | `discover != install != enable != trust != execute` is encoded in design |

### Dependencies And Risks

- Depends on the existing CEP review and prompt requirements.
- Risk: over-designing abstractions before code. Mitigation: schemas must map to
  concrete Phase 1 structs and CLI commands.
- Risk: confusing `.dev/` operational state with `docs/` durable docs.
  Mitigation: document the artifact boundary and keep examples explicit.

### Test And Verification Plan

- Review schema examples for round-trip serialization feasibility.
- Validate state machine transitions through table-driven examples.
- Check CLI examples against expected artifact changes.
- Review policy matrix for dangerous missing actions.

### Documentation Tasks

- Write design-only runtime design.
- Write workflow state design.
- Write security/policy design draft.
- Write ClawHub compatibility scope.
- Keep Korean mirrors optional until canonical design stabilizes.

## 5. Phase 1: Minimal Local Agent Runtime

### Objective

Build a runnable local CLI that performs design-only planning with file-based
state, structured output validation, checkpoints, summaries, and resume.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P1.M1 Rust project scaffold | `Cargo.toml`, `src/`, `tests/`, `scripts/`, formatter/linter config | `cargo fmt`, `cargo clippy`, and `cargo test` run from the repository root |
| P1.M2 CLI foundation | Blocking CLI with `init`, `run`, `status`, `resume`, `review` | CLI can initialize `.dev/` and print current workflow state |
| P1.M3 Goal and state store | File-backed `goal.md`, `state.json`, `run-history/*.json`, atomic writes | A run can load goal/state, write checkpoint, and survive restart |
| P1.M4 Design-only run loop | Context selection, prompt assembly, provider seam, structured output request | A mock provider can produce a design proposal and review report |
| P1.M5 Structured validation | Typed output structs, schema versioning, validation errors, bounded retry | Invalid output retries stop at configured limit and produce a failed report |
| P1.M6 Human approval gate | `waiting_approval` transition, approval record, approve/reject CLI | A run pauses for approval and resumes after approval without losing state |
| P1.M7 Run summary generation | Markdown summary with goal, decisions, risks, proposed artifacts, next action | Every completed, blocked, or failed run writes a durable summary |

### Dependencies And Risks

- Depends on Phase 0 artifact schemas and state machine.
- Risk: provider integration slows the MVP. Mitigation: implement mock provider
  first and keep real provider behind a small trait or command adapter.
- Risk: file corruption during writes. Mitigation: use temp file plus rename and
  include schema version checks.

### Test And Verification Plan

- Unit tests for schema parsing, state transitions, validation, retry limits,
  and approval decisions.
- Integration tests for CLI init/run/resume/status.
- Smoke test for a complete design-only run with mock provider.
- Regression test for interrupted run recovery from checkpoint.

### Documentation Tasks

- Document `.dev/` layout and state file format.
- Document CLI commands and examples.
- Document provider seam and mock provider behavior.
- Update `AGENTS.md` if real source/test directories are added.

## 6. Phase 2: Tool And Skill Foundation

### Objective

Define internal tool and skill metadata, implement ClawHub-compatible discovery
and inspection, and support dry-run install without executing external skills.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P2.M1 Tool schema | Internal tool descriptor, input/output schema, error model, capability declaration | Tool definitions can be validated without execution |
| P2.M2 Tool registry | Local registry loading, duplicate detection, disabled/hidden states | CLI can list registered tools and explain why a tool is unavailable |
| P2.M3 Skill metadata model | Skill ID, source, version, summary, capabilities, requirements, trust state | Local skill catalog can parse valid metadata and reject malformed metadata |
| P2.M4 `SKILL.md` parser | Frontmatter/body parser, instruction extraction, injection-risk markers | Parser preserves content but separates trusted metadata from untrusted text |
| P2.M5 ClawHub parser and client | Registry metadata mapping, search, inspect, offline cache shape | `agent clawhub search` and `agent clawhub inspect` work without activation |
| P2.M6 Dry-run install | Download/metadata simulation or real fetch into temp area, checksum plan, path safety check | `agent clawhub install --dry-run` reports planned changes and blocks activation |
| P2.M7 Skill review CLI | `agent skill list`, `agent skill review`, `agent skill enable` as state changes only | Enable updates metadata state but does not grant execution permission |

### Dependencies And Risks

- Depends on Phase 1 CLI, file store, policy draft, and report generation.
- Risk: ClawHub metadata instability. Mitigation: isolate mapping and preserve
  raw registry response in cache for debugging.
- Risk: prompt injection through `SKILL.md`. Mitigation: treat skill content as
  untrusted payload until policy review.

### Test And Verification Plan

- Unit tests for metadata parsing, path safety, lock/cache records, and trust
  state transitions.
- Integration tests for local catalog load and dry-run install report.
- Smoke test for search/inspect/dry-run using fixture registry data.
- Security tests for malicious paths and hostile `SKILL.md` instructions.

### Documentation Tasks

- Document internal tool schema.
- Document internal skill schema and ClawHub mapping.
- Document dry-run install report format.
- Document lifecycle: discover, install, enable, trust, execute.

## 7. Phase 3: Durable Workflow Engine

### Objective

Turn the single-run design loop into a durable workflow engine with explicit
state transitions, checkpointing, resume, retry policy, queueing, locking,
heartbeat, and daemon scheduling.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3.M1 Workflow state machine | Runtime transition engine and transition validation | Invalid transitions are rejected with typed errors and audit events |
| P3.M2 Checkpoint and history | Checkpoint schema, run-history append log, partial result recovery | Interrupted runs can resume from the last valid checkpoint |
| P3.M3 Retry and timeout policy | Retry classes, backoff, timeout handling, cancellation | Failed steps do not retry indefinitely and cancellation is durable |
| P3.M4 Queue and locking | File-backed queue, lock file, stale lock detection, duplicate run prevention | Concurrent CLI/daemon attempts cannot corrupt one workflow state |
| P3.M5 Daemon scheduler | Interval scheduler, cron-like scheduler, file watcher, graceful shutdown | Scheduled design/review runs enqueue and execute predictably |
| P3.M6 Job model | Scheduled job records linked to goals, workflow runs, reports | Every scheduler trigger produces auditable job or skip evidence |
| P3.M7 Minimal maintenance tasks | Memory/design lint stubs, goal review, weekly report generation | Scheduled jobs can produce reports without external tool execution |

### Dependencies And Risks

- Depends on Phase 1 state store and Phase 2 policy-aware metadata.
- Risk: prematurely building a DAG engine. Mitigation: support linear workflows
  with resumable steps; reserve DAG metadata for future extension.
- Risk: daemon complexity on multiple platforms. Mitigation: start with a
  foreground daemon process and explicit lock/heartbeat files.

### Test And Verification Plan

- Unit tests for transition table, retry policy, timeout behavior, and lock
  expiry.
- Integration tests for enqueue/dequeue, resume, cancellation, and scheduler
  triggers.
- Smoke test for daemon start, one scheduled run, report write, graceful stop.
- Failure recovery tests for stale lock, partial checkpoint, and duplicate run.

### Documentation Tasks

- Document workflow state transition table.
- Document checkpoint, run history, queue, lock, and heartbeat schemas.
- Document daemon command UX.
- Document excluded DAG features and future extension path.

## 8. Phase 4: Safety And Sandboxing

### Objective

Implement enforceable safety boundaries for tools, skills, external processes,
network access, filesystem access, secrets, prompt injection handling, and audit
logs. This phase enables restricted execution only through policy.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P4.M1 Policy engine | Policy file parser, decision API, deny/allow/approval/dry-run outcomes | Every tool or skill action receives a policy decision before execution |
| P4.M2 Capability model | File read/write, process spawn, network, env, secrets, temp workspace, resource limits | Capabilities are explicit and least-privilege by default |
| P4.M3 Approval enforcement | Approval gate for sensitive transitions and capability grants | Always-approval actions cannot execute without approval record |
| P4.M4 Audit log | Append-only audit events with actor, action, capability, decision, artifact links | Security-sensitive actions are auditable without leaking secrets |
| P4.M5 Guardrail pipeline | Input validation, output validation, tool guardrails, result parser, redaction | Unsafe or malformed tool results cannot silently enter trusted state |
| P4.M6 Sandbox MVP | Restricted command runner, temp workspace, env filtering, command allowlist, network default deny | Approved commands run with reduced context and report captured outputs |
| P4.M7 Skill execution pilot | Execute a reviewed local fixture skill under policy and sandbox limits | A safe fixture skill can run; unsafe fixture skills are blocked with reports |

### Dependencies And Risks

- Depends on Phase 2 metadata/capability declarations and Phase 3 durable state.
- Risk: policy bypass through direct module calls. Mitigation: route all
  execution through a single executor boundary.
- Risk: overclaiming sandbox strength. Mitigation: document exact enforcement
  mechanisms and unsupported isolation guarantees.
- Risk: secrets leaking into prompts/logs. Mitigation: redaction tests and
  explicit secret-reference types.

### Test And Verification Plan

- Unit tests for policy decisions, capability matching, redaction, and approval
  requirements.
- Integration tests for restricted command execution and audit logging.
- Security tests for prompt injection, unsafe paths, env leaks, and network-deny
  behavior.
- Smoke test for approved dry-run, approved restricted execution, and blocked
  unapproved execution.

### Documentation Tasks

- Document threat model and trust boundaries.
- Document policy file schema and approval matrix.
- Document audit log schema.
- Document sandbox MVP guarantees and non-guarantees.
- Document skill execution review workflow.

## 9. Phase 5: Performance And Production Hardening

### Objective

Prepare the Rust CLI and workflow engine for real use through performance
benchmarks, observability, compatibility tests, regression suites, packaging,
and release readiness checks.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P5.M1 Benchmark suite | Startup, memory, state load/save, schema validation, catalog load benchmarks | Baseline numbers are recorded and regressions are detectable |
| P5.M2 Observability | Structured logs, trace IDs, workflow metrics, provider/tool timing hooks | Runs can be debugged from logs and artifact links |
| P5.M3 Trace export | Optional trace export format for workflow steps and policy decisions | A run trace can be exported without secrets |
| P5.M4 Regression suite | End-to-end flows for design-only run, resume, scheduler, policy, dry-run install, sandbox fixture | Release branch cannot pass with broken critical flows |
| P5.M5 ClawHub compatibility tests | Fixture registry, metadata variants, checksum/path safety, offline cache | Compatibility behavior is stable across fixture versions |
| P5.M6 Packaging | Release profile, install script or package target, shell completions, config templates | A clean machine can install and run the CLI smoke test |
| P5.M7 Release readiness | Checklist, versioning, migration notes, known limitations, rollback guidance | Release candidate has signed-off checklist and documented residual risks |

### Dependencies And Risks

- Depends on the feature-complete workflow, policy, and sandbox MVP.
- Risk: benchmark goals are vague. Mitigation: establish numeric baselines early
  in Phase 5 and require regression thresholds before release.
- Risk: observability leaks sensitive content. Mitigation: logs use metadata and
  redacted references by default.

### Test And Verification Plan

- Full `cargo fmt`, `cargo clippy`, `cargo test`.
- Integration and smoke tests on clean temp workspaces.
- E2E tests for design-only workflow, approval resume, scheduler, ClawHub
  dry-run, and restricted execution fixture.
- Benchmark comparison against stored baselines.
- Manual release rehearsal from packaged artifact.

### Documentation Tasks

- User guide for local CLI.
- Configuration and policy reference.
- Artifact schema reference.
- Troubleshooting guide.
- Release notes and migration notes.
- Contributor test and release checklist.

## 10. Cross-Phase Dependency Map

| Capability | First Designed | First Implemented | Hardened |
| --- | --- | --- | --- |
| Goal management | Phase 0 | Phase 1 | Phase 3 |
| Design-only planning | Phase 0 | Phase 1 | Phase 5 |
| File-backed state | Phase 0 | Phase 1 | Phase 3 |
| Approval gate | Phase 0 | Phase 1 | Phase 4 |
| Structured output validation | Phase 0 | Phase 1 | Phase 5 |
| Tool schema | Phase 2 | Phase 2 | Phase 4 |
| ClawHub metadata | Phase 0 | Phase 2 | Phase 5 |
| Skill execution | Phase 2 | Phase 4 | Phase 5 |
| Scheduler | Phase 0 | Phase 3 | Phase 5 |
| Sandbox | Phase 0 | Phase 4 | Phase 5 |
| Multi-agent delegation | Phase 0 compatibility only | Post-Phase 5 or separate roadmap | Future |
| DAG workflow | Phase 3 extension notes | Post-Phase 5 or separate roadmap | Future |

## 11. Release Readiness Checklist

- Phase 0 design documents are reviewed and conflict resolutions are accepted.
- Phase 1 CLI can run design-only workflow in a clean repository.
- File state survives interruption and resumes correctly.
- Structured output validation has bounded retry and clear failure reports.
- Approval gates are represented in both state and review documents.
- Tool and skill metadata cannot execute by default.
- ClawHub dry-run install cannot activate or execute downloaded content.
- Scheduler prevents duplicate execution with locks and heartbeat.
- Policy engine is the only route to tool or skill execution.
- Audit log records approval, policy, execution, failure, and security events.
- Sandbox MVP guarantees and limitations are documented.
- Secrets are redacted from prompts, logs, reports, and traces.
- Unit, integration, smoke, and selected e2e tests pass.
- Startup and memory benchmarks have accepted baselines.
- ClawHub compatibility fixtures pass.
- Packaging has been tested on a clean environment.
- Release notes document known limitations and future work.

## 12. Future Roadmap Seeds

- Telegram channel adapter over the workflow/session core.
- Personal memory ingestion and LLM Wiki maintenance automation.
- Provider OAuth and multi-provider routing.
- External CLI worker adapters for Codex, Claude, and Gemini.
- Peer Dore pairing and A2A-compatible envelopes.
- DAG workflow execution once linear durable workflows are reliable.
- Stronger OS-level sandboxing and signed skill provenance.
