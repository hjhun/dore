# Technical Design

## 설계 방향

Dore는 하나의 거대한 프롬프트가 아니라 여러 계층으로 구성한다.

- Orchestrator: 사용자 요청을 해석하고 작업을 분배한다.
- Memory Manager: 장기 기억과 wiki를 관리한다.
- Engineering Agent: 코드 작업, 리뷰, 테스트를 수행한다.
- Trading Agent: 시장 데이터 분석과 주문 실행을 담당한다.
- Tool Builder: 필요한 내부 도구를 만든다.
- Scheduler: 리마인더와 주기 작업을 실행한다.
- Safety Guard: 위험도 평가와 승인 정책을 적용한다.
- Logger: 작업 결과와 판단 근거를 기록한다.
- Model Gateway: OpenAI, Claude, Gemini 호출을 공통 interface로 감싼다.
- Auth Manager: API key와 OpenAI OAuth credential을 관리한다.

초기 실행 형태는 로컬 상시 실행 daemon, Telegram bot, Electron 데스크톱 앱이다.

## 제안 아키텍처

```text
User
  |
  v
Interface
  |
  v
Orchestrator
  |-- Model Gateway
  |-- Memory Manager
  |-- Engineering Agent
  |-- Trading Agent
  |-- Tool Builder
  |-- Scheduler
  |-- Safety Guard
  `-- Logger
        |
        v
Storage / Tools / APIs
```

## Runtime Topology

```text
Electron Desktop App
  |
Telegram Bot ---- Gateway ---- Local Agent Daemon
  |                              |
CLI/TUI -------------------------|
                                 v
                    Memory / Scheduler / Tools / APIs
```

## Interface Strategy

### Local Agent Daemon

- 항상 실행되는 기본 runtime.
- scheduler, memory manager, tool registry, trading engine을 소유한다.
- desktop app과 messenger gateway는 daemon API를 통해 같은 상태를 사용한다.

### Telegram Bot

- gateway adapter 구조로 만든다.
- 초기 메신저 플랫폼은 Telegram만 지원한다.
- 장기적으로 다른 플랫폼 확장을 막지 않도록 adapter 경계를 유지한다.

### Electron Desktop App

- Agent 상태를 관찰하고 승인하는 primary UI다.
- memory/wiki, task, schedule, trading, development job 상태를 보여준다.
- 위험 작업 승인/거절을 지원한다.
- 웹 프론트엔드 기술을 사용해 빠르게 dashboard UI를 만든다.
- Node.js 권한은 main/preload/renderer 경계를 명확히 나누고, renderer에는 필요한 API만 노출한다.
- 첫 화면은 Dashboard다.
- 위험 작업 승인은 Dashboard의 Approvals 패널과 별도 Approvals 화면에서 처리한다.

### CLI/TUI

- 운영, 디버깅, 개발자 작업을 위한 보조 인터페이스다.
- Hermes command parity를 일부 유지한다.

## 저장소 구성 초안

```text
docs/
memory/
src/
  agent/
  memory/
  tools/
  trading/
  engineering/
  scheduler/
  safety/
tests/
configs/
scripts/
```

## Memory 구현

초기 버전은 Markdown 기반 wiki로 시작한다.

- 장점: 단순함, git 버전 관리, 사람이 읽기 쉬움, Codex와 잘 맞음.
- 단점: 규모가 커지면 검색과 일관성 관리가 어려워짐.

확장 시 선택지:

- SQLite metadata index.
- BM25 검색.
- vector index.
- hybrid search.
- MCP 기반 local search server.

## Tool Registry

Agent가 사용할 수 있는 도구는 registry로 관리한다.

각 도구는 아래 정보를 가진다.

- 이름.
- 설명.
- 입력 스키마.
- 출력 스키마.
- 위험도.
- 필요한 권한.
- dry-run 지원 여부.
- 로그 정책.

## Model Gateway

Dore는 provider별 SDK 호출을 직접 Agent core에 섞지 않고 Model Gateway 뒤에 둔다.

지원 provider:

- OpenAI.
- Claude.
- Gemini.

기본 인증 방식은 API key다. OpenAI는 API key와 OAuth 계열 연결 방식을 모두 지원한다.

Model Gateway 책임:

- provider/model 선택.
- streaming 응답 처리.
- tool calling capability 차이 흡수.
- usage/token/cost metadata 수집.
- provider별 오류를 공통 오류 타입으로 변환.
- auth mode를 usage log에 기록.

Auth Manager 책임:

- API key 위치 관리.
- OpenAI OAuth 연결 상태 관리.
- token refresh/만료/revoke 처리.
- secret이 로그나 UI에 노출되지 않도록 보호.

## Trading Engine

### 구성 요소

- MarketDataClient.
- AccountClient.
- OrderClient.
- StrategyEngine.
- RiskManager.
- ExecutionManager.
- TradingJournal.
- BrokerConnectorRegistry.
- DryRunExecutor.

### 기본 흐름

1. broker connector 지원 범위 확인.
2. 데이터 조회.
3. 전략 평가.
4. 주문 후보 생성.
5. RiskManager 검증.
6. dry-run journal 기록.
7. 승인 정책 확인.
8. 주문 전송.
9. 체결 확인.
10. journal 기록.

리스크 정책은 코드에 하드코딩하지 않고 설정 또는 Agent memory에서 주입한다. 정책이 없으면 `dry-run`과 주문 후보 보고까지만 허용한다.

초기 broker 우선순위:

- 토스증권: 1차 connector 후보.
- 신한증권: 2차 connector 후보.
- 삼성증권: 공식 개인용 Open API 확인 전까지 자동 주문 제외.

## Engineering Engine

### 구성 요소

- RepositoryInspector.
- Planner.
- CodeEditor.
- Reviewer.
- TestRunner.
- DocumentationUpdater.

### 기본 흐름

1. 요구사항 정리.
2. repo 탐색.
3. 변경 계획.
4. 구현.
5. 검증.
6. 요약.
7. memory 반영.

## 토큰 최적화

- 요청마다 전체 memory를 읽지 않는다.
- index와 active context를 먼저 읽는다.
- 작업별 필요한 파일만 검색한다.
- 긴 문서는 요약 계층을 만든다.
- 반복되는 정책은 짧은 system context로 유지한다.
- 작업 완료 후 결과를 압축된 log로 저장한다.
- daily briefing은 source extract, diff summary, final synthesis의 3단계로 나눠 토큰 사용을 줄인다.

## 실행 환경 결정

- 로컬 상시 실행 daemon.
- Telegram bot.
- Electron 데스크톱 앱.
- CLI/TUI는 관리 및 개발 보조 기능으로 유지.

## 구현 중 검증 항목

- 주기 작업은 MVP에서 daemon 내부 scheduler로 시작하고, 안정화 후 queue 도입 여부를 검토한다.
- 저장소는 MVP에서 Markdown/JSON/JSONL/YAML로 시작하고, 검색/색인 필요가 커지면 SQLite metadata index를 붙인다.
- provider별 기본 모델과 routing tier는 [13_LLM_PROVIDERS.md](13_LLM_PROVIDERS.md)를 따른다.
- 배포는 MVP에서 로컬 실행으로 시작하고, 외부 서버 배포는 범위에서 제외한다.

초기 설정 구조는 [22_CONFIG_SCHEMA_DRAFT.md](22_CONFIG_SCHEMA_DRAFT.md)를 따른다.

구현 시 daemon, task, approval, briefing, usage, trading signal의 구체 데이터 계약은 [28_RUNTIME_CONTRACTS.md](28_RUNTIME_CONTRACTS.md)를 따른다.

MVP 개발 task 분해는 [29_MVP_ENGINEERING_BACKLOG.md](29_MVP_ENGINEERING_BACKLOG.md)를 따른다.

실제 repo scaffold, package 구조, 첫 PR 분할은 [30_DEVELOPMENT_START_SPEC.md](30_DEVELOPMENT_START_SPEC.md)를 따른다.
