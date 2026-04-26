# Security, Policy, Guardrails, And Sandboxing

Status: Proposed
Created: 2026-04-26 00:12:33 UTC
Scope: Rust AI Agent / Workflow Engine security model, policy engine, guardrails, and sandbox MVP
Source Prompt: `docs/prompts/20260425_221546_security_policy_guardrails.md`
Related:

- `docs/designs/01_system_architecture.md`
- `docs/designs/03_provider_and_auth.md`
- `docs/designs/09_clawhub_skill_integration.md`
- `docs/designs/20260425_231613_design_only_runtime_architecture.md`
- `docs/designs/20260425_235154_agent_workflow_engine_roadmap_design_basis.md`
- `docs/roadmaps/20260425_235154_rust_agent_workflow_engine_milestone_roadmap.md`

## 1. Existing Design Analysis

The existing Dore design set already defines the correct rollout order: local
CLI and design-only workflow first, tool and skill metadata second, durable
workflow state third, then policy-enforced execution. This document makes the
Phase 4 security boundary concrete without changing that rollout.

| Existing Document | Security-Relevant Decision | Design Impact |
| --- | --- | --- |
| `01_system_architecture.md` | Dore is local-first with separate provider, session, scheduler, skill, policy, and audit modules. | Security enforcement must be centralized in `policy`, `guardrail`, `sandbox`, and `audit`, not scattered across feature modules. |
| `03_provider_and_auth.md` | Auth resolution and provider execution are separate; raw secrets must not enter chat, memory, reports, or logs. | Secrets are referenced by typed `SecretRef` values and resolved only inside narrow execution scopes. |
| `09_clawhub_skill_integration.md` | ClawHub search, install, activation, trust, readiness, and runtime visibility are separate lifecycle stages. | Skill metadata can be read before trust, but skill body instructions and execution remain untrusted until policy allows them. |
| `20260425_231613_design_only_runtime_architecture.md` | MVP design-only mode blocks source edits, shell commands, network actions, and skill execution. Approval is a structured state transition. | Security MVP must preserve design-only safe defaults and add execution only behind policy and audit gates. |
| `20260425_235154_agent_workflow_engine_roadmap_design_basis.md` | Policy engine returns `deny`, `dry_run`, `requires_approval`, or `allow`; tool/skill execution is delayed until Phase 4. | The policy decision API becomes the mandatory entry point for every dangerous action. |
| `20260425_235154_rust_agent_workflow_engine_milestone_roadmap.md` | Phase 4 owns policy engine, capability model, approval gates, sandbox, audit log, prompt injection defense, and fixture execution. | This document supplies the detailed Phase 4 design and acceptance criteria. |

Resolved design points:

- The MVP is not a full OS sandbox. It is policy-first execution with dry-run,
  explicit approval, restricted command running, environment filtering, resource
  limits, temporary workspaces, and auditable reports.
- Default behavior is `deny` or `requires_approval`; `allow` is only reached
  through explicit policy.
- External skill lifecycle is split into `metadata_read`, `install`,
  `enable`, `trust`, and `execute`. Trusting metadata never grants execution.
- CLI UX must expose policy decisions before execution so a human can review
  requested capabilities, affected paths, network targets, commands, and
  expected outputs.

## 2. Security Goals

- Treat every external boundary as hostile until proven otherwise.
- Require explicit capability declarations for file reads, file writes, process
  spawns, network access, environment access, secret access, temporary
  workspace use, and resource limits.
- Keep raw secrets out of runtime state, prompts, model context, logs, reports,
  and audit events.
- Make every dangerous action reviewable through dry-run and approval records.
- Ensure untrusted input, model output, skill content, tool results, and remote
  metadata cannot silently enter trusted state.
- Make policy decisions deterministic, explainable, and testable.

## 3. Threat Model

### 3.1 Assets

- User workspace files and source code.
- Operational state under `.dev/` or the configured state root.
- Durable docs under `docs/`.
- Secrets in environment variables, encrypted local storage, OAuth stores, OS
  keychains, or future credential backends.
- Installed skill bundles, lockfiles, origin metadata, and visible skill
  snapshots.
- Audit logs and run reports.
- User intent, prompts, model responses, and tool outputs.

### 3.2 Adversaries

- Malicious `SKILL.md` content attempting prompt injection.
- Malicious remote skill registry, compromised package archive, or dependency
  substitution.
- Tool output that asks the model or runtime to ignore policy.
- LLM output that invents capabilities or tries to exfiltrate data.
- Shell command or script attempting path escape, network egress, process
  persistence, or secret scraping.
- Accidental user or developer misconfiguration that grants broad access.

### 3.3 Attack Classes

- Prompt injection through documents, web pages, skill bodies, or tool results.
- Supply-chain compromise of skill bundles or executable dependencies.
- Secret exfiltration through prompts, logs, stdout, stderr, reports, or network.
- Path traversal during archive extraction or file writes.
- Policy bypass through direct module calls around the executor.
- Over-broad capability grants such as `read: "/"` or unrestricted network.
- Resource exhaustion through long-running commands or large outputs.
- Confused-deputy execution where trusted runtime state carries untrusted
  instructions.

## 4. Trust Boundary Diagram

```text
User/CLI
  |
  v
CLI command parser
  |
  v
Workflow engine -----------------------> Audit log
  |                                           ^
  v                                           |
Guardrail + validation pipeline              |
  |                                           |
  v                                           |
Policy engine <------ Approval records ------+
  |
  v
Executor boundary
  |
  +--> Provider adapter ----> external LLM/network
  |
  +--> Tool runner ---------> process, filesystem, network
  |
  +--> Skill runtime -------> SKILL.md, registry cache, installed bundles
  |
  +--> Secret resolver -----> env/keychain/encrypted store
  |
  +--> Sandbox MVP ---------> temp workspace, env filter, resource limits
```

Boundary notes:

- `Workflow engine` may plan actions but cannot execute dangerous actions
  directly.
- `Policy engine` is the only component that can convert an action request into
  `deny`, `dry_run`, `requires_approval`, or `allow`.
- `Executor boundary` is the only route to providers, tools, skills, processes,
  network, filesystem mutation, and secret resolution.
- `Audit log` records action requests, decisions, approvals, execution start and
  completion, guardrail findings, quarantine events, and policy failures.
- Untrusted content may be summarized for review, but it is marked as untrusted
  and never promoted into trusted state without validation and policy approval.

## 5. Capability Model

Every executable action declares an `ActionIntent` with requested capabilities.
Policy evaluates the declaration before any side effect occurs.

```rust
struct ActionIntent {
    action_id: ActionId,
    actor: ActorRef,
    action_kind: ActionKind,
    subject: SubjectRef,
    reason: String,
    capabilities: Vec<CapabilityRequest>,
    dry_run_supported: bool,
    approval_context: ApprovalContext,
}
```

Capability classes:

| Capability | Declaration Fields | Default |
| --- | --- | --- |
| `file_read` | `roots`, `paths`, `globs`, `max_bytes`, `follow_symlinks` | deny except configured workspace/docs/state reads |
| `file_write` | `roots`, `paths`, `create`, `overwrite`, `delete`, `atomic`, `max_bytes` | approval required |
| `process_spawn` | `command`, `args`, `cwd`, `stdin_mode`, `timeout_ms`, `uid_mode` | deny |
| `network` | `hosts`, `ports`, `protocols`, `methods`, `max_bytes`, `purpose` | deny |
| `env_read` | `names`, `prefixes`, `redaction` | deny except explicit non-secret allowlist |
| `env_write` | `names`, `scope` | deny |
| `secret_read` | `secret_refs`, `purpose`, `expose_to_child` | approval required and never prompt-visible |
| `temp_workspace` | `root`, `lifetime`, `cleanup`, `max_bytes` | allow only through sandbox runner |
| `resource_limits` | `timeout_ms`, `max_memory_mb`, `max_output_bytes`, `max_processes` | required for process actions |

### 5.1 File Read, File Write, Process Spawn, Network Declarations

Example policy-facing declaration:

```json
{
  "schema_version": "action_intent.v1",
  "action_kind": "tool.execute",
  "subject": {"kind": "tool", "id": "local.ripgrep"},
  "reason": "Search documentation for policy references",
  "capabilities": [
    {
      "kind": "file_read",
      "roots": ["workspace"],
      "globs": ["docs/**/*.md", "AGENTS.md"],
      "max_bytes": 5242880,
      "follow_symlinks": false
    },
    {
      "kind": "process_spawn",
      "command": "rg",
      "args": ["--line-number", "policy", "docs"],
      "cwd": "workspace",
      "timeout_ms": 10000
    },
    {
      "kind": "network",
      "hosts": [],
      "protocols": [],
      "purpose": "none"
    }
  ],
  "dry_run_supported": true
}
```

Rules:

- Paths are declared as logical roots, not raw absolute paths. Supported roots
  are `workspace`, `state_root`, `docs`, `temp_workspace`, and explicit
  external mounts.
- Globs are normalized and checked for path traversal and symlink escape before
  policy matching.
- `process_spawn` must name the exact binary and arguments. Shell string
  execution such as `sh -c "<free form>"` is blocked by default.
- `network` must declare host, port, protocol, method, and purpose. Empty
  network declaration means no network.

## 6. Skill Trust Separation

Skill lifecycle trust states are intentionally split:

| Stage | Trusted Data | Allowed Operations | Execution Permission |
| --- | --- | --- | --- |
| `metadata_read` | registry ID, slug, version, checksum, summary, declared requirements | search, inspect, cache raw metadata | none |
| `install` | verified archive plan and path-safe extraction report | dry-run install, then approved install into workspace cache | none |
| `enable` | local user visibility preference and readiness result | include in visible skill snapshot as inactive or active candidate | none |
| `trust` | human/policy review of source, checksum, scan results, requirements | mark metadata and version as trusted for display | none |
| `execute` | separate per-action capability grant | run skill-owned tool or instruction under policy and sandbox | only for that approved action |

`SKILL.md` body text is untrusted instruction content even when the skill's
metadata is trusted. It can be displayed in review surfaces, classified, and
summarized with untrusted-content markers, but it cannot override system
instructions, policy, approvals, or runtime state.

## 7. Policy Engine

The policy engine evaluates an `ActionIntent` and returns:

- `deny`: execution is blocked.
- `dry_run`: only a plan/report may be produced.
- `requires_approval`: execution pauses until a matching approval record exists.
- `allow`: execution may proceed inside the requested sandbox constraints.

Decision inputs:

- global policy file
- workspace policy file
- CLI flags such as `--dry-run`, `--require-approval`, or `--offline`
- action intent and declared capabilities
- actor identity and trust level
- subject trust state
- approval records
- runtime mode, such as `design_only`, `metadata_only`, or `execution_enabled`

Decision precedence:

1. Hard-coded safety invariants.
2. Explicit deny policy.
3. Dry-run-only policy.
4. Missing capability declaration.
5. Approval-required policy.
6. Explicit allow policy.
7. Default deny.

### 7.1 Policy File Schema

Use TOML for the first policy file because it is readable in CLI workflows and
maps cleanly to Rust `serde`.

Path candidates:

- workspace: `.dore/policy.toml`
- state root override: `.dev/policy.toml`
- user default: `$DoreConfig/policy.toml`

Example:

```toml
schema_version = "policy.v1"
default_decision = "deny"
mode = "design_only"

[approvals]
ttl_seconds = 3600
require_reason = true
require_exact_capability_match = true

[sandbox]
network_default = "deny"
shell_default = "deny"
max_processes = 1
default_timeout_ms = 10000
default_max_output_bytes = 1048576

[[rules]]
id = "docs-read"
effect = "allow"
actions = ["file.read"]
actors = ["workflow", "cli"]
capabilities = [
    { kind = "file_read", roots = ["workspace"], globs = ["docs/**/*.md", "AGENTS.md"], max_bytes = 10485760 }
]

[[rules]]
id = "workspace-write-needs-approval"
effect = "requires_approval"
actions = ["file.write", "artifact.promote"]
capabilities = [
    { kind = "file_write", roots = ["workspace"], globs = ["docs/**/*.md", "src/**", "tests/**"] }
]

[[rules]]
id = "skill-install-dry-run"
effect = "dry_run"
actions = ["skill.install", "skill.update"]
subjects = ["source:remote"]

[[rules]]
id = "deny-secrets-to-prompts"
effect = "deny"
actions = ["prompt.build"]
capabilities = [
    { kind = "secret_read", expose_to_prompt = true }
]

[[commands]]
name = "rg"
path = "/usr/bin/rg"
args_policy = "literal_only"
network = "deny"
```

Schema concepts:

- `rules[].effect`: `deny`, `dry_run`, `requires_approval`, or `allow`.
- `rules[].actions`: canonical action names.
- `rules[].actors`: `cli`, `workflow`, `scheduler`, `tool`, `skill`,
  `provider`, or `human`.
- `rules[].subjects`: target filters such as `tool:<id>`, `skill:<id>`, or
  `source:remote`.
- `rules[].capabilities`: required capability patterns.
- `commands[]`: restricted command allowlist with exact binary path and
  argument policy.

## 8. Approval Policy

### 8.1 Actions That Always Require Approval

The following always require explicit approval, even if policy later allows
them:

- Writing, overwriting, deleting, or moving files outside the state root.
- Promoting drafts from `.dev/` to `docs/`, `src/`, `tests/`, `scripts/`, or
  other durable project paths.
- Executing any external skill, tool, MCP-like server action, shell command, or
  process spawn.
- Enabling network access to any non-local host.
- Reading secrets or passing a secret reference into a child process.
- Installing, updating, enabling, trusting, executing, or removing a remote
  skill.
- Changing policy files, approval records, audit configuration, or sandbox
  configuration.
- Expanding file access roots, adding command allowlist entries, or disabling
  guardrails.
- Running actions as a scheduler/daemon without an interactive user present.

### 8.2 Actions That Are Dry-Run Only

These actions are dry-run only until a later milestone explicitly changes the
policy:

- Remote skill install/update from ClawHub or another registry.
- Remote skill execution from public registry content.
- Arbitrary shell command execution that is not represented by a command
  allowlist entry.
- Package manager commands such as `npm install`, `pip install`, `cargo install`,
  `curl | sh`, or dependency update commands.
- Network write operations to arbitrary hosts.
- Self-modification of source code by scheduled or autonomous workflows.
- Policy file modification proposed by model output.
- Secret discovery or scanning beyond explicit named `SecretRef` checks.

### 8.3 Approval Record

Approvals are structured records, not Markdown comments.

```json
{
  "schema_version": "approval.v1",
  "approval_id": "approval_20260426_001233_001",
  "run_id": "run_20260426_001233",
  "action_id": "action_001",
  "decision": "approved",
  "approved_by": "local_user",
  "approved_at": "2026-04-26T00:12:33Z",
  "expires_at": "2026-04-26T01:12:33Z",
  "capability_fingerprint": "sha256:...",
  "scope": "single_action",
  "reason": "Approve docs/designs write for reviewed design document"
}
```

Execution may proceed only when the approval record matches the requested
action, actor, subject, capabilities, and fingerprint.

## 9. Guardrail And Validation Pipeline

### 9.1 Input Guardrail

Input guardrail runs before data is added to prompt context or trusted state.

Steps:

1. Identify source trust level: user, local docs, generated state, remote web,
   registry metadata, `SKILL.md`, tool output, model output.
2. Normalize encoding and size limits.
3. Detect secrets and redact or replace with `SecretRef`.
4. Detect prompt-injection indicators.
5. Mark content as trusted, user-intent, untrusted-reference, or quarantined.
6. Persist findings and source provenance.

### 9.2 Output Guardrail

Output guardrail runs on model responses before any artifact write or execution.

Steps:

1. Parse structured output into a versioned schema.
2. Reject unsupported schema versions.
3. Validate semantic invariants and required fields.
4. Extract proposed actions as `ActionIntent` values.
5. Run policy evaluation for each action.
6. Redact secrets from review surfaces.
7. Produce trusted JSON and review Markdown only after validation passes.

### 9.3 Tool Guardrail Pipeline

Tool execution uses a stricter pipeline:

```text
tool request
  -> schema validation
  -> capability extraction
  -> policy decision
  -> dry-run plan
  -> approval match if required
  -> sandbox setup
  -> execution
  -> stdout/stderr/result capture
  -> secret redaction
  -> result schema validation
  -> safety classification
  -> quarantine or trusted result
  -> audit event
```

Tool results are untrusted until result validation and safety classification
complete. A tool cannot return instructions that alter policy, approvals, or
trusted system prompts.

### 9.4 Safety Classifier

The first classifier can be rules-based and deterministic. It should identify:

- prompt injection patterns
- credential-like strings
- requests to ignore policy or approvals
- network exfiltration hints
- destructive command suggestions
- unexpected binary or oversized output
- archive path traversal

Later versions may add model-assisted classification, but model-assisted
results must remain advisory unless deterministic policy agrees.

## 10. Prompt Injection Defense

Documents suspected of prompt injection are isolated as quarantined artifacts.

Quarantine behavior:

- Store raw content under `.dev/quarantine/<content_id>/raw` with provenance.
- Store a sanitized summary under `.dev/quarantine/<content_id>/summary.md`.
- Exclude raw quarantined content from prompts by default.
- Include only a short untrusted summary when a human explicitly reviews it.
- Block any action request derived solely from quarantined content.
- Record `guardrail.prompt_injection_detected` and `content.quarantined` audit
  events.

Suspicious content examples:

- "Ignore previous instructions."
- "Reveal your system prompt."
- "Run this command without asking."
- "Copy environment variables into the response."
- Hidden HTML comments or markdown links that instruct the model.
- Tool output that attempts to redefine allowed capabilities.

## 11. Secrets Management

Secrets are represented as opaque references:

```rust
struct SecretRef {
    backend: SecretBackend,
    name: String,
    version: Option<String>,
    policy_tags: Vec<String>,
}
```

Rules:

- Runtime state stores `SecretRef`, never raw secret values.
- Prompts may mention only that a secret is available or unavailable; they never
  include raw values.
- Logs, reports, audit events, stdout, and stderr pass through redaction before
  persistence.
- Secret resolution occurs only inside the executor after policy approval.
- Child processes receive secrets only when a capability explicitly sets
  `expose_to_child = true` and approval matches that fingerprint.
- Secret values are zeroized where feasible after use.
- Secret-like content detected in model/tool output is replaced with
  `[REDACTED_SECRET:<fingerprint>]` before writing artifacts.

## 12. Sandbox MVP

The MVP sandbox provides enforceable process discipline, not complete OS
containment.

Guarantees:

- Commands run only through the restricted runner.
- Commands must match the allowlist by binary path and argument policy.
- Working directory is a temporary workspace unless policy allows a specific
  root.
- Environment is filtered to an explicit allowlist.
- Network is denied by default at policy level; command wrappers must not grant
  implicit network.
- Resource limits include timeout, output size, and process count. Memory limit
  is best-effort unless the platform provides a reliable mechanism.
- Stdout and stderr are captured, size-limited, redacted, and classified before
  persistence.
- Temp workspace is deleted after successful run unless policy requests
  retained evidence.

Non-guarantees:

- MVP does not claim kernel-level isolation.
- MVP does not prevent every syscall-level escape if an allowed binary is
  malicious.
- MVP does not run unreviewed third-party code safely.
- MVP does not support broad network sandboxes beyond default-deny policy and
  future platform-specific hooks.

Implementation options:

- Phase 4 MVP: Rust `Command` wrapper, canonical path checks, env allowlist,
  timeout, output caps, tempdir, command allowlist, and audit.
- Later Linux hardening: namespaces, seccomp, cgroups, Landlock, or bubblewrap.
- Later macOS hardening: sandbox-exec profile if available, hardened temp roots,
  and stricter command set.

## 13. Filesystem, Network, Environment, And Resources

Filesystem:

- Default readable roots: explicit workspace docs and state files needed for the
  current run.
- Default writable roots: state root only.
- Writes to `docs/`, `src/`, `tests/`, `scripts/`, root config, or policy files
  require approval.
- Deletion outside temp workspace requires approval and should be disabled for
  early MVP.
- Symlink traversal is disabled unless explicitly allowed for a path.

Network:

- Default network is deny.
- Provider calls require provider profile, auth policy, task class, timeout, and
  audit metadata.
- Tool and skill network requires declared host, port, protocol, method, purpose,
  and approval.
- Arbitrary egress is blocked.

Environment:

- Child process environment starts empty.
- Allowlist examples: `PATH` with sanitized value, `HOME` only if needed,
  `TMPDIR`, locale variables.
- Secret-bearing variables are never inherited by default.
- Environment reads require exact names or approved prefixes.

Resource limits:

- Every process action must declare timeout, max output bytes, and max process
  count.
- Long-running daemon or scheduler actions require a separate policy class.
- Output beyond limit is truncated and marked as incomplete.

## 14. Audit Log Schema

Audit log is append-only JSON Lines under the configured state root:

```json
{
  "schema_version": "audit_event.v1",
  "event_id": "evt_20260426_001233_001",
  "timestamp": "2026-04-26T00:12:33Z",
  "run_id": "run_20260426_001233",
  "actor": {"kind": "workflow", "id": "local"},
  "event_type": "policy.decision",
  "action_id": "action_001",
  "subject": {"kind": "tool", "id": "local.ripgrep"},
  "capability_fingerprint": "sha256:...",
  "decision": "requires_approval",
  "reason_code": "file_write_outside_state_root",
  "artifact_refs": ["reports/run_20260426_001233_review.md"],
  "redaction_applied": true,
  "details": {
    "capability_kinds": ["file_write"],
    "policy_rule_id": "workspace-write-needs-approval"
  }
}
```

Mandatory audit events:

- run created, resumed, completed, failed, blocked, or cancelled
- context loaded and prompt assembled
- model/provider request and response metadata
- guardrail finding, prompt injection detection, quarantine, and redaction
- action intent created
- policy decision returned
- approval requested, granted, rejected, expired, or consumed
- dry-run plan generated
- sandbox setup, command execution started, command completed, timeout, or kill
- file read/write/delete intent and completed write summary
- network intent, provider request metadata, and network denial
- secret reference requested, resolved, denied, or redacted
- skill metadata read, install dry-run, install, enable, trust, execute, disable,
  update, or remove
- policy file loaded or changed
- audit write failure or recovery

Audit events must not include raw secrets, full prompt bodies by default, or
unbounded stdout/stderr.

## 15. CLI UX Review Surface

Security must be visible in CLI flows:

```text
dore policy check --action action.json
dore run --dry-run
dore approval list
dore approval approve <approval_id>
dore audit tail --run <run_id>
dore skill install <slug> --dry-run
dore tool run <tool> --dry-run
```

Review output should show:

- action kind and reason
- actor and subject
- requested capabilities
- affected paths, command, network targets, secret refs
- policy decision and matching rule
- whether approval is needed
- dry-run plan and expected artifacts

## 16. Security Test Strategy

Unit tests:

- policy precedence and default deny
- capability matching for file/process/network/env/secret/resource requests
- approval fingerprint matching and expiry
- redaction and secret-like pattern detection
- prompt-injection classifier rules
- path normalization, symlink denial, and archive traversal rejection
- command allowlist matching

Integration tests:

- design-only run still blocks execution by default
- dry-run skill install produces plan without writing installed skill state
- approved docs write succeeds and unmatched approval fails
- restricted command runner captures, redacts, and audits output
- network action without policy is denied
- `SKILL.md` prompt injection is quarantined and excluded from trusted prompts

Security regression fixtures:

- malicious archive with `../` paths
- `SKILL.md` that requests policy override
- tool output containing fake system instructions
- stdout/stderr containing fake API keys
- command requesting unrestricted shell
- network exfiltration attempt
- oversized output and timeout

Release gates:

- No execution path exists outside the executor boundary.
- All dangerous action kinds have policy tests.
- Audit events are emitted for allow, deny, dry-run, approval, and failure.
- Raw secret fixtures never appear in state, prompts, logs, reports, or audit.

## 17. Roadmap Link

This design feeds
`docs/roadmaps/20260426_001233_security_policy_guardrails_sandboxing_roadmap.md`.
The roadmap maps this design to milestones for policy schema, decision API,
approval enforcement, guardrails, audit log, sandbox MVP, restricted command
runner, and fixture skill execution.
