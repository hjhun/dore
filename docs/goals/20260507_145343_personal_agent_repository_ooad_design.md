# Personal Agent Repository OOAD Design

Generated: 2026-05-07 14:53:43 Asia/Seoul
Status: Technical OOAD design for review and later implementation

## 1. Purpose

Dore should become a local-first personal agent repository that maintains an
LLM Wiki for the user. The repository stores approved evidence from
conversations, usage history, notes, Android-originated summaries, uploaded
recordings, transcripts, and work context. Scheduled jobs periodically compile
that evidence into Markdown wiki pages, machine digests, Graphify artifacts,
and proactive preparation reports.

The design preserves the existing Dore decisions:

- Raw sources are immutable evidence.
- The Markdown LLM Wiki is the durable, human-readable memory layer.
- Digests, Graphify outputs, job reports, and sync metadata are derived or
  operational artifacts.
- Graphify helps navigation, clustering, audit, and retrieval expansion, but it
  is never the source of truth.
- Collection, sync, transcription, graph refresh, and proactive suggestions are
  gated by consent, retention, redaction, sync, approval, and audit policy.

## 2. What Was Considered

### Repository as Git-Tracked Memory

Git is excellent for versioning Markdown wiki pages, policies, design docs, and
safe operational manifests. It is risky for plaintext raw personal data,
recordings, transcripts, secrets, and generated private memory. The design
therefore separates "repository structure" from "Git safe by default". Some
paths are intended for private local storage, encrypted bundles, or cloud sync
outside ordinary Git commits.

### Local-First Versus Cloud-First

Local-first is the first milestone because it is inspectable, easier to test,
and avoids premature cloud data exposure. Cloud sync is modeled behind an
adapter so later providers can be added without changing memory, ingestion, or
wiki generation logic.

### Android Data Collection Options

Four Android paths were considered:

- manual export or upload: lowest risk, least automated
- Termux bridge: fast prototype path, limited UX
- companion app: best long-term control, largest implementation cost
- provider exports: useful for calendar, drive, or recorder data, but vendor
  dependent

The design supports all four through the same collector contract, but the first
implementation should start with manual export or a narrow Termux bridge.

### Audio Handling

Audio can contain third-party and confidential speech. The design stores audio
references and transcripts as raw evidence only when policy allows it. Wiki
updates use redacted transcript views, not necessarily the full transcript.

### Proactive Behavior

Proactive preparation should start as Markdown reports and explicit
suggestions, not autonomous external actions. Each suggestion must include
evidence, confidence, dismissal state, and an approval boundary.

## 3. Goals And Non-Goals

### Goals

- Provide a concrete OOAD model for a personal agent repository.
- Define modules, classes, responsibilities, interfaces, and data schemas.
- Define state management for raw evidence, wiki pages, digests, graph outputs,
  sync, jobs, Android ingestion, audio transcription, and proactive reports.
- Define error handling and recovery rules.
- Define unit, integration, and system test strategy.
- Give implementation milestones that keep privacy and auditability ahead of
  automation.

### Non-Goals

- Implement production code in this pass.
- Select a specific cloud sync provider.
- Select a specific Android implementation path.
- Select a specific transcription provider.
- Store or commit private raw data, recordings, transcripts, secrets, or
  generated personal memory.
- Allow hidden collection or autonomous external action without user approval.

## 4. Target Repository Structure

```text
memory/
  raw/
    conversations/
    usage/
    android/
      daily_summaries/
      app_usage/
      location_summaries/
      notification_summaries/
      files/
      recordings/
    audio/
      originals/
      transcripts/
    notes/
    imports/
  wiki/
    daily/
    people/
    projects/
    goals/
    routines/
    preferences/
    decisions/
    work/
    health/
    questions/
    reports/
    index.md
    log.md
  digest/
    user_profile.json
    active_context.json
    active_projects.json
    active_goals.json
    routines.json
    open_questions.json
    recent_changes.json
  graph/
    graph.json
    graph.html
    clusters.json
    audit_report.md
  jobs/
    ingest/
    transcribe/
    wiki_generate/
    graphify/
    sync/
    reports/
  sync/
    manifest.json
    conflicts/
    provider_state/
  policy/
    data_categories.yaml
    retention.yaml
    redaction.yaml
    sync.yaml
    approval.yaml

connectors/
  android/
  cloud/
  transcription/
  calendar/
  repository/

scripts/
  ingest/
  sync/
  wiki/
  graphify/
  transcribe/

docs/
  goals/
  designs/
  roadmaps/
```

### Path Ownership And Mutability

| Path | Owner | Mutability | Sync Safety | Notes |
| --- | --- | --- | --- | --- |
| `memory/raw/**` | Ingestion | Append-only | `local_only` by default | Evidence; never rewritten by generators. |
| `memory/wiki/**` | Wiki generator | Mutable with provenance | User-controlled | Markdown LLM Wiki; safe for private Git only after review. |
| `memory/digest/**` | Digest compiler | Rebuildable | User-controlled | Derived JSON context. |
| `memory/graph/**` | Graphify runner | Rebuildable | User-controlled | Derived Graphify JSON, HTML, clusters, audit. |
| `memory/jobs/**` | Job runner | Append-only reports | User-controlled | Operational audit and failure records. |
| `memory/sync/**` | Sync service | Operational | Provider-specific | No secrets; records manifests and conflicts. |
| `memory/policy/**` | User and policy engine | Mutable by approval | Safe if no secrets | Controls consent, retention, redaction, sync, approval. |
| `connectors/**` | Runtime adapters | Code/config | Safe if no secrets | Provider implementations and docs. |
| `scripts/**` | Runtime tooling | Code | Safe | CLI helpers for jobs. |
| `docs/goals/**` | Design process | Append-only docs | Safe | Design thinking and goal evolution. |

## 5. Module Design

The module design extends the existing Dore architecture without changing its
core boundaries.

### `core`

Responsibilities:

- Shared IDs, timestamps, result envelopes, typed errors, and enums.
- Data category, sensitivity, provenance, approval, and job state primitives.
- Serialization version markers.

Key classes:

- `DoreId`: stable typed identifier base.
- `Clock`: injectable time source for jobs and tests.
- `ResultEnvelope<T>`: value plus warnings, audit reference, and source refs.
- `DoreError`: typed domain error root.

### `policy`

Responsibilities:

- Evaluate consent, retention, redaction, sync, and approval rules.
- Decide whether collection, transformation, sync, or suggestion is allowed.
- Produce auditable policy decisions before side effects.

Key classes:

- `PolicyEngine`: evaluates `PolicyRequest` against loaded policy files.
- `ConsentRegistry`: answers whether a data category is enabled.
- `RetentionPolicy`: computes expiration, deletion, and archive decisions.
- `RedactionPolicy`: selects redaction strategy and redacted fields.
- `SyncPolicy`: decides `local_only`, `cloud_sync`, or `forbidden`.
- `ApprovalPolicy`: maps an action to `allow`, `requires_approval`, or `deny`.

### `storage`

Responsibilities:

- Provide file and metadata repositories.
- Enforce append-only raw writes.
- Maintain atomic writes for generated artifacts.
- Keep secrets outside memory artifacts.

Key classes:

- `FileArtifactStore`: read/write interface over repository paths.
- `RawEvidenceRepository`: append-only raw source storage.
- `WikiPageRepository`: Markdown page loading, atomic update, and diff support.
- `DigestRepository`: JSON digest storage.
- `JobLogRepository`: append-only job reports.
- `SyncStateRepository`: manifests, provider state, and conflict records.
- `SecretResolver`: resolves `SecretRef` without exposing secret material.

### `ingest`

Responsibilities:

- Accept approved source inputs.
- Normalize sources into raw evidence records.
- Classify evidence for later wiki generation.
- Record provenance and policy decisions.

Key classes:

- `IngestionService`: orchestrates policy gate, normalization, and raw write.
- `SourceClassifier`: maps source to category, sensitivity, and target pages.
- `EvidenceNormalizer`: creates canonical metadata and payload shape.
- `ProvenanceBuilder`: assigns source IDs, checksums, and source links.

### `memory`

Responsibilities:

- Maintain the Markdown LLM Wiki.
- Merge claims with provenance.
- Build digests and detect drift.
- Keep `index.md` and `log.md` current.

Key classes:

- `WikiGenerationService`: converts evidence into page update plans.
- `ClaimMerger`: adds, revises, contests, or supersedes claims.
- `PageContractValidator`: validates frontmatter and required sections.
- `IndexMaintainer`: updates `index.md`.
- `WikiLogAppender`: appends `log.md` entries.
- `DigestCompiler`: rebuilds JSON digests from wiki pages.
- `MemoryLintService`: detects contradictions, stale claims, orphan pages,
  missing backlinks, and claims without provenance.

### `graph`

Responsibilities:

- Install or invoke Graphify.
- Build graph artifacts from wiki pages.
- Store derived graph JSON, HTML, clusters, and audit report.
- Support graph expansion as retrieval escalation only.

Key classes:

- `GraphifyInstaller`: verifies Graphify availability and version.
- `GraphifyRunner`: executes graph generation jobs.
- `GraphArtifactRepository`: stores rebuildable graph outputs.
- `GraphAuditReader`: reads graph audit findings for lint and review.
- `GraphExpansionService`: returns neighbors for retrieval escalation.

### `sync`

Responsibilities:

- Support local-only and cloud-sync modes.
- Isolate provider details behind adapters.
- Generate sync manifests and conflict records.
- Preserve append-only raw evidence under conflict.

Key classes:

- `SyncService`: orchestrates sync policy, manifests, provider calls, conflicts.
- `SyncPlanner`: computes upload, download, skip, and conflict actions.
- `SyncManifestBuilder`: records checksums, timestamps, and category policy.
- `ConflictResolver`: preserves raw sources and regenerates derived artifacts.
- `CloudSyncAdapter`: provider-neutral interface.

### `android`

Responsibilities:

- Import Android-originated information through approved categories.
- Normalize daily summaries, app usage, location summaries, notification
  metadata, file metadata, photo metadata, and recordings.
- Avoid background collection without explicit consent.

Key classes:

- `AndroidIngestionService`: orchestrates Android import jobs.
- `AndroidCollectorAdapter`: abstraction for manual export, Termux, companion
  app, or provider export.
- `AndroidPayloadValidator`: validates schema and policy tags.
- `DailySummaryImporter`: converts device summaries to raw evidence.

### `audio`

Responsibilities:

- Accept uploaded recordings or stable recording references.
- Run transcription through provider adapters.
- Apply redaction before wiki generation.
- Preserve transcript provenance.

Key classes:

- `AudioUploadService`: stores or references audio evidence.
- `TranscriptionService`: creates transcript jobs and transcript records.
- `TranscriptionAdapter`: provider-neutral audio-to-text contract.
- `TranscriptRedactor`: produces policy-approved transcript views.
- `TranscriptToWikiMapper`: maps transcript claims into wiki update targets.

### `proactive`

Responsibilities:

- Identify active work and life contexts from approved evidence.
- Produce preparation briefs and suggestions.
- Require evidence, confidence, feedback, and approval boundaries.

Key classes:

- `ContextDetector`: detects active projects, work blocks, meetings, goals,
  routines, and open loops.
- `PreparationPlanner`: selects briefs, references, and answers to prepare.
- `SuggestionService`: creates suggestions with evidence and confidence.
- `FeedbackRecorder`: stores accept, dismiss, refine, and snooze feedback.
- `ApprovalGate`: blocks external actions until policy and user approval pass.

### `scheduler`

Responsibilities:

- Trigger periodic ingest, transcription, wiki generation, digest rebuild,
  Graphify refresh, sync, lint, and proactive reports.
- Create durable jobs and apply retries/backoff.

Key classes:

- `ScheduleRegistry`: schedule definitions.
- `JobFactory`: creates typed job records.
- `JobRunner`: dispatches jobs to services.
- `RetryPolicy`: computes backoff and failure handling.
- `JobReporter`: writes append-only reports under `memory/jobs/**`.

### `retrieval`

Responsibilities:

- Assemble memory context under token budget.
- Prefer digest-first retrieval.
- Escalate to wiki pages, raw snippets, then Graphify neighbors only when
  needed.

Key classes:

- `ContextAssembler`: orchestrates retrieval for agent sessions.
- `TokenBudgetPolicy`: enforces budget slices.
- `DigestRetriever`: loads compact JSON context.
- `WikiRetriever`: loads targeted Markdown pages.
- `RawEvidenceRetriever`: loads narrow raw snippets with policy approval.
- `GraphNeighborRetriever`: optional graph expansion.

## 6. Class Collaboration Summary

```text
Scheduler
  -> JobRunner
    -> PolicyEngine
    -> IngestionService / TranscriptionService / WikiGenerationService
    -> DigestCompiler / GraphifyRunner / SyncService / SuggestionService
    -> JobReporter

IngestionService
  -> PolicyEngine
  -> SourceClassifier
  -> EvidenceNormalizer
  -> RawEvidenceRepository
  -> JobLogRepository

WikiGenerationService
  -> RawEvidenceRepository
  -> WikiPageRepository
  -> ClaimMerger
  -> PageContractValidator
  -> IndexMaintainer
  -> WikiLogAppender
  -> DigestCompiler

ContextAssembler
  -> DigestRetriever
  -> WikiRetriever
  -> RawEvidenceRetriever
  -> GraphNeighborRetriever
  -> PolicyEngine
```

## 7. Interface Contracts

The examples below are implementation-facing contracts. Rust traits are shown
because Dore's existing architecture targets Rust, but the schemas remain
language-neutral.

### Ingestion

```rust
trait IngestionPort {
    fn ingest(&self, request: IngestRequest) -> Result<IngestResult, DoreError>;
}

struct IngestRequest {
    source_kind: SourceKind,
    data_category: DataCategory,
    payload_ref: PayloadRef,
    user_context: UserContextRef,
    requested_sync_mode: SyncMode,
    retention_hint: Option<RetentionClass>,
    created_at: DateTime,
}

struct IngestResult {
    evidence_id: EvidenceId,
    raw_path: RepoPath,
    policy_decision_id: PolicyDecisionId,
    affected_page_candidates: Vec<PageId>,
    job_report_path: RepoPath,
}
```

### Wiki Generation

```rust
trait WikiGenerationPort {
    fn plan_updates(&self, request: WikiUpdateRequest) -> Result<WikiUpdatePlan, DoreError>;
    fn apply_updates(&self, plan: WikiUpdatePlan) -> Result<WikiUpdateResult, DoreError>;
}

struct WikiUpdateRequest {
    evidence_ids: Vec<EvidenceId>,
    mode: WikiUpdateMode,
    approval_context: ApprovalContext,
}

struct WikiUpdateResult {
    changed_pages: Vec<PageId>,
    contested_claims: Vec<ClaimId>,
    stale_digests: Vec<DigestId>,
    index_updated: bool,
    log_appended: bool,
}
```

### Graphify

```rust
trait GraphPort {
    fn ensure_available(&self) -> Result<GraphifyVersion, DoreError>;
    fn build_graph(&self, request: GraphBuildRequest) -> Result<GraphBuildResult, DoreError>;
    fn expand(&self, request: GraphExpandRequest) -> Result<Vec<GraphNeighbor>, DoreError>;
}

struct GraphBuildRequest {
    wiki_root: RepoPath,
    output_root: RepoPath,
    corpus_gate: CorpusGate,
    include_audit: bool,
}
```

### Cloud Sync

```rust
trait CloudSyncAdapter {
    fn provider_id(&self) -> SyncProviderId;
    fn plan(&self, manifest: SyncManifest) -> Result<ProviderSyncPlan, DoreError>;
    fn apply(&self, plan: ProviderSyncPlan) -> Result<ProviderSyncResult, DoreError>;
}

trait SyncPort {
    fn sync(&self, request: SyncRequest) -> Result<SyncResult, DoreError>;
}

struct SyncRequest {
    mode: SyncMode,
    provider: Option<SyncProviderId>,
    categories: Vec<DataCategory>,
    dry_run: bool,
}
```

### Android Collector

```rust
trait AndroidCollectorAdapter {
    fn collector_id(&self) -> CollectorId;
    fn supported_categories(&self) -> Vec<DataCategory>;
    fn collect(&self, request: AndroidCollectRequest) -> Result<Vec<AndroidPayload>, DoreError>;
}

struct AndroidCollectRequest {
    categories: Vec<DataCategory>,
    since: Option<DateTime>,
    until: DateTime,
    consent_snapshot_id: ConsentSnapshotId,
}
```

### Transcription

```rust
trait TranscriptionAdapter {
    fn provider_id(&self) -> TranscriptionProviderId;
    fn transcribe(&self, request: TranscriptionRequest) -> Result<TranscriptResult, DoreError>;
}

struct TranscriptionRequest {
    audio_ref: PayloadRef,
    language_hint: Option<String>,
    redaction_profile: RedactionProfileId,
    consent_snapshot_id: ConsentSnapshotId,
}
```

### Proactive Suggestion

```rust
trait SuggestionPort {
    fn prepare(&self, request: PreparationRequest) -> Result<PreparationBrief, DoreError>;
    fn record_feedback(&self, feedback: SuggestionFeedback) -> Result<(), DoreError>;
}

struct PreparationRequest {
    trigger: PreparationTrigger,
    context_window: TimeWindow,
    allowed_categories: Vec<DataCategory>,
    approval_context: ApprovalContext,
}
```

## 8. Data Schemas

### Raw Evidence Metadata

```json
{
  "schema_version": "raw_evidence.v1",
  "evidence_id": "evi_20260507_145343_01",
  "source_kind": "conversation | usage | android | audio | note | import",
  "data_category": "conversation_history",
  "sensitivity": "normal | sensitive | restricted",
  "created_at": "2026-05-07T14:53:43+09:00",
  "captured_at": "2026-05-07T14:53:43+09:00",
  "payload": {
    "path": "memory/raw/conversations/2026/05/evi_20260507_145343_01.md",
    "sha256": "hex",
    "content_type": "text/markdown"
  },
  "provenance": {
    "collector": "manual_upload",
    "device_id": null,
    "conversation_id": "optional",
    "source_uri": "optional"
  },
  "policy": {
    "consent_snapshot_id": "consent_20260507_01",
    "retention_class": "standard",
    "sync_mode": "local_only",
    "redaction_profile": "default"
  }
}
```

### Wiki Page Frontmatter

```yaml
schema_version: wiki_page.v1
id: project.dore.personal_repository
type: project
status: active
confidence: medium
updated_at: 2026-05-07T14:53:43+09:00
source_count: 4
sync_mode: local_only
tags:
  - dore
  - personal-repository
```

Required sections:

- Summary
- Stable Facts
- Current State
- Preferences And Constraints
- Open Questions
- Recent Changes
- Sources
- Related Pages

### Claim Record

```json
{
  "schema_version": "claim.v1",
  "claim_id": "claim_project_dore_001",
  "text": "The user wants Dore to maintain a personal LLM Wiki from approved daily-life and work signals.",
  "status": "active | stale | contested | superseded",
  "confidence": "low | medium | high",
  "source_ids": ["evi_20260507_145343_01"],
  "last_reviewed_at": "2026-05-07T14:53:43+09:00",
  "supersedes": [],
  "contested_by": []
}
```

### Digest Schema

```json
{
  "schema_version": "active_context.v1",
  "generated_at": "2026-05-07T14:53:43+09:00",
  "source_wiki_revision": "git-or-manifest-revision",
  "sections": [
    {
      "id": "active_project_dore",
      "summary": "Dore personal repository design is active.",
      "page_refs": ["memory/wiki/projects/dore_personal_repository.md"],
      "claim_refs": ["claim_project_dore_001"],
      "expires_at": null
    }
  ]
}
```

### Policy Files

`memory/policy/data_categories.yaml`

```yaml
schema_version: data_categories.v1
categories:
  conversation_history:
    enabled: true
    sensitivity: sensitive
    default_sync_mode: local_only
    requires_approval_for_raw_access: true
  android_location_summary:
    enabled: false
    sensitivity: restricted
    default_sync_mode: local_only
    requires_approval_for_raw_access: true
  audio_transcript:
    enabled: false
    sensitivity: restricted
    default_sync_mode: local_only
    requires_approval_for_raw_access: true
```

`memory/policy/sync.yaml`

```yaml
schema_version: sync_policy.v1
mode: local_only
provider: null
allow_cloud_sync_categories:
  - wiki_generated_pages
  - digest_summaries
deny_cloud_sync_categories:
  - raw_audio
  - raw_transcripts
  - secrets
require_encryption_for_cloud: true
```

`memory/policy/approval.yaml`

```yaml
schema_version: approval_policy.v1
actions:
  raw_evidence_read:
    decision: requires_approval
  wiki_page_update:
    decision: allow
  cloud_sync_raw_sensitive:
    decision: deny
  proactive_external_action:
    decision: requires_approval
```

### Job Report

```json
{
  "schema_version": "job_report.v1",
  "job_id": "job_20260507_145343_graphify",
  "job_kind": "ingest | transcribe | wiki_generate | graphify | sync | proactive",
  "status": "queued | running | succeeded | failed | blocked | partial",
  "started_at": "2026-05-07T14:53:43+09:00",
  "finished_at": null,
  "inputs": ["evi_20260507_145343_01"],
  "outputs": [],
  "policy_decisions": ["pol_20260507_01"],
  "failure": null,
  "audit_events": ["aud_20260507_01"]
}
```

### Sync Manifest

```json
{
  "schema_version": "sync_manifest.v1",
  "mode": "local_only | cloud_sync",
  "provider": "none | git | object_storage | drive | webdav | syncthing",
  "generated_at": "2026-05-07T14:53:43+09:00",
  "entries": [
    {
      "path": "memory/wiki/index.md",
      "artifact_kind": "wiki",
      "data_category": "wiki_generated_pages",
      "sha256": "hex",
      "sync_decision": "upload | download | skip | conflict | forbidden",
      "reason": "allowed_by_policy"
    }
  ]
}
```

### Proactive Preparation Brief

```json
{
  "schema_version": "preparation_brief.v1",
  "brief_id": "brief_20260507_145343_01",
  "trigger": "daily_review | meeting | work_block | recurring_goal",
  "status": "draft | delivered | dismissed | accepted | refined",
  "confidence": "low | medium | high",
  "summary": "Prepare Dore personal repository design decisions for next work block.",
  "evidence": [
    {
      "source_id": "evi_20260507_145343_01",
      "claim_id": "claim_project_dore_001",
      "reason": "active project evidence"
    }
  ],
  "suggestions": [
    {
      "text": "Review cloud sync provider decision before implementing sync.",
      "approval_required": false,
      "action_kind": "review"
    }
  ]
}
```

## 9. State Management

### Evidence State

```text
received -> policy_checked -> normalized -> stored -> classified -> eligible_for_generation
```

Rules:

- `stored` raw evidence is append-only.
- Policy denial stops before storage unless a minimal denied-action audit record
  is allowed.
- Raw evidence is never modified by wiki generation, redaction, Graphify, or
  sync.

### Wiki Update State

```text
planned -> policy_checked -> draft -> validated -> applied -> indexed -> logged -> digest_stale -> digest_rebuilt
```

Rules:

- Existing wiki pages are updated atomically.
- Failed validation leaves a draft and job report; it does not replace pages.
- `index.md` and `log.md` are part of the successful apply transaction.
- Digest staleness is explicit so retrieval can avoid stale derived data.

### Graphify State

```text
not_configured -> available -> corpus_gate_passed -> running -> generated -> audited
```

Rules:

- Graphify is skipped for very small corpora unless manually requested.
- Graph artifacts are rebuildable and can be deleted without memory loss.
- Graph audit findings may create lint issues, not canonical claims.

### Sync State

```text
idle -> planning -> policy_checked -> uploading_or_downloading -> conflict_check -> completed
                                                          \-> failed
                                                          \-> blocked
```

Rules:

- `local_only` mode never contacts cloud providers.
- Cloud sync must respect category policy and encryption requirements.
- Append-only raw conflicts are preserved as separate evidence records.
- Generated artifact conflicts may be regenerated or merged from source.

### Android Ingestion State

```text
disabled -> category_enabled -> collector_configured -> collected -> validated -> ingested
```

Rules:

- Each Android category is independently enabled.
- Restricted categories such as location, notification metadata, contacts, and
  audio require explicit consent and retention policy.
- Background collection is not assumed in milestone one.

### Audio Transcription State

```text
uploaded -> policy_checked -> queued -> transcribed -> quality_checked -> redacted -> ingested -> wiki_mapped
```

Rules:

- Original audio and transcript are raw evidence or stable raw references.
- Redacted transcript views feed wiki generation.
- Low-quality transcripts are marked as low confidence and may require review.

### Proactive Suggestion State

```text
candidate -> evidence_checked -> generated -> reviewed_by_policy -> delivered -> accepted
                                                                  \-> dismissed
                                                                  \-> refined
                                                                  \-> expired
```

Rules:

- Suggestions must state evidence and confidence.
- External actions require explicit approval.
- User feedback is stored as memory evidence and affects future suggestions.

## 10. Error Handling

### Error Taxonomy

| Error | Meaning | Recovery |
| --- | --- | --- |
| `policy_denied` | Consent, sync, retention, redaction, or approval policy blocked the action. | Stop, write blocked report, ask user only if escalation is appropriate. |
| `policy_missing` | Required policy file or category decision is absent. | Default to deny or local_only; create setup issue. |
| `invalid_payload` | Source payload failed schema or content validation. | Quarantine input and write validation report. |
| `append_only_violation` | A flow attempted to overwrite raw evidence. | Block and report implementation defect. |
| `transcription_failed` | Audio provider failed or returned unusable transcript. | Retry according to policy or mark failed with provider class. |
| `redaction_failed` | Sensitive transcript or source could not be safely redacted. | Block wiki update and keep raw local_only. |
| `wiki_validation_failed` | Page contract, provenance, or claim rules failed. | Keep draft, do not apply, write report. |
| `digest_stale` | Digest no longer matches wiki pages. | Rebuild before retrieval or use wiki fallback. |
| `graphify_unavailable` | Graphify missing or incompatible. | Skip graph job; memory remains usable. |
| `sync_conflict` | Local and remote artifact diverged. | Preserve raw, regenerate derived, record conflict. |
| `cloud_provider_failed` | Provider unavailable, auth failed, or quota exceeded. | Retry/backoff; local repository remains canonical. |
| `token_budget_exceeded` | Retrieval would exceed budget. | Narrow query, compress, or defer raw/graph expansion. |

### Failure Artifacts

Every material failure writes a job report with:

- error class
- affected source IDs or artifact paths
- policy decision IDs
- partial outputs, if any
- retry eligibility
- user-visible next action

## 11. Key Scenarios

### Scenario A: Conversation Becomes Wiki Memory

1. A conversation excerpt is promoted for memory.
2. `IngestionService` asks `PolicyEngine` whether `conversation_history` is
   enabled.
3. `RawEvidenceRepository` appends the normalized evidence.
4. `WikiGenerationService` creates a page update plan.
5. `ClaimMerger` merges or contests claims.
6. `PageContractValidator` validates required sections and provenance.
7. `IndexMaintainer` updates `index.md`.
8. `WikiLogAppender` appends `log.md`.
9. `DigestCompiler` rebuilds affected digests.
10. `JobReporter` writes the ingest and wiki generation reports.

### Scenario B: Android Daily Summary

1. Scheduler triggers an Android daily summary job.
2. `AndroidCollectorAdapter` collects only enabled categories.
3. `AndroidPayloadValidator` validates category, timestamps, and consent
   snapshot.
4. `IngestionService` stores the summary under `memory/raw/android/`.
5. The wiki generator updates `memory/wiki/daily/` and related project or
   routine pages.

### Scenario C: Audio Upload To Wiki

1. `AudioUploadService` stores or references the recording.
2. `TranscriptionService` checks policy and queues transcription.
3. `TranscriptionAdapter` returns transcript text and quality metadata.
4. `TranscriptRedactor` creates a redacted view.
5. `IngestionService` stores transcript evidence.
6. `TranscriptToWikiMapper` suggests wiki update targets.
7. `WikiGenerationService` applies approved updates.

### Scenario D: Graphify Refresh

1. Scheduler triggers Graphify refresh.
2. `GraphifyRunner` checks corpus gate and Graphify availability.
3. Graphify reads `memory/wiki/**`.
4. Outputs are written to `memory/graph/graph.json`,
   `memory/graph/graph.html`, `memory/graph/clusters.json`, and
   `memory/graph/audit_report.md`.
5. Audit findings create lint issues or retrieval hints.

### Scenario E: Proactive Work Preparation

1. Scheduler detects an upcoming work block or daily review.
2. `ContextDetector` reads approved digests and wiki pages.
3. `PreparationPlanner` creates a brief with likely useful references.
4. `SuggestionService` labels suggestions with evidence and confidence.
5. `ApprovalGate` blocks external actions.
6. User feedback is recorded and later compiled into memory.

## 12. Retrieval Rules

Retrieval must use this order:

1. Read relevant digest slices.
2. Expand to directly linked high-value wiki pages.
3. Read narrow raw evidence snippets only when policy allows and ambiguity
   remains.
4. Use Graphify neighbors only when direct retrieval is incomplete.

This preserves the LLM Wiki principle: Dore should use compiled memory first,
not reprocess all raw evidence for every question.

## 13. Security And Privacy Controls

- Default mode is `local_only`.
- Restricted categories are disabled until explicitly enabled.
- Cloud sync of sensitive raw data is denied unless encryption and category
  policy explicitly allow it.
- Secrets are referenced by `SecretRef` and never written to wiki, digest,
  reports, prompts, transcripts, or logs.
- Redaction is required before transcript-derived wiki updates when sensitive
  categories are present.
- Every ingestion, transcription, sync, graph, generation, and proactive job
  records policy decisions and audit references.
- Generated claims must retain provenance and confidence.
- Proactive suggestions must be reversible through dismissal or correction.

## 14. Milestones

### Milestone 1: Local LLM Wiki Scaffold

Deliver:

- `memory/raw/`, `memory/wiki/`, `memory/digest/`, `memory/jobs/`,
  `memory/policy/`
- page contract validator
- manual ingest of notes or conversations
- `index.md`, `log.md`, and digest rebuild
- local_only policy defaults

Validation:

- ingest one safe sample note
- generate or update one wiki page
- append `log.md`
- rebuild digest
- prove raw source remains unchanged

### Milestone 2: Graphify Integration

Deliver:

- Graphify install or invocation path
- scheduled or manual graph refresh
- graph JSON, HTML, clusters, and audit report output
- corpus gating

Validation:

- graph artifacts rebuild from wiki pages
- graph deletion causes no memory loss
- retrieval uses graph expansion only as escalation

### Milestone 3: Sync Adapter

Deliver:

- `SyncPort` and first provider adapter
- sync policy and manifest
- dry-run sync report
- conflict handling

Validation:

- `local_only` mode makes no provider call
- `cloud_sync` uploads only allowed categories
- conflict records preserve raw evidence

### Milestone 4: Android Import

Deliver:

- manual export or Termux-based collector
- category-level policy
- daily summary import

Validation:

- disabled category is blocked
- enabled summary becomes raw evidence
- daily wiki page is updated with provenance

### Milestone 5: Audio Transcription

Deliver:

- audio upload/reference contract
- transcription adapter
- redaction profile
- transcript-to-wiki mapping

Validation:

- transcript metadata includes source file, provider, language hint, quality,
  and confidence
- redaction failure blocks wiki generation
- original transcript remains raw evidence

### Milestone 6: Proactive Preparation

Deliver:

- active context detector
- preparation brief generator
- suggestion feedback loop
- approval gates for external actions

Validation:

- suggestion includes evidence and confidence
- dismissal affects future suggestions
- external action cannot run without approval

## 15. Test Strategy

### Unit Tests

Focus:

- policy decisions for consent, retention, redaction, sync, and approval
- raw evidence append-only enforcement
- source classification
- wiki page frontmatter and required section validation
- claim merge, contest, stale, and supersede rules
- digest compilation and stale detection
- Graphify corpus gate
- token budget enforcement
- sync manifest planning
- Android payload validation
- transcript quality and redaction rules
- proactive suggestion state transitions

### Integration Tests

Focus:

- ingest request to raw evidence to wiki update plan
- wiki update to `index.md`, `log.md`, and digest rebuild
- scheduled job to job report
- Graphify runner to graph artifacts
- sync dry-run to manifest and provider plan
- Android collector payload to raw evidence
- audio upload to transcript to redacted wiki update
- proactive preparation brief to feedback record

### System Tests

Focus:

- learn a fact from an approved conversation and retrieve it later through
  digest-first context assembly
- import an Android daily summary and update a daily wiki page
- transcribe a safe sample recording, redact it, and compile a wiki update
- run Graphify and confirm artifacts are derived and rebuildable
- run cloud_sync dry-run and confirm forbidden categories are skipped
- generate a proactive work brief with evidence and approval boundaries

### Non-Functional Verification

- Security: no secret or raw sensitive artifact appears in wiki, digest, logs,
  reports, or Git diff.
- Reliability: failed jobs leave reports and do not corrupt existing wiki pages.
- Maintainability: modules can be tested behind their interfaces.
- Observability: every job has status, input, output, policy, and error class.
- Portability: local-only operation works without cloud, Android, Graphify, or
  transcription providers configured.

## 16. Open Decisions Before Implementation

- Choose the first sync provider and encryption model.
- Choose whether raw evidence is excluded from Git entirely or stored only as
  encrypted bundles.
- Choose Android milestone path: manual export, Termux bridge, companion app,
  or provider export.
- Choose transcription provider and on-device/off-device policy.
- Choose review threshold for automatically applying wiki updates.
- Choose proactive delivery surface: Markdown report, chat message,
  notification, dashboard, or daily digest.

## 17. Acceptance Checklist

- Module and class responsibilities are defined.
- Interface contracts and data schemas are defined.
- State management and error handling are defined.
- Unit, integration, and system test strategy is defined.
- Graphify integration is designed as an installable/invokable derived layer.
- Android ingestion is category-based and consent-gated.
- Audio transcription includes provenance, metadata, redaction, and wiki flow.
- `local_only` and `cloud_sync` modes are explicit.
- `index.md` and `log.md` remain part of the LLM Wiki contract.
- Raw evidence remains append-only and separate from generated artifacts.
- Proactive behavior includes evidence, confidence, feedback, and approval.
