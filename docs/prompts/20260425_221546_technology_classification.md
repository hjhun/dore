# Prompt: AI Agent Technology Classification

이 문서는 Rust 기반 신규 AI Agent / Workflow Engine 설계를 위한 prompt이다.

반드시 이 내용을 기반으로 설계와 개발 로드맵 문서를 작성해야 한다.

## File Writing Rules

- 기존 설계 문서를 먼저 분석하고 정리한 뒤 새 설계 문서나 로드맵 문서를 작성한다.
- 설계 문서는 `docs/designs/<date_utc_time>_<title>.md` 경로에 작성한다.
- 개발 로드맵 문서는 `docs/roadmaps/<date_utc_time>_<title>.md` 경로에 작성한다.
- `<date_utc_time>`은 UTC 기준 `YYYYMMDD_HHMMSS` 형식을 사용한다.
- `<title>`은 소문자 `snake_case`를 사용한다.
- 최종 개발 로드맵은 기존 설계 분석과 새 설계 정리가 끝난 뒤 작성한다.

## Context

AI Agent는 단순 LLM API 호출 프로그램이 아니라 목표를 이해하고, 계획을 세우고, 도구를 호출하고, 상태를 저장하고, 실패를 복구하고, 사람의 승인을 받아 반복 실행되는 시스템이다.

이 프로젝트는 특히 다음 6개 축을 중요하게 본다.

1. goal-driven 반복 실행
2. design-only planning loop
3. resumable workflow state
4. ClawHub-compatible skill metadata
5. explicit trust / approval / policy
6. low-memory, fast-start Rust CLI

## Task

다음 기술 범주를 "Rust 프로젝트 적용 여부 + 우선순위 + 구현 난이도 + 초기 구현 범위 + 후속 확장 범위" 관점으로 정리하라.

- Goal Management
- Planning and Reasoning
- Tool Calling
- Structured Output
- Memory and State Management
- Durable Execution
- Workflow Orchestration
- Human-in-the-Loop
- Guardrails and Validation
- Skill / Plugin System
- ClawHub / OpenClaw Compatibility
- Context Management
- Retrieval and Indexing
- Prompt Engineering and Prompt Asset Management
- Agent Runtime
- Multi-Agent / Specialist Handoff
- Security Model
- Sandboxing
- Observability
- Evaluation and Benchmarking
- Configuration and Policy
- CLI UX
- Daemon and Scheduler
- Repository and Artifact Management
- Model Provider Abstraction

## Required Output

작성할 문서는 다음 형식을 포함해야 한다.

- 기술 분류표
- 각 기술의 프로젝트 적용 여부
- MVP 포함 여부
- Phase 0-5 우선순위 매핑
- Rust 구현 난이도
- 핵심 crate 또는 구현 후보
- 설계 문서에서 더 자세히 다룰 항목
- 개발 로드맵에서 milestone으로 분리할 항목

## Constraints

- 모든 기술을 한 번에 구현하지 않는다.
- 초기 버전은 design-only foundation과 파일 기반 state를 우선한다.
- autonomous execution보다 human approval gate를 우선한다.
- embedding retrieval보다 filename, metadata, keyword 기반 검색을 먼저 고려한다.
- multi-agent는 초기에는 role-specific prompt template 수준으로 제한한다.
