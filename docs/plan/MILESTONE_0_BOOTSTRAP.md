# Milestone 0: Repository Bootstrap and Local Core

## Goal

Create the first implementation skeleton for Dore and prove the local core can load config, create memory folders, write events, route model tiers, and expose daemon status.

## Scope

In scope:

- pnpm workspace.
- TypeScript build.
- Vitest tests.
- runtime contract schemas.
- config schema.
- memory bootstrap.
- event JSONL writer.
- model routing policy.
- daemon `/status`.
- doctor command.

Out of scope:

- real LLM API calls.
- real Telegram bot connection.
- real broker API calls.
- Electron UI.
- scheduler.
- real trading.

## TDD Backlog

Implement with tests first.

- [ ] Contract schemas validate task, approval, briefing, usage, model selection, broker capability, and trading signal shapes.
- [ ] Config schema defaults `real_trading_enabled` to `false`.
- [ ] Config schema supports future broker configuration without requiring credentials.
- [ ] Memory bootstrap creates `raw`, `wiki`, `operations`, `logs`, and `wiki/index.md`.
- [ ] Event log writes append-only JSONL records.
- [ ] Event log redacts or rejects direct secret-like fields.
- [ ] Model routing selects economy models for low complexity work.
- [ ] Model routing selects premium models for high complexity work.
- [ ] Model routing marks unavailable providers instead of throwing when credentials/model ids are missing.
- [ ] Daemon `/status` returns app, memory, provider, Telegram, trading, and uptime status.
- [ ] Doctor command exits successfully when credentials are missing but reports missing setup clearly.

## Verification Commands

```bash
pnpm install
pnpm test
pnpm build
pnpm doctor
pnpm dev:daemon
```

Manual daemon check:

```bash
curl http://127.0.0.1:3173/status
```

## Completion Criteria

M0 is complete when:

- all tests pass.
- build passes.
- doctor output does not expose secrets.
- daemon status endpoint works.
- `.dev/DASHBOARD.md` checklist is updated.

