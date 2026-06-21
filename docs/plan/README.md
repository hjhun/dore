# Dore Development Plan

This directory contains the implementation roadmap derived from `docs/drafts/`.

Use this plan as the day-to-day development source of truth. The draft documents remain the product and design reference, but implementation should proceed from the milestones and acceptance gates here.

## Documents

- [ROADMAP.md](ROADMAP.md): milestone roadmap and development order.
- [MILESTONE_0_BOOTSTRAP.md](MILESTONE_0_BOOTSTRAP.md): first scaffold and verification target.
- [MILESTONE_5_ACCEPTANCE_AUDIT.md](MILESTONE_5_ACCEPTANCE_AUDIT.md): trading watch and dry-run acceptance evidence.
- [QUALITY_GATES.md](QUALITY_GATES.md): TDD, verification, and release gates.

## Current Development Focus

Current focus: Milestone 6, pilot real trading acceptance audit.

The next working slice must provide:

- acceptance evidence for config gates, status gates, control routes, and blocked real-order paths.
- explicit known boundaries for missing broker/API details.
- verification that approval and kill-switch controls do not enable real trading by themselves.
