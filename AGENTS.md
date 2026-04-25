# Repository Guidelines

## Project Structure & Module Organization
This repository is currently empty aside from Git metadata and this guide. Keep the root directory minimal as the project grows. Put application code in `src/`, tests in `tests/`, static assets in `assets/`, and supporting scripts in `scripts/`. Store repository-wide configuration files at the root so they are easy to discover.

Example layout:

```text
src/
tests/
assets/
scripts/
AGENTS.md
```

## Build, Test, and Development Commands
There are no project-specific build or test commands configured yet. Until tooling is added, use Git to inspect local changes:

- `git status` checks the working tree before and after edits.
- `git diff` reviews unstaged changes.
- `git log --oneline` shows the history once commits exist.

When introducing build or test automation, expose it through a consistent root entry point such as a `Makefile`, `package.json`, or equivalent, and update this guide with the exact commands.

## Coding Style & Naming Conventions
Use 4 spaces for indentation in prose-oriented files and follow the formatter or linter required by the language you add. Prefer clear, descriptive names: `src/auth/session_manager.py`, `tests/test_session_manager.py`, `scripts/bootstrap.sh`. Use lowercase, separator-based filenames (`snake_case` or `kebab-case`) unless the language ecosystem strongly prefers another style.

## Testing Guidelines
No test framework is configured yet. Add automated tests with every new feature or bug fix, place them under `tests/`, and name them so intent is obvious. Match test names to the module or behavior they cover, for example `tests/test_login_flow.py` or `tests/user-service.spec.ts`.

## Commit & Pull Request Guidelines
This repository has no commit history yet, so there is no established convention to inherit. Start with short, imperative commit messages such as `docs: add repository guidelines` or `feat: add initial project scaffold`. Keep pull requests focused, describe the change and its motivation, link related issues, and include screenshots or command output when UI or developer workflow changes are involved.

## Documentation Maintenance
Update this file whenever you add real source directories, tooling, or contributor workflow rules. A stale guide is worse than a short one.
