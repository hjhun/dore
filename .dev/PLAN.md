# Plan

## Source Inputs

- Prompt: `.dev/PROMPT.md`
- Requirements: `.dev/REQUIREMENT.md`
- Requirements brief:
  `docs/goals/20260507_144826_personal_agent_repository_llm_wiki_requirements.md`
- Existing architecture references:
  - `docs/refs/llm_wiki.md`
  - `docs/designs/01_system_architecture.md`
  - `docs/designs/02_memory_and_llm_wiki.md`

## Entry Requirement

Execution must enter through `refine -> plan`.

- The refiner records the user's rough goal and requirements in `.dev/PROMPT.md`
  and `.dev/REQUIREMENT.md` or `.dev/REQUIRMENT.md`.
- The planner reads those artifacts and writes `.dev/PLAN.md`.
- The planner, not downstream agents, decides which later stages are required
  after planning. That downstream stage decision is recorded in
  `.dev/WORKFLOWS.md` and mirrored in `.dev/DASHBOARD.md`.
- No architect, developer, tester, reviewer, or committer stage should start
  without the planner status marked complete.

## Assumptions

- This pass is a design/documentation execution, not production code
  implementation.
- The existing requirements brief is accepted as the current refined
  requirements input.
- The target deliverable is one or more timestamped Markdown design documents
  under `docs/goals/`.
- Raw private user data must not be committed. Only design documents and
  planning artifacts are safe to commit.
- The first milestone should be local-first. Cloud sync, Android ingestion,
  audio transcription, and proactive suggestions should be designed with clear
  extension points before implementation.

## Scope

In scope:

- Design the repository structure for raw sources, wiki pages, digests, graph
  artifacts, policies, sync state, scheduled jobs, reports, connectors, and
  scripts.
- Define the LLM Wiki memory model, page contracts, provenance rules, and
  generation cadence.
- Define Graphify installation and invocation as a derived analysis layer.
- Define local-only and cloud-sync operating modes.
- Define Android data ingestion categories and consent gates.
- Define audio upload, transcription, redaction, and wiki integration flow.
- Define proactive work-preparation flow and evidence requirements.
- Document privacy, security, audit, retention, and escalation rules.
- Commit and push the resulting design documentation.

Out of scope:

- Building an Android app.
- Implementing cloud provider adapters.
- Implementing audio transcription.
- Writing production ingestion, scheduling, or sync code.
- Committing raw personal data, secrets, transcripts, recordings, or usage
  history.
- Allowing hidden collection or autonomous external actions.

## Phase Breakdown

### Phase 1: Research Current Design Context

Actions:

- Read the requirements brief and existing LLM Wiki and architecture documents.
- Identify existing decisions that the new design must preserve.
- List contradictions, gaps, and unresolved choices.

Completion signal:

- The design author can cite the current memory model, graph role, scheduler
  role, and local-first constraints from existing docs.

### Phase 2: Design Target Repository Structure

Actions:

- Propose the personal repository layout for `memory/`, `connectors/`,
  `scripts/`, `docs/goals/`, policy files, sync metadata, job reports, and
  derived artifacts.
- Distinguish immutable raw evidence from generated wiki pages and rebuildable
  artifacts.
- Define which paths are safe for Git and which require local-only storage,
  encryption, or ignore rules.

Completion signal:

- A timestamped Markdown design file under `docs/goals/` contains a concrete
  tree layout and explains ownership, mutability, and sync safety for each
  major directory.

### Phase 3: Design Memory, Graph, And Generation Flows

Actions:

- Define the ingest flow from conversation, usage, notes, Android summaries, and
  audio transcripts into raw sources.
- Define the Markdown wiki page contract, provenance sections, update rules,
  `index.md`, and `log.md`.
- Define digest rebuild flow and token-budget-aware retrieval order.
- Define Graphify installation/invocation, input paths, output paths, graph
  refresh cadence, and graph audit usage.

Completion signal:

- The design file explains how a new source becomes raw evidence, wiki updates,
  digest changes, Graphify outputs, and append-only job logs without corrupting
  prior memory.

### Phase 4: Design Sync, Policy, Android, Audio, And Proactive Behavior

Actions:

- Define local-only and cloud-sync modes, provider adapter boundaries, conflict
  handling, and sync audit reports.
- Define data-category policy files for consent, retention, redaction, sync, and
  approval.
- Define Android ingestion options and milestone ordering.
- Define audio upload, transcription metadata, redaction, and transcript-to-wiki
  flow.
- Define proactive work-preparation reports with evidence, confidence, user
  feedback, and dismissal handling.

Completion signal:

- The design file includes policy gates and operational reports for every
  collection, sync, transcription, graph, generation, and proactive suggestion
  path.

### Phase 5: Roadmap And Milestone Definition

Actions:

- Define a practical milestone sequence:
  local LLM Wiki scaffold first, Graphify second, sync third, Android/audio
  connectors later unless the user reprioritizes.
- Identify concrete decisions needed before implementation.
- Separate document-only work from later production code.

Completion signal:

- The design document includes a sequenced milestone roadmap with validation
  checks and user decision points.

### Phase 6: Review, Commit, And Push

Actions:

- Review the new documentation for requirement coverage, privacy gaps,
  overreach, and contradictions with existing architecture docs.
- Run `git diff` and verify only intended documentation/planning files changed.
- Commit with a focused message.
- Push to the tracked remote branch.

Completion signal:

- `git status --short --branch` is clean after push, and the new commit exists
  on the tracked branch.

## Workflow

| Stage | Owner/Skill | Required | Actions | Verification |
| --- | --- | --- | --- | --- |
| Refiner | `refiner` | Complete | Record user goal and requirements. Existing requirements brief is accepted as current refined input. | `.dev/PROMPT.md`, `.dev/REQUIREMENT.md`, and the requirements brief exist. |
| Planner | `planner` | Complete | Produce this authoritative plan and downstream stage routing. | `.dev/PLAN.md`, `.dev/WORKFLOWS.md`, `.dev/DASHBOARD.md`, and `.dev/progress/planner.md` exist and match. |
| Architect | `architect` | Required | Write the timestamped `docs/goals/` design document for personal repository, LLM Wiki, Graphify, sync, Android, audio, policy, and proactive flows. | Document inspection against requirements and existing architecture docs. |
| Developer | `developer` | Not required | No production code is planned in this pass. | No `src/`, connector, or runtime implementation changes are needed. |
| Tester | `tester` | Not required | No executable behavior is changed. Validation is documentation inspection and repository state checks. | Reviewer confirms acceptance criteria are covered. |
| Reviewer | `reviewer` | Required | Review the documentation for consistency, missing risks, privacy flaws, and acceptance coverage. | Review notes or final review result identify no blocking issues. |
| Committer | `git-commit` or `committer` | Required | Commit and push the documentation/planning changes because the user explicitly requested commit and push. | Clean worktree after push; commit hash recorded. |

## Dashboard Decisions

- Architect: required, because the requested output is a design for a personal
  agent repository and its memory/sync/collection architecture.
- Developer: not_required, because this execution pass should produce design
  documents only.
- Tester: not_required, because no production behavior changes are planned.
- Reviewer: required, because the design touches privacy, personal data,
  sync, audio, Android, and proactive automation risks.
- Committer: required, because the user explicitly requested related content be
  committed and pushed.

## Acceptance Criteria

- A timestamped Markdown file is created under `docs/goals/` using
  `<date>_<time>_<title>.md`.
- The document describes what was considered, not only the final answer.
- The design includes a concrete repository structure for personal raw data,
  wiki pages, digests, graph artifacts, sync state, policies, jobs, connectors,
  scripts, and reports.
- The design preserves raw evidence as append-only and separates it from
  generated wiki pages and derived graph/digest artifacts.
- The design includes Graphify installation or invocation, inputs, outputs,
  rebuild rules, and retrieval role.
- The design includes local-only and cloud-sync modes with provider boundaries,
  conflict handling, encryption expectations, and sync auditability.
- The design includes Android ingestion categories, consent controls, and a
  recommended milestone path.
- The design includes audio upload, transcription, metadata, redaction, and
  transcript-to-wiki flow.
- The design includes proactive work-preparation behavior with evidence,
  confidence, user feedback, and approval boundaries.
- The design includes privacy, retention, redaction, sync, approval, audit, and
  escalation rules.
- The final execution commit is pushed to the tracked remote branch.

## Validation Strategy

- Run `git status --short --branch` before and after execution.
- Inspect `docs/goals/` for the new timestamped Markdown deliverable.
- Use `rg` to verify that key requirements are represented:
  `Graphify`, `Android`, `audio`, `transcription`, `local_only`,
  `cloud_sync`, `policy`, `retention`, `redaction`, `provenance`,
  `proactive`, `index.md`, and `log.md`.
- Review the design against existing docs:
  `docs/refs/llm_wiki.md`,
  `docs/designs/01_system_architecture.md`, and
  `docs/designs/02_memory_and_llm_wiki.md`.
- Confirm no raw personal data, recordings, transcripts, secrets, or generated
  private memory artifacts were added.
- Confirm `git diff --check` passes before committing.
- Confirm push success and a clean tracked branch after commit.

## Risks, Blockers, And Escalation Points

- Privacy risk: Personal data collection can become invasive. Escalate if any
  flow lacks explicit consent, retention, redaction, sync, and audit policy.
- Cloud risk: Syncing sensitive data before encryption and key management are
  designed can leak private information. Escalate before recommending a default
  cloud provider for raw data.
- Android risk: Background collection may be constrained by OS permissions,
  battery policy, and app store rules. Escalate if a first milestone depends on
  unreliable background collection.
- Audio risk: Recordings may contain third-party or confidential speech.
  Escalate if transcription or retention policy is unclear.
- Graph risk: Graphify outputs are derived and may be misleading if treated as
  canonical. Escalate if any design makes graph artifacts the source of truth.
- Proactive automation risk: Suggestions can feel intrusive or unsupported.
  Escalate if evidence, confidence, dismissal, and approval flows are missing.
- Repository risk: Raw data and secrets must not be committed. Escalate if Git
  is proposed as the storage path for plaintext sensitive artifacts.
- Ambiguity blocker: Provider choice for cloud sync, transcription, and Android
  collection remains open. The design should list options and recommend a
  low-risk sequence, not hard-code unapproved providers.
