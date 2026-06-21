# Implementation Roadmap

## 목적

Dore를 실제 제품으로 만들기 위한 단계별 구현 계획을 정한다.

## Phase 0: Product Spec Consolidation

목표:

- draft 문서를 정리하고 첫 구현 범위를 고정한다.

완료 조건:

- MVP scope 확정.
- memory 구조 확정.
- risk/cost defaults 확정.
- Telegram bot 운영 방식 확정.
- LLM provider 설정 방식 확정.
- runtime contract 확정.
- MVP engineering backlog 확정.
- development start spec 확정.

## Phase 1: Local Core

목표:

- Dore core runtime을 로컬에서 실행한다.

포함:

- local daemon skeleton.
- config loader.
- logging.
- scheduler.
- model gateway interface.
- memory directory 생성.
- approval queue.

완료 조건:

- daemon 실행/종료 가능.
- scheduled job 등록 가능.
- action log 기록.
- provider credential 없는 상태에서도 doctor가 누락 항목을 알려줌.

세부 backlog:

- [29_MVP_ENGINEERING_BACKLOG.md](29_MVP_ENGINEERING_BACKLOG.md)의 Milestone 0, 1, 2를 따른다.
- 첫 scaffold는 [30_DEVELOPMENT_START_SPEC.md](30_DEVELOPMENT_START_SPEC.md)의 첫 Scaffold 작업을 따른다.

## Phase 2: Daily Briefing

목표:

- 매일 오전 6시 briefing pipeline을 만든다.

포함:

- daily source collector.
- summary cache.
- briefing template.
- Telegram 전송.
- Dashboard용 briefing JSON.
- memory log 저장.

완료 조건:

- 수동 실행으로 briefing 생성 가능.
- scheduler로 06:00 KST 실행 가능.
- 실패 시 retry와 log 기록.

세부 contract:

- briefing payload는 [28_RUNTIME_CONTRACTS.md](28_RUNTIME_CONTRACTS.md)의 Daily Briefing contract를 따른다.

## Phase 3: Telegram Bot

목표:

- Telegram을 통해 Dore와 상호작용한다.

포함:

- long polling.
- authorized user allowlist.
- `/status`, `/briefing`, `/stop`, `/usage`.
- 작업 완료 알림.
- approval notification.

완료 조건:

- 인증된 사용자만 사용 가능.
- daily briefing 수신.
- 실행 중 작업 중단 가능.

## Phase 4: Electron App

목표:

- Dore의 primary UI를 제공한다.

포함:

- Dashboard.
- Approvals.
- Chat.
- Logs.
- Settings.

완료 조건:

- daemon 상태 확인.
- pending approval 승인/거절.
- daily briefing 상세 확인.
- usage/cost 확인.

## Phase 5: Development Agent

목표:

- 사용자의 아이디어를 실제 제품 작업으로 이어간다.

포함:

- project intake.
- requirement drafting.
- technical design.
- repo inspection.
- code change workflow.
- test execution.
- review workflow.

완료 조건:

- 아이디어를 문서와 task로 변환.
- 작은 기능 구현.
- 테스트 또는 검증 결과 기록.

세부 backlog:

- [29_MVP_ENGINEERING_BACKLOG.md](29_MVP_ENGINEERING_BACKLOG.md)의 Milestone 7을 따른다.

## Phase 6: Trading Watch

목표:

- 국내/미국 주식 watch와 dry-run trading journal을 만든다.

포함:

- watchlist.
- market data adapter.
- broker connector skeleton.
- 토스증권 connector 검증.
- 신한증권 connector 검증.
- 삼성증권 read-only/manual reference policy.
- signal generator.
- dry-run executor.
- trading journal.

완료 조건:

- 실제 주문 없이 signal과 dry-run journal 생성.
- broker별 지원 범위 표시.
- risk rule 위반 시 주문 후보 차단.

세부 contract:

- signal과 broker capability는 [28_RUNTIME_CONTRACTS.md](28_RUNTIME_CONTRACTS.md)의 Trading Signal, Broker Capability contract를 따른다.

## Phase 7: Pilot Real Trading

목표:

- 제한된 실제 주문을 안전하게 활성화한다.

전제:

- 30일 dry-run journal.
- 공식 API 확인.
- risk limit 설정.
- kill switch.
- Electron approval.

완료 조건:

- 작은 금액 주문.
- 체결 확인.
- journal 기록.
- 손실 제한 도달 시 자동 중단.
