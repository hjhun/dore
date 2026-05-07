# Repository Guidelines

## Project Structure & Module Organization
Application code lives in `src/` (Rust crate, binary `dore` and library
`dore`). Integration tests live in `tests/`. Long-form designs and
roadmaps live under `docs/`. Operator-managed runtime state goes under
`/.dev/` and `/.tmp/` and is intentionally ignored by Git.

The Rust source is organized by domain module:

```text
src/
  core/        # ids, clock, checksum, error types
  runtime/     # runtime root resolution, layout, init
  policy/      # policy model, defaults, decision engine
  storage/     # raw evidence, job log, wiki, atomic artifact store
  ingest/      # note/conversation-summary normalization and service
  wiki/        # markdown index/log renderer and generator
  jobs/        # append-only job report writer
  graphify/    # availability check (no graph generation)
  cli.rs       # clap-based CLI entry point
  main.rs      # binary dispatch
  lib.rs       # library facade
tests/
  cli_smoke.rs # end-to-end CLI smoke tests
docs/          # designs, refs, roadmaps
AGENTS.md      # this guide
README.md      # user-facing setup and command reference
```

Private runtime data (raw personal evidence, generated wiki pages, job
reports, graph status) is created under `.dore-local/` (default) and is
ignored by Git. See `.gitignore` for the full list of protected paths.

## Build, Test, and Development Commands
Build and test the Rust crate:

- `cargo build` — debug build of the `dore` binary and `dore` library.
- `cargo build --release` — release build.
- `cargo test` — run unit tests under `src/` and integration tests under
  `tests/`.
- `cargo run -- <subcommand>` — run the CLI against a local runtime.

Common CLI flows (see `README.md` for details):

- `cargo run -- init`
- `cargo run -- ingest --kind note --title "..." --file ./note.md`
- `echo "..." | cargo run -- ingest --kind note --title "..." --stdin`
- `cargo run -- wiki generate`
- `GRAPHIFY_CMD=/path/to/graphify cargo run -- graphify check`

When extending the build, expose new tooling through `cargo` aliases or
a `Makefile` and update this guide with the exact commands.

## Coding Style & Naming Conventions
Rust source follows `rustfmt` defaults (4-space indent, 100 column soft
limit). Prefer module names that match their domain (`policy`, `ingest`,
`wiki`). Keep filenames `snake_case`. Public types stay `CamelCase`,
functions and fields stay `snake_case`. Prose-oriented files use 4-space
indentation.

## Testing Guidelines
Unit tests live next to the code they cover under
`#[cfg(test)] mod tests` blocks in each module. Integration and smoke
tests live under `tests/` and exercise the public CLI. Use `tempfile`
for hermetic runtime roots and never write to the user's real
`.dore-local/`. Match test names to the behavior they cover, for example
`appending_with_duplicate_id_auto_disambiguates_to_a_fresh_suffix` or
`ingest_note_then_generate_wiki_records_provenance`.

## Commit & Pull Request Guidelines
Use short, imperative commit messages prefixed by an area tag where
useful, for example `feat: add manual note ingestion` or
`docs: refresh agent guide`. Keep pull requests focused, describe the
change and its motivation, link related issues, and include command
output when developer workflow changes.

## Privacy and Local-Only Posture
Dore is local-only by default. Never commit raw personal memory, wiki
pages, job reports, transcripts, recordings, secrets, or graph outputs.
The default runtime root `.dore-local/` and the matching memory
subdirectories are protected by `.gitignore`. When adding a new private
artifact path, extend `.gitignore` first and verify with
`git status --short --ignored`.

## Documentation Maintenance
Update this file whenever you add real source directories, tooling, or
contributor workflow rules. A stale guide is worse than a short one.
