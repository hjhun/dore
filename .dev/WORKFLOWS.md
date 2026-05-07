# Workflows

Generated: 2026-05-07 14:51 KST

## Required Entry Path

All execution for this task must enter through:

```text
refine -> plan
```

The refiner supplies `.dev/PROMPT.md` and `.dev/REQUIREMENT.md` or
`.dev/REQUIRMENT.md`. The planner then writes `.dev/PLAN.md`.

## Planner Stage Decision

The planner decides downstream stages after the plan. Downstream agents should
follow this file and `.dev/DASHBOARD.md` instead of independently adding or
skipping stages.

For this task:

```text
refiner -> planner -> architect -> reviewer -> committer
```

Skipped for this task:

- developer: no production code is planned.
- tester: no executable behavior is changed.

## Completion Rule

The task is complete only after the required design documentation is written,
reviewed, committed, pushed, and the worktree is clean.
