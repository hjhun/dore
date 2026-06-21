# Dore Development Plan

This directory contains the implementation roadmap derived from `docs/drafts/`.

Use this plan as the day-to-day development source of truth. The draft documents remain the product and design reference, but implementation should proceed from the milestones and acceptance gates here.

## Documents

- [ROADMAP.md](ROADMAP.md): milestone roadmap and development order.
- [MILESTONE_0_BOOTSTRAP.md](MILESTONE_0_BOOTSTRAP.md): first scaffold and verification target.
- [QUALITY_GATES.md](QUALITY_GATES.md): TDD, verification, and release gates.

## Current Development Focus

Current focus: Milestone 0, repository bootstrap and local core foundation.

The first working slice must provide:

- pnpm TypeScript workspace.
- shared runtime contracts.
- config schema and loader.
- memory directory bootstrap.
- append-only event log.
- local daemon `/status`.
- `doctor` command.
- tests for the above.

