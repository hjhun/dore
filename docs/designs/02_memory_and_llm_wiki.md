# CEP-02: Memory And LLM Wiki

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore memory maintainers
Related: `01_system_architecture.md`, `05_scheduler_and_self_improvement.md`, `07_goal_management_and_reporting.md`

## 1. Summary

Dore will use the LLM Wiki pattern as its primary long-term memory architecture.

The goal is not to store everything in prompts or bury knowledge in opaque retrieval layers. The goal is to build and maintain a persistent, inspectable, LLM-written knowledge base that compiles user context into durable markdown pages and compact machine-facing digests.

This CEP adapts the user's `llm_wiki.md` reference to Dore's personal-assistant use case and incorporates useful graph-aware ideas from the reviewed Graphify outputs.

## 2. Design Goals

- Preserve important user knowledge over long periods.
- Keep retrieval token cost materially lower than naive conversation replay.
- Make durable knowledge editable and reviewable by the user.
- Surface contradictions, open questions, and stale assumptions instead of hiding them.
- Keep the graph layer optional and secondary.

## 3. Non-Goals

- Making vector search the primary source of truth
- Replacing durable pages with only embeddings or chat logs
- Auto-generating huge graphs for small corpora with no retrieval benefit
- Keeping memory in provider-specific proprietary stores

## 4. Memory Layers

### 4.1 `raw/`

Immutable evidence and source inputs:

- conversation excerpts promoted for memory processing
- user notes
- imported files
- reports
- clipped articles
- schedule outputs
- external research artifacts

Raw sources are append-only. They are evidence, not the synthesized memory.

### 4.2 `wiki/`

The persistent markdown knowledge base maintained by Dore.

This is the durable human-readable layer and the primary compiled knowledge store.

### 4.3 `digest/`

Compact machine-oriented summaries derived from the wiki:

- active user profile
- active projects
- routines and recurring obligations
- decision register
- open questions
- recent changes

Digests exist to reduce prompt cost and speed retrieval.

### 4.4 `graph/`

Optional derived graph artifacts for:

- navigation
- linting
- relationship exploration
- weak-link detection
- retrieval expansion only when justified

Graph artifacts are rebuildable and never the source of truth.

## 5. Knowledge Model

### 5.1 Page Classes

The initial wiki should support these page classes:

- `person`
- `preference`
- `project`
- `goal`
- `routine`
- `decision`
- `tool`
- `provider`
- `report`
- `question`

### 5.2 Claim Model

Durable facts should be represented as claims with explicit provenance and status.

Each claim should have:

- a stable claim ID
- one or more sources
- confidence
- last reviewed timestamp
- status such as `active`, `stale`, `contested`, or `superseded`

This does not require a separate database table in milestone one, but the model must exist in the document conventions.

### 5.3 Page Contract

Recommended frontmatter:

```yaml
id: person.user
type: person
status: active
confidence: high
updated_at: 2026-04-19
source_count: 8
tags:
  - user
  - memory
```

Recommended page sections:

- Summary
- Stable Facts
- Current State
- Preferences And Constraints
- Open Questions
- Recent Changes
- Sources
- Related Pages

## 6. File Layout

```text
memory/
  raw/
    conversations/
    notes/
    imports/
    reports/
  wiki/
    people/
    preferences/
    projects/
    goals/
    routines/
    decisions/
    tools/
    reports/
    questions/
    index.md
    log.md
  digest/
    user_profile.json
    active_context.json
    active_goals.json
    open_questions.json
    recent_changes.json
  graph/
    graph.json
    graph_report.md
```

## 7. Ingestion Flow

1. A source is captured or promoted into `raw/`.
2. The source is classified by type, scope, and expected affected pages.
3. Dore identifies the target wiki pages to create or update.
4. Claims are merged, revised, or marked contested.
5. `index.md` is updated.
6. `log.md` is appended.
7. Affected digests are rebuilt incrementally.
8. Graph artifacts are refreshed only if policy says they are worth it.

This is directly aligned with the LLM Wiki principle that knowledge should accumulate rather than be rediscovered from scratch.

## 8. Retrieval Flow

Dore must retrieve memory in a staged way:

1. load only the digest slices relevant to the current task
2. load directly linked high-value wiki pages if more detail is needed
3. load narrow raw snippets only when unresolved ambiguity remains
4. consult graph neighbors only when direct retrieval still looks incomplete

This order is mandatory. Graph-based expansion is an escalation path, not the default path.

## 9. Token Budget Policy

Memory retrieval must operate under explicit budgets:

- `budget.digest_default`
- `budget.page_expansion`
- `budget.raw_evidence_escalation`
- `budget.graph_expansion`

If a request exceeds the target budget, the runtime should:

- compress more aggressively
- split work into steps
- ask a narrower question internally
- defer low-value context

It must not silently bloat prompts.

## 10. Compiled Digests

The minimum digest set should include:

- `user_profile.json`
- `active_context.json`
- `active_goals.json`
- `current_preferences.json`
- `recent_decisions.json`
- `open_questions.json`
- `recent_changes.json`

Digest compilation should be incremental. A small source update should not force a full-memory rebuild unless consistency requires it.

## 11. Indexing And Logging

### 11.1 `index.md`

Purpose:

- stable navigation
- page discovery
- category-level browsing
- low-cost retrieval routing

### 11.2 `log.md`

Purpose:

- chronological audit trail
- memory evolution timeline
- evidence for later debugging
- simple grep-friendly inspection

Suggested log prefix:

```text
## [2026-04-19] ingest | telegram-summary-2026-04-19
```

## 12. Linting And Health Checks

Memory lint must detect:

- contradictory claims
- stale summaries
- orphan pages
- missing backlinks
- oversized pages that should be split
- claims without provenance
- open questions with no recent review
- digests that no longer match source pages

Memory health is not optional. A personal assistant that "remembers" inaccurate things is worse than one that remembers less.

## 13. Graphify Features To Adopt

From the prior Graphify analysis, Dore should adopt the following ideas:

### 13.1 Body-Based Cache Identity

Derived graph or analysis caches should prefer semantic body changes over frontmatter-only changes when possible. This reduces rebuild churn.

### 13.2 Relative-Path Cache Keys

Derived artifacts should key on stable relative paths rather than machine-specific absolute paths.

### 13.3 Corpus Gating

Graph generation should be disabled by default for very small corpora. Turn it on only when page count, link density, or lint value justifies the cost.

### 13.4 Token Benchmarking

Dore should periodically measure:

- naive retrieval token cost
- digest-first retrieval cost
- digest plus page expansion cost
- graph-expanded cost

If the optimized path is not materially better, the memory design is drifting.

## 14. Failure Modes

### 14.1 Conflicting Claims

Do not collapse conflicts into one silent summary. Mark the conflict and downgrade confidence.

### 14.2 Runaway Page Growth

Split pages by topic or time horizon once they exceed configured size limits.

### 14.3 Digest Drift

If a digest cannot be trusted, mark it stale and rebuild it before use.

### 14.4 Over-Reliance On Raw Search

If runtime behavior repeatedly needs raw search, the wiki or digest layer is underspecified and should be repaired.

## 15. Security And Ownership

- The user owns all memory files.
- Memory artifacts must remain readable without Dore running.
- Sensitive secrets must never be written into wiki or digest files.
- Reports may cite memory facts, but should not duplicate full sensitive records unnecessarily.

## 16. Testing Requirements

- Unit tests for page parsing, claim merge rules, digest compilation, and lint rules
- Integration tests for source ingestion and targeted page updates
- Smoke tests for digest-first retrieval
- End-to-end tests that prove a fact can be learned, stored, retrieved, revised, and reported correctly

## 17. Acceptance Criteria

This CEP is accepted when:

- durable user facts persist across sessions
- token usage is clearly lower than naive full-history replay
- memory changes are auditable through source, index, and log artifacts
- contradictions remain visible
- the graph layer improves retrieval or linting only when justified

## 18. Open Questions

- Should claim IDs be embedded inline in markdown or stored in sidecar metadata files?
- Which digest format is best for Rust ergonomics and human inspection: JSON only, TOML, or mixed?
- At what corpus size should graph generation turn on by default?
