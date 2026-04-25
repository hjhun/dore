# CEP-01: Dore 시스템 아키텍처

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore core maintainers
Related: `02_memory_and_llm_wiki.md`, `03_provider_and_auth.md`, `04_telegram_and_session_runtime.md`, `05_scheduler_and_self_improvement.md`, `06_quality_and_test_strategy.md`, `07_goal_management_and_reporting.md`, `08_multi_agent_and_a2a.md`, `09_clawhub_skill_integration.md`

## 1. 요약

Dore는 다음을 목표로 하는 Rust 기반 개인 비서 런타임입니다.

- 장기간 사용자를 기억한다
- 전체 대화 이력을 재생하지 않고도 대화 연속성을 유지한다
- 통제된 방식으로 스스로 개선한다
- OpenAI를 OAuth 기반 기본 provider로 사용한다
- 사용자가 설정하면 API key 기반 provider와 local LLM도 사용한다
- Telegram을 첫 번째 상호작용 채널로 사용한다
- 장기적으로 멀티 에이전트와 멀티 디바이스 실행으로 확장한다

이 CEP는 Dore의 제품 수준 아키텍처와 이후 개별 설계 문서가 따라야 할 핵심 결정을 정의합니다.

## 2. 배경

사용자 요구사항은 나중에 덧붙일 수 있는 옵션이 아니라 처음부터 아키텍처를 결정해야 하는 제약입니다.

- 일반 챗봇이 아니라 개인 비서 중심
- LLM Wiki 패턴 기반의 지속 기억
- 토큰 사용 최소화와 강한 컨텍스트 연속성
- 단일 책임을 가진 단순하고 경계가 명확한 모듈
- 책임 분리를 위한 Clean Architecture와 OOAD
- 과한 패턴 적용이 아닌 실용적인 설계 패턴 사용
- 통제되지 않은 자율성이 아닌 제한된 자기개선
- OpenAI OAuth를 기본 연결 경로로 사용
- Claude, ChatGPT, Gemini 등을 위한 API key provider 지원
- local LLM을 수용할 수 있는 구조
- Telegram 우선 운영과 최소 명령 집합
- cron, interval, daily, weekly 스케줄 지원
- 내부 sub-agent와 향후 Dore 간 협업 지원
- unit, integration, smoke, e2e 테스트를 모두 강제

또한 이미 검토한 프로젝트들의 장점을 설계에 반영해야 합니다.

- `llm_wiki`: 지속적이고 누적되는 wiki 기반 기억
- `openclaw`: provider/auth 경계와 실용적인 런타임 분리
- `claude-code`: 절제된 에이전트 실행 흐름과 저장소 중심 작업 방식
- `opencode`: session 중심 런타임과 provider 중립 실행 경계
- `dormammu`: goal 중심 자동화, 스케줄링, report 중심 운영
- `graphify`: 그래프 기반 탐색, lint, 토큰 비용 진단

## 3. 문제 정의

일반적인 agent 구조는 다음 중 하나 이상에서 실패합니다.

- 너무 많은 과거 대화를 재전송하여 토큰을 낭비한다
- 기억을 불투명한 벡터 스토어나 로그에 숨긴다
- provider 로직과 비즈니스 로직을 섞는다
- 채널 코드와 도메인 코드, 오케스트레이션을 분리하지 못한다
- 자기개선을 무제한 자기변형으로 오해한다
- 테스트와 보고를 부차적인 문제로 취급한다

Dore는 이 문제들을 동시에 해결해야 합니다.

## 4. 목표

### 4.1 제품 목표

- 한 명의 사용자를 장기간 개인적으로 돕는다.
- 사용자 컨텍스트를 일시적 채팅 상태가 아니라 지속 지식으로 보존한다.
- 전체 이력이 아니라 컴파일된 기억을 가져와 프롬프트를 작게 유지한다.
- 비서와 코드베이스를 통제된 흐름 안에서 개선한다.
- 의미 있는 발견, 변경, 실패를 사용자에게 보고한다.

### 4.2 엔지니어링 목표

- 모듈 경계를 좁고 명확하게 유지한다.
- 숨겨진 인프라보다 로컬에서 읽을 수 있는 상태를 우선한다.
- 각 기능을 독립적으로 테스트 가능하게 만든다.
- provider, channel, scheduler, multi-agent 확장을 고려한 구조를 유지한다.

## 5. 비목표

- 첫 마일스톤에서 범용 분산 에이전트 플랫폼을 만드는 것
- 처음부터 모든 메시징 채널을 지원하는 것
- 무제한 자동 코드 수정을 허용하는 것
- 그래프 인덱스를 주 기억 저장소로 취급하는 것
- 정당화되기 전부터 무거운 인프라에 의존하는 것

## 6. 요구사항

### 6.1 기능 요구사항

- FR-1: Dore는 장기 사용자 기억을 로컬의 지속 아티팩트로 유지해야 한다.
- FR-2: Dore는 요약과 표적 참조를 이용해 컴팩트한 컨텍스트로 답변해야 한다.
- FR-3: Dore는 기본 모델 연결 경로로 OpenAI OAuth를 사용해야 한다.
- FR-4: Dore는 사용자가 설정한 API key provider를 지원해야 한다.
- FR-5: Dore는 local LLM을 위한 provider 인터페이스를 유지해야 한다.
- FR-6: Dore는 Telegram을 첫 번째 채널로 사용해야 한다.
- FR-7: Dore는 스케줄 작업과 deferred goal을 지원해야 한다.
- FR-8: Dore는 통제된 자기개선과 사용자 보고를 지원해야 한다.
- FR-9: Dore는 내부 sub-agent와 향후 Dore peer 협업을 지원해야 한다.
- FR-10: Dore는 memory update, 런타임 결정, 개선 작업의 감사 가능성을 유지해야 한다.
- FR-11: Dore는 ClawHub에서 설치 가능한 skill을 명시적 trust/activation 정책 아래 지원해야 한다.

### 6.2 비기능 요구사항

- NFR-1: 토큰 사용량은 1급 시스템 예산으로 다뤄야 한다.
- NFR-2: 핵심 상태는 디스크에서 읽을 수 있어야 한다.
- NFR-3: 각 모듈은 하나의 명확한 기능을 가져야 한다.
- NFR-4: 실패 유형은 구분 가능하고 관측 가능해야 한다.
- NFR-5: secret은 session과 memory 아티팩트로부터 격리되어야 한다.
- NFR-6: 자기개선은 정책 경계와 테스트 게이트를 반드시 따라야 한다.
- NFR-7: 시스템은 로컬 운용이 가능할 만큼 경량이어야 한다.
- NFR-8: 전체 설계는 Rust로 깔끔하게 구현 가능해야 한다.

## 7. 아키텍처 결정

### AD-1: 지속 wiki를 장기 기억의 source of truth로 사용한다

raw 입력은 불변으로 유지하되, LLM이 유지하는 wiki를 주된 컴파일 지식 계층으로 사용합니다. digest는 wiki에서 파생됩니다. 그래프 인덱스는 선택적이며 보조적입니다.

### AD-2: 내부 session을 주 런타임 추상화로 사용한다

Telegram은 첫 번째 채널 adapter일 뿐입니다. 비즈니스 로직은 Telegram이 아니라 session에서 실행되어야 합니다.

### AD-3: provider 실행과 인증은 별개의 관심사다

provider adapter는 모델 요청을 실행하고, credential resolution과 secret storage는 별도 계층으로 둡니다. session 코드는 secret을 직접 다루지 않습니다.

### AD-4: 스케줄 작업과 대화 작업은 같은 실행 모델을 사용한다

스케줄 작업도 goal로 표현되고 session에서 실행됩니다. 이렇게 해야 감사 로그와 보고 구조가 일관됩니다.

### AD-5: 자기개선은 기능이지만 무제한 모드가 아니다

관찰, 분석, 구현, 테스트, 보고 단계를 분리합니다. 테스트되지 않은 변경은 수용하지 않습니다.

### AD-6: 로컬 우선 저장은 필수다

memory, session, schedule, report, 파생 아티팩트는 로컬에서 점검 가능해야 합니다. 캐시는 재생성 가능해야 합니다.

### AD-7: 멀티 에이전트는 단계적으로 도입한다

첫 단계는 내부 child session, 두 번째는 CLI 기반 외부 worker, 세 번째는 Dore-to-Dore peer 협업과 A2A 정렬입니다.

## 8. 모듈 경계

## `core`

공유 도메인 primitive:

- ID
- typed error
- clock
- config type
- task class
- policy enum
- result envelope

`core`는 구현 모듈에 의존하면 안 됩니다.

## `storage`

영속화 경계와 로컬 저장:

- file store
- structured metadata store
- cache
- secret reference store
- session/job repository

## `memory`

지속 지식 생명주기:

- raw source ingestion
- wiki update workflow
- digest compilation
- memory lint
- graph index generation

## `provider`

모델 접근과 routing:

- provider registry
- OAuth flow
- API key resolution
- local LLM adapter
- model routing과 fallback

## `session`

주 런타임 orchestration:

- session 생성과 로드
- context assembly
- 요약과 compaction
- child session 관리
- 응답 실행
- report promotion

## `channel`

외부 인터페이스:

- Telegram first
- 이후 채널도 동일한 session 경계를 따름

## `scheduler`

시간 기반 작업:

- cron parsing
- interval trigger
- daily/weekly trigger
- job enqueue
- backoff/retry

## `skill`

설치 가능한 런타임 확장:

- local skill discovery
- ClawHub search/install
- skill lockfile/origin tracking
- skill readiness/dependency check
- skill trust/allowlist policy
- hot reload 또는 snapshot invalidation

## `improvement`

통제된 시스템 진화:

- 개선 포인트 탐지
- 개선 제안
- 제한된 실행
- report 생성
- quality gate 연동

## `quality`

검증 시스템:

- unit, integration, smoke, e2e orchestration
- quality policy
- regression enforcement
- release/acceptance rule

## `goal`

지속되는 사용자/시스템 목표:

- goal intake
- 우선순위 관리
- plan state
- report/review link

## `agent`

sub-agent와 peer coordination:

- child session worker
- CLI worker adapter
- peer node coordination
- capability registry

## 9. 런타임 흐름

### 9.1 상호작용 흐름

1. Telegram update를 수신한다.
2. 사용자와 active session을 식별한다.
3. intent와 task class를 결정한다.
4. 최소 유효 context를 조립한다.
5. provider와 model을 선택한다.
6. 작업을 실행한다.
7. 필요 시 session과 memory를 갱신한다.
8. 응답을 전송하고 audit event를 기록한다.

### 9.2 스케줄 흐름

1. scheduler가 due job을 트리거한다.
2. goal 또는 job record를 생성하거나 재개한다.
3. system session 또는 child session에서 작업을 수행한다.
4. 결과가 memory, goal, report를 갱신한다.
5. 중요한 결과는 사용자에게 통지한다.

### 9.3 자기개선 흐름

1. Dore가 friction, debt, missed capability를 감지한다.
2. improvement candidate를 생성한다.
3. 정책이 자동 실행 가능 여부를 판정한다.
4. 전용 worker context에서 제한된 구현을 수행한다.
5. 필요한 테스트를 실행한다.
6. 관련 goal 또는 session에 연결된 report를 생성한다.

## 10. 저장소 구조

```text
docs/
  refs/
  designs/
  designs/ko/
src/
  core/
  storage/
  memory/
  provider/
  session/
  skill/
  channel/
    telegram/
  scheduler/
  improvement/
  quality/
  goal/
  agent/
tests/
  unit/
  integration/
  smoke/
  e2e/
assets/
scripts/
```

## 11. 의존성 규칙

허용 방향:

- `channel -> session, goal, provider`
- `channel -> skill`
- `scheduler -> goal, session`
- `improvement -> goal, session, memory, provider, quality, agent`
- `agent -> session, provider, quality`
- `skill -> storage, core`
- `session -> memory, provider, goal, core, storage`
- `memory -> storage, core`
- `provider -> storage, core`
- `quality -> core`
- `goal -> storage, core`

금지 예시:

- `memory`가 `channel`에 의존
- `provider`가 `telegram`에 의존
- `core`가 바깥 모듈에 의존
- `quality`가 provider 구현 세부사항에 의존

## 12. 영속화 모델

지속 아티팩트는 책임별로 분리되어야 합니다.

- memory 아티팩트는 memory root 아래
- session ledger와 summary는 session root 아래
- goal/job record는 planning root 아래
- report는 reporting root 아래
- secret과 auth material은 보호된 secret store 아래
- cache는 재생성 가능한 cache root 아래

정확한 디스크 레이아웃은 바뀔 수 있지만, 범주 분리는 유지해야 합니다.

## 13. 보안과 프라이버시

- secret은 memory page, report, session summary에 기록하면 안 됩니다.
- auth refresh token은 별도로 격리합니다.
- peer device는 명시적으로 pair 되기 전에는 위임 대상이 될 수 없습니다.
- 자기개선은 provider routing 변경이나 데이터 유출을 조용히 수행하면 안 됩니다.
- log는 민감 본문보다 메타데이터 중심으로 남기는 편이 좋습니다.

## 14. 도입 단계

### Phase 1

- core type
- local storage
- provider/auth boundary
- Telegram channel
- session runtime

### Phase 2

- memory wiki ingestion
- digest compilation
- memory lint
- goal tracking

### Phase 3

- scheduler
- reporting
- controlled self-improvement
- quality gate integration

### Phase 4

- internal sub-agent
- CLI worker adapter
- peer Dore discovery와 A2A-compatible envelope

## 15. 수용 기준

다음이 만족되면 이 아키텍처를 수용합니다.

- Telegram이 session을 통해 assistant를 깨끗하게 구동한다
- 사용자 기억이 전체 대화 재생 없이 유지된다
- OpenAI OAuth가 기본 경로로 안정적으로 동작한다
- API-key provider를 구조 변경 없이 추가할 수 있다
- 스케줄 작업과 대화 작업이 일관된 audit model을 공유한다
- 자기개선이 테스트를 우회할 수 없다
- Dore가 무엇을 했고 무엇이 실패했는지 report가 명확히 설명한다

## 16. 열린 질문

- 첫 secret backend는 무엇으로 할 것인가?
- session state는 plain file부터 시작할 것인가, SQLite부터 시작할 것인가, hybrid인가?
- peer Dore discovery의 첫 마일스톤은 manual pairing만으로 충분한가?
- 어떤 improvement class는 테스트가 통과해도 반드시 사용자 승인을 받아야 하는가?
