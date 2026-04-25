# Prompt: Tool, Skill, and ClawHub Compatibility

이 문서는 Rust 기반 AI Agent / Workflow Engine의 tool calling, skill/plugin system, ClawHub / OpenClaw compatibility를 설계하기 위한 prompt이다.

반드시 이 내용을 기반으로 설계와 개발 로드맵 문서를 작성해야 한다.

## File Writing Rules

- 기존 설계 문서를 먼저 분석하고 정리한 뒤 새 설계 문서나 로드맵 문서를 작성한다.
- 설계 문서는 `docs/designs/<date_utc_time>_<title>.md` 경로에 작성한다.
- 개발 로드맵 문서는 `docs/roadmaps/<date_utc_time>_<title>.md` 경로에 작성한다.
- `<date_utc_time>`은 UTC 기준 `YYYYMMDD_HHMMSS` 형식을 사용한다.
- `<title>`은 소문자 `snake_case`를 사용한다.
- 최종 개발 로드맵은 기존 설계 분석과 새 설계 정리가 끝난 뒤 작성한다.

## Context

Agent는 외부 기능을 호출할 수 있어야 하지만, 외부 skill과 registry는 기본적으로 신뢰할 수 없는 입력으로 취급해야 한다. 중요한 설계 원칙은 다음과 같다.

```text
discover != install
install != enable
enable != trust
trust != execute without policy
```

## Task

다음 영역을 설계하라.

- Tool Schema
- Function Calling
- Tool Router
- Tool Executor
- Tool Result Parser
- Tool Error Handling
- Tool Capability Model
- Skill Metadata
- Skill Discovery
- Skill Registry
- Skill Install
- Skill Enable/Disable
- Skill Versioning
- Skill Lock File
- Skill Capability Declaration
- Skill Sandbox
- ClawHub Metadata Parser
- `SKILL.md` Parser
- Registry Client
- Local Skill Catalog
- Package Verification
- Compatibility Layer
- Offline Cache
- Trust Separation

## Required CLI Scope

다음 CLI 흐름을 설계하라.

```bash
agent clawhub search
agent clawhub inspect
agent clawhub install --dry-run
agent skill list
agent skill enable
agent skill review
agent policy show
```

## Required Output

작성할 문서는 다음을 포함해야 한다.

- internal tool schema
- internal skill metadata schema
- ClawHub metadata mapping
- `SKILL.md` parsing rules
- install / enable / trust / execute lifecycle
- package lock strategy
- offline cache strategy
- permission and capability model
- dry-run install flow
- MVP implementation scope
- 개발 로드맵 및 milestone 연결

## Constraints

- MVP는 search, inspect, dry-run install, local catalog부터 시작한다.
- 실제 실행은 policy와 approval gate 뒤에 둔다.
- package verification은 checksum부터 시작하고 signature/provenance는 후속 단계로 둔다.
- 외부 skill의 prompt injection 가능성을 명시적으로 다룬다.
