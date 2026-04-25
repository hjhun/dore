# Design-Only Runtime Architecture

Status: Proposed
Created: 2026-04-25 23:16:13 UTC
Scope: Rust AI Agent / Workflow Engine design-only planning loop
Source Prompt: `docs/prompts/20260425_221546_design_only_runtime.md`
Related:

- `docs/designs/20260425_225514_existing_design_review_and_roadmap_synthesis.md`
- `docs/roadmaps/20260425_225514_rust_agent_workflow_engine_development_roadmap.md`
- `docs/designs/01_system_architecture.md`
- `docs/designs/07_goal_management_and_reporting.md`
- `docs/prompts/20260425_221546_workflow_state_scheduler.md`
- `docs/prompts/20260425_221546_security_policy_guardrails.md`

## 1. Existing Design Analysis

The current design set already establishes Dore as a local-first Rust assistant
runtime with durable memory, goals, reports, provider boundaries, workflow
state, safety policy, and eventual scheduler, tool, skill, Telegram, and
multi-agent support. The design-only runtime should not replace those CEPs. It
is the first executable slice that proves the goal, state, validation, approval,
and report model before the project allows code modification, shell execution,
remote skill execution, or daemon scheduling.

Key conclusions from the existing documents:

- `01_system_architecture.md` remains the long-term module map. The MVP adds a
  narrower `workflow`, `planner`, `artifact`, `validator`, `approval`, and
  `cli` slice beside the broader architecture.
- `07_goal_management_and_reporting.md` should be promoted into the first
  implementation. A design-only run starts from a goal, produces a plan or
  proposal, and ends in a durable report.
- `20260425_225514_existing_design_review_and_roadmap_synthesis.md` already
  resolves rollout order: local CLI, file-backed state, structured validation,
  approval gates, and resumable reports come before Telegram, tool execution,
  sandboxing, ClawHub execution, scheduler, DAG, and multi-agent work.
- `20260425_221546_workflow_state_scheduler.md` requires an explicit lifecycle,
  checkpointing, resume, retry limits, locks, heartbeat, and scheduler
  expansion. The design-only MVP should implement the linear lifecycle and
  checkpoint model first; queue, daemon, heartbeat, and cron are later phases.
- `20260425_221546_security_policy_guardrails.md` requires safe defaults. For
  design-only mode, the policy is simple: project file writes, shell commands,
  network actions, and skill execution are out of scope unless represented as
  proposals for human review.
- The prior roadmap makes `.dev/` operational state and `docs/` durable project
  documentation. This design keeps that split.

Open issues resolved here:

- Use `.dev/` for mutable operational runtime state, checkpoints, run history,
  pending approval records, and generated review packets.
- Use `docs/` for approved or explicitly exported design documents, roadmaps,
  ADRs, and durable project documentation.
- Store both typed JSON and readable Markdown for important generated outputs:
  JSON is the runtime source of truth; Markdown is the review surface.
- Treat approval as a state transition backed by a structured record, not as
  markdown text alone.

## 2. Purpose

Design-only mode is a local workflow runtime that repeatedly improves project
design artifacts without autonomously changing source code. It reads a goal,
loads previous state and design artifacts, selects relevant context, asks an LLM
for typed structured design output, validates that output, writes
human-reviewable Markdown, requests approval, checkpoints progress, and resumes
from the last safe state on the next run.

The runtime is intended to answer these questions every run:

- What goal is being pursued?
- What prior plan, architecture, risks, and decisions matter now?
- What design improvement or change proposal is being suggested?
- What risks or approvals does a human need to review?
- What checkpoint should the next run continue from?

## 3. Non-Goals

- No autonomous source code edits in the MVP.
- No shell command execution as part of generated plans in the MVP.
- No external skill execution or ClawHub activation in the MVP.
- No daemon scheduler, durable queue, or complex DAG engine in the MVP.
- No Telegram channel in the MVP.
- No opaque vector-store-only state.
- No untyped free-form LLM output entering trusted state.
- No infinite retry loop for malformed model output.
- No hidden approval. Every approval gate must leave a structured record.

## 4. Artifact Layout Decision

Adopt a split layout.

Operational state lives under `.dev/` because it is mutable, resumable runtime
state:

```text
.dev/
  goal.md
  state.json
  plan.md
  architecture.md
  risks.md
  design-decisions/
  approvals/
  checkpoints/
  reports/
  run-history/
  prompts/
```

Durable project documentation lives under `docs/` because it is intended to be
read, reviewed, versioned, and cited:

```text
docs/
  designs/
  roadmaps/
  adrs/
```

In the current operator environment, `.dev/...` references are resolved to the
operational state directory provided by the runtime, not necessarily to a
repository-root `.dev` directory. The Rust implementation should support an
explicit `--state-root` and default to repository `.dev/` when no managed
runtime path is supplied.

### 4.1 Promotion Rules

- Draft outputs are written to `.dev/reports/`, `.dev/checkpoints/`, and
  `.dev/run-history/`.
- Approved durable design documents may be exported to `docs/designs/`.
- Approved roadmaps may be exported to `docs/roadmaps/`.
- ADRs may start as `.dev/design-decisions/*.json` and be promoted to
  `docs/adrs/*.md` after approval.
- Failed or invalid outputs stay in run history and reports; they are not
  promoted.

## 5. Runtime State Machine

The design-only lifecycle is linear in the MVP, with explicit pause and resume.
Later phases may add queues and DAGs without changing the meaning of these
states.

| State | Meaning | Entry Input | Exit Output |
| --- | --- | --- | --- |
| `created` | Goal exists, no context has been selected yet | goal file or CLI goal | initialized `state.json` |
| `loaded_context` | Prior state and relevant artifacts are loaded | existing `.dev/` and `docs/` artifacts | context manifest |
| `planned` | Goal is decomposed into design tasks and steps | context manifest | plan model and `plan.md` |
| `prompt_ready` | Prompt packet and expected schema are assembled | plan model | prompt packet |
| `model_requested` | LLM request has been sent or mock output selected | prompt packet | raw provider response |
| `validating` | Runtime is deserializing and validating structured output | raw provider response | validated design output or validation errors |
| `retrying` | Invalid output is being retried within policy limit | validation errors | new provider response or failure |
| `drafted` | Design draft or change proposal has been generated | validated output | markdown and JSON artifacts |
| `waiting_approval` | Human review is required before promotion or next step | review packet | approval or rejection record |
| `approved` | Human accepted the proposal or selected a continuation path | approval record | promotable artifacts |
| `rejected` | Human rejected or requested revision | rejection record | replan input |
| `checkpointed` | State has been durably saved for resume | current run state | checkpoint record |
| `completed` | Run finished without pending approval | final report | run history entry |
| `blocked` | Run cannot continue without external input or missing context | blocker record | updated goal or human input |
| `failed` | Run exhausted retries or hit unrecoverable validation/storage error | failure record | failure report |
| `cancelled` | User requested stop | cancellation request | cancellation report |

### 5.1 Transition Table

| From | To | Trigger | Guard | Audit Event |
| --- | --- | --- | --- | --- |
| `created` | `loaded_context` | `run` or `resume` | state root readable | `context.loaded` |
| `loaded_context` | `planned` | goal decomposition | goal schema valid | `plan.created` |
| `planned` | `prompt_ready` | prompt assembly | schema version supported | `prompt.assembled` |
| `prompt_ready` | `model_requested` | provider call | provider configured or mock selected | `model.requested` |
| `model_requested` | `validating` | provider response received | response captured | `output.received` |
| `validating` | `drafted` | validation passes | typed deserialization and semantic checks pass | `output.validated` |
| `validating` | `retrying` | validation fails | retry count below max | `output.invalid` |
| `retrying` | `model_requested` | retry prompt sent | retry count incremented | `retry.started` |
| `validating` | `failed` | validation fails | retry count exhausted | `run.failed` |
| `drafted` | `waiting_approval` | approval required | policy says approve | `approval.requested` |
| `drafted` | `checkpointed` | no approval required | policy allows auto-checkpoint | `checkpoint.created` |
| `waiting_approval` | `approved` | user approves | approval record valid | `approval.granted` |
| `waiting_approval` | `rejected` | user rejects | rejection record valid | `approval.rejected` |
| `approved` | `checkpointed` | save approved result | atomic write succeeds | `checkpoint.created` |
| `rejected` | `planned` | replan requested | revision instruction present | `plan.revised` |
| `checkpointed` | `completed` | run has no remaining steps | final report written | `run.completed` |
| any non-terminal | `blocked` | missing required input | blocker recorded | `run.blocked` |
| any non-terminal | `cancelled` | user cancels | cancellation durable | `run.cancelled` |

Terminal states are `completed`, `failed`, and `cancelled`. `blocked`,
`waiting_approval`, and `checkpointed` are resumable states.

## 6. Runtime Components

| Component | Responsibility |
| --- | --- |
| `cli` | Parse commands, locate repo root and state root, print status, route actions |
| `goal` | Load goal from `goal.md` or CLI input, normalize lifecycle fields |
| `artifact_store` | Read/write JSON and Markdown artifacts with atomic writes |
| `context_selector` | Pick relevant state, plans, architecture notes, risks, ADRs, and docs |
| `prompt_builder` | Assemble prompt packet with schema contract and selected context |
| `provider` | Call mock or real LLM provider through a narrow request/response trait |
| `validator` | Deserialize typed output, validate schema version and semantic invariants |
| `planner` | Convert validated output into plan, steps, design proposal, and review packet |
| `approval` | Create approval request, record approval/rejection, gate promotion |
| `checkpoint` | Persist resumable state after important transitions |
| `reporter` | Render Markdown review and run summary documents |
| `audit` | Append security and workflow events without secrets |

### 6.1 Required Capability Traceability

The design-only runtime must explicitly implement the required capability set
from the source prompt. Each capability has a typed owner, durable artifact,
and state-machine role so it can be tested independently instead of remaining
an implied behavior.

| Required Capability | Design Commitment | Primary Artifacts Or States |
| --- | --- | --- |
| Goal Definition | `goal` accepts a goal from `.dev/goal.md`, an external goal file, or CLI text and normalizes it into a typed goal record with success criteria. | `.dev/goal.md`, `.dev/goal.json`, `created` |
| Goal Decomposition | `planner` breaks the goal into typed design tasks, dependencies, and next-step intent before prompt assembly. | `.dev/plan.json`, `.dev/plan.md`, `planned` |
| Goal Lifecycle | `goal` and `workflow` track goal status from proposed or active through waiting, blocked, completed, rejected, or archived. | `Goal.status`, `RuntimeState.state`, run history |
| Task Planning | `planner` produces task records with IDs, dependency links, status, and acceptance notes for the current run. | `plan.v1.tasks`, `.dev/plan.md` |
| Step-by-Step Planning | each task can be expanded into ordered steps with current, next, and completed markers so review and resume know exactly where work stopped. | `plan.v1.steps`, checkpoints, `completed_steps` |
| Replanning | rejected approvals, blocked runs, or explicit `plan replan` requests create a new plan revision linked to the previous plan and rejection reason. | `rejected`, `planned`, `plan_revision`, run history |
| Design Iteration | validated model output can produce a draft, revised draft, or change proposal without promoting it until approval is recorded. | design draft JSON/Markdown, review packet |
| Decision Recording | proposed architectural decisions are stored as typed records and may later be promoted to ADR Markdown after approval. | `.dev/design-decisions/*.json`, `docs/adrs/*.md` |
| Structured Output Validation | every LLM response is parsed into a versioned `serde` type, then checked for schema, semantic, and policy validity before rendering Markdown. | `design_output.v1`, `validating`, validation errors |
| Retry on Invalid Output | invalid model output retries only within a persisted finite retry budget and transitions to `failed` when exhausted. | `retry_count`, `max_retries`, `retrying`, `failed` |
| Versioned Schema | all trusted JSON artifacts include a `schema_version` and unsupported versions are rejected or migrated explicitly. | all `*.v1` schemas, validator |
| Review Document | `reporter` renders human-readable Markdown containing summary, proposed changes, risks, decisions, and approval request links. | `.dev/reports/<run_id>_review.md`, `waiting_approval` |
| Pause and Resume | `checkpoint` persists resumable states and `resume` continues from `waiting_approval`, `blocked`, `checkpointed`, or selected failed retry states. | `.dev/checkpoints/*.json`, `resume_from`, `resume` |

## 7. Input And Output Artifact Schemas

Schemas should be implemented as Rust `serde` structs with explicit
`schema_version` fields. JSON Schema generation can be added, but Rust structs
are the first source of truth for MVP implementation.

### 7.1 Goal

File: `.dev/goal.md` and `.dev/goal.json`

```json
{
  "schema_version": "goal.v1",
  "goal_id": "goal_20260425_231613",
  "title": "Design-only runtime",
  "class": "project",
  "status": "active",
  "source": {
    "kind": "cli",
    "path": null
  },
  "description": "Design a resumable design-only planning loop.",
  "success_criteria": [
    "Create a design proposal",
    "Create a review document",
    "Save a checkpoint"
  ],
  "created_at": "2026-04-25T23:16:13Z",
  "updated_at": "2026-04-25T23:16:13Z"
}
```

### 7.2 Runtime State

File: `.dev/state.json`

```json
{
  "schema_version": "runtime_state.v1",
  "run_id": "run_20260425_231613",
  "goal_id": "goal_20260425_231613",
  "state": "waiting_approval",
  "step": "approval_request",
  "retry_count": 0,
  "max_retries": 2,
  "last_checkpoint_id": "chk_20260425_231700",
  "pending_approval_id": "approval_20260425_231701",
  "artifact_links": [],
  "updated_at": "2026-04-25T23:17:01Z"
}
```

### 7.3 Context Manifest

File: `.dev/run-history/<run_id>_context.json`

```json
{
  "schema_version": "context_manifest.v1",
  "run_id": "run_20260425_231613",
  "included_artifacts": [
    {
      "kind": "design_doc",
      "path": "docs/designs/07_goal_management_and_reporting.md",
      "reason": "Goal lifecycle and reporting model"
    }
  ],
  "excluded_artifacts": [
    {
      "path": "docs/designs/08_multi_agent_and_a2a.md",
      "reason": "Future phase, not needed for MVP prompt"
    }
  ],
  "token_budget": {
    "max_input_tokens": 24000,
    "estimated_input_tokens": 12000
  }
}
```

### 7.4 Plan

Files: `.dev/plan.md`, `.dev/plan.json`

```json
{
  "schema_version": "plan.v1",
  "goal_id": "goal_20260425_231613",
  "plan_id": "plan_20260425_231620",
  "revision": 1,
  "previous_plan_id": null,
  "revision_reason": null,
  "status": "proposed",
  "tasks": [
    {
      "task_id": "task_1",
      "title": "Analyze existing designs",
      "status": "completed",
      "depends_on": [],
      "steps": [
        {
          "step_id": "step_1",
          "title": "Read current design synthesis",
          "status": "completed"
        }
      ]
    }
  ],
  "next_step": "request_structured_design_output"
}
```

### 7.5 LLM Structured Output

File: `.dev/run-history/<run_id>_model_output.json`

The provider must produce a top-level tagged structure:

```json
{
  "schema_version": "design_output.v1",
  "output_kind": "design_proposal",
  "goal_summary": "...",
  "decomposition": [],
  "proposed_changes": [],
  "decisions": [],
  "risks": [],
  "approval": {
    "required": true,
    "reason": "New design artifacts should be reviewed before promotion."
  },
  "next_run_hint": "Resume after approval and promote the design document."
}
```

Validation must reject:

- missing or unsupported `schema_version`
- unknown `output_kind`
- empty goal summary
- decisions without rationale
- risks without severity
- approval-required outputs without approval reason
- artifact paths outside allowed roots
- any instruction to run commands or edit source files in MVP mode

### 7.6 Design Draft Or Change Proposal

Files:

- `.dev/reports/<run_id>_design_draft.md`
- `.dev/reports/<run_id>_design_draft.json`
- optional promoted file under `docs/designs/`

```json
{
  "schema_version": "design_draft.v1",
  "draft_id": "draft_20260425_231650",
  "run_id": "run_20260425_231613",
  "title": "Design-Only Runtime Architecture",
  "kind": "new_design_doc",
  "summary": "...",
  "sections": [],
  "source_context": [],
  "promotion_target": "docs/designs/20260425_231613_design_only_runtime_architecture.md"
}
```

### 7.7 Decision Record

Files:

- `.dev/design-decisions/<decision_id>.json`
- optional `docs/adrs/<decision_id>.md`

```json
{
  "schema_version": "decision_record.v1",
  "decision_id": "adr_0001",
  "status": "proposed",
  "title": "Split operational and durable artifacts",
  "context": "Design-only runtime needs resumable state and durable docs.",
  "decision": ".dev stores operational state; docs stores approved documentation.",
  "consequences": [
    "Runtime can resume without polluting docs",
    "Approved outputs remain reviewable in repository history"
  ],
  "linked_run_id": "run_20260425_231613"
}
```

### 7.8 Risk Summary

Files: `.dev/risks.md`, `.dev/risks.json`

```json
{
  "schema_version": "risk_summary.v1",
  "run_id": "run_20260425_231613",
  "risks": [
    {
      "risk_id": "risk_1",
      "severity": "medium",
      "title": "Schema too rigid for iteration",
      "mitigation": "Allow optional notes while keeping core fields required."
    }
  ]
}
```

### 7.9 Review Document And Approval Request

Files:

- `.dev/reports/<run_id>_review.md`
- `.dev/approvals/<approval_id>.json`

```json
{
  "schema_version": "approval_request.v1",
  "approval_id": "approval_20260425_231701",
  "run_id": "run_20260425_231613",
  "state": "pending",
  "requested_action": "promote_design_draft",
  "summary": "Approve promotion of the design-only runtime architecture.",
  "artifact_links": [
    ".dev/reports/run_20260425_231613_review.md"
  ],
  "created_at": "2026-04-25T23:17:01Z",
  "decided_at": null,
  "decision": null
}
```

Approval decisions:

```json
{
  "schema_version": "approval_decision.v1",
  "approval_id": "approval_20260425_231701",
  "decision": "approved",
  "actor": "human",
  "comment": "Promote this design.",
  "decided_at": "2026-04-25T23:20:00Z"
}
```

### 7.10 Checkpoint And Run History

Files:

- `.dev/checkpoints/<checkpoint_id>.json`
- `.dev/run-history/<run_id>.jsonl`

```json
{
  "schema_version": "checkpoint.v1",
  "checkpoint_id": "chk_20260425_231700",
  "run_id": "run_20260425_231613",
  "state": "waiting_approval",
  "completed_steps": [
    "load_context",
    "plan",
    "prompt",
    "validate",
    "draft",
    "review"
  ],
  "resume_from": "waiting_approval",
  "artifact_links": [],
  "created_at": "2026-04-25T23:17:00Z"
}
```

Run history is append-only JSON Lines. Each line is an event with:

- `schema_version`
- `event_id`
- `run_id`
- `timestamp`
- `actor`
- `event_type`
- `state_before`
- `state_after`
- `artifact_links`
- `redacted_message`

## 8. Context Selection And Prompt Assembly

Context selection should be deterministic before any model call.

Selection order:

1. Current goal and runtime state.
2. Last checkpoint and pending approval, if any.
3. Current plan, architecture, risks, and decision records.
4. Existing design synthesis and roadmap documents.
5. Relevant CEPs by topic.
6. Prompt files that define the current task.
7. Recent run reports only when they affect resume or replanning.

The prompt packet should contain:

- goal summary
- selected context manifest
- current state
- allowed output schema name and version
- explicit MVP constraints
- forbidden actions for design-only mode
- retry instruction if this is a retry
- required response format with no extra wrapper text

The prompt packet itself should be saved under `.dev/prompts/` for auditability.

## 9. Validation And Retry Flow

The validator runs in layers:

1. Provider response captured as immutable raw text or bytes.
2. JSON extraction, if provider returned a tool/function envelope.
3. Typed deserialization into the exact schema version.
4. Schema-version compatibility check.
5. Semantic validation.
6. Policy validation for forbidden actions and unsafe paths.
7. Markdown rendering only after validation succeeds.

Retry policy:

- Default maximum: 2 retries after the first invalid output.
- Retry prompt includes compact validation errors and the same schema contract.
- The runtime must never retry a storage, approval, or cancellation failure as
  if it were a model formatting failure.
- If all retries fail, transition to `failed`, write validation errors into the
  run report, and checkpoint the failure.
- Retry count is persisted before the retry request so process interruption
  cannot reset the loop.

## 10. Approval Gate Behavior

Approval is required when a run wants to:

- promote a draft into `docs/designs/`, `docs/roadmaps/`, or `docs/adrs/`
- mark a goal or major plan as completed
- supersede or deprecate an existing decision
- propose future file modification, shell execution, skill execution, network
  use, or secrets access
- continue after a high-severity risk is identified

Approval is not required for:

- writing raw run history
- writing checkpoints
- rendering draft review documents under `.dev/reports/`
- updating retry counters or failure reports

CLI approval actions must update both the approval record and runtime state.
Markdown approval text is only a projection of the structured record.

## 11. CLI Command Design

MVP commands:

```text
dore init [--state-root <path>]
dore goal set --file <path>
dore goal set --text <text>
dore run [--goal-file <path>] [--state-root <path>] [--mock-provider]
dore status [--state-root <path>]
dore review [--state-root <path>] [--latest]
dore approve <approval-id> [--comment <text>]
dore reject <approval-id> [--comment <text>]
dore resume [--state-root <path>]
dore checkpoint list [--state-root <path>]
```

Later commands:

```text
dore plan show
dore plan replan --reason <text>
dore decisions list
dore decisions promote <decision-id>
dore export design <draft-id>
dore scheduler run
dore scheduler daemon
dore policy show
dore skill inspect <skill-id>
```

Command behavior:

- `run` creates a run if none exists or continues a resumable run when safe.
- `resume` requires a resumable state: `blocked`, `waiting_approval`,
  `checkpointed`, or `failed` with `--retry-failed`.
- `approve` moves `waiting_approval` to `approved` and then checkpointed.
- `reject` moves `waiting_approval` to `rejected`; the next `resume` replans.
- `review` opens or prints the latest Markdown review packet path.

## 12. MVP Implementation Tasks

1. Create Rust scaffold with `Cargo.toml`, `src/`, `tests/`, formatter, and a
   root automation entry point.
2. Implement CLI parsing for `init`, `goal set`, `run`, `status`, `review`,
   `approve`, `reject`, and `resume`.
3. Implement file-backed artifact store with atomic write and schema-version
   checking.
4. Implement goal, runtime state, plan, LLM output, approval, checkpoint, and
   run-history structs.
5. Implement state transition validator.
6. Implement context selector over `.dev/` and `docs/`.
7. Implement prompt packet builder and save prompt packets.
8. Implement mock provider that emits valid and invalid fixture outputs.
9. Implement structured output validator and bounded retry.
10. Implement Markdown renderers for design draft, review document, risk
    summary, approval request, and final report.
11. Implement approval gate commands and resume from approval.
12. Add unit and integration tests for schemas, transitions, retry limits,
    approval records, artifact writes, and CLI smoke flow.

## 13. Testing Strategy

Unit tests:

- schema deserialization and version rejection
- semantic validation rules
- state transition table
- retry counter persistence
- approval decision validation
- path allowlist and promotion target validation

Integration tests:

- initialize state root
- load goal from file and CLI text
- complete a mock design-only run
- retry invalid mock output and fail at the limit
- pause at approval and resume after approval
- reject approval and replan
- recover from last checkpoint after interrupted run

Smoke tests:

- `dore init`
- `dore goal set --text "..."`
- `dore run --mock-provider`
- `dore status`
- `dore review --latest`
- `dore approve <id>`
- `dore resume`

## 14. Roadmap Connection

This design maps to the broader roadmap as follows:

- Phase 0: this document, schemas, state machine, approval semantics, CLI UX.
- Phase 1: Rust CLI implementation of the design-only loop.
- Phase 2: tool and skill metadata models remain non-executing inputs to
  planning.
- Phase 3: queue, scheduler, locks, heartbeat, cancellation, and daemon extend
  the same state model.
- Phase 4: policy engine, sandbox, audit, and guardrails enforce actions beyond
  design-only generation.
- Phase 5: benchmarks, observability, packaging, and release readiness.

## 15. Acceptance Criteria

The design-only runtime is acceptable when:

- goals can be loaded from file or CLI text
- previous state and design artifacts are included through a context manifest
- every model output has a typed deserialization target
- invalid model output retries are bounded and persisted
- design drafts and review packets are human-readable Markdown
- approval requests are structured records
- checkpoints allow a later run to resume without losing context
- durable documentation can be promoted into `docs/` only after approval
- MVP behavior does not execute shell commands, modify source code, or run
  external skills
