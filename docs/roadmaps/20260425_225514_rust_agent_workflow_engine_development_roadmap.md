# Rust Agent Workflow Engine Development Roadmap

Status: Proposed
Created: 2026-04-25 22:55:14 UTC
Basis: `docs/designs/20260425_225514_existing_design_review_and_roadmap_synthesis.md`

## 1. Roadmap Goal

Build Dore as a Rust-based AI Agent / Workflow Engine in dependency-safe order.
The first product slice is a local, file-backed, design-only workflow engine
that reads goals, maintains resumable state, produces design proposals, writes
review documents, requests human approval, and resumes from checkpoints.

The roadmap preserves the existing CEP decisions, but changes rollout order:
CLI, file state, structured validation, approval gates, and durable reports come
before Telegram, ClawHub skill execution, sandbox completion, multi-agent
delegation, and DAG orchestration.

## 2. Non-Goals

- No autonomous repository modification in Phase 0 or Phase 1.
- No external skill execution before policy and sandbox enforcement.
- No complex DAG engine before the durable linear workflow engine is stable.
- No Telegram-first MVP.
- No production release without regression tests, benchmarks, compatibility
  tests, and documented release readiness.
- No raw secrets in state, prompts, logs, reports, or traces.

## 3. Implementation Order

1. Define artifact schemas, state machine, approval semantics, and policy draft.
2. Build a Rust CLI scaffold with file-backed state and mock provider.
3. Add structured output validation, bounded retry, checkpoint, resume, and run
   reports.
4. Add tool and skill metadata models without execution.
5. Add ClawHub search, inspect, cache, and dry-run install.
6. Implement durable workflow state, queue, locks, heartbeat, and scheduler.
7. Implement policy engine, capability model, approval enforcement, and audit
   log.
8. Add guardrails, restricted command runner, sandbox MVP, and fixture skill
   execution.
9. Add observability, benchmarks, compatibility tests, packaging, and release
   process.

## 4. Phase 0: Design-Only Foundation

### Objective

Create the document and architecture foundation for a safe design-only workflow
engine. Phase 0 produces executable design, not runtime automation.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P0.M1 Existing design synthesis | Inventory, decisions, conflicts, missing areas, resolution rules | Existing CEPs, refs, prompts, and Korean mirrors are accounted for |
| P0.M2 Technology classification | Technology table with MVP inclusion, Phase 0-5 mapping, Rust difficulty, crate candidates | Every required technology area has priority, initial scope, and later scope |
| P0.M3 Artifact model | Versioned schemas for goal, plan, design proposal, risk summary, ADR, approval request, report, checkpoint | Schemas can map to Rust `serde` structs and markdown projections |
| P0.M4 State machine design | Lifecycle with `created`, `planned`, `waiting_approval`, `running`, `blocked`, `completed`, `failed`, `cancelled` | Every transition defines owner, input, output, failure behavior, and audit event |
| P0.M5 CLI UX draft | Commands for `init`, `goal`, `run`, `plan`, `review`, `approve`, `reject`, `resume`, `status`, `policy show` | Examples cover normal run, invalid output retry, approval pause, and resume |
| P0.M6 Policy and trust draft | Threat model, capability categories, approval matrix, dry-run defaults, audit event list | Dangerous actions default to blocked, dry-run, or approval-required |
| P0.M7 ClawHub scope draft | Metadata mapping plan, lifecycle separation, dry-run install report shape | `discover != install != enable != trust != execute` is explicit |

### Dependencies And Risks

- Depends on the existing CEPs and current prompt set.
- Risk: design artifacts become too abstract. Mitigation: require every schema
  to map to Phase 1 structs, files, and CLI commands.
- Risk: `.dev/` operational state is confused with durable `docs/` outputs.
  Mitigation: document the artifact boundary and use examples.

### Test And Verification Plan

- Table-review state transitions and invalid transitions.
- Review schema examples for round-trip serialization feasibility.
- Review CLI examples against expected artifact changes.
- Review policy matrix for missing dangerous actions.

### Documentation Tasks

- Write design-only runtime design.
- Write workflow state design.
- Write security and policy draft.
- Write ClawHub compatibility scope.
- Keep Korean mirrors optional until canonical design stabilizes.

## 5. Phase 1: Minimal Local Agent Runtime

### Objective

Build a runnable local Rust CLI that performs design-only planning with
file-based state, typed output validation, bounded retry, checkpoints, summaries,
approval gates, and resume.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P1.M1 Rust scaffold | `Cargo.toml`, `src/`, `tests/`, formatter/linter config, root automation entry point | `cargo fmt`, `cargo clippy`, and `cargo test` run from repo root |
| P1.M2 CLI foundation | Blocking CLI with `init`, `run`, `status`, `resume`, `review` | CLI initializes operational state and prints current workflow status |
| P1.M3 File state store | `goal.md`, `state.json`, `run-history/*.json`, `reports/*.md`, atomic writes | A run can load, checkpoint, stop, and resume without corrupting state |
| P1.M4 Design-only loop | Context selection, prompt assembly, mock provider seam, structured output request | Mock provider produces a design proposal and review report |
| P1.M5 Structured validation | Versioned output structs, validation errors, bounded retry, failed report | Invalid output retries stop at limit and leave an understandable failure artifact |
| P1.M6 Approval gate | `waiting_approval` transition, approval record, approve/reject CLI | A run pauses and resumes after approval without losing decisions |
| P1.M7 Run summary | Markdown summary with goal, decisions, risks, artifacts, next action | Every completed, blocked, failed, or cancelled run writes a report |

### Dependencies And Risks

- Depends on Phase 0 schemas and state machine.
- Risk: real provider work delays MVP. Mitigation: ship mock provider first.
- Risk: file corruption during writes. Mitigation: temp file plus atomic rename,
  schema version checks, and recovery tests.
- Risk: approval becomes markdown-only and hard to validate. Mitigation: keep a
  structured approval record plus human-readable review document.

### Test And Verification Plan

- Unit tests for schemas, state transitions, validation, retry limits, and
  approval decisions.
- Integration tests for CLI `init`, `run`, `resume`, `status`, `review`.
- Smoke test for a complete design-only run with mock provider.
- Regression test for interrupted run recovery from checkpoint.

### Documentation Tasks

- Document `.dev/` layout and file formats.
- Document CLI commands and examples.
- Document provider seam and mock provider behavior.
- Update `AGENTS.md` after adding real source/test directories.

## 6. Phase 2: Tool And Skill Foundation

### Objective

Define internal tool and skill models and implement ClawHub-compatible discovery,
inspection, local catalog, offline cache, and dry-run install. No external skill
execution occurs in this phase.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P2.M1 Tool schema | Tool descriptor, input/output schema, error model, capability declaration | Tool definitions validate without execution |
| P2.M2 Tool registry | Local registry loader, duplicate detection, disabled/hidden states | CLI can list tools and explain unavailable tools |
| P2.M3 Skill metadata | Skill ID, source, version, summary, requirements, capabilities, trust state | Valid skill metadata loads; malformed metadata is rejected |
| P2.M4 `SKILL.md` parser | Frontmatter/body parser, instruction extraction, injection-risk markers | Trusted metadata is separated from untrusted instruction body |
| P2.M5 ClawHub compatibility | Registry client, metadata mapping, search, inspect, offline cache | `agent clawhub search` and `agent clawhub inspect` work against fixtures |
| P2.M6 Dry-run install | Temp extraction plan, checksum check, path safety check, planned lock changes | `agent clawhub install --dry-run` reports changes and blocks activation |
| P2.M7 Skill review CLI | `agent skill list`, `agent skill review`, `agent skill enable` as metadata state changes | Enable does not grant execution permission |

### Dependencies And Risks

- Depends on Phase 1 CLI, file store, report generation, and policy draft.
- Risk: ClawHub metadata changes. Mitigation: isolate mapping and preserve raw
  registry responses in cache fixtures.
- Risk: prompt injection through `SKILL.md`. Mitigation: treat skill body as
  untrusted until reviewed and policy-approved.

### Test And Verification Plan

- Unit tests for metadata parsing, path safety, lock/cache records, and trust
  state transitions.
- Integration tests for local catalog load and dry-run install report.
- Smoke tests using fixture registry data.
- Security tests for malicious paths and hostile `SKILL.md` content.

### Documentation Tasks

- Document internal tool schema.
- Document skill metadata schema and ClawHub mapping.
- Document dry-run install report format.
- Document discover/install/enable/trust/execute lifecycle.

## 7. Phase 3: Durable Workflow Engine

### Objective

Turn the single-run CLI loop into a durable workflow engine with transition
validation, checkpoints, run history, retry policy, cancellation, queueing,
locking, heartbeat, daemon scheduler, and restart recovery.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3.M1 Transition engine | Runtime state machine and transition validator | Invalid transitions are rejected with typed errors and audit events |
| P3.M2 Checkpoint/history | Checkpoint schema, append-only run history, partial result recovery | Interrupted runs resume from the last valid checkpoint |
| P3.M3 Retry/timeout/cancel | Retry classes, backoff, timeout handling, durable cancellation | Failed steps do not retry indefinitely; cancellation survives restart |
| P3.M4 Queue and locks | File-backed queue, lock files, stale lock detection, duplicate prevention | Concurrent CLI/daemon attempts cannot corrupt workflow state |
| P3.M5 Heartbeat and daemon | Foreground daemon, heartbeat file, graceful shutdown/restart | Daemon can stop and restart without losing queued work |
| P3.M6 Scheduler | Interval scheduler, cron-like scheduler, file watcher | Scheduled design/review runs enqueue predictably |
| P3.M7 Job records | Jobs linked to goals, workflow runs, and reports | Every trigger creates auditable job or skip evidence |

### Dependencies And Risks

- Depends on Phase 1 state store and Phase 2 metadata foundations.
- Risk: accidentally building a DAG engine too early. Mitigation: keep linear
  workflows and document DAG as future extension.
- Risk: cross-platform daemon complexity. Mitigation: start with a foreground
  daemon process and explicit files.

### Test And Verification Plan

- Unit tests for transition table, retry policy, timeout, cancellation, and lock
  expiry.
- Integration tests for enqueue/dequeue, resume, cancellation, scheduler
  triggers, and stale lock recovery.
- Smoke test for daemon start, one scheduled run, report write, graceful stop.
- Failure recovery tests for partial checkpoint and duplicate run attempts.

### Documentation Tasks

- Document workflow transition table.
- Document checkpoint, run history, queue, lock, and heartbeat schemas.
- Document daemon command UX.
- Document excluded DAG features and extension path.

## 8. Phase 4: Safety And Sandboxing

### Objective

Make execution enforceable and auditable through a policy engine, capability
model, approval enforcement, guardrails, audit log, restricted command runner,
sandbox MVP, and a safe fixture skill execution path.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P4.M1 Policy engine | Policy parser, decision API, deny/dry-run/approval/allow outcomes | Every tool or skill action receives a policy decision before execution |
| P4.M2 Capability model | File read/write, process spawn, network, env, secrets, temp workspace, resource limits | Capabilities are explicit and least-privilege by default |
| P4.M3 Approval enforcement | Approval gate for sensitive transitions and capability grants | Always-approval actions cannot execute without approval record |
| P4.M4 Audit log | Append-only events with actor, action, capability, decision, artifact links | Security-sensitive actions are auditable without leaking secrets |
| P4.M5 Guardrail pipeline | Input validation, output validation, tool result parser, redaction, prompt injection quarantine | Unsafe results cannot silently enter trusted state |
| P4.M6 Sandbox MVP | Restricted command runner, temp workspace, env filtering, command allowlist, network default deny | Approved commands run with reduced context and captured reports |
| P4.M7 Skill execution pilot | Execute reviewed local fixture skill under policy and sandbox limits | Safe fixture skill runs; unsafe fixture skills are blocked with reports |

### Dependencies And Risks

- Depends on Phase 2 metadata/capability declarations and Phase 3 durable state.
- Risk: policy bypass through direct module calls. Mitigation: route all
  execution through one executor boundary.
- Risk: overclaiming sandbox strength. Mitigation: document exact guarantees and
  non-guarantees.
- Risk: secret leakage. Mitigation: secret-reference types and redaction tests.

### Test And Verification Plan

- Unit tests for policy decisions, capability matching, redaction, approval, and
  audit event creation.
- Integration tests for restricted command execution and audit logging.
- Security tests for prompt injection, unsafe paths, environment leaks, and
  network-deny behavior.
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

Prepare the CLI and workflow engine for real use with benchmarks, observability,
trace export, regression suites, ClawHub compatibility tests, packaging,
release notes, and readiness checks.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P5.M1 Benchmark suite | Startup, memory, state load/save, schema validation, catalog load benchmarks | Baselines are recorded and regressions are detectable |
| P5.M2 Observability | Structured logs, trace IDs, workflow metrics, provider/tool timing hooks | Runs can be debugged from logs and artifact links |
| P5.M3 Trace export | Optional trace export for workflow steps and policy decisions | Trace export contains no raw secrets |
| P5.M4 Regression suite | E2E flows for design-only run, resume, scheduler, policy, dry-run install, sandbox fixture | Release cannot pass with broken critical flows |
| P5.M5 ClawHub compatibility tests | Fixture registry, metadata variants, checksum/path safety, offline cache | Compatibility behavior is stable across fixture versions |
| P5.M6 Packaging | Release profile, install script/package target, shell completions, config templates | Clean machine can install and run CLI smoke test |
| P5.M7 Release readiness | Checklist, versioning, migration notes, known limitations, rollback guidance | Release candidate has signed-off checklist and documented residual risks |

### Dependencies And Risks

- Depends on the feature-complete workflow engine, policy, and sandbox MVP.
- Risk: benchmark goals remain vague. Mitigation: establish numeric baselines
  and regression thresholds during Phase 5.
- Risk: observability leaks sensitive content. Mitigation: log metadata and
  redacted references by default.

### Test And Verification Plan

- Run full `cargo fmt`, `cargo clippy`, and `cargo test`.
- Run integration and smoke tests in clean temp workspaces.
- Run E2E tests for design-only workflow, approval resume, scheduler, ClawHub
  dry-run, policy, and sandbox fixture.
- Compare benchmarks against stored baselines.
- Rehearse release from packaged artifact.

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
| Skill metadata | Phase 2 | Phase 2 | Phase 5 |
| ClawHub inspect/dry-run | Phase 0 | Phase 2 | Phase 5 |
| Skill execution | Phase 2 | Phase 4 | Phase 5 |
| Scheduler | Phase 0 | Phase 3 | Phase 5 |
| Sandbox | Phase 0 | Phase 4 | Phase 5 |
| Multi-agent delegation | Future-compatible contract | Post-Phase 5 | Future |
| DAG workflow | Extension notes | Post-Phase 5 | Future |

## 11. Release Readiness Checklist

- Existing design synthesis is complete and reviewed.
- Phase 0 artifact schemas and conflict resolutions are accepted.
- Phase 1 CLI can run design-only workflow in a clean repository.
- File state survives interruption and resumes correctly.
- Structured output validation has bounded retry and clear failure reports.
- Approval gates are represented in structured state and review documents.
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
- Packaging has been tested in a clean environment.
- Release notes document known limitations, migration notes, and future work.

## 12. Deferred Work

- Telegram channel adapter over the workflow/session core.
- Personal memory ingestion and LLM Wiki automation.
- OpenAI OAuth and full multi-provider routing.
- External CLI worker adapters for Codex, Claude, and Gemini.
- Peer Dore pairing and A2A-compatible envelopes.
- Complex DAG workflow execution.
- Stronger OS-level sandboxing, signed skill provenance, and publisher trust.
