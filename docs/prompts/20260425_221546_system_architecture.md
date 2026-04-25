# Prompt: Rust AI Agent System Architecture

이 문서는 Rust 기반 신규 AI Agent / Workflow Engine의 시스템 아키텍처를 작성하기 위한 prompt이다.

반드시 이 내용을 기반으로 설계와 개발 로드맵 문서를 작성해야 한다.

## File Writing Rules

- 기존 설계 문서를 먼저 분석하고 정리한 뒤 새 설계 문서나 로드맵 문서를 작성한다.
- 설계 문서는 `docs/designs/<date_utc_time>_<title>.md` 경로에 작성한다.
- 개발 로드맵 문서는 `docs/roadmaps/<date_utc_time>_<title>.md` 경로에 작성한다.
- `<date_utc_time>`은 UTC 기준 `YYYYMMDD_HHMMSS` 형식을 사용한다.
- `<title>`은 소문자 `snake_case`를 사용한다.
- 최종 개발 로드맵은 기존 설계 분석과 새 설계 정리가 끝난 뒤 작성한다.

## Context

프로젝트는 goal-driven 반복 실행, design-only planning loop, resumable workflow state, ClawHub-compatible skill metadata, explicit trust / approval / policy, low-memory fast-start Rust CLI를 핵심 축으로 한다.

초기 목표는 복잡한 autonomous system이 아니라 문서 기반 planning과 human approval gate를 갖춘 안전한 workflow engine이다.

## Task

다음 컴포넌트를 포함하는 시스템 아키텍처를 설계하라.

- CLI entrypoint
- Project config and user config
- Goal manager
- Planner
- Design artifact manager
- State store
- Workflow state machine
- Approval gate
- LLM provider client
- Structured output validator
- Tool registry and executor
- Skill registry
- ClawHub compatibility layer
- Policy engine
- Audit log
- Scheduler / daemon
- Benchmark and observability layer

## Architecture Questions

문서에서 최소한 다음 질문에 답하라.

- 어떤 state를 파일에 저장하고 어떤 state를 runtime memory에만 둘 것인가?
- `.dev/`, `docs/`, `docs/designs/`, `docs/prompts/` 같은 artifact 디렉터리를 어떻게 나눌 것인가?
- design-only mode와 execute mode는 어디에서 분기되는가?
- human approval gate는 state machine의 어느 transition에 위치하는가?
- ClawHub skill은 내부 tool / skill model로 어떻게 변환되는가?
- provider abstraction은 어느 수준까지 일반화할 것인가?
- Rust async runtime은 MVP에 필요한가, 아니면 blocking CLI로 시작할 수 있는가?
- error type, retry policy, checkpoint는 어느 계층이 소유하는가?

## Required Output

작성할 문서는 다음을 포함해야 한다.

- high-level architecture diagram 설명
- module boundary
- data flow
- runtime loop
- artifact lifecycle
- security and trust boundary
- MVP architecture
- future architecture
- 개발 로드맵으로 연결되는 architectural milestone

## Constraints

- Clean Architecture를 참고하되 과도한 계층화를 피한다.
- Rust trait abstraction은 실제 교체 가능성이 있는 경계에만 둔다.
- 초기 구현은 local-first, file-first, inspectable-state 원칙을 따른다.
- 안전하지 않은 tool execution은 기본적으로 차단 또는 dry-run으로 처리한다.
