# Security, Policy, Guardrails, And Sandboxing Roadmap

Status: Proposed
Created: 2026-04-26 00:12:33 UTC
Basis: `docs/designs/20260426_001233_security_policy_guardrails_sandboxing.md`
Scope: Development roadmap for Dore security model, policy engine, guardrails, and sandbox MVP

## 1. Roadmap Goal

Implement enforceable security boundaries for Dore before unrestricted tool,
skill, shell, network, or source-modifying workflows are available. The roadmap
keeps the current product order intact: design-only runtime first, metadata and
dry-run skill handling second, durable workflow third, then restricted execution
behind policy, approval, guardrails, audit, and sandbox controls.

The first secure execution milestone does not claim complete OS isolation. It
ships a policy-first MVP with dry-run, explicit approval, least-privilege
capability declarations, a restricted command runner, temporary workspace,
environment filtering, default-deny network, resource limits, and auditability.

## 2. Implementation Order

1. Add policy and capability schemas while design-only mode still blocks
   execution.
2. Route all proposed actions through a single policy decision API.
3. Add approval records and exact capability fingerprint matching.
4. Add input, output, prompt-injection, and tool-result guardrails.
5. Add append-only audit events for policy, approval, guardrail, secret, skill,
   tool, and sandbox events.
6. Add restricted command runner with allowlist, temp workspace, env filtering,
   timeout, output caps, and redaction.
7. Pilot only reviewed local fixture tool/skill execution.
8. Defer remote skill execution, broad network, package-manager execution, and
   full OS sandboxing until later hardening milestones.

## 3. Non-Goals

- No unrestricted shell execution.
- No remote skill execution from public registry content in the MVP.
- No package-manager execution as an automatic agent action.
- No autonomous policy weakening.
- No raw secret storage in prompts, state, logs, reports, or audit events.
- No claim of kernel-level sandbox isolation in the MVP.

## 4. Phase 0: Security Design Finalization

### Goal

Turn the security design into implementable schemas, CLI examples, and test
fixtures before runtime execution is enabled.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| S0.M1 Existing design alignment | Summary of security decisions from system architecture, provider/auth, ClawHub, design-only runtime, and prior roadmap | Conflicts are resolved and Phase 4 remains the first execution phase |
| S0.M2 Threat model and trust boundaries | Threat model, boundary diagram, actor/asset/action inventory | External tools, skills, registry content, `SKILL.md`, shell, network, and provider calls are explicit trust boundaries |
| S0.M3 Capability vocabulary | Capability names and fields for file, process, network, env, secret, temp workspace, and resources | Every dangerous operation can be represented without free-form text |
| S0.M4 Policy schema draft | `policy.v1` TOML schema with rule effects and command allowlist | Schema can express deny, dry-run, approval, and allow outcomes |
| S0.M5 Approval matrix | Always-approval and dry-run-only action lists | Required policy questions are answered in reviewable form |
| S0.M6 CLI review draft | `policy check`, `run --dry-run`, `approval`, `audit`, `skill install --dry-run`, `tool run --dry-run` examples | A user can inspect requested capabilities before execution |

### Verification

- Manually review policy matrix against file read/write, process spawn, network,
  env, secret, skill, tool, and sandbox actions.
- Validate schema examples against planned Rust `serde` structs.
- Check that every always-approval action has an audit event and CLI review
  surface.

## 5. Phase 1: Policy Core In Design-Only Runtime

### Goal

Introduce policy evaluation without enabling dangerous execution. Design-only
runtime may create action intents, but policy blocks or dry-runs them.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| S1.M1 Rust policy module | `policy` module with `ActionIntent`, `CapabilityRequest`, `PolicyDecision`, and typed errors | Unit tests cover default deny and rule precedence |
| S1.M2 Policy file loader | TOML parser, schema version check, rule normalization, validation errors | Invalid policy files fail closed with clear diagnostics |
| S1.M3 Decision API | `decide(intent, context) -> PolicyDecision` | All proposed actions receive deny, dry-run, approval, or allow |
| S1.M4 Design-only enforcement | Workflow creates intents for proposed writes/execution but does not execute them | Source writes, shell, network, and skill execution remain blocked by default |
| S1.M5 CLI policy inspection | `dore policy check --action`, `dore policy show` | CLI prints matched rule, requested capabilities, and decision |

### Verification

- Unit tests: deny precedence, dry-run precedence, missing capability, explicit
  approval, explicit allow, unsupported schema.
- Integration tests: design-only run with generated dangerous action creates a
  blocked or dry-run report.
- Regression test: no tool, shell, network, or skill execution path exists in
  design-only mode.

## 6. Phase 2: Approval, Secrets, And Audit Foundation

### Goal

Make approval and audit durable before any restricted execution is introduced.
Secrets remain reference-only.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| S2.M1 Approval record schema | `approval.v1` with run ID, action ID, actor, subject, expiry, scope, and capability fingerprint | Markdown-only approval cannot satisfy execution |
| S2.M2 Approval enforcement | Approval matching API and expiry handling | Unmatched, expired, broad, or stale approvals are rejected |
| S2.M3 SecretRef model | Secret reference type and redaction utilities | Raw secret values cannot serialize into state, prompt, report, or audit structs |
| S2.M4 Audit event schema | Append-only `audit_event.v1` JSONL writer | Policy decisions, approvals, guardrail findings, secret events, and run events are recorded |
| S2.M5 Audit CLI | `dore audit tail`, `dore audit show --run` | User can inspect security events without raw secrets |

### Verification

- Unit tests: approval fingerprint matching, approval expiry, redaction,
  serialization denial for raw secret wrappers.
- Integration tests: approval requested, approved, consumed, rejected, and
  expired flows.
- Secret regression fixtures: fake API keys never appear in persisted artifacts.

## 7. Phase 3: Guardrail And Validation Pipeline

### Goal

Prevent untrusted input, model output, skill content, and tool results from
silently entering trusted runtime state.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| S3.M1 Input guardrail | Source trust labeling, size limits, provenance, secret scan, prompt-injection scan | Untrusted sources are marked before prompt assembly |
| S3.M2 Output guardrail | Structured output parsing, semantic checks, action intent extraction | Model output cannot create trusted actions without validation |
| S3.M3 Safety classifier MVP | Deterministic classifier for prompt injection, secret-like output, destructive commands, exfiltration hints | Known malicious fixtures produce findings |
| S3.M4 Quarantine store | `.dev/quarantine/<content_id>/` raw and sanitized artifacts | Suspected injection is excluded from prompts by default |
| S3.M5 Tool-result validator | Result schema validation, redaction, safety classification, trust promotion gate | Tool output stays untrusted until validation passes |
| S3.M6 Guardrail audit events | Findings, quarantine, redaction, validation fail/pass events | Every guardrail decision is auditable |

### Verification

- Unit tests: classifier patterns, trust labels, redaction, validation errors.
- Integration tests: hostile `SKILL.md` is quarantined; hostile tool output does
  not alter policy or prompt instructions.
- Regression tests: quarantined raw content is not included in prompt packets.

## 8. Phase 4: Sandbox MVP And Restricted Execution Pilot

### Goal

Enable only narrowly reviewed local fixture execution through policy, approval,
guardrails, sandbox setup, and audit.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| S4.M1 Executor boundary | Single execution API for providers, tools, skills, process spawn, network, file mutation, and secrets | Feature modules cannot bypass policy to execute |
| S4.M2 Command allowlist | Exact binary path and argument policy checks | Non-allowlisted commands and shell strings are denied |
| S4.M3 Temporary workspace | Tempdir creation, path mapping, cleanup, retained evidence option | Commands run outside source tree unless explicitly approved |
| S4.M4 Environment filtering | Empty-by-default child env with explicit allowlist | Secret-bearing env vars are not inherited |
| S4.M5 Resource limits | Timeout, max output bytes, max process count, best-effort memory limits | Long-running or noisy commands terminate with audit events |
| S4.M6 Network restriction | Default-deny network capability and provider-specific network policy | Tool/skill network without explicit host policy is denied |
| S4.M7 Restricted command runner | Rust command wrapper with stdout/stderr capture, redaction, result schema, and audit | Approved fixture command runs; unsafe command is blocked |
| S4.M8 Local fixture skill/tool pilot | Reviewed local fixture execution under declared capabilities | Safe fixture succeeds, unsafe fixture leaves blocked report and audit trail |

### Verification

- Unit tests: allowlist match, arg policy, env filter, path mapping, resource
  limit config, output truncation.
- Integration tests: approved fixture run, unapproved run, expired approval,
  denied network, denied shell string, path escape attempt.
- Security tests: stdout secret redaction, oversized output, timeout,
  malicious local fixture.
- Manual CLI smoke: `tool run --dry-run`, approval, execution, audit review.

## 9. Phase 5: Hardening And Remote Skill Readiness

### Goal

Prepare for broader tool and skill usage without weakening MVP defaults.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| S5.M1 Supply-chain verification | Checksums, lockfile enforcement, archive path safety, source provenance, optional signatures | Installed skill content is reproducible and traceable |
| S5.M2 Remote skill install approval | Approved install/update path with scan and readiness reports | Remote install can write skill files only after approval |
| S5.M3 Remote execution gate | Separate execute approval and per-action capability grants | Trusting or enabling a skill still does not grant execution |
| S5.M4 Platform sandbox research | Linux/macOS hardening plan for namespaces, seccomp, cgroups, Landlock, bubblewrap, or platform equivalents | MVP guarantees and future OS guarantees remain clearly separated |
| S5.M5 Policy migration and compatibility | Versioned policy migrations and compatibility fixtures | Old policies fail closed or migrate explicitly |
| S5.M6 Security release gate | End-to-end regression suite for policy, approval, guardrail, audit, sandbox, and secret redaction | Release cannot pass with missing audit or policy bypass |

### Verification

- Compatibility tests with ClawHub fixture metadata and hostile archives.
- Regression suite for install, enable, trust, execute separation.
- Platform-specific sandbox experiments documented as non-MVP hardening.

## 10. Milestone Connection To Main Roadmap

| Main Roadmap Phase | Security Roadmap Milestones |
| --- | --- |
| Phase 0: Design-only foundation | S0.M1-S0.M6 |
| Phase 1: Minimal local runtime | S1.M1-S1.M5 and S2.M1-S2.M5 schemas may start here without enabling execution |
| Phase 2: Tool and skill foundation | S3.M1, S3.M4, S5.M1 for metadata, dry-run install, scan, quarantine, and supply-chain fixtures |
| Phase 3: Durable workflow engine | S2.M4-S2.M5 audit, approval resume semantics, and durable guardrail events |
| Phase 4: Safety and sandboxing | S3.M1-S3.M6 and S4.M1-S4.M8 are required before fixture execution |
| Phase 5: Production hardening | S5.M1-S5.M6 |

## 11. Required Policy Question Coverage

| Question | Roadmap Coverage |
| --- | --- |
| What always requires approval? | S0.M5, S2.M1-S2.M2, S4 restricted execution milestones |
| What is dry-run only? | S0.M5, S1.M4, S5 remote skill readiness gates |
| How are file read, file write, process spawn, and network declared? | S0.M3, S1.M1, S1.M3 |
| How are skill metadata trust and skill execution trust separated? | S0.M2, S3.M1, S5.M2-S5.M3 |
| How are secrets excluded from state, logs, and prompts? | S2.M3-S2.M5, S3.M1-S3.M2, S4.M7 |
| What audit events are mandatory? | S2.M4-S2.M5, S3.M6, S4.M7 |
| How is suspected prompt injection quarantined? | S3.M1, S3.M3-S3.M4 |

## 12. Release Readiness Checklist

- Policy default is deny.
- Every action intent has explicit capability declarations.
- Every execution path goes through the executor boundary.
- Always-approval actions cannot execute with missing or broad approvals.
- Dry-run-only actions cannot mutate state outside dry-run reports.
- Remote skill lifecycle keeps metadata, install, enable, trust, and execute
  separate.
- Secrets are represented by `SecretRef` and redacted from all persisted
  artifacts.
- Prompt injection fixtures are quarantined and excluded from prompt context.
- Restricted runner blocks non-allowlisted commands and shell strings.
- Network is denied by default.
- Audit events exist for decisions, approvals, guardrails, sandbox execution,
  secrets, skill lifecycle, and failures.
- Documentation states sandbox MVP guarantees and non-guarantees clearly.
