# Prompt: Design-Only Agent Runtime

이 문서는 Rust 기반 AI Agent / Workflow Engine의 design-only runtime을 설계하기 위한 prompt이다.

반드시 이 내용을 기반으로 설계와 개발 로드맵 문서를 작성해야 한다.

## File Writing Rules

- 기존 설계 문서를 먼저 분석하고 정리한 뒤 새 설계 문서나 로드맵 문서를 작성한다.
- 설계 문서는 `docs/designs/<date_utc_time>_<title>.md` 경로에 작성한다.
- 개발 로드맵 문서는 `docs/roadmaps/<date_utc_time>_<title>.md` 경로에 작성한다.
- `<date_utc_time>`은 UTC 기준 `YYYYMMDD_HHMMSS` 형식을 사용한다.
- `<title>`은 소문자 `snake_case`를 사용한다.
- 최종 개발 로드맵은 기존 설계 분석과 새 설계 정리가 끝난 뒤 작성한다.

## Context

초기 버전은 코드를 자동 수정하는 agent보다 설계를 반복 개선하는 agent에 집중한다. 사용자가 원하는 목표를 읽고, 이전 상태와 설계 산출물을 확인하고, 다음 설계 개선안을 만들고, 사람이 승인할 수 있는 review document를 생성해야 한다.

## Task

다음 흐름을 지원하는 design-only planning loop를 설계하라.

1. goal file 또는 CLI 입력으로 목표를 읽는다.
2. 기존 state, plan, architecture, risks, ADR을 로드한다.
3. 필요한 context를 선택하고 prompt를 조립한다.
4. LLM에게 structured output을 요청한다.
5. schema validation을 수행한다.
6. 설계 문서 초안 또는 변경 제안서를 생성한다.
7. risk summary와 approval request를 만든다.
8. checkpoint를 저장한다.
9. 다음 run에서 이전 결과를 이어받는다.

## Required Capabilities

- Goal Definition
- Goal Decomposition
- Goal Lifecycle
- Task Planning
- Step-by-Step Planning
- Replanning
- Design Iteration
- Decision Recording
- Structured Output Validation
- Retry on Invalid Output
- Versioned Schema
- Review Document
- Pause and Resume

## Suggested Artifact Layout

```text
.dev/
  goal.md
  state.json
  plan.md
  architecture.md
  risks.md
  design-decisions/
  run-history/
```

문서에서는 이 layout을 그대로 채택할지, `docs/` 아래로 이동할지, 또는 둘을 역할별로 분리할지 판단하라.

## Required Output

작성할 문서는 다음을 포함해야 한다.

- design-only mode의 목적과 non-goals
- runtime state machine
- input/output artifact schema
- retry and validation flow
- approval gate behavior
- CLI command design
- MVP implementation tasks
- 개발 로드맵 및 milestone 연결

## Constraints

- MVP는 실제 파일 수정이나 shell command 실행보다 설계 산출물 생성을 우선한다.
- 모든 LLM output은 typed deserialization 가능한 구조를 가져야 한다.
- invalid output은 재시도하되 무한 루프를 만들지 않는다.
- 사람이 검토하기 쉬운 Markdown 산출물을 생성한다.
