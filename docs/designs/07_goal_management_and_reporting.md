# CEP-07: Goal Management And Reporting

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore planning maintainers
Related: `01_system_architecture.md`, `04_telegram_and_session_runtime.md`, `05_scheduler_and_self_improvement.md`

## 1. Summary

Dore should not merely respond to prompts. It should track goals, maintain progress over time, identify useful next steps, and report those findings back to the user in a disciplined way.

This CEP defines how user goals, system goals, and improvement goals are represented and reviewed, and how Dore keeps the user informed without creating notification spam.

## 2. Goals

- Represent durable user goals explicitly.
- Track system and self-improvement goals separately from user life goals.
- Allow Dore to discover useful research or maintenance work.
- Make reporting concise, useful, and reviewable.
- Ensure Dore evolves with the user rather than beside the user.

## 3. Non-Goals

- Replacing the memory system with the goal system
- Treating every reminder as a long-lived goal
- Spamming the user with low-value status messages
- Hiding agent activity in silent background loops

## 4. Goal Classes

The initial goal taxonomy should include:

- `user_long_term`
- `user_operational`
- `project`
- `routine`
- `research`
- `maintenance`
- `improvement`

Examples:

- personal plans and preferences are usually `user_long_term`
- "add Telegram scheduling command" is `project`
- "review token budget regressions weekly" is `maintenance`
- "compare opencode session patterns against Dore runtime" is `research`

## 5. Goal Record

Each goal should contain:

- goal ID
- title
- class
- description
- source
- owner
- status
- priority
- review cadence
- linked sessions
- linked reports
- linked memory pages
- success criteria

Suggested statuses:

- `proposed`
- `active`
- `blocked`
- `waiting`
- `completed`
- `archived`

## 6. Goal Sources

Goals may originate from:

- direct user requests
- conversation analysis
- scheduled reviews
- memory lint findings
- repeated failures
- self-improvement analysis

System-created goals must always cite their source and confidence.

## 7. Goal Review Loop

Dore should review goals regularly:

- daily for active operational items
- weekly for project and maintenance goals
- on-demand when the user asks

Each review should answer:

- what changed
- what is blocked
- what should happen next
- whether the goal should be split, downgraded, or archived

## 8. Relationship To Memory

Goals are not a replacement for the memory wiki.

Recommended separation:

- memory stores durable knowledge
- goals store desired outcomes and execution state
- reports store what happened

Cross-linking is required, but the responsibilities remain distinct.

## 9. Reporting Model

Reports should exist in two forms:

### 9.1 Short Reports

Delivered through Telegram. They should be concise and action-oriented.

### 9.2 Durable Reports

Stored as durable artifacts and linked to goals, sessions, and memory pages.

Each durable report should include:

- report ID
- origin
- time range
- summary
- actions taken
- changes or findings
- tests run if relevant
- recommended next steps

## 10. Notification Policy

Notify the user immediately for:

- blocked important goals
- provider/auth failures that stop normal operation
- completed high-value work
- improvement proposals needing approval

Batch or summarize:

- routine maintenance
- low-risk memory refreshes
- repetitive health checks

## 11. Research And Discovery Work

Dore should be able to create bounded research goals such as:

- investigate a new provider option
- compare an architectural pattern from another project
- analyze token inefficiency in memory retrieval

Research work should end in a report, not in silent internal knowledge only.

## 12. Testing Requirements

- Unit tests for goal state transitions and report policies
- Integration tests for session-to-goal and schedule-to-goal linkage
- Smoke tests for a weekly review report
- End-to-end tests for a goal being created, progressed, reported, and archived

## 13. Acceptance Criteria

This CEP is accepted when:

- Dore can represent goals explicitly
- goals can be reviewed and updated over time
- reports are concise in Telegram and durable in storage
- the user can see how Dore is helping and improving

## 14. Open Questions

- Which goal classes should be created automatically in milestone one?
- How aggressive should automatic research-goal creation be?
- What is the right default report cadence to stay useful without becoming noisy?
