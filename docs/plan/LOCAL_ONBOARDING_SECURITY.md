# Local Onboarding And Security Audit

## Local Startup

Install dependencies:

```bash
npx --yes pnpm@11.8.0 install
```

Run daemon:

```bash
npx --yes pnpm@11.8.0 dev:daemon
```

Run desktop:

```bash
npx --yes pnpm@11.8.0 dev:desktop
```

Run checks:

```bash
npx --yes pnpm@11.8.0 doctor
npx --yes pnpm@11.8.0 test
npx --yes pnpm@11.8.0 build
npx --yes pnpm@11.8.0 build:desktop
```

## Configuration

- Use `configs/dore.config.example.yaml` as the starting point.
- Keep raw credentials out of config files.
- Use `secret_ref:` values for broker credentials.
- Use environment variables for provider and Telegram tokens.

## Runtime State Backup And Recovery

Dore stores MVP runtime state in local files so the user can inspect and back it
up without a database.

Important paths:

| State | Path |
| --- | --- |
| Runtime tasks | `memory/data/runtime/tasks.json` |
| Runtime approvals | `memory/data/runtime/approvals.json` |
| Runtime task/approval events | `memory/logs/events/runtime.jsonl` |
| Scheduled briefing events | `memory/logs/events/briefing.jsonl` |
| Daily briefing outputs | `memory/logs/daily/` |
| Usage records | `memory/logs/usage/` |
| Trading journals | `memory/logs/trading/` |
| Wiki memory | `memory/wiki/` |
| Raw source memory | `memory/raw/` |
| Operational memory | `memory/operations/` |

Before a risky local change, stop the daemon and copy the full memory root:

```bash
cp -a memory "memory.backup.$(date +%Y%m%d-%H%M%S)"
```

To recover from a bad runtime state:

1. Stop `dev:daemon` and `dev:desktop`.
2. Copy the latest known-good backup over `memory/`, or restore only the
   affected file listed above.
3. Run `npx --yes pnpm@11.8.0 doctor`.
4. Start the daemon and inspect `GET /health` or the desktop Daemon panel.
5. If `tasks.json` or `approvals.json` is unreadable, move the broken file aside
   and restart; Dore will treat the missing runtime array as empty.

Runtime task and approval JSON writes use an atomic replace boundary in
`packages/core`, and runtime event appends use the shared JSONL append helper.
This reduces the normal risk of half-written runtime state. Other local logs
remain append-oriented and should be recovered from backup if manually edited
into an invalid shape.

## Local Auth And Diagnostics

Runtime mutation endpoints are local-first. Non-local requests to runtime paths
must use a bearer token.

Set a local daemon token only through the environment:

```bash
export DORE_DAEMON_TOKEN="secret_ref:local-daemon-token"
npx --yes pnpm@11.8.0 dev:daemon
```

Then call protected endpoints from a non-local client with:

```bash
curl -H "Authorization: Bearer secret_ref:local-daemon-token" http://127.0.0.1:3173/tasks
```

Do not store raw daemon tokens in config files, docs, task logs, or memory
records. Prefer `secret_ref:` labels in examples and operational notes.

Diagnostics:

- `npx --yes pnpm@11.8.0 doctor` prints the same structured health checks used
  by daemon health status.
- `GET /health` returns full check detail for local daemon diagnostics.
- `GET /status` includes a compact `health` summary and scheduler recovery
  fields for desktop and Telegram consumers.
- Optional missing provider or Telegram credentials are warnings, not daemon
  startup failures.
- Required failures, such as missing example config in the project root, make
  `doctor` exit non-zero.

## Security Audit

| Risk | MVP control |
| --- | --- |
| Secret in UI | Desktop renderer maps safe daemon state and tests token omission. |
| Secret in logs | Engineering, Telegram, and model gateway redact secret-like values. |
| Unauthorized Telegram access | Allowlist enforcement is tested. |
| Remote daemon mutation | Runtime endpoints require local request or bearer token. |
| Real trading accident | Real trading is disabled by default and blocked by gates. |
| Sensitive memory persistence | Sensitive memory creates approval request before wiki write. |
| Runtime state corruption | Core runtime JSON writes use atomic replace and are backed by recovery steps above. |

## Release Gate

Do not release if:

- `git diff --check` fails.
- docs relative links fail.
- tests/build fail.
- any raw token, password, API key, or broker secret is found in changed files.
- any real broker order path exists before M16/M17 prerequisites.
