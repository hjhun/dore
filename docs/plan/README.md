# Dore Development Plan

This directory contains the implementation roadmap derived from `docs/drafts/`.

Use this plan as the day-to-day development source of truth. The draft documents remain the product and design reference, but implementation should proceed from the milestones and acceptance gates here.

## Documents

- [ROADMAP.md](ROADMAP.md): milestone roadmap and development order.
- [REQUIREMENTS_TRACE.md](REQUIREMENTS_TRACE.md): draft requirement coverage and milestone mapping.
- [MILESTONE_0_BOOTSTRAP.md](MILESTONE_0_BOOTSTRAP.md): first scaffold and verification target.
- [MILESTONE_5_ACCEPTANCE_AUDIT.md](MILESTONE_5_ACCEPTANCE_AUDIT.md): trading watch and dry-run acceptance evidence.
- [MILESTONE_6_ACCEPTANCE_AUDIT.md](MILESTONE_6_ACCEPTANCE_AUDIT.md): pilot real trading gate acceptance evidence.
- [PROJECT_STATUS_AUDIT.md](PROJECT_STATUS_AUDIT.md): current objective status and handoff evidence.
- [QUALITY_GATES.md](QUALITY_GATES.md): TDD, verification, and release gates.
- [MILESTONE_15_MVP_ACCEPTANCE_AUDIT.md](MILESTONE_15_MVP_ACCEPTANCE_AUDIT.md): final MVP acceptance evidence.
- [EVAL_RUNBOOK.md](EVAL_RUNBOOK.md): MVP eval and manual scenario runbook.
- [HERMES_MVP_PARITY.md](HERMES_MVP_PARITY.md): Hermes compatibility and slash command parity checklist.
- [SESSION_LIFECYCLE.md](SESSION_LIFECYCLE.md): reset/resume/stop, queueing, interruption, and recovery plan.
- [LOCAL_ONBOARDING_SECURITY.md](LOCAL_ONBOARDING_SECURITY.md): local startup, configuration, and security audit.
- [M16_BROKER_CONNECTOR_INPUT_PACKET.md](M16_BROKER_CONNECTOR_INPUT_PACKET.md): required user inputs and start gate for broker connector work.
- [HERMES_AGENT_LOOP_GAP_ANALYSIS.md](HERMES_AGENT_LOOP_GAP_ANALYSIS.md): comparison against `../ref/hermes-agent` agent-loop reliability surfaces.

## Useful Commands

- `npx --yes pnpm@11.8.0 trading:m16-check configs/m16-broker-input.example.json`: validate whether an M16 broker/API input packet is complete enough to start connector planning.

## Current Development Focus

Current focus: M22 agent loop reliability is in progress; M16/M17 broker
connector work remains blocked until required broker/API inputs arrive.

Broker/API connector work remains post-MVP and blocked until the user supplies official broker/API details, terms, and credential references. Keep M16/M17 paused unless the input packet is completed and validated.

M18 desktop operations hardening, M19 daemon reliability hardening, M20 memory
quality hardening, and M21 development-agent workflow depth are implemented.
M21 covers development task stage visibility, failed verification summaries,
code-review report storage/desktop visibility, workflow risk review visibility,
and engineering memory reflections for decisions, regressions, and follow-up
tasks.

M22 is based on the Hermes agent-loop comparison. The first slice exposes
development-agent loop status with iteration budget, retry guards, exit reason,
and next action through daemon status and the desktop Engineering panel.
