# Quality Gates

## Required Gates

Every development change must pass the smallest relevant gate before it is considered done.

## Gate 1: TDD

- A failing test must be written or updated before behavior implementation.
- The test must represent a real requirement from `docs/plan` or `docs/drafts`.
- The implementation must make the test pass.

Documentation-only changes may use link checks and manual review instead of unit tests.

## Gate 2: Safety

Before commit:

- no API keys, OAuth tokens, broker secrets, account passwords, or Telegram bot tokens in files.
- no real trading call path when `real_trading_enabled: false`.
- Telegram allowlist behavior is tested before bot use.
- Electron renderer must not receive raw secret values.

## Gate 3: Verification

For code changes:

```bash
pnpm test
pnpm build
```

For M0:

```bash
pnpm doctor
```

For docs:

- verify relative Markdown links.
- inspect changed docs for stale milestone/checklist claims.

## Gate 4: Progress Tracking

Update `.dev/DASHBOARD.md` whenever:

- a milestone starts.
- a checklist item is completed.
- a blocker appears.
- verification passes or fails.
- a push is made.

The dashboard must be useful to a fresh session.

## Gate 5: GitHub

When publishing is requested:

- inspect `git status -sb`.
- stage only intended files.
- commit with a focused message.
- push the branch.
- create a PR when GitHub tooling is available.

Do not push known broken code.

