# Design

## Context

- Source prompt: `.dev/PROMPT.md`
- Requirements: `.dev/REQUIREMENT.md`
- Plan: `.dev/PLAN.md`
- Dashboard: `.dev/DASHBOARD.md`
- Full timestamped design:
  `docs/goals/20260507_145343_personal_agent_repository_ooad_design.md`

## Goals And Non-Goals

Goals:

- Design Dore as a local-first personal agent repository with an LLM Wiki.
- Keep raw evidence append-only and separate from generated Markdown wiki pages.
- Integrate Graphify as a rebuildable analysis layer.
- Support local_only and cloud_sync modes with explicit policy controls.
- Define Android ingestion, audio transcription, proactive preparation, state,
  error handling, and test strategy.

Non-goals:

- Production code implementation in this stage.
- Provider selection for cloud, Android, or transcription.
- Committing private raw data, recordings, transcripts, secrets, or generated
  personal memory.
- Hidden collection or autonomous external actions.

## Functional Requirements

- Capture approved conversations, usage, notes, Android summaries, audio
  transcripts, and imports as raw evidence.
- Periodically generate Markdown wiki pages, `index.md`, `log.md`, and digests.
- Invoke Graphify over wiki pages and store graph JSON, HTML, clusters, and
  audit reports as derived artifacts.
- Sync allowed artifacts locally or to cloud providers through a provider
  adapter.
- Transcribe uploaded audio with provenance, quality metadata, redaction, and
  wiki mapping.
- Prepare proactive work and daily-life briefs with evidence, confidence, and
  approval boundaries.

## Non-Functional Requirements

- Local-first operation must work without cloud, Android, Graphify, or
  transcription providers configured.
- Raw evidence must be append-only.
- Secrets must never enter memory, wiki, digest, transcript, log, or report
  artifacts.
- Policy decisions must be auditable.
- Derived artifacts must be rebuildable.
- Failure modes must be typed and observable.

## Quality Attributes

| Attribute | Requirement | Design Tactic | Verification |
| --- | --- | --- | --- |
| Privacy | Personal data collection must be consented. | `PolicyEngine`, category policy, local_only default, redaction. | Unit policy tests and system tests checking forbidden artifacts. |
| Reliability | Failed jobs must not corrupt memory. | Append-only raw store, atomic wiki writes, job reports. | Integration tests for failed wiki generation and transcription. |
| Maintainability | Modules need narrow ownership. | Ports for ingestion, sync, graph, Android, transcription, suggestions. | Unit tests against interfaces and review of dependency direction. |
| Auditability | User can inspect collection, generation, sync, and suggestions. | Job reports, policy decision IDs, provenance, `log.md`. | System tests inspect reports and wiki provenance. |
| Portability | Dore must run locally first. | Provider-neutral adapters and optional external integrations. | Smoke test with only filesystem storage. |
| Token efficiency | Runtime should not replay all raw history. | Digest-first retrieval, wiki expansion, raw and graph escalation. | Retrieval tests enforce token budget order. |

## Architecture

### Components

- `core`: IDs, typed errors, clocks, result envelopes, shared enums.
- `policy`: consent, retention, redaction, sync, and approval decisions.
- `storage`: append-only raw evidence, wiki pages, digests, jobs, sync state,
  and secret references.
- `ingest`: source classification, normalization, provenance, raw storage.
- `memory`: wiki generation, claim merge, page validation, `index.md`,
  `log.md`, digest compilation, lint.
- `graph`: Graphify installation/invocation, graph artifacts, audit, retrieval
  expansion.
- `sync`: local_only/cloud_sync planning, provider adapters, manifests,
  conflicts.
- `android`: category-based Android collector adapters and import validation.
- `audio`: upload/reference handling, transcription, transcript redaction,
  transcript-to-wiki mapping.
- `proactive`: context detection, preparation briefs, suggestions, feedback,
  approval gate.
- `scheduler`: schedules, jobs, retries, and append-only reports.
- `retrieval`: digest-first context assembly with page, raw, and graph
  escalation.

### Data Flow

1. Source arrives through manual input, conversation promotion, Android import,
   audio upload, or provider export.
2. `PolicyEngine` checks consent, retention, sync, redaction, and approval.
3. `IngestionService` normalizes and appends raw evidence.
4. `WikiGenerationService` plans and applies Markdown page updates.
5. `IndexMaintainer` updates `index.md`; `WikiLogAppender` appends `log.md`.
6. `DigestCompiler` rebuilds affected digests.
7. `GraphifyRunner` optionally rebuilds graph artifacts after corpus gating.
8. `SyncService` syncs only allowed artifacts and records manifests/conflicts.
9. `SuggestionService` creates proactive briefs from approved digests/wiki.

### Interfaces

- `IngestionPort::ingest(IngestRequest) -> IngestResult`
- `WikiGenerationPort::plan_updates(WikiUpdateRequest) -> WikiUpdatePlan`
- `WikiGenerationPort::apply_updates(WikiUpdatePlan) -> WikiUpdateResult`
- `GraphPort::build_graph(GraphBuildRequest) -> GraphBuildResult`
- `CloudSyncAdapter::plan(SyncManifest) -> ProviderSyncPlan`
- `CloudSyncAdapter::apply(ProviderSyncPlan) -> ProviderSyncResult`
- `AndroidCollectorAdapter::collect(AndroidCollectRequest) -> AndroidPayload[]`
- `TranscriptionAdapter::transcribe(TranscriptionRequest) -> TranscriptResult`
- `SuggestionPort::prepare(PreparationRequest) -> PreparationBrief`

### Data Model

- Raw evidence metadata records source kind, data category, sensitivity,
  timestamps, payload path/checksum, provenance, consent snapshot, retention,
  sync mode, and redaction profile.
- Wiki pages use frontmatter with schema version, ID, type, status, confidence,
  update timestamp, source count, sync mode, and tags.
- Claims include stable claim ID, text, status, confidence, source IDs, review
  timestamp, supersession links, and contested-by links.
- Digests include schema version, generation time, source wiki revision,
  compact sections, page refs, claim refs, and optional expiration.
- Job reports include job ID, kind, status, inputs, outputs, policy decisions,
  failure class, and audit events.
- Sync manifests include sync mode, provider, checksums, data category, sync
  decision, and reason.
- Proactive briefs include trigger, status, confidence, summary, evidence, and
  suggestions.

## OOAD Model

### Domain Objects

- `RawEvidence`: immutable source evidence with provenance and policy snapshot.
- `WikiPage`: generated Markdown page that implements the page contract.
- `Claim`: provenance-backed fact or inference with status and confidence.
- `Digest`: compact derived context for retrieval.
- `GraphArtifact`: rebuildable Graphify output.
- `PolicyDecision`: auditable allow, deny, requires_approval, or blocked result.
- `Job`: durable scheduled or manual work item.
- `SyncManifest`: planned and executed sync state.
- `AndroidPayload`: category-tagged device-originated input.
- `Transcript`: audio-derived text with provider and quality metadata.
- `PreparationBrief`: proactive suggestion bundle with evidence and feedback.

### Relationships And Invariants

- `RawEvidence` may support many `Claim` records.
- `WikiPage` contains or references many `Claim` records.
- `Digest` is derived from `WikiPage`, not directly from raw evidence unless a
  repair job explicitly records why.
- `GraphArtifact` is derived from `WikiPage` and may create lint findings, not
  canonical memory.
- `Job` owns reports for ingest, transcription, wiki generation, graphify,
  sync, and proactive work.
- Raw evidence is append-only; generated artifacts are atomic and rebuildable.
- Every sensitive operation has a `PolicyDecision`.
- Every durable claim has provenance.

### Key Scenarios

- Conversation to memory: policy check, append raw evidence, merge claims,
  update wiki, update `index.md`, append `log.md`, rebuild digest.
- Android daily summary: collect enabled categories, validate consent snapshot,
  ingest raw summary, update daily and routine pages.
- Audio to wiki: upload/reference audio, transcribe, redact, ingest transcript,
  map transcript to wiki updates.
- Graphify refresh: check availability and corpus gate, read wiki, write graph
  JSON/HTML/clusters/audit, record job.
- Proactive preparation: detect context, build brief, attach evidence and
  confidence, require approval for external action, record feedback.

## Alternatives Considered

- Git as primary raw data storage: rejected for plaintext sensitive artifacts;
  accepted only for safe docs, policies, and private reviewed wiki artifacts.
- Cloud-first sync: rejected for milestone one due to encryption and provider
  risk; adapter boundary retained.
- Graphify as canonical memory: rejected because graph output is derived and
  may be misleading.
- Fully autonomous proactive action: rejected; start with reports and explicit
  approval gates.
- Companion Android app first: deferred because manual export or Termux bridge
  lowers initial cost and risk.

## Implementation Guidance

- Build milestone one around local-only filesystem storage, policy defaults,
  manual ingest, page validation, `index.md`, `log.md`, and digest rebuild.
- Add Graphify only after wiki pages exist and corpus gating can be tested.
- Add sync as dry-run first, then one provider adapter with encryption policy.
- Add Android and audio through adapters after category policy and retention
  behavior are proven.
- Keep proactive behavior as Markdown preparation reports before notifications
  or external actions.

## Testing And Verification

- Unit tests: policy evaluation, append-only enforcement, classification, page
  contract validation, claim merge, digest rebuild, Graphify corpus gate, sync
  planning, Android payload validation, transcript redaction, suggestion state.
- Integration tests: ingest to raw to wiki, wiki to index/log/digest, scheduler
  to job report, Graphify to artifacts, sync dry-run to manifest, Android import
  to daily wiki, audio upload to transcript to wiki, proactive brief feedback.
- System tests: learn and retrieve a fact, import Android daily summary,
  transcribe and redact sample audio, rebuild Graphify outputs, run cloud_sync
  dry-run, generate proactive work brief with evidence and approval boundaries.

## Risks And Open Questions

- Select cloud sync provider and encryption model before implementing cloud_sync.
- Decide whether raw evidence is excluded from Git entirely or stored only as
  encrypted bundles.
- Choose Android path: manual export, Termux bridge, companion app, or provider
  export.
- Choose transcription provider and local/off-device privacy posture.
- Define review threshold before automatic wiki updates become accepted memory.
- Choose proactive delivery surface: Markdown report, chat, notification,
  dashboard, or digest.
