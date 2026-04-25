# Prompt: Existing Design Review and Roadmap Synthesis

이 문서는 Rust 기반 신규 AI Agent / Workflow Engine의 기존 설계안을 먼저 분석하고, 최종적으로 개발 로드맵 문서를 작성하기 위한 최우선 prompt이다.

반드시 이 내용을 기반으로 설계와 개발 로드맵 문서를 작성해야 한다.

이 prompt는 `docs/prompts/` 아래의 다른 세부 topic prompt보다 먼저 실행한다.

## File Writing Rules

- 기존 설계 문서를 먼저 분석하고 정리한 뒤 새 설계 문서나 로드맵 문서를 작성한다.
- 설계 문서는 `docs/designs/<date_utc_time>_<title>.md` 경로에 작성한다.
- 개발 로드맵 문서는 `docs/roadmaps/<date_utc_time>_<title>.md` 경로에 작성한다.
- `<date_utc_time>`은 UTC 기준 `YYYYMMDD_HHMMSS` 형식을 사용한다.
- `<title>`은 소문자 `snake_case`를 사용한다.
- 필요한 경우 `docs/designs/` 또는 `docs/roadmaps/` 디렉터리를 생성한다.
- 기존 설계 문서와 충돌하는 새 문서를 만들 때는 충돌 내용과 정리 기준을 문서에 명시한다.
- 최종 개발 로드맵은 기존 설계 분석과 새 설계 정리가 끝난 뒤 작성한다.

## Context

현재 저장소에는 이미 `docs/designs/` 아래에 여러 설계 문서가 존재한다. 새 로드맵을 바로 작성하기 전에 기존 설계 문서의 의도, 중복, 충돌, 누락, 구현 우선순위를 먼저 정리해야 한다.

이번 작업의 최종 목표는 기존 설계안을 근거로 Rust 기반 AI Agent / Workflow Engine 개발 로드맵을 작성하는 것이다.

## Source Documents

우선 다음 문서들을 분석한다.

- `docs/designs/*.md`
- `docs/designs/ko/*.md`
- `docs/refs/*.md`
- `docs/prompts/*.md`

필요하면 repository root의 `AGENTS.md`도 참고한다.

## Task

다음 순서로 진행하라.

1. 기존 설계 문서 목록을 만들고 각 문서의 핵심 주제를 요약한다.
2. 설계 문서 간 중복, 충돌, 누락된 요구사항을 식별한다.
3. 핵심 architecture decision을 정리한다.
4. 아직 design-only foundation, durable workflow, ClawHub compatibility, security policy, roadmap 관점에서 부족한 부분을 표시한다.
5. 필요한 경우 보완 설계 문서를 `docs/designs/<date_utc_time>_<title>.md`로 작성한다.
6. 모든 분석을 바탕으로 최종 개발 로드맵 문서를 `docs/roadmaps/<date_utc_time>_<title>.md`로 작성한다.

## Required Design Review Output

기존 설계 분석 문서는 다음을 포함해야 한다.

- existing design inventory
- document-by-document summary
- confirmed decisions
- open questions
- duplicated or overlapping topics
- conflicts and resolution proposal
- missing design areas
- roadmap implications

## Required Roadmap Output

최종 개발 로드맵 문서는 다음을 포함해야 한다.

- phase별 목표
- milestone별 deliverable
- milestone별 acceptance criteria
- implementation order
- dependency and risk
- test and verification plan
- documentation tasks
- release readiness checklist

## Priority Rules

- 기존 설계안 정리가 새 설계 작성보다 우선이다.
- 새 개발 로드맵은 기존 설계 문서를 무시하고 작성하면 안 된다.
- roadmap은 Phase 0부터 Phase 5까지 이어지는 실행 가능한 순서로 작성한다.
- Phase 0과 Phase 1은 design-only foundation, local CLI, file-based state를 우선한다.
- ClawHub skill 실행, sandbox, multi-agent, DAG는 후속 phase로 둔다.
