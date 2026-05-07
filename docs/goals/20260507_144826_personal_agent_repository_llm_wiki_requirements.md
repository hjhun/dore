# Personal Agent Repository And LLM Wiki Requirements Brief

Generated: 2026-05-07 14:48:26 Asia/Seoul
Status: Requirements analysis for planner handoff

## 1. Goal Restatement

Dore should become an agent-connected personal repository that supports the LLM
Wiki pattern as its durable memory system.

The system should collect the user's intentional inputs, usage history,
conversation history, daily-life information, Android device signals, and
recorded audio. It should store these inputs locally first, optionally sync them
to a user-selected cloud environment, and periodically compile them into
Markdown-based LLM Wiki pages.

Graphify should be installable and integrated as a graph generation and
analysis layer. Graph artifacts should help Dore understand relationships,
detect weak links, and navigate the user's personal knowledge, but the
human-readable Markdown wiki remains the source of truth.

The longer-term product vision is a private personal agent repository: Dore
observes the user's approved information streams, understands what the user is
working on and living through, prepares useful information before it is asked
for, and suggests next actions while keeping privacy, consent, auditability, and
user control central.

## 2. In-Scope And Out-Of-Scope Boundaries

### In Scope

- Define the target repository structure for personal raw data, generated wiki
  pages, digests, graph artifacts, sync state, jobs, and reports.
- Support the LLM Wiki model with raw immutable sources, Markdown wiki pages,
  compact machine-facing digests, and append-only logs.
- Add Graphify as an optional but first-class derived analysis layer for graph
  creation, clustering, relationship discovery, and audit reports.
- Capture user conversation history and agent usage history into local raw
  sources when the user opts in.
- Support local-only storage and cloud-synced storage through a provider-neutral
  sync adapter.
- Periodically run ingestion, transcription, wiki generation, digest rebuild,
  graph refresh, lint, and report jobs.
- Ingest Android-originated information through an explicit mobile collector or
  bridge with user-approved data categories.
- Upload recorded audio, transcribe it, store the transcript as raw evidence,
  and compile useful claims or summaries into the LLM Wiki.
- Infer work context from approved signals such as calendar items, messages,
  documents, repository activity, browser captures, notes, and recordings.
- Proactively prepare briefs, answers, reading lists, reminders, and open
  questions based on current projects and recent activity.
- Provide policy controls for data categories, retention, cloud sync, proactive
  suggestions, and human approval requirements.
- Produce Markdown documentation that records design decisions and goal
  evolution under `docs/goals/`.

### Out Of Scope For The First Planner Pass

- Building a complete Android application implementation.
- Building every cloud sync provider at once.
- Real-time surveillance, hidden collection, or collection without explicit
  consent.
- Treating Graphify output as the canonical source of user memory.
- Fully autonomous actions that affect external systems without policy checks
  and user approval.
- Medical, legal, financial, or employment decisions made automatically from
  personal data.
- Team or enterprise collaboration features beyond a single-user personal
  repository.
- Training custom foundation models on the user's private data.

## 3. Concrete Acceptance Criteria

### Repository Structure

- A planner can derive a concrete file layout from this brief with separate
  directories for raw sources, wiki pages, digests, graph artifacts, sync
  metadata, scheduled job reports, policies, and connectors.
- Raw sources are append-only and never overwritten by generated summaries.
- Generated Markdown wiki pages include provenance back to raw sources.
- The structure supports both local-only and cloud-synced operation without
  changing the memory model.

### LLM Wiki Generation

- The system can ingest at least one conversation transcript or user note and
  produce or update Markdown wiki pages.
- Wiki pages include stable sections for summary, claims, current state,
  preferences or constraints, open questions, sources, and related pages.
- `index.md` and `log.md` are updated after each successful ingest.
- Scheduled wiki generation can run on a configurable cadence such as hourly,
  daily, or weekly.
- A failed generation job leaves a report explaining the failure and does not
  corrupt existing wiki pages.

### Graphify Integration

- The system has a documented way to install or invoke Graphify.
- Graphify can read the Markdown wiki and produce derived graph outputs such as
  JSON, HTML, clusters, and audit reports.
- Graphify artifacts are stored in a derived-artifact directory and can be
  rebuilt from raw and wiki data.
- The retrieval flow treats graph expansion as an escalation path after direct
  digest and wiki retrieval.

### Local And Cloud Sync

- The user can choose `local_only` or `cloud_sync` mode.
- The system records which data categories are allowed to sync.
- Sync state is auditable, including last sync time, provider, changed files,
  failures, and conflict decisions.
- Cloud provider details are isolated behind an adapter so future providers can
  be added without rewriting ingestion or wiki logic.
- Conflict handling is explicit: append-only raw sources are preserved, while
  generated artifacts can be regenerated or merged.

### Android And Daily-Life Data Capture

- Android data ingestion is based on explicit data categories, such as calendar,
  location summaries, activity summaries, notifications metadata, app usage,
  files, photos metadata, and voice recordings.
- The user can enable or disable each Android data category independently.
- The system can import at least one Android-originated daily summary as a raw
  source and compile it into a daily wiki entry.
- Sensitive categories such as location, notifications, contacts, and audio
  require explicit consent and clear retention policy.

### Audio And Transcription

- The system can accept an uploaded audio file or recording reference.
- The audio file is stored as raw evidence or referenced by a stable path.
- A transcription job produces text with metadata including source file, time,
  language when known, transcription provider, and confidence or quality notes.
- The transcript can be summarized into wiki pages without deleting the original
  transcript.
- Private or sensitive transcript segments can be redacted or excluded according
  to policy.

### Proactive Work Preparation

- The system can identify active projects or work themes from approved sources.
- For each active project, the system can maintain a Markdown project page with
  current goals, recent activity, blockers, next actions, open questions, and
  likely needed references.
- A scheduled job can produce a proactive preparation brief before a work block,
  meeting, or recurring review.
- Suggestions are labeled as suggestions, include evidence, and avoid claiming
  certainty where the underlying signals are weak.
- The user can dismiss, accept, or refine suggestions, and that feedback is
  stored as memory.

### Privacy, Policy, And Auditability

- Every ingestion path has a policy gate for consent, retention, sync, and
  redaction.
- The user can inspect what was collected, what was generated, and why a
  suggestion was made.
- The system keeps an append-only operational log of ingest, sync, generation,
  graph, transcription, and proactive suggestion jobs.
- Secrets, access tokens, and raw private data are not committed to a public
  repository.

## 4. Constraints And Dependencies

### Product Constraints

- The personal repository must remain inspectable as files, primarily Markdown,
  JSON, and append-only logs.
- Markdown wiki files are the durable user-facing memory layer.
- Raw data is evidence and must remain separate from generated interpretation.
- Graph outputs are derived and rebuildable.
- The system should work in local-only mode before cloud sync is required.
- Automation must be bounded by explicit schedules, policies, reports, and user
  approval classes.
- Proactive behavior must be explainable and reversible.

### Technical Dependencies

- Graphify must be available as an installable or invokable tool.
- A scheduler is required for periodic ingest, digest rebuild, wiki generation,
  graph refresh, sync, lint, and reports.
- A transcription provider is required for audio-to-text.
- Android ingestion likely requires one of:
  - a companion Android app,
  - a Termux-based collector,
  - integration with Android backup/export mechanisms,
  - integration with third-party services such as calendar, cloud drive, or
    recorder sync.
- Cloud sync requires at least one provider adapter, such as Git remote, object
  storage, Google Drive, Dropbox, iCloud Drive, Syncthing, or WebDAV.
- Encryption and key management are required before syncing sensitive personal
  data to cloud storage.
- A policy engine is required to enforce data category permissions, retention,
  redaction, and approval level.
- A retrieval layer is required to load relevant digests, wiki pages, raw
  evidence, and optional graph neighbors within token budgets.

### Suggested Repository Design

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
```

```text
docs/
  goals/
  designs/
  roadmaps/
```

```text
connectors/
  android/
  cloud/
  transcription/
  calendar/
  repository/
```

```text
scripts/
  ingest/
  sync/
  wiki/
  graphify/
  transcribe/
```

## 5. Risks, Ambiguities, And Open Questions

### Risks

- Personal data collection can become invasive unless consent, scope, retention,
  and audit trails are designed before implementation.
- Android background collection may be limited by OS permissions, battery
  optimization, vendor restrictions, and app store policies.
- Cloud sync can leak sensitive data if encryption, provider isolation, and
  secret handling are not designed early.
- Audio transcription can capture third-party speech, confidential information,
  or legally sensitive content.
- Proactive suggestions can feel intrusive or wrong if evidence quality and
  confidence are not visible.
- Generated wiki pages can accumulate false claims unless provenance,
  contradiction handling, and review workflows are mandatory.
- Graphify output may look authoritative even though it is derived from
  imperfect source and wiki data.
- Sync conflicts can damage generated artifacts unless raw evidence is
  protected and generated artifacts are rebuildable.
- Storing conversation and usage history may conflict with provider terms,
  workplace confidentiality, or user expectations.

### Ambiguities

- "User usage history" needs definition: Dore usage, browser usage, app usage,
  shell commands, repository activity, mobile app usage, or all of these.
- "Local or cloud environment" needs provider priorities and security posture.
- The target Android ingestion mechanism is unknown.
- The intended Graphify integration depth is unclear: manual CLI invocation,
  scheduled job, MCP tool, or embedded service.
- The cadence for "periodically" generating the wiki is unspecified.
- The scope of proactive preparation is unclear: daily life, work only,
  meetings, coding tasks, learning, errands, or all approved domains.
- The user's tolerance for automation versus review-before-write needs a policy
  decision.
- The repository visibility is unclear: private GitHub repository, local Git
  repo, encrypted cloud folder, or hybrid.

### Open Questions For Planner

- What is the minimum viable first milestone: local-only LLM Wiki, Graphify
  integration, Android ingestion, audio transcription, or cloud sync?
- Which data categories should be enabled by default, and which must be
  opt-in-only?
- Should cloud sync use Git first, file sync first, or object storage first?
- Should raw personal data ever be committed to Git, or should Git store only
  generated wiki and encrypted bundles?
- What encryption model should be used for local files and cloud sync?
- Which transcription provider should be supported first?
- What Android path is most practical for milestone one: companion app, Termux,
  cloud exports, or manual upload?
- How should Dore distinguish durable facts from temporary context and weak
  inferences?
- What review workflow should exist before generated wiki updates become
  accepted memory?
- What should the proactive suggestion interface be: Markdown report, chat
  message, notification, dashboard, or daily digest?
