# CEP-04: Telegram And Session Runtime

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore runtime maintainers
Related: `01_system_architecture.md`, `02_memory_and_llm_wiki.md`, `03_provider_and_auth.md`, `07_goal_management_and_reporting.md`

## 1. Summary

Telegram is the first operational channel for Dore, but the session is the true domain model.

This CEP defines how Telegram events become session work, how context is assembled compactly, how reports are delivered, and how child sessions support sub-agent execution without polluting the main user thread.

## 2. Goals

- Start with one clean, reliable channel.
- Keep Telegram logic thin and replaceable.
- Preserve long-lived conversational continuity through sessions.
- Use compact context instead of replaying full history.
- Allow child sessions for delegated work and scheduled jobs.

## 3. Non-Goals

- Making Telegram-specific concepts the center of the system
- Supporting a large command set in milestone one
- Replaying full message history for every request
- Mixing memory updates directly into Telegram transport handlers

## 4. Core Decisions

### AD-1: Session is the primary runtime object

Every user or system interaction is attached to a session.

### AD-2: Telegram is a transport adapter

The Telegram module parses updates, resolves the actor and target session, and passes work into the session runtime.

### AD-3: Child sessions are the first sub-agent implementation

Delegated tasks run in child sessions. Their outputs are promoted back to the parent only when useful.

## 5. Session Model

Each session should track:

- session ID
- owner ID
- session kind: user, child, system, scheduled
- parent session ID if any
- current objective
- compact summary
- linked goals
- linked memory references
- recent turn ledger
- last report
- active task state

Recommended session states:

- `active`
- `waiting`
- `blocked`
- `completed`
- `archived`

## 6. Telegram Mapping

Recommended mapping rules:

- one private Telegram chat maps to one primary user session lineage
- scheduled jobs use system or child sessions linked back to the user
- delegated work creates child sessions under the current session

Telegram message IDs are useful references, but they are not the source of truth for runtime state.

## 7. Minimal Command Surface

The first command set should stay small:

- `/status`
- `/help`
- `/memory`
- `/goals`
- `/report`
- `/schedule`
- `/approve`
- `/skills`

Free text remains the default mode for normal conversational work.

## 8. Request Processing Flow

1. Receive Telegram update.
2. Validate allowed actor and chat.
3. Parse command or classify as free text.
4. Resolve or create the target session.
5. Determine task class and linked goals.
6. Assemble minimal context.
7. Select provider and model.
8. Execute work.
9. Persist session changes.
10. Trigger memory or reporting side effects if required.
11. Deliver response to Telegram.

## 9. Context Assembly Policy

The default context stack should be:

1. current request text
2. session compact summary
3. active goal slices
4. relevant digest slices from memory
5. very small recent-turn window if needed
6. direct wiki pages only when ambiguity remains

The runtime should avoid:

- full conversation replay
- raw source ingestion during normal chat unless necessary
- large unfiltered goal or report dumps

## 10. Session Compaction

Compaction should happen:

- after substantial exchanges
- before scheduled idle archival
- before spawning child work from a large parent session

Compaction outputs:

- compact summary
- updated key references
- unresolved questions
- promoted durable facts if memory-worthy

## 11. Child Session Design

Child sessions are used for:

- research tasks
- memory maintenance
- self-improvement runs
- multi-step delegated work

Rules:

- child sessions inherit only the minimum needed context
- parent and child write scopes must be explicit
- final outputs must be summarized before promotion
- child sessions should not silently modify the parent summary

## 12. Reporting In Telegram

Reports should be short by default and include:

- what Dore did
- whether it succeeded
- what changed
- what needs user review

Report types:

- scheduled task result
- memory update summary
- provider or auth issue
- improvement proposal or completion
- goal review summary
- skill installation, update, or readiness issue

## 13. Telegram Operational Requirements

The Telegram adapter must handle:

- allow-listing of chats or users
- outgoing rate limits
- retries for transient send failures
- safe startup and shutdown
- known-chat persistence for later notifications
- command-level error messages

These concerns must remain confined to the Telegram module.

## 14. Persistence Requirements

The session store should persist:

- session metadata
- compact summaries
- turn ledger excerpts
- goal links
- memory links
- parent-child session links
- report references

The initial store may be file-backed or SQLite-backed, but the interface must not assume a specific backend.

## 15. Testing Requirements

- Unit tests for command parsing, session resolution, and compaction rules
- Integration tests for Telegram-to-session routing
- Smoke tests for a basic Telegram request and response cycle
- End-to-end tests proving memory continuity across multiple conversations

## 16. Acceptance Criteria

This CEP is accepted when:

- Telegram can drive the assistant without owning business logic
- sessions preserve continuity across interactions
- context remains compact and budget-aware
- child sessions support delegated work cleanly
- reports arrive in Telegram in a concise and understandable form

## 17. Open Questions

- Should the first milestone support group chats or private chat only?
- Which commands require explicit user approval versus passive status viewing?
- How much recent-turn history should remain in-session before compaction?
