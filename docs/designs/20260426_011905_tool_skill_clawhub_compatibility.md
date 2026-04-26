# Tool, Skill, And ClawHub Compatibility

Status: Proposed
Created: 2026-04-26 01:19:05 UTC
Scope: Rust AI Agent / Workflow Engine tool calling, skill/plugin system, and ClawHub/OpenClaw compatibility
Source Prompt: `docs/prompts/20260425_221546_tool_skill_clawhub.md`
Related:

- `docs/designs/01_system_architecture.md`
- `docs/designs/09_clawhub_skill_integration.md`
- `docs/designs/20260425_231613_design_only_runtime_architecture.md`
- `docs/designs/20260425_235154_agent_workflow_engine_roadmap_design_basis.md`
- `docs/designs/20260426_001233_security_policy_guardrails_sandboxing.md`
- `docs/designs/20260426_004308_ai_agent_technology_classification.md`
- `docs/roadmaps/20260425_235154_rust_agent_workflow_engine_milestone_roadmap.md`

## 1. Existing Design Analysis

The existing design set already defines the correct safety order for external
tools and public skills. This document does not replace those decisions. It
turns them into concrete schemas, CLI behavior, parsing rules, cache/lock
strategy, and MVP implementation boundaries.

| Existing Document | Relevant Decision | Design Impact |
| --- | --- | --- |
| `01_system_architecture.md` | Dore has separate `skill`, `provider`, `session`, `policy`, `audit`, and `quality` modules. | Tool and skill execution must be routed through a shared policy/executor boundary rather than called directly from sessions. |
| `09_clawhub_skill_integration.md` | ClawHub search, install, activation, trust, readiness, and runtime visibility are separate lifecycle stages. | The compatibility layer keeps `discover`, `install`, `enable`, `trust`, and `execute` as different state transitions. |
| `20260425_231613_design_only_runtime_architecture.md` | MVP design-only mode blocks source edits, shell commands, network actions, and skill execution. | Phase 2 may parse, inspect, cache, and dry-run install skills, but may not execute them. |
| `20260425_235154_agent_workflow_engine_roadmap_design_basis.md` | Phase 2 owns metadata compatibility; Phase 4 owns policy-enforced execution. | This design maps the schema work to Phase 2 and execution work to Phase 4. |
| `20260426_001233_security_policy_guardrails_sandboxing.md` | Every dangerous action declares capabilities and passes policy, approval, sandbox, and audit gates. | Tool calls and skill commands are represented as `ActionIntent` values before any side effect. |
| `20260426_004308_ai_agent_technology_classification.md` | Tool calling and skill/plugin systems are not MVP execution features; ClawHub starts with search, inspect, cache, and dry-run install. | The MVP scope is intentionally metadata-first. |
| `20260425_235154_rust_agent_workflow_engine_milestone_roadmap.md` | Phase 2 includes tool schema, tool registry, skill metadata, ClawHub parser, and dry-run install. | This document supplies the detailed milestone content for that phase. |

Resolved direction:

- Public registry metadata, downloaded archives, `SKILL.md` files, package
  manifests, tool results, and remote error messages are untrusted inputs.
- Metadata compatibility is useful before trust. It may be parsed, cached,
  displayed, and validated without making the skill executable.
- A skill may be installed and enabled for visibility without being trusted for
  execution.
- Trusting a skill version still does not grant blanket execution. Every future
  action needs a policy decision and, when required, approval.
- Package verification starts with archive checksum and path-safety checks.
  Signatures, provenance, publisher identity, and transparency logs are later
  hardening work.

The guiding invariant is:

```text
discover != install
install != enable
enable != trust
trust != execute without policy
```

## 2. Goals

- Define an internal tool schema independent of provider-specific function
  calling formats.
- Define a tool call routing and execution pipeline that preserves policy,
  capability, result parsing, typed errors, and auditability.
- Define internal skill metadata that can represent bundled, local, and
  ClawHub-origin skills without trusting remote content.
- Define ClawHub/OpenClaw metadata mapping, `SKILL.md` parsing rules, registry
  client behavior, local catalog behavior, package lock strategy, and offline
  cache behavior.
- Define CLI flows for `agent clawhub search`, `agent clawhub inspect`,
  `agent clawhub install --dry-run`, `agent skill list`,
  `agent skill enable`, `agent skill review`, and `agent policy show`.
- Keep MVP implementation limited to search, inspect, dry-run install, local
  catalog, cache, and schema validation.

## 3. Non-Goals

- No execution of remote tools or skills in the MVP.
- No automatic enable, trust, or execution after download.
- No package manager integration such as `npm install`, `pip install`, or
  `cargo install` during skill install.
- No kernel-level sandbox claim in the metadata MVP.
- No blind compatibility promise for every future ClawHub field.
- No use of external `SKILL.md` instructions to alter system policy,
  approval requirements, prompt hierarchy, or runtime trust state.

## 4. Component Model

The tool and skill foundation is split into narrow modules.

| Component | Responsibility |
| --- | --- |
| `tool_schema` | Internal tool descriptor, input/output schema, capability declaration, error contract. |
| `function_calling` | Provider-specific projection from internal tool descriptors to model-visible function definitions and back. |
| `tool_router` | Selects a candidate tool from a model call, CLI action, or workflow step; rejects ambiguous or unavailable calls. |
| `tool_executor` | Converts a routed call into an `ActionIntent`, runs policy, performs dry-run or approved execution later. |
| `tool_result_parser` | Validates stdout/stderr/JSON/tool-native results into typed result envelopes and safety classes. |
| `skill_catalog` | Local source of truth for discovered, installed, enabled, reviewed, trusted, and visible skill records. |
| `skill_parser` | Parses local `SKILL.md` and package metadata while preserving untrusted body boundaries. |
| `registry_client` | Fetches ClawHub search/inspect/download metadata and writes raw response cache. |
| `compat_layer` | Maps ClawHub/OpenClaw fields into internal metadata and origin records. |
| `package_planner` | Builds dry-run install plans, verifies checksum, checks archive paths, and predicts lock/catalog changes. |
| `offline_cache` | Stores raw registry responses and package blobs keyed by registry, slug, version, and checksum. |
| `policy` | Evaluates action intents, capability requests, trust state, approval records, and runtime mode. |
| `audit` | Records search, inspect, parse, verification, dry-run, catalog mutation, policy, and execution events. |

Execution-capable code paths must enter through `tool_executor` or a future
`skill_executor`. Search, inspect, parse, cache, and dry-run install are
metadata operations and must not invoke skill-owned code.

## 5. Internal Tool Schema

The internal schema is the source of truth. Provider-specific function schemas
are projections, not authoritative runtime permissions.

```json
{
  "schema_version": "tool_descriptor.v1",
  "id": "local.ripgrep",
  "kind": "process",
  "display_name": "Ripgrep Search",
  "description": "Search approved workspace files with rg.",
  "source": {
    "kind": "builtin",
    "origin": "dore"
  },
  "invocation": {
    "mode": "command",
    "binary": "rg",
    "args_template": ["--line-number", "{{pattern}}", "{{root}}"],
    "cwd_root": "workspace",
    "shell": false
  },
  "input_schema": {
    "type": "object",
    "required": ["pattern", "root"],
    "properties": {
      "pattern": {"type": "string", "minLength": 1},
      "root": {"type": "string", "enum": ["docs", "src", "tests"]}
    },
    "additionalProperties": false
  },
  "output_schema": {
    "type": "object",
    "required": ["matches"],
    "properties": {
      "matches": {"type": "array"}
    }
  },
  "capabilities": [
    {
      "kind": "file_read",
      "roots": ["workspace"],
      "globs": ["docs/**/*.md", "src/**/*.rs", "tests/**/*.rs"],
      "max_bytes": 10485760,
      "follow_symlinks": false
    },
    {
      "kind": "process_spawn",
      "command": "rg",
      "args_policy": "template_literal_only",
      "timeout_ms": 10000,
      "max_output_bytes": 1048576
    }
  ],
  "availability": {
    "default_enabled": false,
    "requires_approval": true,
    "unavailable_reason": null
  },
  "result_parser": {
    "kind": "line_parser",
    "format": "rg_line_v1"
  },
  "error_model": {
    "retryable": ["timeout", "resource_limit"],
    "terminal": ["schema_invalid", "policy_denied", "command_not_allowed"]
  }
}
```

Rust shape:

```rust
struct ToolDescriptor {
    schema_version: String,
    id: ToolId,
    kind: ToolKind,
    display_name: String,
    description: String,
    source: ToolSource,
    invocation: InvocationSpec,
    input_schema: JsonSchema,
    output_schema: Option<JsonSchema>,
    capabilities: Vec<CapabilityRequest>,
    availability: Availability,
    result_parser: ResultParserSpec,
    error_model: ToolErrorModel,
}
```

Rules:

- `id` is stable and namespaced: `builtin.<name>`, `local.<name>`,
  `skill.<skill_id>.<tool_name>`, or `registry.<registry>.<slug>.<tool_name>`.
- `input_schema` must be closed by default with `additionalProperties: false`.
- `capabilities` are mandatory for any tool that can access filesystem,
  process, network, environment, secrets, or external services.
- A provider-visible function definition never grants capability. It only
  advertises callable shape to a model.
- Missing or invalid capability declarations produce `tool.unavailable`, not a
  weaker default allow.

## 6. Function Calling Contract

Function calling is a three-step translation.

1. `ToolDescriptor` values are projected into provider-specific function
   declarations for model context.
2. Provider tool calls are parsed into `FunctionCallRequest`.
3. The router resolves the request back to an internal `ToolDescriptor` and
   creates a `ToolInvocationEnvelope`.

```json
{
  "schema_version": "function_call_request.v1",
  "call_id": "call_01",
  "provider": "openai",
  "tool_name": "local.ripgrep",
  "arguments": {
    "pattern": "policy",
    "root": "docs"
  },
  "raw_provider_payload_ref": "artifacts/provider/call_01.json"
}
```

```json
{
  "schema_version": "tool_invocation.v1",
  "invocation_id": "tool_20260426_011905_001",
  "tool_id": "local.ripgrep",
  "actor": {"kind": "model", "id": "session_current"},
  "arguments": {"pattern": "policy", "root": "docs"},
  "validated_arguments": true,
  "capability_fingerprint": "sha256:...",
  "runtime_mode": "metadata_only"
}
```

Function calling rules:

- The model cannot call a tool that is not in the current visible tool
  snapshot.
- Function names from providers are treated as untrusted strings and must be
  resolved by exact internal ID or an explicit alias table.
- Arguments must validate against the internal schema before routing.
- Ambiguous aliases are rejected.
- Provider-native tool error payloads are stored as raw artifacts and then
  parsed into internal errors.

## 7. Tool Router

The router is deterministic.

Input sources:

- model function call
- CLI command
- workflow step proposal
- future scheduler job
- future skill-owned command

Routing steps:

1. Resolve visible tool snapshot for the current run.
2. Match by exact `tool_id` or declared alias.
3. Validate arguments against `input_schema`.
4. Check availability, disabled state, readiness, and trust state.
5. Extract declared capabilities.
6. Build `ToolInvocationEnvelope`.
7. Hand off to executor for policy evaluation.

Router failures:

| Error | Meaning |
| --- | --- |
| `tool_not_found` | No visible descriptor matches the requested tool. |
| `tool_ambiguous` | More than one descriptor matches an alias. |
| `tool_disabled` | The descriptor exists but is disabled by catalog or policy. |
| `tool_untrusted` | The descriptor belongs to a skill version not trusted for display or execution. |
| `tool_not_ready` | Required local dependency, env, or platform condition is missing. |
| `input_schema_invalid` | Arguments do not match internal schema. |
| `capability_missing` | Tool has no valid capability declaration for a side effect. |

## 8. Tool Executor

The executor owns side effects. In the MVP it supports dry-run plans only for
external tools and remote skills. Later phases add approved execution.

Pipeline:

```text
ToolInvocationEnvelope
  -> ActionIntent
  -> policy.evaluate()
  -> deny | dry_run | requires_approval | allow
  -> dry-run report or approval pause
  -> sandbox setup if allowed
  -> execution
  -> capture stdout/stderr/result
  -> redact and classify
  -> result schema validation
  -> audit event
```

MVP behavior:

- `process`, `network`, `skill_command`, and `mcp_like` invocations return
  `dry_run` or `requires_approval`, but do not execute.
- `metadata` invocations such as registry search and inspect may run if policy
  allows network read for the ClawHub host or if offline cache is used.
- Result parsing is implemented against fixtures and metadata commands first.

## 9. Tool Result Parser

All tool results are untrusted until parsed and classified.

```json
{
  "schema_version": "tool_result.v1",
  "invocation_id": "tool_20260426_011905_001",
  "status": "success",
  "structured": {
    "matches": []
  },
  "raw_refs": ["artifacts/tools/tool_20260426_011905_001/stdout.txt"],
  "safety": {
    "classification": "trusted_after_validation",
    "findings": [],
    "redaction_applied": true
  },
  "limits": {
    "truncated": false,
    "elapsed_ms": 42,
    "output_bytes": 128
  }
}
```

Parsing rules:

- Prefer structured JSON output when the tool declares it.
- Validate structured output against `output_schema`.
- Apply size limits before persistence.
- Redact secret-like values before report rendering.
- Detect prompt injection phrases in text output and mark the result as
  `quarantined` or `untrusted_reference`.
- Tool output cannot create approvals, change policy, add tools, enable
  skills, or alter trusted system prompts.

## 10. Tool Error Handling

Tool errors are typed and stable.

| Class | Examples | Retry |
| --- | --- | --- |
| `schema` | invalid descriptor, invalid arguments, invalid result | no, except fixture/parser development |
| `routing` | not found, ambiguous, disabled, not ready | no |
| `policy` | denied, dry-run-only, approval missing | no automatic retry |
| `sandbox` | command not allowlisted, env denied, path escape | no |
| `runtime` | timeout, output limit, process exit failure | maybe, if policy allows |
| `registry` | HTTP timeout, unavailable, bad response, cache miss | maybe for network; no for malformed trusted record |
| `verification` | checksum mismatch, unsafe archive path, missing root file | no |
| `security` | prompt injection, secret leak, critical finding | no |

Error envelope:

```json
{
  "schema_version": "tool_error.v1",
  "code": "verification.checksum_mismatch",
  "message": "Package checksum did not match registry metadata.",
  "retryable": false,
  "safe_to_show_user": true,
  "artifact_refs": ["reports/install_plan.json"],
  "audit_event_id": "evt_..."
}
```

## 11. Capability And Permission Model

Tool and skill capabilities reuse the security design's `CapabilityRequest`
model. The compatibility layer adds skill-specific declarations, but policy
remains the evaluator.

Capability classes:

| Capability | Scope Fields | MVP Decision |
| --- | --- | --- |
| `metadata_read` | registry, cache key, max bytes | allow for local cache; network registry read follows policy |
| `package_download` | registry, URL, checksum, max bytes | dry-run or approval; no execute |
| `package_extract` | archive type, temp root, max files, max bytes | dry-run plan first; approved install later |
| `file_read` | roots, globs, max bytes, symlink policy | policy required |
| `file_write` | roots, paths, create/overwrite/delete | approval required outside state root |
| `process_spawn` | binary, args, cwd, timeout | deny until Phase 4 allowlist |
| `network` | host, port, protocol, method, purpose | deny by default |
| `env_read` | exact names or prefixes | deny by default |
| `secret_read` | `SecretRef`, purpose, child exposure | approval required; never prompt-visible |
| `skill_instruction` | skill ID, version, instruction body ref | display/review only until execution policy exists |

Policy decisions:

- `deny`: block and record reason.
- `dry_run`: produce a plan/report only.
- `requires_approval`: pause until a matching approval record exists.
- `allow`: execute only within declared capabilities and sandbox constraints.

## 12. Internal Skill Metadata Schema

Internal skill metadata is split between trusted catalog fields, untrusted raw
source fields, and review findings.

```json
{
  "schema_version": "skill_metadata.v1",
  "skill_id": "clawhub.web_search",
  "slug": "web-search",
  "display_name": "Web Search",
  "summary": "Searches the web and summarizes results.",
  "description": "Short sanitized registry description.",
  "source": {
    "kind": "clawhub",
    "registry": "https://clawhub.example",
    "package_url": "https://clawhub.example/packages/web-search-1.2.0.zip",
    "origin_ref": "clawhub:web-search@1.2.0"
  },
  "version": {
    "requested": "1.2.0",
    "resolved": "1.2.0",
    "semver": true
  },
  "package": {
    "checksum": "sha256:...",
    "archive_type": "zip",
    "size_bytes": 12345
  },
  "entrypoint": {
    "skill_md_path": "SKILL.md",
    "tools": []
  },
  "requirements": {
    "platforms": ["linux", "macos"],
    "binaries": [],
    "env": [],
    "secrets": []
  },
  "capabilities": [
    {
      "kind": "network",
      "hosts": ["example.com"],
      "protocols": ["https"],
      "purpose": "web search"
    }
  ],
  "trust": {
    "install_state": "not_installed",
    "enable_state": "disabled",
    "review_state": "unreviewed",
    "trust_state": "untrusted",
    "execution_state": "not_allowed"
  },
  "security": {
    "findings": [],
    "prompt_injection_risk": "unknown"
  },
  "raw_refs": {
    "registry_response": "cache/clawhub/raw/search/web-search.json",
    "skill_md_body": null
  }
}
```

Rules:

- `summary` and `description` are sanitized display fields, not executable
  instructions.
- `raw_refs` point to raw untrusted content stored outside trusted catalog
  fields.
- `trust.execution_state` is never derived only from `trust_state`. Execution
  also needs a per-action policy decision.
- `capabilities` can be declared by registry metadata or `SKILL.md`, but they
  are requests, not grants.
- Missing capability declarations make the skill unavailable for execution.

## 13. ClawHub Metadata Mapping

The compatibility layer stores raw registry payloads and maps known fields into
internal metadata. Unknown fields are preserved in raw cache and ignored by
policy unless a future schema version adopts them.

| ClawHub/OpenClaw Field | Internal Field | Trust Level | Notes |
| --- | --- | --- | --- |
| `id`, `slug`, `name` | `skill_id`, `slug`, `display_name` | untrusted until normalized | Slug is normalized to lowercase separator form. |
| `summary`, `description` | `summary`, `description` | untrusted display | Sanitized and size-limited before display. |
| `version`, `latest_version` | `version.requested`, `version.resolved` | registry metadata | Must be pinned in lock before install. |
| `archive_url`, `download_url` | `source.package_url` | untrusted URL | Host must match registry policy or explicit redirect policy. |
| `checksum`, `sha256`, `integrity` | `package.checksum` | verification input | MVP requires checksum for install plan acceptance. |
| `archive_type` | `package.archive_type` | verification input | Initial supported types: `zip`; `tar.gz` optional after path-safety tests. |
| `size` | `package.size_bytes` | advisory | Enforced by download max bytes policy. |
| `tags`, `categories` | catalog search metadata | untrusted display | Not used for trust decisions. |
| `author`, `publisher` | source publisher metadata | unverified | Display only until signature/provenance phase. |
| `license` | catalog metadata | untrusted display | Useful for review. |
| `requirements` | `requirements` | untrusted declaration | Checked locally for readiness. |
| `capabilities`, `permissions` | `capabilities` | untrusted request | Policy evaluates; not a grant. |
| `readme`, `skill_md` | raw content refs | untrusted instruction/reference | Never promoted into system instructions. |

Mapping invariants:

- The raw registry response is archived before mapping.
- Mapping is deterministic and versioned.
- Unsupported mandatory registry fields produce an inspect warning, not an
  implicit allow.
- A metadata mapping failure cannot be fixed by model output.

## 14. `SKILL.md` Parsing Rules

`SKILL.md` parsing extracts reviewable metadata while preserving instruction
trust boundaries.

Accepted structure:

```text
---
name: web-search
version: 1.2.0
summary: Search the web.
capabilities:
  - kind: network
    hosts: ["example.com"]
---

# Web Search

Human-readable instructions...
```

Parsing rules:

1. Read as UTF-8 with a size limit.
2. Normalize line endings.
3. Parse optional YAML front matter if present.
4. Extract first H1 as fallback display name.
5. Extract short summary from front matter, registry metadata, or first plain
   paragraph, in that precedence order.
6. Parse declared capabilities from front matter or a fenced
   `capabilities` block only if it validates against `CapabilityRequest`.
7. Parse declared requirements from front matter or a fenced `requirements`
   block only if it validates against the requirement schema.
8. Store the full body as untrusted raw content.
9. Run prompt-injection detection on the body and record findings.
10. Reject install plans if `SKILL.md` is missing, too large, binary, invalidly
    encoded, or path-escaped from the package root.

Security rules:

- `SKILL.md` body instructions are never merged into system prompts.
- Phrases asking the model or runtime to ignore policy, reveal secrets,
  install dependencies, execute commands, or bypass approvals are recorded as
  prompt-injection findings.
- A trusted metadata record does not make the body trusted.
- Review surfaces must label `SKILL.md` excerpts as untrusted external content.

## 15. Registry Client

The ClawHub registry client supports metadata operations first.

Commands:

- `search(query, filters, offline)`
- `inspect(slug, version, offline)`
- `download_plan(slug, version)`
- `download_blob(slug, version)` later behind install approval

Client behavior:

- Network access is a declared `metadata_read` or `package_download`
  capability.
- Raw responses are written to offline cache with timestamp, registry URL,
  request parameters, response hash, and schema mapping version.
- Search and inspect tolerate unknown fields but not invalid JSON.
- Redirects are disabled by default or restricted to same-origin policy.
- TLS and HTTP behavior use the platform default initially; certificate pinning
  is future hardening.
- Offline mode never reaches the network and returns cache miss as a typed
  error.

## 16. Local Skill Catalog

The local catalog is the trusted runtime source of truth for skill visibility
state. Raw registry and `SKILL.md` content are referenced, not embedded as
trusted instructions.

Operational catalog paths:

```text
state_root/
  skill/
    catalog.json
    visible_snapshot.json
    reviews/
    install-plans/
  cache/
    clawhub/
      raw/
      packages/
      indexes/
```

Workspace install paths for ClawHub compatibility:

```text
workspace/
  skills/
    <slug>/
      SKILL.md
      ...
      .clawhub/
        origin.json
  .clawhub/
    lock.json
```

Catalog states:

| State | Meaning |
| --- | --- |
| `discovered` | Seen in registry search or local scan; not installed. |
| `cached` | Metadata or package blob is present in offline cache. |
| `installed` | Files exist in workspace skill directory and origin metadata exists. |
| `enabled` | User wants the skill considered for visible snapshots. |
| `reviewed` | Human or policy review record exists for the exact version/checksum. |
| `trusted` | The exact source/version/checksum passed configured trust policy for display or future execution eligibility. |
| `executable_candidate` | Skill may propose tools, but actual execution still needs policy and approval. |

`visible_snapshot.json` is rebuilt when catalog, policy, readiness, trust, or
installed files change. Sessions use snapshots, not live filesystem scans.

## 17. Install, Enable, Trust, Execute Lifecycle

| Stage | Input | Side Effects | Policy Class | Execution Allowed |
| --- | --- | --- | --- | --- |
| `discover` | Registry search response or local scan | Raw metadata cache, discovered catalog entry | metadata read | no |
| `inspect` | Slug/version metadata and optional cached `SKILL.md` | Review report, normalized metadata | metadata read | no |
| `install_dry_run` | Resolved package metadata and checksum | Install plan artifact only | dry-run | no |
| `install` | Approved install plan | Package files under `skills/<slug>`, origin metadata, lock update | approval required | no |
| `enable` | Installed skill ID | Catalog visibility flag, snapshot invalidation | approval or local policy | no |
| `review` | Metadata, `SKILL.md`, findings, checksum | Review record for exact version/checksum | approval required for remote | no |
| `trust` | Review record plus policy | Trust record for exact source/version/checksum | approval required | no |
| `execute` | Skill-owned tool invocation | Sandbox execution and result artifact | per-action policy | only if allowed for that action |

Critical rule: `execute` is not a state inherited from `trust`. It is a new
action evaluated each time.

## 18. Dry-Run Install Flow

`agent clawhub install --dry-run <slug>` produces an install plan and changes
nothing in `workspace/skills/`.

Flow:

1. Resolve registry and version.
2. Fetch or load inspect metadata.
3. Require checksum metadata for MVP install planning.
4. Download archive only if policy permits dry-run package fetch; otherwise use
   metadata-only plan and mark archive checks as pending.
5. Store package blob in cache keyed by checksum if downloaded.
6. Verify checksum.
7. Open archive in a temporary safe reader.
8. Build archive manifest: paths, file count, total uncompressed bytes, root
   layout.
9. Reject path traversal, absolute paths, parent components, unsafe symlinks,
   device files, oversized files, and missing `SKILL.md`.
10. Parse `SKILL.md` with untrusted-body rules.
11. Extract declared requirements and capabilities.
12. Run deterministic security checks.
13. Build predicted file operations.
14. Build predicted `.clawhub/origin.json`, `.clawhub/lock.json`, and catalog
    changes.
15. Render JSON install plan and Markdown review report.
16. Do not copy files into `workspace/skills/`.
17. Do not enable, trust, or execute the skill.

Dry-run output:

```json
{
  "schema_version": "skill_install_plan.v1",
  "plan_id": "install_plan_20260426_011905_001",
  "registry": "clawhub",
  "slug": "web-search",
  "version": "1.2.0",
  "checksum": "sha256:...",
  "status": "dry_run_only",
  "would_write": [
    "skills/web-search/",
    "skills/web-search/.clawhub/origin.json",
    ".clawhub/lock.json"
  ],
  "verification": {
    "checksum": "passed",
    "path_safety": "passed",
    "skill_md": "parsed_with_findings"
  },
  "capabilities_requested": [],
  "requirements": [],
  "findings": [],
  "next_allowed_actions": ["review", "install_with_approval"]
}
```

## 19. Package Lock Strategy

The lock file pins installed package identity and expected filesystem state.

Path:

```text
workspace/.clawhub/lock.json
```

Schema:

```json
{
  "schema_version": "clawhub_lock.v1",
  "generated_at": "2026-04-26T01:19:05Z",
  "skills": {
    "web-search": {
      "registry": "https://clawhub.example",
      "slug": "web-search",
      "version": "1.2.0",
      "checksum": "sha256:...",
      "archive_type": "zip",
      "installed_path": "skills/web-search",
      "origin_path": "skills/web-search/.clawhub/origin.json",
      "installed_at": "2026-04-26T01:19:05Z",
      "metadata_mapping_version": "clawhub_mapping.v1",
      "skill_md_hash": "sha256:...",
      "files_manifest_hash": "sha256:..."
    }
  }
}
```

Rules:

- Lock updates are atomic.
- Lock entries are exact version and checksum pins.
- Reinstall or update must compare current origin, lock, archive checksum, and
  parsed metadata.
- A checksum mismatch blocks install/update.
- Signature/provenance fields are reserved for `clawhub_lock.v2`.
- Lock file trust does not grant execution; it only records package identity.

## 20. Offline Cache Strategy

The offline cache supports deterministic inspect and dry-run review without
depending on registry availability.

Cache paths:

```text
state_root/cache/clawhub/
  raw/search/<query_hash>.json
  raw/inspect/<slug>/<version>.json
  packages/sha256/<checksum>.zip
  indexes/catalog_index.json
```

Cache record:

```json
{
  "schema_version": "cache_record.v1",
  "registry": "https://clawhub.example",
  "request": {"kind": "inspect", "slug": "web-search", "version": "1.2.0"},
  "fetched_at": "2026-04-26T01:19:05Z",
  "expires_at": "2026-05-03T01:19:05Z",
  "response_hash": "sha256:...",
  "mapping_version": "clawhub_mapping.v1",
  "raw_path": "raw/inspect/web-search/1.2.0.json"
}
```

Rules:

- `--offline` forbids network and reads only cache.
- Expired cache may be shown with a stale warning.
- Package blobs are addressed by checksum and may be reused across versions
  only when checksum matches.
- Cache poisoning risk is reduced by checksum validation, registry namespace,
  raw response hash, and lock comparison.
- Cache garbage collection is safe because lock files and install plans keep
  content hashes.

## 21. Compatibility Layer

The compatibility layer isolates OpenClaw/ClawHub shapes from Dore internals.

Responsibilities:

- Normalize ClawHub metadata into `skill_metadata.v1`.
- Generate OpenClaw-compatible origin metadata under
  `skills/<slug>/.clawhub/origin.json`.
- Maintain `.clawhub/lock.json` for package identity and update checks.
- Preserve raw registry payloads for debugging and future mapping upgrades.
- Map OpenClaw lifecycle vocabulary onto Dore catalog states without weakening
  trust separation.

Non-responsibilities:

- It does not execute skills.
- It does not decide policy.
- It does not treat registry popularity, publisher name, or tags as trust.
- It does not parse arbitrary code or install dependencies.

## 22. CLI Scope

### `agent clawhub search`

Purpose: discover remote metadata.

Behavior:

- Uses registry client search.
- Writes raw cache and discovered catalog entries.
- Displays slug, latest version, summary, tags, and trust/install state if
  known.
- Supports `--offline` to search cached index only.
- Does not install, enable, trust, or execute.

### `agent clawhub inspect`

Purpose: show a detailed review packet for a remote skill version.

Behavior:

- Fetches or loads inspect metadata.
- Maps fields to `skill_metadata.v1`.
- Shows checksum presence, package size, requirements, declared capabilities,
  publisher display data, and warnings.
- May fetch `SKILL.md` only as untrusted content if registry exposes it.
- Does not install, enable, trust, or execute.

### `agent clawhub install --dry-run`

Purpose: produce a side-effect-free install plan.

Behavior:

- Resolves version and checksum.
- Optionally downloads archive into cache if policy allows.
- Verifies checksum and archive path safety when blob is present.
- Parses `SKILL.md`.
- Writes plan/report under `state_root/skill/install-plans/`.
- Shows predicted lock/catalog/origin changes.
- Does not write `workspace/skills/`, `.clawhub/lock.json`, or visible
  snapshots.

### `agent skill list`

Purpose: show local catalog and visibility state.

Behavior:

- Reads `state_root/skill/catalog.json` and local installed skill scan if
  configured.
- Shows source, version, install state, enable state, review state, trust state,
  readiness, and unavailable reason.

### `agent skill enable`

Purpose: mark an installed skill as visible candidate.

Behavior:

- Requires installed package or local skill path.
- Requires no critical parser/security findings.
- Invalidates visible snapshot.
- Does not mark trusted or executable.
- Remote-origin skill enable should require approval unless workspace policy
  explicitly allows local enable.

### `agent skill review`

Purpose: inspect exact skill version/checksum before trust or enable.

Behavior:

- Shows normalized metadata, raw source refs, parsed `SKILL.md` summary,
  declared requirements, declared capabilities, checksum, origin, lock state,
  and prompt-injection findings.
- Can create a structured review record for exact source/version/checksum.
- Does not grant execution.

### `agent policy show`

Purpose: make current safety posture visible.

Behavior:

- Shows default decision, runtime mode, registry/network policy, install policy,
  execution policy, approval requirements, and sandbox guarantees.
- Explains why a skill/tool is denied, dry-run-only, approval-required, or
  allowed when given `--subject`.

## 23. MVP Implementation Scope

The MVP for this area is Phase 2 metadata compatibility.

Implement:

- `tool_descriptor.v1` schema validation.
- `skill_metadata.v1` schema validation.
- ClawHub raw metadata cache.
- ClawHub search and inspect client against fixtures first, then network behind
  policy.
- `SKILL.md` parser with front matter, H1, summary, requirement/capability
  extraction, and prompt-injection findings.
- Local skill catalog with discovered, cached, installed, enabled, reviewed,
  trusted, and unavailable states.
- Dry-run install planner with checksum requirement, archive manifest, path
  safety checks, predicted origin/lock/catalog changes, and report rendering.
- CLI commands: `agent clawhub search`, `agent clawhub inspect`,
  `agent clawhub install --dry-run`, `agent skill list`,
  `agent skill review`, and `agent policy show`.
- `agent skill enable` as catalog-only for local or installed skills, with no
  execution exposure.

Defer:

- Actual package install without `--dry-run`.
- Trust approval workflow automation beyond structured review records.
- Skill execution.
- Skill-owned process/network tools.
- Dependency installation.
- Signature/provenance verification.
- Publisher reputation.
- OS-level sandboxing.

## 24. Prompt Injection Handling

External skill content can be malicious even when it is useful metadata.

Explicit defenses:

- `SKILL.md` body is stored as untrusted content and shown only in labeled
  review surfaces.
- Prompt-injection indicators create findings with severity and excerpts.
- Raw `SKILL.md` body is excluded from model system prompts.
- A skill can request capabilities, but cannot grant them to itself.
- Instructions in registry metadata or `SKILL.md` cannot change policy,
  approval, sandbox, or trust records.
- Tool results from skills are classified and may be quarantined before any
  model sees them.
- Any action derived solely from quarantined content is blocked.

Minimum detector patterns:

- Requests to ignore previous instructions or system/developer policy.
- Requests to reveal secrets, environment variables, prompt text, or hidden
  state.
- Requests to install dependencies or execute commands without approval.
- Hidden Markdown/HTML instructions.
- Attempts to redefine tool names, permissions, approval state, or trust state.

## 25. Testing Requirements

- Unit tests for tool descriptor parsing, input schema validation, capability
  fingerprinting, and error envelopes.
- Unit tests for skill metadata parsing, `SKILL.md` parser, ClawHub mapping,
  and catalog state transitions.
- Fixture tests for multiple ClawHub response variants and unknown fields.
- Security tests for hostile `SKILL.md`, prompt injection phrases, oversized
  files, binary files, path traversal, symlinks, absolute paths, and checksum
  mismatch.
- Integration tests for `search`, `inspect`, `install --dry-run`, `skill list`,
  `skill review`, and `policy show`.
- Snapshot tests for install plan JSON and Markdown review report.
- Offline tests proving `--offline` makes no network calls.

## 26. Acceptance Criteria

This design is accepted when implementation can prove:

- A ClawHub skill can be searched and inspected without installing it.
- A dry-run install produces a deterministic plan and no workspace file writes.
- A package without checksum cannot pass MVP install planning.
- Archive path traversal and missing `SKILL.md` are blocked.
- `SKILL.md` prompt injection content is detected and labeled untrusted.
- The local catalog can list skill lifecycle state without enabling execution.
- `agent policy show` explains why execution is unavailable in the MVP.
- No remote skill can execute without a policy-evaluated action intent and
  matching approval in a later phase.

## 27. Open Questions

- Should `zip` be the only archive type in Phase 2, or should `tar.gz` be
  supported if fixture coverage is strong enough?
- Should `agent skill enable` for remote-origin skills be Phase 2 catalog-only
  or delayed until actual install exists?
- Should catalog source of truth be JSON files only at first, or should a small
  SQLite store be introduced when search results grow?
- Which ClawHub registry URL and response schemas should be treated as the
  canonical compatibility fixtures?
- How much of OpenClaw's origin metadata should be preserved verbatim versus
  namespaced under Dore-specific fields?
