# Agent Workflow Engine Roadmap Design Basis

Status: Proposed
Created: 2026-04-25 23:51:54 UTC
Scope: Rust 기반 신규 AI Agent / Workflow Engine 개발 로드맵 설계 근거
Source Prompt: `docs/prompts/20260425_221546_roadmap_milestones.md`

## 1. 목적

이 문서는 최종 개발 로드맵을 작성하기 전에 기존 설계 문서를 분석하고,
로드맵에 반영할 설계 기준을 정리한다. 결론은 기존 Dore CEP 설계를
장기 방향으로 유지하되, 구현 순서는 더 보수적으로 재배치하는 것이다.

초기 제품은 Telegram, full memory automation, 외부 skill 실행, 복잡한
DAG, 완성형 sandbox를 한 번에 구현하지 않는다. Phase 0에서는
design-only foundation을 문서와 schema 수준에서 확정하고, Phase 1에서
local CLI와 파일 기반 state만으로 최소 실행 루프를 검증한다.

## 2. 기존 설계 문서 분석

| 문서 | 핵심 내용 | 로드맵 반영 |
| --- | --- | --- |
| `docs/designs/01_system_architecture.md` | Rust 기반 personal assistant runtime, local-first storage, provider/session/channel/scheduler/skill/module 경계 | 장기 module map으로 유지하되 초기 구현은 `cli`, `workflow`, `goal`, `artifact`, `validator`, `approval`, `policy` 중심으로 축소 |
| `docs/designs/02_memory_and_llm_wiki.md` | durable memory, wiki, digest, provenance, token budget | workflow artifact도 inspectable file-first 원칙을 따르되 Phase 1 범위에는 full memory automation을 포함하지 않음 |
| `docs/designs/03_provider_and_auth.md` | provider 실행과 auth/secret 분리, typed failure | Phase 1은 mock 또는 narrow provider seam까지만 두고 OAuth/API-key routing은 후속 단계로 연기 |
| `docs/designs/04_telegram_and_session_runtime.md` | session 중심 runtime, Telegram은 channel adapter | CLI를 첫 channel로 사용하고 Telegram은 workflow/session core 안정화 후 구현 |
| `docs/designs/05_scheduler_and_self_improvement.md` | scheduled jobs, bounded improvement, policy class, reports | Phase 1은 단일 run/checkpoint/resume만 구현하고 queue/daemon/scheduler는 Phase 3로 연기 |
| `docs/designs/06_quality_and_test_strategy.md` | unit/integration/smoke/e2e test gate | Phase 1부터 schema, state transition, validation, CLI smoke test를 필수화 |
| `docs/designs/07_goal_management_and_reporting.md` | goal class, goal lifecycle, durable report | Phase 0/1의 핵심 backbone으로 채택 |
| `docs/designs/08_multi_agent_and_a2a.md` | child session, external worker, peer coordination | work contract vocabulary만 장기 호환성으로 유지하고 구현은 Post-Phase 5로 연기 |
| `docs/designs/09_clawhub_skill_integration.md` | ClawHub search/install/update/trust/snapshot | Phase 2에서는 metadata, inspect, dry-run install만 구현하고 실행은 Phase 4 이후로 제한 |
| `docs/designs/20260425_231613_design_only_runtime_architecture.md` | design-only state machine, artifact layout, validation/retry/approval | Phase 0/1의 직접 설계 근거로 사용 |
| `docs/roadmaps/20260425_225514_rust_agent_workflow_engine_development_roadmap.md` | Phase 0-5 순서의 이전 roadmap | 새 prompt의 필수 phase와 산출물 기준에 맞춰 보강 |

## 3. 정리된 설계 방향

### 3.1 제품 형태

Dore의 초기 형태는 "local-first Rust workflow engine"이다. 사용자는
CLI로 goal을 주고, runtime은 파일 기반 state를 읽고 쓴다. LLM 또는 mock
provider는 design proposal과 run summary를 구조화된 출력으로 반환하며,
runtime은 이를 검증한 뒤 review artifact와 approval request를 만든다.

### 3.2 Artifact 경계

운영 중 변경되는 runtime state와 project documentation을 분리한다.

```text
operational state:
  .dev/goal.md
  .dev/state.json
  .dev/checkpoints/
  .dev/reports/
  .dev/approvals/
  .dev/run-history/

durable documentation:
  docs/designs/
  docs/roadmaps/
  docs/adrs/
```

이 실행 환경에서 `.dev/...` 참조는 repository root가 아니라 runtime이
제공한 operational state directory를 가리킬 수 있다. 구현은
`--state-root` 같은 명시적 override를 지원해야 한다.

### 3.3 Phase별 설계 원칙

| Phase | 설계 원칙 |
| --- | --- |
| Phase 0 | code보다 schema, state machine, approval, policy boundary를 먼저 고정 |
| Phase 1 | local CLI와 파일 기반 state만으로 design-only run loop 구현 |
| Phase 2 | tool/skill은 metadata와 dry-run까지만 허용하고 외부 실행 금지 |
| Phase 3 | 단일 run을 durable workflow engine으로 확장하되 복잡한 DAG는 제외 |
| Phase 4 | policy engine과 capability model을 모든 실행 경로 앞에 배치하고 sandbox는 명시된 guarantee만 제공 |
| Phase 5 | low-memory, fast-start Rust CLI 요구사항을 benchmark로 검증하고 release discipline 완성 |

## 4. 핵심 결정

- Phase 0과 Phase 1은 파일 기반 state와 local CLI로 제한한다.
- Phase 1의 provider는 mock provider 또는 좁은 provider trait까지만
  허용한다.
- 구조화된 LLM 출력은 versioned schema로 deserialize되고 semantic
  validation을 통과해야 trusted state에 들어간다.
- approval은 Markdown 문서가 아니라 structured approval record를 가진
  workflow transition이다.
- Phase 2 이전에는 외부 skill 실행을 구현하지 않는다.
- ClawHub 호환성은 `discover != install != enable != trust != execute`
  원칙으로 설계한다.
- Phase 3 이전에는 complex DAG를 구현하지 않는다.
- Phase 4 이전에는 sandbox 완성을 목표로 하지 않고 policy boundary와
  auditability를 먼저 고정한다.
- Phase 5에서는 startup time, memory usage, regression suite,
  compatibility fixture를 release gate로 사용한다.

## 5. 초기 Module 후보

Phase 1 scaffold 기준 module 후보는 다음과 같다.

| Module | 책임 |
| --- | --- |
| `cli` | command parsing, repo/state root resolution, user-facing status |
| `goal` | goal file loading, typed goal record, lifecycle status |
| `workflow` | state transition, run loop, retry/resume orchestration |
| `artifact` | JSON/Markdown read/write, atomic write, schema version check |
| `planner` | goal decomposition, plan and design proposal shaping |
| `provider` | mock/real provider seam, raw response capture |
| `validator` | structured output schema and semantic validation |
| `approval` | approval request, approve/reject records, promotion gate |
| `report` | run summary and review document rendering |
| `policy` | early deny/dry-run/approval/allow decision model |
| `audit` | append-only workflow and security events |

## 6. Roadmap 작성 기준

최종 로드맵은 다음 기준을 만족해야 한다.

- phase별 goal을 명확히 분리한다.
- milestone마다 deliverable과 acceptance criteria를 둔다.
- test and verification plan을 phase별로 둔다.
- documentation task를 phase별로 둔다.
- risk and dependency를 phase별로 둔다.
- non-goals와 implementation order를 별도로 명시한다.
- release readiness checklist를 전체 release gate로 둔다.

## 7. Non-Goals

- Phase 0/1에서 autonomous source modification을 구현하지 않는다.
- Phase 2 이전에 외부 skill을 실행하지 않는다.
- Phase 3 이전에 DAG, distributed queue, daemon scheduler를 구현하지 않는다.
- Phase 4 이전에 sandbox 보장을 과장하지 않는다.
- Phase 5 이전에 production-ready release를 선언하지 않는다.
- Telegram, multi-agent, A2A, full provider auth, personal memory automation은
  초기 milestone의 필수 산출물이 아니다.

## 8. Open Questions

- Phase 1의 canonical state format은 하나의 `state.json` 중심으로 둘지,
  plan/report/approval/checkpoint를 초기에 분리할지 결정해야 한다.
- structured schema는 Rust `serde` struct를 source of truth로 둘지,
  JSON Schema를 source of truth로 둘지 결정해야 한다.
- Phase 5 benchmark의 numeric target은 baseline 측정 후 확정해야 한다.
- canonical documentation language를 English, Korean, bilingual 중 무엇으로
  둘지 결정해야 한다.

## 9. 로드맵 연결

이 문서는 같은 UTC timestamp로 작성되는
`docs/roadmaps/20260425_235154_rust_agent_workflow_engine_milestone_roadmap.md`
의 설계 근거이다. 최종 roadmap은 이 분석을 기준으로 Phase 0부터 Phase 5까지
implementation order, milestone, test, documentation, risk, release
readiness를 구체화한다.
