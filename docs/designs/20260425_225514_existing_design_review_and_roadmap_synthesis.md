# Existing Design Review And Roadmap Synthesis

Status: Proposed
Created: 2026-04-25 22:55:14 UTC
Scope: Rust AI Agent / Workflow Engine roadmap synthesis
Source Prompt: `docs/prompts/20260425_221546_00_existing_design_review_to_roadmap.md`

## 1. Summary

This document reviews the existing Dore design set before producing the final
development roadmap. The older CEP documents describe a Rust personal assistant
runtime with Telegram, durable memory, provider abstraction, scheduler,
self-improvement, ClawHub skills, and later multi-agent coordination. The newer
prompt set narrows the first implementation slice to a safer Rust workflow
engine: local CLI, design-only planning, file-based state, structured output
validation, human approval, and resumable runs.

The resolution is to keep the older CEPs as the long-term architecture, but
change the implementation order:

- Phase 0 and Phase 1 prioritize design-only foundation, local CLI, file-backed
  operational state, schema validation, review artifacts, and approval gates.
- Tool execution, ClawHub skill execution, sandboxing, multi-agent delegation,
  Telegram, provider OAuth, and DAG execution are later phases.
- Workflow artifacts under `.dev/` are operational state, while durable design
  and roadmap outputs stay under `docs/`.

This document supersedes neither the existing CEPs nor the earlier
`20260425_223158_existing_design_review_and_roadmap_basis.md`; it refines their
roadmap basis by explicitly incorporating every current prompt in
`docs/prompts/`.

## 2. Existing Design Inventory

| Group | Document | Core Topic | Review Position |
| --- | --- | --- | --- |
| Architecture | `docs/designs/01_system_architecture.md` | Dore product architecture and module boundaries | Keep as long-term architecture; rebase rollout to CLI-first workflow engine |
| Memory | `docs/designs/02_memory_and_llm_wiki.md` | Persistent LLM Wiki memory, digest, provenance, token budget | Keep; defer full memory automation until after workflow state is stable |
| Provider/Auth | `docs/designs/03_provider_and_auth.md` | Provider adapters, auth isolation, routing, typed failures | Keep; Phase 1 needs only a minimal provider seam and mock provider |
| Session/Telegram | `docs/designs/04_telegram_and_session_runtime.md` | Session runtime, Telegram adapter, compact context, child sessions | Keep session ideas; defer Telegram channel |
| Scheduler/Improvement | `docs/designs/05_scheduler_and_self_improvement.md` | Schedules, jobs, bounded self-improvement, reports | Split: design-only workflow first, durable scheduler later |
| Quality | `docs/designs/06_quality_and_test_strategy.md` | Unit/integration/smoke/e2e quality gates | Keep; apply from the first Rust implementation |
| Goals/Reports | `docs/designs/07_goal_management_and_reporting.md` | Goal records, review cadence, durable reports | Promote into Phase 0 and Phase 1 foundation |
| Multi-Agent/A2A | `docs/designs/08_multi_agent_and_a2a.md` | Child sessions, external workers, peer Dore nodes | Keep compatibility concepts; defer implementation |
| ClawHub Skills | `docs/designs/09_clawhub_skill_integration.md` | ClawHub search/install/update/trust/snapshot lifecycle | Keep; implement metadata/inspect/dry-run before execution |
| Prior review | `docs/designs/20260425_223158_existing_design_review_and_roadmap_basis.md` | First synthesis of existing CEPs and prompts | Keep as predecessor; this document is the current synthesis |
| Korean mirrors | `docs/designs/ko/*.md` | Korean localized copies of CEP-01 through CEP-09 | Treat as localized duplicates; update only after canonical design stabilizes |
| Reference | `docs/refs/llm_wiki.md` | Persistent wiki pattern | Use as memory principle, not as Phase 1 implementation scope |
| Prompts | `docs/prompts/*.md` | Current design and roadmap constraints | Treat as active planning requirements |
| Repo guide | `AGENTS.md` | Layout, tests, docs, commit rules | Follow for file placement and documentation maintenance |

## 3. Document-By-Document Summary

### 3.1 CEP-01: System Architecture

Defines Dore as a Rust personal assistant runtime with durable memory, compact
context, OpenAI OAuth default, optional providers, Telegram-first channel,
scheduled work, bounded self-improvement, and future multi-agent execution.
It also defines module boundaries for `core`, `storage`, `memory`, `provider`,
`session`, `channel`, `scheduler`, `skill`, `improvement`, `quality`, `goal`,
and `agent`.

Roadmap implication: retain the modules as long-term architecture, but add
workflow-engine modules for the first implementation: `cli`, `workflow`,
`planner`, `artifact`, `validator`, `approval`, `policy`, `audit`, and
`observability`.

### 3.2 CEP-02: Memory And LLM Wiki

Defines durable memory as raw sources, LLM-maintained markdown wiki pages,
compiled digests, and optional graph artifacts. It emphasizes provenance,
claim status, index/log files, and explicit token budgets.

Roadmap implication: adopt the same inspectable file-first discipline for
workflow artifacts. Do not make the memory wiki the active workflow state store.

### 3.3 CEP-03: Provider And Authentication

Separates provider execution from authentication and secret storage. OpenAI
OAuth is the default path, API-key providers and local LLMs share an adapter
contract, routing is task-class driven, and failures are typed.

Roadmap implication: Phase 1 needs a small provider trait and mock provider for
structured design output. OAuth, API-key profile management, local model
discovery, and provider routing belong after the local workflow loop is proven.

### 3.4 CEP-04: Telegram And Session Runtime

Makes session the primary runtime abstraction and Telegram a transport adapter.
It defines compact context assembly, session compaction, child sessions,
reports, minimal Telegram commands, and persistence requirements.

Roadmap implication: the CLI should become the first channel. Session concepts
are useful later, but Phase 1 can use `workflow_run` as the primary execution
record without implementing Telegram.

### 3.5 CEP-05: Scheduler And Self-Improvement

Defines scheduled triggers, jobs, bounded improvement workflows, policy classes,
artifacts, retries, failures, and reports.

Roadmap implication: separate "resumable single workflow run" from "daemon
scheduler". Phase 1 implements resume/checkpoint basics. Phase 3 implements
queue, lock, heartbeat, scheduler, and job records.

### 3.6 CEP-06: Quality And Test Strategy

Requires unit, integration, smoke, and end-to-end tests. It treats untested
self-improvement as failed work and identifies critical boundaries such as auth,
memory correctness, scheduler deduplication, session continuity, and report
integrity.

Roadmap implication: first tests should cover schemas, state transitions,
structured validation, retry limits, artifact generation, approval gates, and
CLI smoke flows. Later phases add provider, scheduler, ClawHub, sandbox, and
e2e coverage.

### 3.7 CEP-07: Goal Management And Reporting

Defines goal classes, durable goal records, review loops, memory/report links,
short Telegram reports, and durable reports. It separates memory, goals, and
reports.

Roadmap implication: use goals and reports as the Phase 0/1 backbone. The first
runtime should load a goal, decompose it, produce a plan/design proposal, write
a review report, and pause for approval when needed.

### 3.8 CEP-08: Multi-Agent And A2A

Defines layered delegation: internal child sessions, external CLI workers, and
peer Dore nodes with A2A-compatible envelopes. It emphasizes work contracts,
capability registry, lease/failure handling, explicit trust, and result
promotion.

Roadmap implication: retain the work-contract vocabulary for future extension,
but restrict early execution to a single-process workflow. Multi-agent workers
and peer coordination are post-foundation features.

### 3.9 CEP-09: ClawHub Skill Integration

Defines ClawHub as the first remote skill source and separates search, install,
update, disable/remove, readiness checks, security checks, activation policy,
and visible-skill snapshots.

Roadmap implication: implement the separation rule immediately:
`discover != install != enable != trust != execute`. Phase 2 covers metadata,
catalog, inspect, cache, and dry-run install. Execution waits for Phase 4
policy and sandbox boundaries.

### 3.10 Korean Design Set

The files under `docs/designs/ko/` mirror CEP-01 through CEP-09. They do not
introduce separate architectural decisions in this review. They should be
updated only after the canonical English documents and roadmap direction are
stable enough to avoid translation churn.

### 3.11 Reference And Prompt Documents

`docs/refs/llm_wiki.md` provides the memory philosophy: durable, compounding,
inspectable wiki artifacts instead of rediscovering knowledge from raw sources
on every query.

The prompt set adds requirements not fully present in the older CEPs:

- design-only runtime and planning loop
- typed structured output validation and bounded retry
- file-backed `.dev/` workflow state
- local CLI as the MVP interface
- explicit approval records and review documents
- tool/skill metadata before tool/skill execution
- ClawHub compatibility with inspect and dry-run install
- security policy, guardrails, audit, and sandbox strategy
- low-memory, fast-start Rust CLI benchmarks
- Phase 0 through Phase 5 roadmap ordering

### 3.12 Prior Review Document

`docs/designs/20260425_223158_existing_design_review_and_roadmap_basis.md`
already identified the main roadmap rebase: keep the CEP architecture, but move
CLI, file state, design-only mode, structured validation, approval, and ClawHub
dry-run work ahead of Telegram, skill execution, sandboxing, multi-agent, and
DAG features.

Roadmap implication: this current review should not reverse that conclusion. It
adds more explicit source coverage and should be treated as the current basis
for the companion roadmap.

### 3.13 Prompt-By-Prompt Summary

| Prompt | Key Requirement | Roadmap Implication |
| --- | --- | --- |
| `20260425_221546_00_existing_design_review_to_roadmap.md` | Review existing designs before writing roadmap | This document must precede the roadmap |
| `20260425_221546_technology_classification.md` | Classify agent technologies by applicability, MVP scope, phase, Rust difficulty, and crate candidates | Phase 0 includes technology classification |
| `20260425_221546_design_only_runtime.md` | Design goal-driven, resumable, design-only planning loop with typed output and approval | Phase 0 designs it; Phase 1 implements it |
| `20260425_221546_system_architecture.md` | Define CLI, config, goal manager, planner, artifact manager, workflow, validator, tool/skill, policy, scheduler, observability | Add workflow-engine modules beside existing CEP modules |
| `20260425_221546_workflow_state_scheduler.md` | Define explicit lifecycle, checkpoints, resume, locks, heartbeat, queue, scheduler, and no early DAG | Phase 1 minimal resume; Phase 3 durable engine |
| `20260425_221546_tool_skill_clawhub.md` | Separate tool schema, skill metadata, ClawHub parser, cache, dry-run install, trust, and execution | Phase 2 metadata/dry-run; Phase 4 execution |
| `20260425_221546_security_policy_guardrails.md` | Define threat model, capability policy, approvals, audit, guardrails, restricted runner, sandbox MVP | Phase 0 policy draft; Phase 4 enforcement |
| `20260425_221546_roadmap_milestones.md` | Produce Phase 0-5 roadmap with milestones, tests, docs, risks, release readiness | Companion roadmap follows this structure |

## 4. Confirmed Decisions

- Dore remains local-first and file-first for core workflow state.
- Durable artifacts must be readable and reviewable by the user.
- Phase 0 and Phase 1 are design-only and CLI-first.
- `.dev/` is operational state; `docs/` is durable project documentation.
- The initial state backend is file-based with atomic write discipline.
- Human approval is a workflow state transition, not only a UI convention.
- LLM runtime outputs must deserialize into versioned typed structures.
- Invalid LLM output may retry only within a bounded retry policy.
- Provider execution and auth remain explicit boundaries.
- Tool and skill execution are blocked or dry-run until policy permits them.
- ClawHub support starts with metadata, inspect, cache, and dry-run install.
- Skill trust metadata and executable capability permission are separate.
- Security-sensitive behavior must create audit events.
- Scheduler, daemon, and queue come after the minimal local run loop.
- Complex DAG execution comes after linear durable workflows.
- Multi-agent and A2A compatibility remain future architecture, not MVP scope.
- Testing starts with the first Rust scaffold and expands by phase.

## 5. Open Questions

- Should canonical future design documents be English, Korean, or bilingual?
- Should Phase 1 keep one `state.json` or immediately split into specialized
  files such as `plan.md`, `risks.md`, `approvals/*.json`, and `reports/*.md`?
- Should runtime schemas be authored as Rust `serde` structs first, generated
  JSON Schema first, or both from the start?
- Which real provider should follow the mock provider: OpenAI API key, OpenAI
  OAuth, local command adapter, or another provider?
- What exact approval artifact is required for Phase 1: markdown only, JSON
  record only, or both?
- Should policy configuration use TOML, JSON, or YAML in the first
  implementation?
- How much of the session terminology should be generalized into workflow-run
  terminology for the CLI-first engine?
- Which ClawHub metadata fields are stable enough for strict parsing in Phase 2?
- What numeric startup and memory targets define "fast-start" and "low-memory"
  for Phase 5?

## 6. Duplicated Or Overlapping Topics

### 6.1 Goal, Session, Job, And Workflow Run

CEP-04 centers `session`, CEP-05 adds `job`, CEP-07 adds `goal`, and the new
prompts require a workflow state machine.

Resolution: use `goal` for intent, `workflow_run` for one execution attempt,
`checkpoint` for resumable progress, `job` for scheduled invocation, and
`session` for conversational or delegated context. Phase 1 implements `goal`,
`workflow_run`, and `checkpoint`; Phase 3 adds `job`; later channel and
delegation work reintroduces `session`.

### 6.2 Reports Across Modules

CEP-04, CEP-05, CEP-07, and CEP-09 all require reports.

Resolution: define one durable report artifact with origin, summary, actions,
changes, risks, tests, approval state, and linked artifacts. Telegram or CLI
short reports are projections of the durable report.

### 6.3 Policy Across Improvement, Skills, Agents, And Security

CEP-05, CEP-08, CEP-09, and the security prompt all define trust and policy
concerns.

Resolution: create one policy engine that returns decisions such as `deny`,
`dry_run`, `requires_approval`, or `allow`. Feature modules request decisions
from policy instead of embedding local allow/deny logic.

### 6.4 Tool Schema And Skill Metadata

CEP-09 focuses on skills; the tool/skill prompt adds function calling, tool
schema, tool routing, capability model, and package verification.

Resolution: a `skill` is installable instruction/metadata. A `tool` is an
executable capability. A skill may declare tools, but enabling or trusting a
skill never grants execution permission by itself.

### 6.5 Memory And Workflow State

CEP-02 and the design-only prompts both use markdown and JSON artifacts.

Resolution: active workflow state lives in `.dev/`; long-lived design outputs
live in `docs/designs/` and roadmaps in `docs/roadmaps/`; future personal memory
wiki remains a separate runtime store.

## 7. Conflicts And Resolution Proposal

| Conflict | Existing Design | Updated Requirement | Resolution |
| --- | --- | --- | --- |
| First user interface | Telegram-first in CEP-01 and CEP-04 | Local CLI first | CLI is MVP; Telegram is later channel adapter |
| First implementation slice | Personal assistant runtime with memory/provider/channel | Design-only workflow engine | Phase 0/1 produce plans, proposals, reviews, approval records |
| State backend | File or SQLite session store | File-based state first | Start with `.dev` files; keep storage traits narrow |
| Provider scope | OpenAI OAuth default from early architecture | MVP can use mock provider seam | Mock provider first; real auth later |
| Self-improvement | Bounded improvement workflow | No autonomous modification in MVP | Design proposals and approval first; execution later |
| ClawHub install/use | Install and make skills available | Inspect/dry-run before execution | Phase 2 metadata and dry-run; Phase 4 guarded execution |
| Sandbox | Trust language but incomplete enforcement model | Policy, guardrails, audit, restricted runner | Phase 4 implements enforceable safety boundary |
| Multi-agent | Child sessions early in rollout | Multi-agent later | Keep work-contract compatibility; defer workers/peers |
| DAG | Scheduler can grow toward orchestration | No complex DAG before durable engine | Linear state machine first; DAG post-foundation |

## 8. Missing Design Areas

### 8.1 Design-Only Foundation

Missing or underspecified:

- goal file schema
- design proposal schema
- risk summary schema
- approval request and approval record schema
- runtime state transition table
- CLI command UX for design-only runs
- bounded retry flow for invalid structured output

Roadmap treatment: Phase 0 designs these; Phase 1 implements them.

### 8.2 Durable Workflow

Missing or underspecified:

- checkpoint schema
- run history append format
- idempotent step contract
- lock file and heartbeat semantics
- cancellation and partial recovery behavior
- queue and daemon lifecycle
- explicit exclusion of complex DAG in MVP

Roadmap treatment: Phase 1 implements minimal checkpoint/resume; Phase 3
implements durable workflow engine mechanics.

### 8.3 ClawHub Compatibility

Missing or underspecified:

- internal skill metadata schema
- ClawHub metadata mapping
- `SKILL.md` parsing rules
- offline cache layout
- checksum and package verification format
- dry-run install report schema
- activation versus execution permission boundary

Roadmap treatment: Phase 2.

### 8.4 Security Policy

Missing or underspecified:

- threat model
- policy file schema
- capability model for file/process/network/env/secrets
- trust-level taxonomy
- always-approval and dry-run-only action matrix
- audit log event schema
- prompt injection quarantine behavior
- sandbox MVP guarantees and non-guarantees

Roadmap treatment: policy draft in Phase 0; enforceable policy and sandbox MVP
in Phase 4.

### 8.5 Roadmap And Release Readiness

Missing or underspecified:

- Phase 0-5 execution order
- milestone deliverables and acceptance criteria
- phase-level dependencies and risks
- test and verification plan per phase
- documentation tasks per phase
- release readiness checklist
- benchmark acceptance process

Roadmap treatment: companion roadmap document.

## 9. Roadmap Implications

The implementation must follow dependency order rather than product ambition:

1. Settle artifact schemas, state machine, and approval semantics before code
   execution.
2. Build a local CLI and file state before external channels.
3. Validate structured model output before relying on model-generated plans.
4. Implement reports and audit-friendly artifacts before autonomous behavior.
5. Define tool and skill metadata before execution.
6. Support ClawHub inspect and dry-run before activation or execution.
7. Add durable scheduler mechanics before background automation.
8. Add policy and sandbox enforcement before restricted execution.
9. Defer multi-agent, peer coordination, Telegram, provider OAuth hardening, and
   DAG execution until the core workflow engine is stable.

## 10. Artifact Boundary

Adopt this split:

```text
.dev/
  goal.md
  state.json
  plan.md
  architecture.md
  risks.md
  design-decisions/
  approvals/
  reports/
  run-history/
  locks/
docs/
  designs/
  roadmaps/
  prompts/
  refs/
```

Interpretation:

- `.dev/` is operational state for active runs and resumes. In this hosted
  workflow, `.dev/...` references map to the operational state directory
  provided by the runner, not necessarily the repository-local `.dev`.
- `docs/designs/` contains durable architecture and design decisions.
- `docs/roadmaps/` contains durable roadmap outputs.
- `docs/prompts/` contains source prompt assets.
- `docs/refs/` contains reference materials.

## 11. Architecture Decision Basis

The roadmap should use these decisions:

- Phase 0: design-only foundation, artifact schemas, approval semantics, policy
  draft, CLI UX draft, ClawHub compatibility scope.
- Phase 1: minimal Rust CLI with goal loading, file state, mock provider,
  structured validation, bounded retry, checkpoint, resume, and reports.
- Phase 2: tool and skill metadata, local catalog, ClawHub parser/client,
  offline cache, dry-run install, no execution.
- Phase 3: durable workflow state machine, run history, queue, locking,
  heartbeat, scheduler, jobs, restart recovery, no complex DAG.
- Phase 4: enforceable policy, capability model, approval enforcement, audit
  log, guardrails, restricted command runner, sandbox MVP, skill execution pilot.
- Phase 5: benchmarks, observability, trace export, regression suites, ClawHub
  compatibility tests, packaging, release readiness.

## 12. Acceptance Criteria For This Review

This review is complete when:

- every existing design document group has a summary and roadmap implication
- duplicated topics are resolved with explicit terminology
- conflicts are identified with a clear resolution proposal
- missing design areas are assigned to roadmap phases
- Phase 0/1 are limited to design-only, CLI, and file-based state
- ClawHub skill execution, sandboxing, multi-agent, and DAG execution are
  deferred to later phases
- the companion roadmap can be written without ignoring the existing CEPs
