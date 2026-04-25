# Existing Design Review And Roadmap Basis

Status: Proposed
Created: 2026-04-25 22:31:58 UTC
Scope: Rust AI Agent / Workflow Engine roadmap synthesis
Source Prompt: `docs/prompts/20260425_221546_00_existing_design_review_to_roadmap.md`

## 1. Summary

This document reviews the existing Dore design set before producing the
development roadmap. It treats the current CEP documents as the historical
design baseline, the Korean files as localized mirrors of those CEPs, and the
new prompt set as the updated prioritization input for a Rust workflow engine.

The main resolution is:

- keep the existing Dore concepts: local-first state, session runtime, durable
  memory, provider separation, goals, reports, quality gates, ClawHub skill
  boundaries, and layered multi-agent support
- reorder implementation around the new required foundation: Phase 0 and Phase
  1 are design-only, local CLI, file-based state, structured output validation,
  review artifacts, approval gates, and resumable checkpoints
- defer Telegram, real tool execution, ClawHub skill execution, sandbox
  completion, multi-agent workers, peer coordination, and DAG execution until
  later phases

## 2. Existing Design Inventory

| Area | Document | Role | Status In Review |
| --- | --- | --- | --- |
| Architecture | `docs/designs/01_system_architecture.md` | Product-level architecture and module map | Keep, but reorder rollout |
| Memory | `docs/designs/02_memory_and_llm_wiki.md` | LLM Wiki memory architecture | Keep as later memory foundation |
| Provider/Auth | `docs/designs/03_provider_and_auth.md` | Provider adapters, auth, routing, secrets | Keep; move full OAuth later than local design-only MVP |
| Session/Telegram | `docs/designs/04_telegram_and_session_runtime.md` | Session runtime with Telegram adapter | Keep session model; defer Telegram |
| Scheduler/Self-Improvement | `docs/designs/05_scheduler_and_self_improvement.md` | Scheduler, jobs, bounded improvement | Keep; split design-only workflow from daemon scheduler |
| Quality | `docs/designs/06_quality_and_test_strategy.md` | Test strategy and quality gates | Keep; apply from Phase 0 onward |
| Goals/Reports | `docs/designs/07_goal_management_and_reporting.md` | Goal records and report model | Keep; promote to Phase 0 foundation |
| Multi-Agent/A2A | `docs/designs/08_multi_agent_and_a2a.md` | Child sessions, external workers, peer nodes | Keep; defer beyond MVP |
| ClawHub Skills | `docs/designs/09_clawhub_skill_integration.md` | ClawHub search/install/update/trust lifecycle | Keep; split inspect/dry-run before execute |
| Korean mirrors | `docs/designs/ko/*.md` | Korean translations of CEP-01 through CEP-09 | Treat as localized duplicates |
| LLM Wiki reference | `docs/refs/llm_wiki.md` | Source pattern for persistent wiki memory | Keep as memory reference |
| Prompt set | `docs/prompts/*.md` | Updated design and roadmap requirements | Treat as active planning constraints |
| Repository guide | `AGENTS.md` | Repository layout and documentation rules | Follow for file placement and docs maintenance |

## 3. Document-By-Document Summary

### 3.1 CEP-01: Dore System Architecture

Defines Dore as a Rust-based personal assistant runtime with durable memory,
compact context, provider abstraction, Telegram-first operation, scheduled
work, bounded self-improvement, and eventual multi-agent coordination. It
establishes module boundaries for `core`, `storage`, `memory`, `provider`,
`session`, `channel`, `scheduler`, `skill`, `improvement`, `quality`, `goal`,
and `agent`.

Roadmap implication: keep these modules as future architecture, but introduce
`cli`, `planner`, `artifact`, `workflow`, `policy`, `validator`, `audit`, and
`observability` explicitly for the new workflow-engine scope.

### 3.2 CEP-02: Memory And LLM Wiki

Defines durable memory as an LLM-maintained markdown wiki with immutable raw
sources, compiled wiki pages, machine-oriented digests, optional graph artifacts,
claim provenance, linting, and token budgets. It rejects opaque vector stores as
the primary memory source.

Roadmap implication: use the same inspectable file-first principle for workflow
state. Full personal memory ingestion can wait until after the design-only CLI
and state machine exist.

### 3.3 CEP-03: Provider And Authentication

Separates provider execution from authentication and secret storage. OpenAI
OAuth is the default happy path, API-key providers and local LLMs share an
adapter contract, provider routing is task-class policy driven, and failures are
typed.

Roadmap implication: Phase 0 and Phase 1 only need a minimal LLM client seam and
structured-output contract. Full OAuth, API-key profile management, provider
routing, and local provider discovery can follow once the local workflow loop is
stable.

### 3.4 CEP-04: Telegram And Session Runtime

Establishes sessions as the real runtime abstraction and Telegram as a thin
transport adapter. It defines session metadata, compaction, compact context,
child sessions, reports, Telegram command surfaces, and persistence requirements.

Roadmap implication: session continuity and compact context are relevant, but
Telegram should not be in the first implementation slice. The first channel is
the CLI. Telegram becomes a later adapter over the same state and workflow core.

### 3.5 CEP-05: Scheduler And Self-Improvement

Defines scheduled work as jobs linked to goals and sessions. It also defines a
bounded self-improvement workflow with policy classes, reports, explicit write
scope, test plans, retries, failure classification, and observability.

Roadmap implication: split this into two layers. Phase 1 implements resumable
single-run workflow state. Phase 3 adds daemon scheduling, queueing, locks,
heartbeats, retry policy, and restart recovery. Self-improvement execution is
not an MVP goal; design proposals and approval requests are.

### 3.6 CEP-06: Quality And Test Strategy

Requires unit, integration, smoke, and end-to-end tests, with critical
boundaries around auth, memory correctness, scheduler deduplication, session
continuity, and report integrity. It treats untested self-improvement as a
failed attempt.

Roadmap implication: tests start with schema validation, state transition,
artifact generation, policy decision, and CLI smoke coverage. Provider,
Telegram, scheduler, and skill execution tests are added when those features
enter scope.

### 3.7 CEP-07: Goal Management And Reporting

Defines durable goals, goal classes, review cadence, source/confidence, linked
sessions/reports/memory, and short versus durable reports. It clearly separates
memory, goals, and reports.

Roadmap implication: this is the strongest match for Phase 0. The workflow
engine should start by reading goal files, decomposing them, producing design
artifacts, writing review reports, and preserving approval state.

### 3.8 CEP-08: Multi-Agent And A2A

Defines three delegation layers: internal child sessions, external CLI worker
adapters, and peer Dore nodes with A2A-compatible envelopes. It emphasizes work
contracts, explicit scopes, capability registries, leases, result promotion, and
trust.

Roadmap implication: keep the work-contract model as a future-compatible shape,
but restrict early multi-agent behavior to role-specific prompt templates and
single-process planning. External workers and peer nodes belong after durable
workflow and policy foundations.

### 3.9 CEP-09: ClawHub Skill Integration

Defines ClawHub as the first remote skill source. Search, install, update,
disable/remove, origin metadata, lockfile tracking, readiness checks, trust
checks, and visible-skill snapshots are separate responsibilities.

Roadmap implication: adopt the lifecycle principle immediately:
`discover != install != enable != trust != execute`. Phase 2 should implement
metadata parsing, local catalog, inspect, and dry-run install before any skill
execution.

### 3.10 Korean Design Set

The Korean documents under `docs/designs/ko/` mirror CEP-01 through CEP-09. They
do not add a separate architectural decision in this review. Keep them aligned
when the canonical English CEPs are materially changed.

### 3.11 Reference And Prompt Documents

`docs/refs/llm_wiki.md` is the source rationale for persistent wiki memory. The
new prompt set adds explicit requirements that are not fully covered by the
older CEPs:

- design-only runtime
- typed structured output validation
- Phase 0-5 roadmap
- file-based resumable workflow state
- policy-first tool and skill execution
- ClawHub compatibility before execution
- low-memory, fast-start Rust CLI benchmarks

## 4. Confirmed Decisions

- Dore remains local-first and file-first where feasible.
- Durable artifacts must be inspectable by the user.
- Goal management, plans, state, design artifacts, decisions, risks, reports,
  and run history are separate artifact types.
- The initial user-facing interface for the workflow engine is a local CLI.
- Design-only mode is the first execution mode.
- Human approval gates are part of the workflow state machine, not a UI-only
  convention.
- LLM outputs used by the runtime must be typed and schema-validated.
- Invalid model output can be retried, but retry count must be bounded.
- Provider execution and auth stay behind explicit adapter boundaries.
- Tool and skill execution default to blocked, dry-run, or approval-required
  until policy permits execution.
- ClawHub compatibility starts with metadata, inspect, and dry-run install.
- External skills are untrusted input until separately enabled, trusted, and
  policy-approved for execution.
- Daemon scheduling and durable queueing are later than the single-run CLI.
- Complex DAG execution is later than explicit state-machine execution.
- Multi-agent delegation is layered and later than the core workflow engine.

## 5. Open Questions

- Should the canonical design language remain English with Korean mirrors, or
  should new roadmap-facing documents be bilingual?
- Should Phase 1 use a single `.dev/state.json` file first, or split state into
  `state.json`, `plan.md`, `risks.md`, and `run-history/*.json` immediately?
- Which schema format should be used for runtime artifacts: JSON Schema, Rust
  `serde` structs with generated schema, or both?
- Which LLM provider path is required for the first runnable CLI: mock provider,
  OpenAI API key, OpenAI OAuth, or pluggable command adapter?
- What is the minimal approval artifact: Markdown review document only, or a
  structured approval record plus Markdown?
- Which policy file format should be adopted first: TOML for human editing, JSON
  for schema validation, or YAML for readability?
- How much of the existing session model should be renamed or generalized into a
  workflow run model?
- What exact ClawHub metadata fields are stable enough to parse in Phase 2?
- Which benchmark targets define "low-memory" and "fast-start" for Phase 5?

## 6. Duplicated Or Overlapping Topics

### 6.1 Session, Goal, Job, And Workflow Run

CEP-04 uses `session` as the primary runtime abstraction. CEP-05 introduces
`job`. CEP-07 introduces `goal`. The new prompts introduce a workflow state
machine.

Resolution proposal: use `goal` for intent, `workflow_run` for one execution
attempt, `checkpoint` for resumable progress, `job` for scheduled invocation,
and `session` for conversational or delegated context. In Phase 0 and Phase 1,
implement `goal` and `workflow_run`; add `job` and `session` only when their
feature surface appears.

### 6.2 Reports Across Runtime Surfaces

CEP-04, CEP-05, CEP-07, and CEP-09 all require reports.

Resolution proposal: define one durable report artifact with origin, summary,
actions, changes, tests, risks, approval request, and links. Channel-specific
short reports are projections of the durable report.

### 6.3 Policy Across Self-Improvement, Skills, Agents, And Security

CEP-05, CEP-08, CEP-09, and the security prompt all describe policy and trust.

Resolution proposal: create one policy engine with capability declarations,
approval requirements, trust levels, dry-run behavior, audit events, and
redaction rules. Feature modules request decisions from policy instead of
embedding their own ad hoc allow/deny logic.

### 6.4 ClawHub Skill Registry And Generic Skill Runtime

CEP-09 covers ClawHub and local skills together. The new tool/skill prompt adds
internal tool schema, function calling, capability model, package verification,
and offline cache.

Resolution proposal: keep `skill` as installed prompt/workflow capability
metadata and `tool` as executable function/process/network capability. A skill
may declare tools, but activation of a skill does not imply execution permission
for its tools.

### 6.5 Memory And Workflow State

CEP-02 memory artifacts and the new design-only state layout both use markdown
and JSON files.

Resolution proposal: keep workflow state in `.dev/` operational artifacts and
long-lived design outputs in `docs/`. Memory wiki remains a separate future
runtime store, not the storage location for active workflow checkpoints.

## 7. Conflicts And Resolution Proposal

| Conflict | Existing Design | Updated Requirement | Resolution |
| --- | --- | --- | --- |
| First runtime surface | Telegram-first operation in CEP-01 and CEP-04 | Phase 0/1 local CLI and design-only loop | CLI first; Telegram becomes a later channel adapter |
| First implementation phase | CEP-01 Phase 1 includes provider/auth, Telegram, session runtime | New roadmap requires Phase 0 design-only foundation and Phase 1 minimal local runtime | Rebase roadmap to Phase 0-5; map old Phase 1 work to later phases |
| State backend | CEP-04 allows file-backed or SQLite-backed session store | New prompts require file-based state first | Start with file-backed `.dev` state; keep repository interfaces backend-neutral |
| Automation scope | CEP-05 includes scheduler and self-improvement | New prompts require design iteration and approval before execution | Implement design-only planning and approval first; defer autonomous modification |
| Skill install/use | CEP-09 emphasizes search/install/use from Dore | New prompts require dry-run and policy before execution | Phase 2 supports metadata, inspect, dry-run install; execution waits for policy/sandbox |
| Sandbox expectations | CEPs mention trust and security but not a full guardrail pipeline | Security prompt requires capability policy, guardrails, audit, sandbox strategy | Add policy-first safety phase before OS sandbox completion |
| Multi-agent timing | CEP-08 rollout starts with child sessions | New prompt says multi-agent later | Restrict early work to single-process workflow with future work-contract compatibility |
| DAG execution | Scheduler design leaves room for orchestration | New prompt says no complex DAG before Phase 3 | Use explicit state machine first; DAG remains future extension |

## 8. Missing Design Areas

### 8.1 Design-Only Foundation

Missing details:

- goal file schema
- design proposal schema
- review document schema
- approval record schema
- design artifact lifecycle
- CLI command family for design-only runs
- retry behavior for invalid structured output

Roadmap treatment: Phase 0 and Phase 1.

### 8.2 Durable Workflow State

Missing details:

- workflow state transition table
- checkpoint schema
- run history schema
- lock and heartbeat strategy
- resume semantics
- idempotent step contract
- cancellation and partial result recovery

Roadmap treatment: basic state in Phase 1, durable engine in Phase 3.

### 8.3 ClawHub Compatibility

Missing details:

- exact internal skill metadata schema
- exact ClawHub metadata mapping
- `SKILL.md` parsing rules
- offline cache layout
- checksum verification format
- dry-run install output schema

Roadmap treatment: Phase 2.

### 8.4 Security Policy

Missing details:

- policy file schema
- capability declaration schema
- trust-level taxonomy
- required approval matrix
- command allowlist model
- prompt injection quarantine behavior
- audit log schema

Roadmap treatment: policy boundary starts Phase 0, guardrail pipeline and
sandbox MVP in Phase 4.

### 8.5 Roadmap And Release Criteria

Missing details:

- Phase 0-5 milestone order
- acceptance criteria per milestone
- release readiness checklist
- benchmark targets
- documentation tasks per phase

Roadmap treatment: covered by the companion roadmap document.

## 9. Roadmap Implications

The roadmap must be ordered by dependency rather than by product ambition:

1. stabilize design artifacts and approval workflow before implementation
2. make local CLI and file state reliable before external channels
3. validate structured model outputs before trusting planning results
4. define policy and audit boundaries before executing tools
5. inspect and dry-run ClawHub skills before enabling or executing them
6. add durable scheduler mechanics before multi-step automation
7. add sandboxing after policy semantics are stable enough to enforce
8. benchmark and package only after core workflows are verified

## 10. Proposed Artifact Boundary

Use the following split:

```text
.dev/
  goal.md
  state.json
  plan.md
  architecture.md
  risks.md
  design-decisions/
  run-history/
  approvals/
  reports/
  locks/
docs/
  designs/
  roadmaps/
  prompts/
  refs/
```

Interpretation:

- `.dev/` is operational state for active workflow runs.
- `docs/designs/` stores durable architecture and design outputs.
- `docs/roadmaps/` stores durable implementation roadmaps.
- `docs/prompts/` stores source prompts and prompt assets.
- `docs/refs/` stores reference materials.

This aligns with the runtime paths in the current prompt: `.dev/...` references
belong to the operational state directory, while durable design and roadmap
documents belong in the repository.

## 11. Architecture Decision Basis For The Roadmap

The roadmap should use these decisions as its basis:

- Phase 0: design-only foundation, artifact schemas, approval gate design,
  policy draft, CLI UX draft, and ClawHub compatibility scope
- Phase 1: minimal local CLI runtime with goal loading, state persistence,
  structured output validation, report generation, retry, and resume
- Phase 2: tool and skill metadata foundation with ClawHub inspect and dry-run
  install; no external skill execution
- Phase 3: durable workflow engine with state machine, checkpoints, queue,
  scheduler, locking, heartbeat, and restart recovery; no complex DAG
- Phase 4: safety and sandboxing with policy engine, capability enforcement,
  approval gates, audit log, prompt injection defense, and restricted execution
- Phase 5: production hardening with benchmarks, observability, regression
  suites, ClawHub compatibility tests, packaging, and release readiness

## 12. Acceptance Criteria For This Review

This review is complete when:

- every existing design document has a summary and roadmap implication
- duplicates and conflicts are identified
- conflict resolution rules are explicit
- missing design areas are tied to roadmap phases
- the final roadmap can be written without ignoring existing CEP decisions
