# Dore

Dore is a local-only LLM Wiki scaffold for personal memory. It ingests
manually supplied notes and conversation summaries, stores them under a
private runtime root that never enters Git, and renders a Markdown wiki
with provenance and append-only job reports.

This repository is an early scaffold: it implements ingestion, policy
defaults, wiki generation, append-only job logging, and a Graphify
availability check. It does not yet generate graphs, perform retrieval,
or sync to the cloud.

## Privacy posture

Raw personal evidence, generated wiki pages, transcripts, recordings,
secrets, graph outputs, sync state, and job reports stay on the local
machine. The default runtime root is `.dore-local/` and is matched by
`.gitignore`. `local_only` is the default policy; sync and export are
denied unless explicitly approved.

Verify with `git status --short --ignored` before committing.

## Setup

Requirements:

- Rust toolchain (edition 2021, MSRV 1.75 or newer).

Build the project:

```bash
cargo build
```

Run unit and integration tests:

```bash
cargo test
```

## CLI commands

All commands accept `--runtime-root <PATH>` to override the runtime
root. The default is `.dore-local/` in the current working directory.
Set `DORE_RUNTIME_ROOT` to override globally.

### Initialize the runtime layout

```bash
cargo run -- init
cargo run -- init --runtime-root ./.dore-local-demo
```

`init` is idempotent. It creates the `memory/{raw,digest,wiki,jobs,
graph,sync,transcripts,recordings,secrets,policy,tmp}` substructure and
writes the active policy to two visible files under `memory/policy/`:

- `defaults.toml`: editable starting point seeded from the binary's
  embedded defaults. Subsequent `init` runs preserve user edits.
- `snapshot.json`: machine-readable snapshot of the defaults the binary
  is enforcing. Refreshed on every `init` so it always reflects the
  shipped policy.

Inspect the snapshot with `cat <runtime>/memory/policy/snapshot.json`
or `cat <runtime>/memory/policy/defaults.toml`.

### Ingest a manual note

```bash
cargo run -- ingest \
  --kind note \
  --title "First note" \
  --file ./path/to/note.md
```

Or pipe from stdin:

```bash
echo "Quick thought." | cargo run -- ingest \
  --kind note \
  --title "First note" \
  --stdin
```

### Ingest a conversation summary

```bash
cargo run -- ingest \
  --kind conversation-summary \
  --title "Standup 2026-05-07" \
  --file ./path/to/summary.md
```

### Generate the wiki

```bash
cargo run -- wiki generate
```

This writes `memory/wiki/index.md` and appends to `memory/wiki/log.md`
inside the runtime root. Provenance lines reference the source evidence
identifiers.

### Graphify availability check

```bash
cargo run -- graphify check
```

Reports `installed`, `invokable`, or `unavailable` and writes a status
snapshot under `memory/graph/status/` plus a single line in
`memory/jobs/graphify_check.jsonl`. Set `GRAPHIFY_CMD` to override the
candidate executable; when set, that command is the only one probed and
the built-in `graphify` fallback is skipped, so an unreachable override
reports `unavailable` rather than silently falling back.

```bash
GRAPHIFY_CMD=/definitely/not/graphify cargo run -- graphify check
```

## Sync, export, and approval

Cloud sync is **not available in this slice**. The embedded policy
defaults set `sync.cloud_sync_enabled = false`, so the policy engine
denies any `--sync-mode cloud` request even when `--approve` is
passed. The denial is recorded in the job log and the raw payload is
not written.

Export is gated by approval. Pass `--sync-mode export --approve` to
opt in for a single command. Without `--approve`, the engine denies
the action and writes a denial entry to the job log without writing
the raw payload.

## Repository layout

```text
src/                # Rust crate
tests/              # Integration and CLI smoke tests
docs/               # Designs, references, roadmaps
AGENTS.md           # Contributor guide
README.md           # This file
.gitignore          # Protects private runtime artifacts
```

See `AGENTS.md` for module organization and contributor conventions.
