# Dore Development Plan

This directory contains the implementation roadmap derived from `docs/drafts/`.

Use this plan as the day-to-day development source of truth. The draft documents remain the product and design reference, but implementation should proceed from the milestones and acceptance gates here.

## Documents

- [ROADMAP.md](ROADMAP.md): milestone roadmap and development order.
- [MILESTONE_0_BOOTSTRAP.md](MILESTONE_0_BOOTSTRAP.md): first scaffold and verification target.
- [MILESTONE_5_ACCEPTANCE_AUDIT.md](MILESTONE_5_ACCEPTANCE_AUDIT.md): trading watch and dry-run acceptance evidence.
- [MILESTONE_6_ACCEPTANCE_AUDIT.md](MILESTONE_6_ACCEPTANCE_AUDIT.md): pilot real trading gate acceptance evidence.
- [PROJECT_STATUS_AUDIT.md](PROJECT_STATUS_AUDIT.md): current objective status and handoff evidence.
- [QUALITY_GATES.md](QUALITY_GATES.md): TDD, verification, and release gates.

## Current Development Focus

Current focus: broker/API details pending for future connector work.

The next working slice must provide:

- source-cited official broker API and terms review.
- connector design based on user-provided broker details.
- secret-reference-only credential setup.
- tests proving real order paths remain blocked until explicit connector gates pass.
