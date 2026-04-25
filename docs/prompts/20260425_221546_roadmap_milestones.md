# Prompt: Development Roadmap and Milestones

이 문서는 Rust 기반 신규 AI Agent / Workflow Engine의 개발 로드맵과 milestone을 작성하기 위한 prompt이다.

반드시 이 내용을 기반으로 설계와 개발 로드맵 문서를 작성해야 한다.

## File Writing Rules

- 기존 설계 문서를 먼저 분석하고 정리한 뒤 새 설계 문서나 로드맵 문서를 작성한다.
- 설계 문서는 `docs/designs/<date_utc_time>_<title>.md` 경로에 작성한다.
- 개발 로드맵 문서는 `docs/roadmaps/<date_utc_time>_<title>.md` 경로에 작성한다.
- `<date_utc_time>`은 UTC 기준 `YYYYMMDD_HHMMSS` 형식을 사용한다.
- `<title>`은 소문자 `snake_case`를 사용한다.
- 최종 개발 로드맵은 기존 설계 분석과 새 설계 정리가 끝난 뒤 작성한다.

## Context

전체 기술 목록을 한 번에 구현하면 안 된다. Phase 0에서 design-only foundation을 만들고, 이후 runtime, tool/skill, durable workflow, safety, production hardening 순서로 확장한다.

## Required Roadmap

다음 phase 구조를 기준으로 개발 로드맵을 작성하라.

### Phase 0: Design-Only Foundation

- Goal Management
- Planning
- State Management
- Design Artifact Management
- Human Approval Gate
- CLI UX 초안
- Security Model 초안
- ClawHub Compatibility Scope 초안

### Phase 1: Minimal Local Agent Runtime

- CLI
- Goal file loading
- State file loading/saving
- Design-only run loop
- Structured output validation
- Run summary generation
- Retry/resume 기본 구조

### Phase 2: Tool and Skill Foundation

- Tool schema
- Tool registry
- Tool execution policy
- Skill metadata model
- ClawHub metadata parser
- Dry-run install/inspect

### Phase 3: Durable Workflow Engine

- State machine
- Checkpoint
- Resume
- Retry policy
- Queue
- Daemon scheduler
- Locking

### Phase 4: Safety and Sandboxing

- Policy engine
- Capability model
- Approval gates
- Sandbox strategy
- Audit log
- Prompt injection defense

### Phase 5: Performance and Production Hardening

- Memory benchmark
- Startup benchmark
- Observability
- Trace export
- Regression test suite
- ClawHub compatibility tests
- Packaging and release

## Required Output

작성할 문서는 다음을 포함해야 한다.

- phase별 목표
- milestone별 deliverable
- milestone별 acceptance criteria
- test and verification plan
- documentation tasks
- risk and dependency
- non-goals
- implementation order
- release readiness checklist

## Constraints

- Phase 0과 Phase 1은 파일 기반 state와 local CLI로 제한한다.
- Phase 2 이전에는 외부 skill 실행을 구현하지 않는다.
- Phase 3 이전에는 복잡한 DAG를 구현하지 않는다.
- Phase 4 이전에는 sandbox를 완성하려 하지 말고 policy boundary를 먼저 고정한다.
- Phase 5에서는 low-memory, fast-start Rust CLI 요구사항을 benchmark로 검증한다.
