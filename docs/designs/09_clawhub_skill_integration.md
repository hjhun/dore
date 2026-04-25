# CEP-09: ClawHub Skill Integration

Status: Proposed
Last Updated: 2026-04-20
Owners: Dore skill runtime maintainers
Related: `01_system_architecture.md`, `04_telegram_and_session_runtime.md`, `06_quality_and_test_strategy.md`

## 1. Summary

Dore should support direct ClawHub-backed skill installation so that users can download useful skills and use them immediately in Dore.

This CEP adapts the useful OpenClaw pattern:

- search and install skills from ClawHub
- install into the active workspace
- persist origin and version metadata for later updates
- scan installed content before activation
- expose only approved skills to active sessions

The goal is not to copy OpenClaw implementation details blindly. The goal is to adopt the same strong boundaries: registry access, installation, trust evaluation, and runtime visibility are separate steps.

## 2. Context

The user wants Dore users to be able to install skills from ClawHub and use them directly. OpenClaw already demonstrates a practical shape for this:

- `skills search/install/update` against ClawHub
- workspace-local installation into `skills/`
- per-skill origin metadata for updates
- lockfile-like tracking for installed versions
- security scanning and readiness checks
- skill snapshot invalidation when the visible skill set changes

Dore should adopt the same product property while keeping the runtime small and explicit.

## 3. Goals

- Support direct ClawHub search, install, update, list, and info flows.
- Let users install a skill once and make it available to Dore without manual file copying.
- Keep installed-skill state auditable through origin and lock metadata.
- Apply security and readiness checks before a skill becomes active.
- Support immediate use after install through registry refresh or snapshot invalidation.

## 4. Non-Goals

- Supporting every remote skill registry from milestone one
- Blindly auto-enabling all downloaded skills
- Allowing a downloaded skill to bypass Dore trust policy
- Mixing registry download code into Telegram or session logic

## 5. Core Decisions

### AD-1: ClawHub is the first remote skill source

Dore should treat ClawHub as the first-class remote registry for installable skills.

### AD-2: Skills install into the active Dore workspace

Installed skills should land under a workspace-local `skills/` directory, not inside the application binary or memory store.

### AD-3: Installation and activation are separate phases

Downloading a skill does not automatically make it visible to all runs. The skill must pass trust and readiness checks first.

### AD-4: Skill visibility is snapshot-based

Active sessions should use a stable skill snapshot. When the skill inventory changes, Dore should invalidate the snapshot so new turns pick up the updated set deterministically.

## 6. Skill Runtime Model

The `skill` subsystem should own:

- local skill discovery
- ClawHub registry client
- download and extract pipeline
- origin metadata
- lockfile tracking
- readiness checks
- security scan
- activation policy
- visible-skill snapshot building

The `session` subsystem should only ask for a resolved visible skill set for the current run.

## 7. Directory And Metadata Layout

Recommended workspace layout:

```text
workspace/
  skills/
    <skill-slug>/
      SKILL.md
      ...
      .clawhub/
        origin.json
  .clawhub/
    lock.json
```

Recommended `origin.json` fields:

- version
- registry
- slug
- installed_version
- installed_at

Recommended `lock.json` fields:

- version
- installed skill map
- per-skill installed version
- installed timestamp

This closely follows the proven OpenClaw shape and keeps updates deterministic.

## 8. Skill Lifecycle

### 8.1 Search

Dore should support searching ClawHub by:

- keyword query
- tags if available later
- default browse feed when query is omitted

### 8.2 Install

Install flow:

1. resolve the requested skill and version from ClawHub
2. download the archive
3. extract into a temporary safe directory
4. verify required skill root files such as `SKILL.md`
5. run path safety checks
6. run security and readiness checks
7. copy into `workspace/skills/<slug>`
8. write `.clawhub/origin.json`
9. update workspace `.clawhub/lock.json`
10. invalidate skill snapshot
11. report install result to the user

### 8.3 Update

Update flow should use the origin and lock metadata to determine:

- whether the skill came from ClawHub
- current installed version
- latest available version

### 8.4 Remove Or Disable

Removal and disable should be distinct:

- disable keeps files but hides the skill from new runs
- remove deletes the skill directory and updates metadata

## 9. Trust And Security Policy

ClawHub is a public registry. Public does not mean trusted.

Before activation, Dore should evaluate:

- archive path safety
- expected root files
- banned file patterns if configured
- security scan findings
- declared dependency or environment requirements
- local policy allowlist or denylist

Skill scan severity should support:

- `info`
- `warn`
- `critical`

Activation policy:

- `critical` findings block activation
- `warn` findings may require user approval
- `info` findings are recorded only

## 10. Readiness Checks

A skill may be safe but not ready.

Readiness checks should validate:

- required binaries
- required environment variables
- required local files or credentials
- platform compatibility where relevant

This prevents "installed but unusable" skills from silently failing at run time.

## 11. Runtime Visibility

The session runtime should not scan the filesystem on every turn.

Instead, Dore should build a visible-skill snapshot containing:

- skill ID
- summary
- resolved path
- source type: bundled, local, ClawHub
- readiness status
- trust status
- command exposure if any

When install, update, disable, or remove occurs, the snapshot version should increment so future turns refresh deterministically.

## 12. Telegram And UX Surface

The Telegram channel should expose a bounded skill-management surface:

- `/skills` for list and status
- `/skills search <query>`
- `/skills install <slug>`
- `/skills update <slug|all>`
- `/skills enable <slug>`
- `/skills disable <slug>`
- `/skills info <slug>`

The initial UX may internally route these through one `/skills` command family rather than many separate native commands.

Install responses should tell the user:

- what was installed
- source and version
- whether it is active now
- what requirements are still missing

## 13. Session Behavior After Install

To satisfy the "install and use immediately" requirement:

- current long-running sessions should invalidate their skill snapshot after a successful install
- the next turn should resolve the new visible skill set
- if a skill requires missing dependencies, it should remain installed but not active

Dore should avoid partial activation ambiguity.

## 14. Failure Modes

Expected failures:

- skill not found
- version not found
- download failure
- archive extraction failure
- unsafe path or archive layout
- missing `SKILL.md`
- critical security finding
- missing runtime dependency
- policy rejection

All of these should produce a short Telegram report and a durable install record.

## 15. Future Extensions

This design should leave room for:

- additional registries
- signed skill bundles
- publisher verification levels
- community trust scores
- per-agent skill allowlists
- native skill commands exposed by channel surfaces

ClawHub is first, not forever the only source.

## 16. Testing Requirements

- Unit tests for origin metadata, lockfile updates, and activation policy
- Integration tests for search/install/update/remove flows
- Integration tests for snapshot invalidation after install
- Smoke tests for installing a safe skill and using it in the next turn
- End-to-end tests for a ClawHub skill being discovered, installed, approved if needed, and used successfully

## 17. Acceptance Criteria

This CEP is accepted when:

- a user can search and install a ClawHub skill from Dore
- the installed skill is tracked with origin and lock metadata
- unsafe or unready skills do not activate silently
- newly installed ready skills become available on the next Dore turn without manual file work

## 18. Open Questions

- Should the first milestone support only ClawHub skills, or ClawHub plugins too?
- Which readiness rules should be standardized versus skill-defined?
- Should warn-level findings require approval globally or per skill policy?
