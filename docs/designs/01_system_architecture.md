# CEP-01: Dore System Architecture

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore core maintainers
Related: `02_memory_and_llm_wiki.md`, `03_provider_and_auth.md`, `04_telegram_and_session_runtime.md`, `05_scheduler_and_self_improvement.md`, `06_quality_and_test_strategy.md`, `07_goal_management_and_reporting.md`, `08_multi_agent_and_a2a.md`, `09_clawhub_skill_integration.md`

## 1. Summary

Dore is a Rust-based personal assistant runtime that:

- remembers the user over long periods
- preserves continuity across conversations without replaying full history
- improves itself in a controlled, test-gated way
- uses OpenAI via OAuth as the default provider path
- can use API-key-backed providers and local LLMs when configured
- starts with Telegram as the primary interaction channel
- grows toward multi-agent and multi-device execution

This CEP defines the product-level architecture and the major decisions that all feature-level designs must follow.

## 2. Context

The user's requirements are strict and should shape the architecture rather than being layered on later:

- personal assistant first, not a generic chatbot
- durable memory based on the LLM Wiki pattern
- minimal token usage with strong context continuity
- simple, well-bounded modules with single responsibilities
- Clean Architecture and OOAD where they clarify responsibilities
- pragmatic adoption of design patterns, not pattern theater
- support for self-improvement without uncontrolled autonomy
- OpenAI OAuth as the default provider path
- optional API-key providers for Claude, ChatGPT, Gemini, and future providers
- support for local LLM adapters
- Telegram-first operations with a minimal command surface
- scheduled work through cron, interval, daily, and weekly jobs
- future multi-agent execution across Dore peers and sub-agents
- mandatory test coverage across unit, integration, smoke, and end-to-end layers

The architecture should also carry forward useful ideas from the already reviewed projects:

- `llm_wiki`: persistent wiki as the compiled knowledge layer
- `openclaw`: provider/auth boundaries and practical runtime seams
- `claude-code`: disciplined agent workflow and repository-oriented execution
- `opencode`: session-oriented runtime and provider-neutral execution boundaries
- `dormammu`: goal-driven automation, scheduling, and report-centric operation
- `graphify`: graph-derived navigation, linting, and token-aware retrieval diagnostics

## 3. Problem Statement

Typical agent architectures fail one or more of these constraints:

- they re-send too much history and waste tokens
- they hide memory in opaque vector stores or unstructured logs
- they mix provider logic into business logic
- they blur channel code, domain code, and orchestration
- they allow "self-improvement" to become unbounded self-mutation
- they treat tests and reports as secondary concerns

Dore must solve all of those at once.

## 4. Goals

### 4.1 Product Goals

- Help one user continuously and personally over time.
- Preserve user context as durable knowledge instead of ephemeral chat state.
- Keep prompts compact by retrieving compiled memory, not replaying history.
- Improve the assistant and the codebase in a controlled, auditable workflow.
- Report meaningful findings, changes, and failures back to the user.

### 4.2 Engineering Goals

- Keep module boundaries narrow and explicit.
- Favor local, inspectable state over hidden infrastructure.
- Make each feature testable in isolation.
- Preserve extensibility for providers, channels, schedulers, and multi-agent execution.

## 5. Non-Goals

- Building a general-purpose distributed agent platform in milestone one
- Supporting every messaging channel from the start
- Allowing unrestricted autonomous code changes
- Treating the graph index as the primary memory store
- Depending on heavyweight infrastructure before it is justified

## 6. Requirements

### 6.1 Functional Requirements

- FR-1: Dore must maintain long-lived user memory in durable local artifacts.
- FR-2: Dore must answer with compact context assembled from summaries and targeted references.
- FR-3: Dore must use OpenAI OAuth as the default model connection path.
- FR-4: Dore must support user-configured API-key providers.
- FR-5: Dore must keep a local-LLM-compatible provider interface.
- FR-6: Dore must operate through Telegram first.
- FR-7: Dore must support scheduled jobs and deferred goals.
- FR-8: Dore must support controlled self-improvement and user-facing reporting.
- FR-9: Dore must support internal sub-agents and future peer Dore coordination.
- FR-10: Dore must preserve auditability for memory updates, runtime decisions, and improvements.
- FR-11: Dore must support installable skills from ClawHub with explicit trust and activation policy.

### 6.2 Non-Functional Requirements

- NFR-1: Token usage must be treated as a first-class system budget.
- NFR-2: Core state must remain readable on disk.
- NFR-3: Each module should own one clear capability.
- NFR-4: Failure modes must be typed and observable.
- NFR-5: Secrets must be isolated from session and memory artifacts.
- NFR-6: Self-improvement must be policy-bounded and test-gated.
- NFR-7: The design must remain lightweight enough for local operation.
- NFR-8: The system must be implementable cleanly in Rust.

## 7. Architectural Decisions

### AD-1: The persistent wiki is the source of truth for durable memory

Raw inputs remain immutable, but the LLM-maintained wiki is the primary compiled knowledge layer. Digests are derived from the wiki. A graph index is optional and secondary.

### AD-2: Internal session is the primary runtime abstraction

Telegram is only the first channel adapter. Business logic must execute in sessions, not in the Telegram layer.

### AD-3: Provider execution and authentication are separate concerns

Provider adapters execute model requests. Credential resolution and secret storage are separate layers. Session code never handles secrets directly.

### AD-4: Scheduled work and conversational work share the same execution model

A scheduled task becomes a goal, then runs in a session, often a child session. This keeps audit trails and reports consistent.

### AD-5: Self-improvement is a bounded workflow, not an unrestricted mode

Observation, analysis, implementation, testing, and reporting are explicit phases. Untested changes are not accepted.

### AD-6: Local-first storage is mandatory

Memory, sessions, schedules, reports, and derived artifacts must be inspectable locally. Optional caches may be rebuilt.

### AD-7: Multi-agent support is layered

The first layer is internal child sessions. The second is external worker adapters such as CLI-based coding agents. The third is Dore-to-Dore peer coordination and A2A alignment.

## 8. Module Boundaries

## `core`

Shared domain primitives:

- IDs
- typed errors
- clocks
- config types
- task classes
- policy enums
- result envelopes

`core` must not depend on implementation modules.

## `storage`

Persistence seams and local stores:

- file store
- structured metadata store
- caches
- secret reference store
- session and job repositories

## `memory`

Durable knowledge lifecycle:

- raw source ingestion
- wiki update workflows
- digest compilation
- memory lint
- graph index generation

## `provider`

Model access and routing:

- provider registry
- OAuth flows
- API-key resolution
- local LLM adapters
- model routing and fallback

## `session`

Primary runtime orchestration:

- session creation and loading
- context assembly
- summarization and compaction
- child session management
- response execution
- report promotion

## `channel`

External interfaces:

- Telegram first
- later channels via the same session boundary

## `scheduler`

Time-based work:

- cron parsing
- interval triggers
- daily and weekly triggers
- job enqueueing
- backoff and retry

## `skill`

Installable runtime extensions:

- local skill discovery
- ClawHub search and install
- skill lockfile and origin tracking
- skill readiness and dependency checks
- skill trust and allowlist policy
- hot reload or snapshot invalidation

## `improvement`

Controlled system evolution:

- opportunity detection
- improvement proposals
- bounded execution
- report generation
- integration with quality gates

## `quality`

Verification system:

- unit, integration, smoke, and e2e orchestration
- quality policies
- regression enforcement
- release and acceptance rules

## `goal`

Durable user and system objectives:

- goal intake
- goal prioritization
- plan state
- report and review links

## `agent`

Sub-agent and peer coordination:

- child session workers
- CLI worker adapters
- peer node coordination
- capability registry

## 9. Runtime Flows

### 9.1 Interactive Flow

1. Receive a Telegram update.
2. Resolve the user and active session.
3. Determine intent and task class.
4. Assemble the minimal valid context.
5. Select provider and model.
6. Execute the task.
7. Update session and memory if required.
8. Send response and record an audit event.

### 9.2 Scheduled Flow

1. Scheduler triggers a due job.
2. A goal or job record is created or resumed.
3. The job runs in a system or child session.
4. Outputs update memory, goals, or reports.
5. User is notified if the result is material.

### 9.3 Self-Improvement Flow

1. Dore detects friction, debt, or a missed capability.
2. An improvement candidate is created.
3. Policy determines whether autonomous execution is allowed.
4. Bounded implementation occurs in a dedicated worker context.
5. Required tests run.
6. A report is produced and linked to the relevant goal or session.

## 10. Repository Layout

```text
docs/
  refs/
  designs/
  designs/ko/
src/
  core/
  storage/
  memory/
  provider/
  session/
  skill/
  channel/
    telegram/
  scheduler/
  improvement/
  quality/
  goal/
  agent/
tests/
  unit/
  integration/
  smoke/
  e2e/
assets/
scripts/
```

## 11. Dependency Rules

Allowed dependency direction:

- `channel -> session, goal, provider`
- `channel -> skill`
- `scheduler -> goal, session`
- `improvement -> goal, session, memory, provider, quality, agent`
- `agent -> session, provider, quality`
- `skill -> storage, core`
- `session -> memory, provider, goal, core, storage`
- `memory -> storage, core`
- `provider -> storage, core`
- `quality -> core`
- `goal -> storage, core`

Forbidden examples:

- `memory` depending on `channel`
- `provider` depending on `telegram`
- `core` depending on any outer module
- `quality` depending on provider implementation details

## 12. Persistence Model

Durable artifacts should be split by responsibility:

- memory artifacts under a dedicated memory root
- session ledgers and summaries under a session root
- goal and job records under a planning root
- reports under a reporting root
- secrets and auth material in a protected secret store
- caches under a rebuildable cache root

The exact on-disk layout may evolve, but categories must remain separate.

## 13. Security And Privacy

- Secrets must never be written into memory pages, reports, or session summaries.
- Auth refresh tokens must remain isolated.
- Peer devices must be explicitly paired before work delegation.
- Improvement workflows must not silently change provider routing or exfiltrate data.
- Logs should prefer metadata over raw sensitive content.

## 14. Rollout Plan

### Phase 1

- core types
- local storage
- provider/auth boundary
- Telegram channel
- session runtime

### Phase 2

- memory wiki ingestion
- digest compilation
- memory lint
- goal tracking

### Phase 3

- scheduler
- reporting
- controlled self-improvement
- quality gate integration

### Phase 4

- internal sub-agents
- CLI worker adapters
- peer Dore discovery and A2A-compatible envelopes

## 15. Acceptance Criteria

This architecture is accepted when:

- Telegram can drive the assistant cleanly through sessions
- user memory persists without replaying full history
- OpenAI OAuth is the default and functions reliably
- API-key providers can be added without architectural rewrites
- scheduled work and conversational work share a consistent audit model
- self-improvement cannot bypass tests
- reports clearly explain what Dore did, changed, or failed to do

## 16. Open Questions

- Which local secret backend should be the default first implementation?
- Should session state use plain files first, SQLite first, or a hybrid approach?
- What is the first milestone for peer Dore discovery: manual pairing only or local network discovery?
- Which improvement classes require explicit user approval even after tests pass?
