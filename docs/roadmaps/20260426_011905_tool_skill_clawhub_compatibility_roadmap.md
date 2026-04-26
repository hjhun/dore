# Tool, Skill, And ClawHub Compatibility Roadmap

Status: Proposed
Created: 2026-04-26 01:19:05 UTC
Basis: `docs/designs/20260426_011905_tool_skill_clawhub_compatibility.md`
Source Prompt: `docs/prompts/20260425_221546_tool_skill_clawhub.md`
Related:

- `docs/roadmaps/20260425_235154_rust_agent_workflow_engine_milestone_roadmap.md`
- `docs/designs/20260426_001233_security_policy_guardrails_sandboxing.md`
- `docs/designs/09_clawhub_skill_integration.md`

## 1. Roadmap Goal

Implement tool calling, skill metadata, and ClawHub/OpenClaw compatibility in a
safe order for the Rust AI Agent / Workflow Engine.

The first deliverable is not remote skill execution. The first deliverable is a
metadata-compatible, inspectable, cacheable, and dry-run-only foundation:

```text
search -> inspect -> dry-run install plan -> local catalog -> review
```

Remote skill execution stays behind later policy, approval, audit, and sandbox
milestones.

## 2. Existing Design And New Design Summary

Existing designs establish that Dore is local-first, file-backed, and
policy-oriented. `09_clawhub_skill_integration.md` already separates ClawHub
search, install, activation, trust, and visibility. The security design adds a
capability model and policy decision API. The milestone roadmap places
metadata and dry-run skill work in Phase 2, durable workflow in Phase 3, and
policy-enforced execution in Phase 4.

The new compatibility design adds:

- `tool_descriptor.v1`
- `function_call_request.v1`
- `tool_invocation.v1`
- `tool_result.v1`
- `tool_error.v1`
- `skill_metadata.v1`
- ClawHub metadata mapping rules
- `SKILL.md` parsing rules
- install, enable, trust, execute lifecycle table
- checksum-first package verification
- offline cache and package lock strategy
- CLI behavior for ClawHub, skill, and policy commands

The roadmap below connects those artifacts to implementation milestones.

## 3. Non-Goals

- Do not execute remote skill code in Phase 2.
- Do not install package dependencies in Phase 2.
- Do not treat `enable` as `trust`.
- Do not treat `trust` as permission to execute.
- Do not support signature/provenance verification before checksum-based
  verification is complete.
- Do not claim strong OS sandboxing before the Phase 4 sandbox MVP exists.
- Do not allow `SKILL.md` or registry metadata to modify policy, approvals, or
  system prompts.

## 4. Phase Alignment

| Existing Roadmap Phase | Compatibility Scope |
| --- | --- |
| Phase 0: Design-Only Foundation | Complete schema, lifecycle, trust boundary, and CLI design. |
| Phase 1: Minimal Local Agent Runtime | Provide artifact store, config, policy enum, report rendering, and CLI foundation needed by metadata work. |
| Phase 2: Tool And Skill Foundation | Implement tool schema, skill metadata, ClawHub search/inspect, local catalog, parser, cache, and dry-run install. |
| Phase 3: Durable Workflow Engine | Make catalog updates, install plans, review records, and approval pauses resumable and auditable. |
| Phase 4: Policy-Enforced Execution Boundary | Add policy-gated execution, sandbox runner, tool result validation, and fixture-only skill execution. |
| Phase 5: Hardening And Compatibility | Add compatibility suite, performance targets, signature/provenance planning, and release checks. |

## 5. MVP Scope

MVP for this roadmap is Phase 2 metadata compatibility.

Required CLI:

```bash
agent clawhub search
agent clawhub inspect
agent clawhub install --dry-run
agent skill list
agent skill review
agent policy show
```

Allowed with strict limits:

```bash
agent skill enable
```

`agent skill enable` may update local catalog visibility for local or already
installed skills, but it must not trust or execute them.

MVP must produce durable artifacts:

- raw registry cache
- normalized metadata JSON
- local catalog JSON
- install plan JSON
- install review Markdown
- policy explanation output
- audit events for metadata actions

## 6. Implementation Milestones

### P2.M1 Schema Foundation

Deliverables:

- `tool_descriptor.v1`
- `function_call_request.v1`
- `tool_invocation.v1`
- `tool_result.v1`
- `tool_error.v1`
- `skill_metadata.v1`
- `skill_install_plan.v1`
- `clawhub_lock.v1`
- `cache_record.v1`

Acceptance criteria:

- Schemas deserialize and validate with fixture examples.
- Unknown schema versions are rejected with typed errors.
- Tool descriptors without capability declarations are unavailable for
  execution.
- Skill metadata keeps trusted display fields separate from raw untrusted refs.

Tests:

- Unit tests for serde round-trip.
- JSON fixture tests for valid and invalid records.
- Snapshot tests for error messages.

### P2.M2 Tool Registry And Function Projection

Deliverables:

- Local tool registry loader.
- Duplicate and alias detection.
- Provider function projection from internal schema.
- Function call parser back into internal request envelope.

Acceptance criteria:

- A model-visible function cannot exist without an internal descriptor.
- Ambiguous aliases are rejected.
- Arguments validate against the internal schema, not provider payload shape.
- No tool executes in this milestone.

Tests:

- Unit tests for alias conflicts.
- Unit tests for invalid arguments.
- Fixture tests for provider projection and reverse parsing.

### P2.M3 ClawHub Registry Client And Raw Cache

Deliverables:

- Registry config.
- `agent clawhub search`.
- `agent clawhub inspect`.
- Raw response cache under `state_root/cache/clawhub/`.
- Offline cache lookup with `--offline`.

Acceptance criteria:

- Search and inspect work against local fixtures before network is enabled.
- Raw responses are stored with request hash, response hash, fetched time, and
  mapping version.
- `--offline` makes no network calls.
- Network registry access is represented as a policy-visible metadata action.

Tests:

- Fixture search and inspect tests.
- Offline cache hit and miss tests.
- Malformed response tests.
- Network-disabled policy tests.

### P2.M4 ClawHub Mapping And `SKILL.md` Parser

Deliverables:

- ClawHub/OpenClaw metadata mapping adapter.
- `SKILL.md` parser with front matter, H1, summary, requirements, capabilities,
  body ref, and prompt-injection findings.
- Unknown-field preservation in raw cache.

Acceptance criteria:

- Registry fields map deterministically into `skill_metadata.v1`.
- Missing checksum blocks dry-run install acceptance.
- `SKILL.md` body remains untrusted.
- Prompt-injection indicators appear in review findings.
- Capability declarations are parsed as requests, not grants.

Tests:

- Fixture variants for ClawHub metadata.
- Hostile `SKILL.md` tests.
- Oversized, binary, and invalid UTF-8 tests.
- Capability and requirement validation tests.

### P2.M5 Local Skill Catalog

Deliverables:

- `state_root/skill/catalog.json`.
- Catalog state transitions for discovered, cached, installed, enabled,
  reviewed, trusted, and unavailable.
- `agent skill list`.
- `agent skill review`.
- Visible snapshot builder placeholder.

Acceptance criteria:

- Catalog can merge registry discoveries without losing local review state.
- `skill list` explains install, enable, review, trust, readiness, and
  unavailable reasons.
- `skill review` creates a review packet for exact source/version/checksum.
- Visible snapshot excludes uninstalled or disabled skills and excludes every
  executable path in Phase 2.

Tests:

- Unit tests for catalog merge behavior.
- State transition tests.
- Review packet snapshot tests.
- Regression test that enable does not imply trust or execution.

### P2.M6 Dry-Run Install Planner

Deliverables:

- `agent clawhub install --dry-run`.
- Archive checksum validation.
- Archive manifest builder.
- Path-safety validator.
- Predicted origin, lock, catalog, and file operation report.
- JSON install plan and Markdown review report.

Acceptance criteria:

- Dry-run writes only state-root plan/report artifacts and cache blobs.
- No files are copied into `workspace/skills/`.
- No `.clawhub/lock.json` is written by dry-run.
- Checksum mismatch blocks the plan.
- Path traversal, absolute paths, unsafe symlinks, missing `SKILL.md`, and
  oversized archives are rejected.

Tests:

- Archive fixture tests.
- Path traversal and symlink tests.
- Checksum mismatch tests.
- Snapshot tests for install plan output.
- Filesystem assertion that workspace is unchanged after dry-run.

### P2.M7 Policy Explanation CLI

Deliverables:

- `agent policy show`.
- Subject-specific explanation for tools and skills.
- Runtime mode display: design-only, metadata-only, execution-enabled later.
- Approval and sandbox summary display.

Acceptance criteria:

- The CLI explains why remote execution is unavailable in the MVP.
- The CLI shows whether registry network reads are allowed, denied, or
  offline-only.
- The CLI can explain a skill subject's current lifecycle state.

Tests:

- Snapshot tests for policy output.
- Deny, dry-run, approval-required, and allow fixture policies.

### P2.M8 Catalog-Only Enable

Deliverables:

- `agent skill enable`.
- Snapshot invalidation.
- Enable policy check.

Acceptance criteria:

- Only installed or local skills can be enabled.
- Critical parser/security findings block enable.
- Enable does not write trust records.
- Enable does not expose executable tools in Phase 2.
- Remote-origin enable requires approval unless policy explicitly allows it.

Tests:

- Enable success and failure tests.
- Critical finding blocks enable.
- Regression test for `enable != trust`.
- Regression test for `enable != execute`.

## 7. Phase 3 Milestones

### P3.M1 Durable Review And Approval Records

Deliverables:

- Review records linked to exact source/version/checksum.
- Approval records for install, enable, trust, and future execute actions.
- Resume support for paused install/review workflows.

Acceptance criteria:

- Interrupted review can resume from last valid artifact.
- Approval fingerprint must match action, subject, version, checksum, and
  capability set.
- Markdown-only approval is rejected.

### P3.M2 Catalog Locking And Atomic Updates

Deliverables:

- File lock around catalog and cache index updates.
- Atomic writes for catalog, lock plans, review records, and visible snapshots.
- Stale lock detection.

Acceptance criteria:

- Concurrent CLI commands do not corrupt catalog state.
- Partial writes recover cleanly.

## 8. Phase 4 Milestones

### P4.M1 Policy-Gated Tool Executor

Deliverables:

- `ActionIntent` conversion for every tool invocation.
- Policy evaluation hook.
- Dry-run, approval pause, deny, and allow handling.
- Audit events for decisions.

Acceptance criteria:

- No side effect occurs before policy decision.
- Missing capability declaration blocks execution.
- Approval must match capability fingerprint.

### P4.M2 Sandbox MVP

Deliverables:

- Restricted process runner.
- Command allowlist.
- Temp workspace.
- Env allowlist.
- Timeout and output limits.
- Redaction and result classification.

Acceptance criteria:

- Process tools run only through the sandbox runner.
- Network is denied unless policy grants specific hosts.
- Secrets are not inherited by child processes.

### P4.M3 Fixture-Only Skill Execution

Deliverables:

- Execution for trusted local fixture skills only.
- Skill-owned tool descriptor generation.
- Tool result parser and prompt-injection guardrail.

Acceptance criteria:

- Public ClawHub skills still do not execute by default.
- Trusted fixture skill action still needs per-action policy allow or approval.
- Skill tool output cannot alter policy, trust, or approvals.

## 9. Phase 5 Milestones

### P5.M1 ClawHub Compatibility Suite

Deliverables:

- Registry fixture corpus.
- Archive fixture corpus.
- OpenClaw origin and lock compatibility tests.
- Offline cache regression suite.

Acceptance criteria:

- Search, inspect, dry-run install, lock planning, and catalog review pass
  compatibility fixtures.
- Unknown fields are preserved and ignored safely.

### P5.M2 Verification Hardening Plan

Deliverables:

- Signature/provenance schema proposal.
- Publisher identity model proposal.
- Transparency or attestation integration options.

Acceptance criteria:

- Checksum remains mandatory.
- Signature/provenance are additive and do not weaken existing policy.

### P5.M3 Release Readiness

Deliverables:

- CLI help docs.
- Security regression tests.
- Startup and cache performance benchmark.
- Migration tests for schema version changes.

Acceptance criteria:

- Metadata commands have stable output.
- Offline mode works without network.
- Cache and catalog migrations are tested.
- Release notes explicitly state that remote skill execution is policy-gated
  future functionality unless Phase 4 execution is enabled.

## 10. CLI Rollout Order

1. `agent policy show`
2. `agent clawhub search --offline` against fixtures/cache
3. `agent clawhub inspect --offline`
4. `agent skill list`
5. `agent skill review`
6. `agent clawhub search` with policy-controlled network
7. `agent clawhub inspect` with policy-controlled network
8. `agent clawhub install --dry-run`
9. `agent skill enable` as catalog-only

This order keeps policy visibility available before remote metadata commands
and keeps dry-run install after parser, catalog, and cache behavior exist.

## 11. Documentation Tasks

- Add schema reference for tool and skill records.
- Add ClawHub compatibility reference with mapping table.
- Add `SKILL.md` authoring and parsing notes that clearly label untrusted
  content handling.
- Add CLI command reference for ClawHub, skill, and policy commands.
- Add dry-run install report examples.
- Update `AGENTS.md` only after real source directories, test commands, or
  workflow commands are added.

## 12. Security Gates

Before Phase 2 is considered complete:

- Remote skill execution must be impossible.
- Dry-run install must prove no workspace writes.
- Checksum mismatch must block package planning.
- Path traversal must be tested.
- Prompt injection in `SKILL.md` must be detected and labeled.
- `enable`, `trust`, and `execute` must be separate catalog or policy states.
- `policy show` must explain the current no-execution posture.

Before Phase 4 execution is considered complete:

- Every tool/skill invocation must create an `ActionIntent`.
- Every side effect must be preceded by policy evaluation.
- Every approval must match a capability fingerprint.
- Every process execution must use the sandbox runner.
- Tool results must be validated, redacted, classified, and audited.

## 13. Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| ClawHub metadata changes shape. | Keep raw response cache, version mapping adapters, and unknown-field preservation. |
| Users confuse install with execution readiness. | CLI output shows lifecycle columns and `policy show` explains disabled execution. |
| `SKILL.md` prompt injection enters model context. | Store body as untrusted raw ref, show labeled excerpts only, and quarantine suspicious content. |
| Dry-run accidentally mutates workspace files. | Use explicit write allowlist for state-root artifacts and add filesystem unchanged tests. |
| Checksum-only verification is mistaken for supply-chain trust. | Label checksum as integrity only; defer signature/provenance to Phase 5 hardening. |
| Catalog state becomes inconsistent across concurrent commands. | Add Phase 3 locking and atomic update milestone before broad install/update workflows. |
| Provider function calling bypasses internal schema. | Always project from internal descriptors and route provider calls back through exact internal IDs. |

## 14. Release Checklist

- `cargo test` passes for schema, parser, catalog, cache, and dry-run planner.
- Fixture-based `search`, `inspect`, `install --dry-run`, `skill list`,
  `skill review`, and `policy show` smoke tests pass.
- Offline mode tests prove no network access.
- Security fixtures cover malicious `SKILL.md`, path traversal, checksum
  mismatch, oversized archive, unsafe symlink, and hidden prompt injection.
- Generated install plans and review reports are deterministic.
- Documentation states that external skill execution requires later policy,
  approval, and sandbox gates.
