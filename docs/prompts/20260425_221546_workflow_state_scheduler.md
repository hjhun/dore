# Prompt: Durable Workflow State and Scheduler

이 문서는 Rust 기반 AI Agent / Workflow Engine의 durable execution, workflow orchestration, daemon scheduler를 설계하기 위한 prompt이다.

반드시 이 내용을 기반으로 설계와 개발 로드맵 문서를 작성해야 한다.

## File Writing Rules

- 기존 설계 문서를 먼저 분석하고 정리한 뒤 새 설계 문서나 로드맵 문서를 작성한다.
- 설계 문서는 `docs/designs/<date_utc_time>_<title>.md` 경로에 작성한다.
- 개발 로드맵 문서는 `docs/roadmaps/<date_utc_time>_<title>.md` 경로에 작성한다.
- `<date_utc_time>`은 UTC 기준 `YYYYMMDD_HHMMSS` 형식을 사용한다.
- `<title>`은 소문자 `snake_case`를 사용한다.
- 최종 개발 로드맵은 기존 설계 분석과 새 설계 정리가 끝난 뒤 작성한다.

## Context

이 프로젝트는 `dormammu`처럼 주기적으로 실행되면서 goal을 읽고, 이전 상태를 확인하고, 다음 작업을 결정하는 구조가 중요하다. 중단되어도 재개할 수 있어야 하며, 같은 step이 재실행되어도 안전해야 한다.

## Task

다음 기능을 설계하라.

- explicit state machine
- checkpointing
- resume
- idempotent steps
- retry policy
- timeout handling
- cancellation
- partial result recovery
- queue management
- interval scheduler
- cron-like scheduler
- file watcher
- lock file
- heartbeat
- graceful shutdown and restart

## Required State Model

다음 상태를 포함하는 lifecycle을 제안하라.

- created
- planned
- waiting_approval
- running
- blocked
- completed
- failed
- cancelled

필요하다면 design-only runtime에 맞는 추가 상태를 제안하라.

## Required Output

작성할 문서는 다음을 포함해야 한다.

- workflow state transition table
- checkpoint schema
- run history schema
- lock and heartbeat strategy
- daemon process lifecycle
- scheduler command UX
- failure recovery behavior
- MVP에서 제외할 복잡한 DAG 기능
- 개발 로드맵 및 milestone 연결

## Constraints

- 초기 설계에서는 복잡한 DAG보다 명시적 state machine을 우선한다.
- 파일 기반 state로 시작한다.
- 중복 실행 방지를 반드시 다룬다.
- 장기적으로 queue와 DAG 실행으로 확장 가능한 여지를 남긴다.
