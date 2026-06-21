# AGENTS.md

This file is the development operating manual for AI agents working on Dore.

Dore is a local-first personal AI assistant for one user. It must support daily 06:00 KST briefings, long-term personal memory, software engineering workflows, Telegram, Electron desktop, token-efficient multi-provider LLM routing, and safe Korea/US stock trading watch and dry-run workflows.

Authoritative product and design documents live in `docs/drafts/`. Start there before implementing.

Execution plans live in `docs/plan/`. Use those for current development order.

Progress state lives in `.dev/DASHBOARD.md`. Update it before ending a development turn.

## Current Source Of Truth

Read these first for any meaningful change:

- `.dev/DASHBOARD.md`
- `docs/plan/README.md`
- `docs/plan/ROADMAP.md`
- `docs/drafts/README.md`
- `docs/drafts/23_PRODUCT_REQUIREMENTS.md`
- `docs/drafts/26_ACCEPTANCE_CRITERIA.md`
- `docs/drafts/28_RUNTIME_CONTRACTS.md`
- `docs/drafts/29_MVP_ENGINEERING_BACKLOG.md`
- `docs/drafts/30_DEVELOPMENT_START_SPEC.md`

Use the rest of `docs/drafts/` for details on memory, safety, LLM providers, trading policy, Electron, Telegram, data sources, and roadmap.

## Development Philosophy

Follow a Karpathy-style engineering posture:

- Keep the system simple, inspectable, and hackable.
- Build small vertical slices that actually run.
- Prefer boring code and obvious state over clever abstraction.
- Make data and logs visible.
- Add evaluations and tests before trusting behavior.
- Delete or avoid complexity until it earns its place.
- When stuck, reduce the problem to the smallest failing case.

Dore is a real assistant, not a demo. Never optimize for appearing complete. Optimize for working behavior that can be tested.

## TDD Is Required

Develop with test-driven development.

For every non-trivial behavior change:

1. Write or update a failing test that captures the desired behavior.
2. Implement the smallest change that makes it pass.
3. Run the relevant test target.
4. Refactor only after tests pass.
5. Record what was verified.

Required test focus:

- Config loading and validation.
- Runtime contract schemas.
- Model routing by category, complexity, cost, latency, and provider availability.
- Usage and cost logging.
- Memory bootstrap.
- Approval state transitions.
- Daily briefing rendering and fallback behavior.
- Telegram allowlist behavior.
- Trading risk manager.
- Real trading disabled path: when `real_trading_enabled: false`, no real order API may be called.

Do not claim normal operation unless the relevant tests or manual verification were run and passed. If a test fails, fix the code and rerun. If verification cannot be run, say why and do not claim the behavior is guaranteed.

## Plan-Driven Development

Implement according to `docs/plan/ROADMAP.md`.

Current milestone state must be reflected in `.dev/DASHBOARD.md`.

Rules:

- Start each session by reading `.dev/DASHBOARD.md`.
- Use `docs/plan/MILESTONE_0_BOOTSTRAP.md` for M0 scope and acceptance.
- Keep checkboxes accurate. Use `- [ ]` and `- [x]`.
- Do not mark a checklist item complete until the relevant files and verification prove it.
- If the implementation plan changes, update `docs/plan/` and `.dev/DASHBOARD.md` in the same patch.
- If a blocker appears, write it under `.dev/DASHBOARD.md` with the failed command or missing information.

## Patch Discipline

Every patch must have a clear goal.

- Keep patches scoped to one coherent objective.
- Do not mix unrelated refactors with feature work.
- Preserve user changes. Never revert unrelated work.
- Prefer explicit file staging over `git add -A` when the worktree is mixed.
- Include docs updates when behavior, config, workflows, or contracts change.
- Include tests or a clear verification artifact with code changes.

Before finishing a development task:

1. Inspect `git status --short`.
2. Inspect the relevant diff.
3. Run the smallest sufficient verification command.
4. Fix failures.
5. Summarize changed files and verification results.

## GitHub Publish Workflow

When the user asks to publish changes:

1. Inspect scope with `git status -sb` and `git diff`.
2. Confirm there are no unrelated changes in the patch.
3. Create a branch if currently on `main` or another default branch.
4. Commit with a concise message.
5. Push to GitHub.
6. Open a draft PR when appropriate.

Use an installed GitHub publish or commit skill if available. In this environment, a specific `git-commit` skill may not be installed; if missing, use the local git workflow and say so clearly.

Never push broken code. If checks fail, fix the code and rerun the checks before pushing. For docs-only changes, at minimum verify markdown links or inspect the changed docs.

## Skill Usage

Use available skills from these locations when relevant:

- `~/.agents/skills`
- `~/.codex/skills`
- `~/.claude/skills`

If a requested skill is not installed, state that briefly and continue with the best available workflow.

Expected skills and intent:

- `graphify`: Use for codebase or documentation graphing, architecture exploration, and token-efficient context retrieval.
- `skill-creator`: Use when a repeatable development workflow needs a new Codex skill.
- `karpathy-guidelines`: Use if installed. If unavailable, follow the Karpathy-style engineering posture in this file.
- `git-commit`: Use if installed. If unavailable, use normal git commands safely.
- `superpowers`: Use if installed for brainstorming, design exploration, and structured thinking. If unavailable, use explicit written tradeoff analysis.

Do not invent that a skill was used. Be honest about availability.

## Graphify Workflow

Use graphify to reduce repeated large-context reads.

Recommended use:

- Before touching a large unfamiliar area: run graphify on the relevant subdirectory.
- After meaningful code changes: run graphify update or the graphify hook if installed.
- For code-only changes: prefer AST or incremental graph updates to avoid unnecessary LLM tokens.
- Use graph queries to answer architecture questions from the graph before rereading many files.

Do not run a full graph over the entire repo if a smaller subdirectory is enough.

## Dore Implementation Stack

The current development start spec chooses:

- TypeScript.
- `pnpm` workspace.
- Electron + React + Vite for desktop.
- Node.js TypeScript daemon.
- Fastify for the local daemon API.
- Zod for runtime validation.
- Markdown, JSON, JSONL, and YAML for MVP storage.
- SQLite metadata index later.
- Vitest for tests.
- Playwright candidate for Electron smoke tests.

Follow `docs/drafts/30_DEVELOPMENT_START_SPEC.md` unless the user explicitly changes the stack.

## LLM Routing Requirements

Dore must not bind a provider to only one model.

Model selection must consider:

- Task category.
- Complexity.
- Cost preference.
- Latency preference.
- Context size.
- Provider availability.
- Budget state.

Required behavior:

- Simple status, short summary, background, and quick Telegram responses use lightweight models.
- Normal assistant and daily briefing synthesis use standard models.
- Architecture, code review, long-context analysis, and important decisions escalate to high-capability models.
- Background work is reduced or downgraded near monthly budget limits.
- Trading numeric decisions are deterministic code, not LLM judgment. LLMs may explain, summarize, and report.

Tests must cover low and high complexity routing within the same provider.

## Safety Rules

Secrets:

- Never write API keys, OAuth tokens, broker secrets, account passwords, or Telegram tokens to docs, logs, UI, or commits.
- Store only environment variable names or `secret_ref` values.

Telegram:

- Telegram bot must enforce an allowlist.
- If `allowed_user_ids` is empty, the bot must not accept external commands.

Electron:

- Renderer must not directly access secrets or broad filesystem APIs.
- Use main/preload/daemon boundaries.

Approvals:

- Critical actions require explicit approval.
- All approval decisions must be logged.

Trading:

- MVP must not place real orders.
- Only brokers with official usable APIs may become real execution targets.
- Toss Securities is the first candidate.
- Shinhan Securities is the second candidate.
- Samsung Securities is read-only or manual reference until an official personal Open API is verified.
- GUI/RPA order automation is forbidden by default.
- `real_trading_enabled: false` must guarantee no real order API path is executed.

## Documentation Rules

Docs live under `docs/drafts/` unless the user asks otherwise.

Update docs when:

- A config key changes.
- A runtime contract changes.
- A workflow changes.
- A safety rule changes.
- A provider, broker, or model routing policy changes.
- A milestone scope changes.

Keep docs practical. Prefer implementation-ready contracts, examples, and acceptance criteria over vague plans.

## Normal Completion Checklist

Before reporting completion:

- `git status --short` inspected.
- Relevant diff inspected.
- Tests or verification run.
- Failures fixed or clearly reported.
- Docs updated if needed.
- No secrets present.
- No unrelated changes reverted.
- If publishing was requested, branch/commit/push/PR status reported.
