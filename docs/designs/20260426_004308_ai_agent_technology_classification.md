# AI Agent Technology Classification

Status: Proposed
Created: 2026-04-26 00:43:08 UTC
Scope: Technology classification for a new Rust AI Agent / Workflow Engine
Source Prompt: `docs/prompts/20260425_221546_technology_classification.md`
Related:

- `docs/designs/01_system_architecture.md`
- `docs/designs/02_memory_and_llm_wiki.md`
- `docs/designs/03_provider_and_auth.md`
- `docs/designs/05_scheduler_and_self_improvement.md`
- `docs/designs/07_goal_management_and_reporting.md`
- `docs/designs/09_clawhub_skill_integration.md`
- `docs/designs/20260425_231613_design_only_runtime_architecture.md`
- `docs/designs/20260425_235154_agent_workflow_engine_roadmap_design_basis.md`
- `docs/designs/20260426_001233_security_policy_guardrails_sandboxing.md`
- `docs/roadmaps/20260425_231613_design_only_runtime_development_roadmap.md`

## 1. Existing Design Analysis

The existing design set defines Dore as a local-first Rust agent and workflow
runtime. The long-term architecture includes durable memory, provider
abstraction, ClawHub-compatible skills, scheduling, multi-agent handoff,
sandboxing, and observability. The initial implementation must be much narrower.

The following decisions should be retained:

- The first product surface is a local CLI, not Telegram or a daemon.
- Phase 0 and Phase 1 focus on a design-only foundation, file-backed state,
  typed schemas, approval gates, and minimal checkpoint/resume behavior.
- `.dev/` is mutable operational state. `docs/` is durable approved
  documentation.
- LLM output enters trusted runtime state only after versioned structured output
  validation and semantic checks.
- ClawHub work starts with search, metadata, cache, inspect, and dry-run install
  planning. The lifecycle remains `discover != install != enable != trust != execute`.
- Tool, skill, shell, network, and source mutation paths become executable only
  after policy, approval, audit, and sandbox boundaries exist.
- Embedding retrieval is not an early dependency. Filename, metadata, keyword,
  and deterministic manifest search come first.
- Multi-agent support is initially limited to role-specific prompt templates and
  explicit handoff records.

This document classifies each required technology category by project
applicability, MVP inclusion, Phase 0-5 priority, Rust implementation
difficulty, crate candidates, initial scope, and later expansion scope. The
roadmap document decomposes this classification into implementation milestones.

## 2. Phase Definitions

| Phase | Name | Primary Purpose |
| --- | --- | --- |
| Phase 0 | Design Foundation | Finalize taxonomy, schemas, state machine, approval semantics, and policy draft. |
| Phase 1 | Minimal Local CLI | Implement the Rust CLI, file-backed state, goal loading, artifact store, and guarded state transitions. |
| Phase 2 | Structured Design Loop | Add prompt packets, mock provider, structured output validation, review artifacts, and basic approval. |
| Phase 3 | Durable Workflow | Strengthen approval, resume, rejection, replanning, run history, locks, and queue preview. |
| Phase 4 | Policy-Enforced Execution Boundary | Add capability policy, guardrails, audit, sandbox MVP, and fixture-only skill execution. |
| Phase 5 | Hardening And Compatibility | Add benchmarks, observability, regression suites, packaging, provider pilots, and ClawHub compatibility checks. |

MVP means the Phase 0-2 design-only CLI foundation. Phase 3 is the first
post-MVP stabilization phase. Phase 4 is the earliest phase that should allow
limited execution, and only through explicit policy and approval boundaries.

## 3. Technology Classification Table

Priority uses `P0` as highest and `P4` as lowest. Difficulty is scoped to a Rust
implementation and uses `Low`, `Medium`, `High`, and `Very High`.

| Technology Category | Applies | MVP | Phase | Priority | Difficulty | Core Crates / Candidates | Initial Implementation Scope | Later Expansion Scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Goal Management | Required | Yes | 0-1 | P0 | Medium | `serde`, `uuid`/`ulid`, `time`, `thiserror` | Goal file and CLI input, typed goal record, success criteria, lifecycle status. | Goal backlog, dependencies, recurring goals, archival, search. |
| Planning and Reasoning | Required | Yes | 0-2 | P0 | High | `serde`, `schemars`, `minijinja`, `indexmap` | Design-only task and step plan, decision records, risk records, bounded replanning input. | Deeper planning strategies, plan comparison, plan scoring, execution planning. |
| Tool Calling | Limited | No | 2,4 | P2 | High | `schemars`, `serde_json`, `jsonschema`, `tokio` later | Define tool metadata schema and proposed action records only. | Policy-gated execution, tool result validation, command adapters. |
| Structured Output | Required | Yes | 0-2 | P0 | Medium | `serde`, `serde_json`, `schemars`, `jsonschema`, `thiserror` | Versioned output schemas, deserialization, semantic validation, retry error classes. | Provider-native structured output, schema migration, compatibility fixtures. |
| Memory and State Management | Required | Yes | 0-1 | P0 | Medium | `camino`, `serde`, `serde_json`, `toml`, `fs2`, `tempfile` | File-backed operational state, atomic writes, checkpoints, docs manifest. | SQLite backend, compaction, memory wiki automation, migration tooling. |
| Durable Execution | Required | Partial | 1-3 | P0 | High | `serde`, `fs2`, `tracing`, `ulid`, `time` | Resumable state, checkpoints, terminal states, waiting states. | Locks, heartbeat, crash recovery, idempotent step runner. |
| Workflow Orchestration | Required | Partial | 1-3 | P1 | High | Custom state machine, `petgraph` later | Linear lifecycle with explicit validated transitions. | DAGs, dependency scheduling, parallel steps, distributed queue. |
| Human-in-the-Loop | Required | Yes | 0-3 | P0 | Medium | `clap`, `serde`, `time`, `comfy-table` optional | Approval request JSON, review Markdown, approve/reject CLI commands. | Multi-approver policy, approval expiry, UI and channel adapters. |
| Guardrails and Validation | Required | Yes | 0-2,4 | P0 | High | `jsonschema`, `regex`, `serde`, `thiserror`, `secrecy` | Parse, schema, semantic, and policy validation; bounded retry; basic redaction. | Prompt-injection quarantine, tool-result guardrails, classifier adapters. |
| Skill / Plugin System | Applicable | Partial | 2,4 | P2 | High | `walkdir`, `ignore`, `serde`, `toml`, `sha2`, `zip`/`tar` later | Local skill metadata schema and visible snapshot draft, with no execution. | Install, update, enable, trust lifecycle; runtime skill tools. |
| ClawHub / OpenClaw Compatibility | Applicable | Partial | 2,5 | P2 | Medium | `reqwest`/`ureq`, `serde`, `sha2`, `zip`, `semver` | Metadata mapping, origin/lock schema, cache/inspect/dry-run plan. | Registry client, verified install, update checks, compatibility suite. |
| Context Management | Required | Yes | 1-2 | P0 | Medium | `ignore`, `globset`, `camino`, `serde`, `walkdir` | Deterministic context manifest from operational state and `docs/`, with include/exclude reasons. | Token budgeting, context compression, channel/session context. |
| Retrieval and Indexing | Applicable | Partial | 1,5 | P3 | Medium | `ignore`, `globset`, `regex`, `tantivy` later | Filename, path, metadata, and keyword search; no embedding dependency. | Digest-first retrieval, graph expansion, embedding/vector index if justified. |
| Prompt Engineering and Prompt Asset Management | Required | Yes | 0-2 | P1 | Medium | `minijinja`, `serde`, `insta` | Versioned prompt packets, schema contract, prompt artifact archive. | Prompt registry, A/B evaluation, localized prompt variants. |
| Agent Runtime | Required | Yes | 1-3 | P0 | High | `clap`, `tracing`, `serde`, `thiserror`, `anyhow` | CLI run loop, state transition driver, provider seam, artifact/report output. | Session runtime, channel adapters, background jobs, execution runtime. |
| Multi-Agent / Specialist Handoff | Limited | No | 2,5+ | P4 | High | Prompt templates, `serde`; A2A later | Role-specific prompt templates and handoff records only. | Child sessions, external worker adapters, peer coordination. |
| Security Model | Required | Partial | 0,4 | P0 | High | `secrecy`, `zeroize`, `serde`, `tracing` | Threat model, trust states, approval-required action classes. | Full capability model, secret resolver, policy-gated executor. |
| Sandboxing | Applicable | No | 4 | P3 | Very High | `tempfile`, `duct`/`std::process`, `nix`, OS sandbox later | Documented non-goal plus sandbox interface placeholder. | Restricted runner, env filtering, network denial, resource limits, stronger isolation. |
| Observability | Required | Partial | 1,5 | P2 | Medium | `tracing`, `tracing-subscriber`, `tracing-appender`, `serde_json` | Run IDs, error classes, artifact links, append-only events. | Trace export, metrics, timing breakdown, redaction tests. |
| Evaluation and Benchmarking | Required | Partial | 2,5 | P2 | Medium | `cargo test`, `insta`, `criterion`, `proptest` | Schema fixtures, mock provider flows, snapshot tests. | Startup and memory benchmarks, regression suites, prompt evaluations. |
| Configuration and Policy | Required | Partial | 0-1,4 | P0 | Medium | `figment`/`config`, `toml`, `serde`, `directories` | Config layout, state root override, policy decision enum. | Policy file parser, capability matching, workspace and organization profiles. |
| CLI UX | Required | Yes | 0-1 | P0 | Medium | `clap`, `anstream`, `comfy-table` optional, `miette` optional | `init`, `goal set`, `run`, `status`, `review`, `approve`, `reject`, `resume`. | Skill commands, policy explain, debug/trace commands, shell completion. |
| Daemon and Scheduler | Applicable | No | 3,5+ | P3 | High | `tokio`, `cron`, `notify`, `fs2` | Scheduler concepts and queue preview only; no daemon in MVP. | Queue, locks, heartbeat, cron/interval jobs, background worker. |
| Repository and Artifact Management | Required | Yes | 0-2 | P0 | Medium | `camino`, `ignore`, `tempfile`, `sha2`, `serde` | Repo root detection, `.dev`/`docs` split, atomic artifact writes, promotion rules. | Artifact GC, content hashes, provenance, export/import. |
| Model Provider Abstraction | Required | Partial | 1-2,5 | P1 | Medium | Trait-based custom code, `reqwest`/`ureq`, `async-trait` later | Mock provider and narrow request/response trait. | OpenAI, API-key, local provider adapters; routing; typed failures. |

## 4. MVP Inclusion Summary

MVP categories are the minimum set required for a design-only loop.

| MVP Level | Categories |
| --- | --- |
| Must implement | Goal Management, Structured Output, Memory and State Management, Context Management, Agent Runtime, CLI UX, Repository and Artifact Management. |
| Implement as core MVP slices | Planning and Reasoning, Durable Execution, Workflow Orchestration, Human-in-the-Loop, Guardrails and Validation, Prompt Engineering, Configuration and Policy, Model Provider Abstraction. |
| Implement as metadata or placeholders | Tool Calling, Skill / Plugin System, ClawHub / OpenClaw Compatibility, Security Model, Observability, Evaluation and Benchmarking. |
| Exclude from MVP | Sandboxing, Daemon and Scheduler, full multi-agent execution, autonomous tool/skill execution, embedding retrieval. |

## 5. Topics Requiring Deeper Design Documents

The following topics should be expanded in dedicated design documents or in
targeted revisions to existing documents.

| Design Topic | Related Categories | Reason |
| --- | --- | --- |
| Versioned schema catalog | Goal, State, Structured Output, Approval, Checkpoint | Rust `serde` structs and JSON artifacts need a stable source of truth. |
| Design-only state machine | Agent Runtime, Workflow, Durable Execution | Every transition, guard, terminal state, and resumable state must be testable. |
| Approval and promotion semantics | Human-in-the-Loop, Repository Artifacts, Policy | Review Markdown and approval JSON must have separate responsibilities. |
| Context manifest and retrieval policy | Context, Retrieval, Prompt Assets | Deterministic context selection must work before embeddings are introduced. |
| ClawHub metadata compatibility | Skill, ClawHub/OpenClaw, Security | Metadata, readiness, trust, and execution lifecycle states must remain separate. |
| Policy and capability model | Security, Guardrails, Tool Calling, Sandboxing | Every future execution path should pass through one policy API. |
| Provider request/response contract | Model Provider, Structured Output, Observability | Mock and real providers should share the same validation path. |
| Artifact ownership and migration | State, Repository Artifacts, Observability | `.dev` and `docs` responsibilities, schema migration, and promotion history need explicit rules. |
| Benchmark targets | CLI, Evaluation, Observability | Low-memory and fast-start requirements need measurable release gates. |

## 6. Roadmap Milestone Separation

The roadmap should not implement all categories in parallel. It should group
strongly coupled categories into small sequential milestones.

| Candidate Milestone | Included Categories | Separation Reason |
| --- | --- | --- |
| Schema and artifact foundation | Goal, State, Structured Output, Repository Artifacts | Every later phase depends on the same files and schemas. |
| CLI and state root bootstrap | CLI UX, Configuration, Artifact Store | Users need `run`, `status`, and `review` before deeper runtime behavior matters. |
| Context manifest and prompt packet | Context, Retrieval, Prompt Assets | Provider input must be deterministic and archived before model calls. |
| Mock provider and validation loop | Provider, Structured Output, Guardrails | Success, retry, and failure paths must be testable without network access. |
| Review and approval gate | Human-in-the-Loop, Policy, Reports | Human approval must be proven before autonomous behavior is allowed. |
| Checkpoint, resume, replan | Durable Execution, Workflow, Planning | Long-running and failed work need a minimal recovery model. |
| Skill metadata and ClawHub dry-run | Skill, ClawHub, Security | Compatibility and trust lifecycle can be prepared without execution. |
| Policy, audit, sandbox boundary | Security, Guardrails, Sandboxing, Tool Calling | Future execution must share one boundary. |
| Hardening and release gates | Observability, Evaluation, Benchmarking, Packaging | Low-memory, fast-start, and regression safety become release conditions. |

## 7. Priority Conclusion

Phase 0-2 should produce a verifiable design-only workflow engine, not a broadly
autonomous agent. The most important early consistency points are goal, state,
structured output, approval, context, artifacts, and CLI behavior. Tool
execution, ClawHub execution, daemon scheduling, and multi-agent delegation are
important long-term capabilities, but enabling them too early would expand
autonomy before approval, policy, audit, and sandboxing exist.

The resulting implementation principles are:

1. File-backed state and typed schemas come first.
2. Human approval gates come before autonomous execution.
3. Metadata compatibility comes before skill execution.
4. Keyword and metadata retrieval come before embedding retrieval.
5. Role-specific prompt templates come before a multi-agent runtime.
6. Policy and audit boundaries come before any sandbox claims.
