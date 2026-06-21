# MVP Engineering Backlog

## 목적

이 문서는 Dore MVP 구현을 실제 개발 task로 쪼갠다.

우선순위는 사용자가 빠르게 체감할 수 있는 개인 비서 흐름을 먼저 만들고, 트레이딩은 watch/dry-run까지 안전하게 제한하는 것이다.

## 우선순위 원칙

- 매일 06:00 briefing을 가장 먼저 체감 가능한 기능으로 만든다.
- Local daemon과 memory/logging을 먼저 만들고 UI와 Telegram은 같은 daemon 상태를 읽게 한다.
- LLM 비용 기록은 첫 LLM 호출부터 남긴다.
- 같은 provider 안에서도 단순 작업은 경량 모델, 복잡한 설계/개발/리뷰는 고성능 모델을 사용한다.
- 실제 주문 기능은 MVP에서 구현하지 않는다. broker capability와 dry-run journal까지만 만든다.
- 기능 추가보다 audit log, approval, secret 보호를 먼저 붙인다.

## Milestone 0: Repository Bootstrap

목표:

- Electron, daemon, shared package, docs가 공존할 repo 구조를 만든다.

Tasks:

- `package.json` workspace 구조 결정.
- `apps/desktop` Electron app skeleton 생성.
- `apps/daemon` local daemon skeleton 생성.
- `packages/core` shared domain model 생성.
- `packages/config` config loader 생성.
- `packages/contracts` runtime contract type 생성.
- 기본 lint/test/format command 추가.

Done:

- package install이 성공한다.
- daemon과 desktop dev command가 분리되어 실행된다.
- contract type이 build된다.

## Milestone 1: Config, Logs, Memory

목표:

- Dore가 로컬 상태를 만들고 자신이 무엇을 할 수 있는지 진단한다.

Tasks:

- `dore.config.yaml` loader 구현.
- env var secret reference 검증.
- memory directory bootstrap 구현.
- event JSONL log 구현.
- task store 구현.
- usage log store 구현.
- `doctor` command 구현.

Done:

- config가 없으면 sample config 생성 또는 setup 필요 메시지를 출력한다.
- `memory/raw`, `memory/wiki`, `memory/operations`, `memory/logs`가 생성된다.
- secret 원문이 log에 남지 않는다.
- provider key가 없어도 앱이 죽지 않고 누락 상태를 표시한다.

## Milestone 2: Daemon API

목표:

- Electron, Telegram, CLI가 공유할 local daemon API를 만든다.

Tasks:

- daemon process lifecycle 구현.
- localhost API 또는 IPC 방식 결정.
- `/status` 구현.
- `/tasks`, `/tasks/:id`, task cancel 구현.
- `/approvals`, approve/reject 구현.
- `/usage/summary` 구현.
- `/memory/index` 구현.
- local auth token 구현.

Done:

- daemon 시작/종료가 가능하다.
- API 호출이 event log에 남는다.
- 인증 없는 외부 요청은 거부된다.

## Milestone 3: Model Gateway

목표:

- OpenAI, Claude, Gemini를 같은 interface로 호출하고 비용을 기록한다.

Tasks:

- `ModelGateway` interface 정의.
- `ModelSelectionRequest` 구현.
- OpenAI adapter 구현.
- Claude adapter skeleton 구현.
- Gemini adapter skeleton 구현.
- provider credential validation 구현.
- task category, complexity, latency, cost preference별 model routing 구현.
- token/cost/latency usage record 구현.
- monthly budget guard 구현.

Done:

- key가 있는 provider는 test prompt를 실행할 수 있다.
- key가 없는 provider는 graceful unavailable 상태를 반환한다.
- 모든 LLM 호출은 usage record를 남긴다.
- 같은 provider 안에서 `low` complexity는 경량 모델, `high` complexity는 고성능 모델로 routing된다.
- background category는 저비용 모델을 선택한다.

## Milestone 4: Daily Briefing Pipeline

목표:

- 수동 실행과 06:00 KST schedule로 briefing을 생성한다.

Tasks:

- briefing source collector 구현.
- repo/dev status collector 구현.
- memory/task/approval collector 구현.
- market watch placeholder collector 구현.
- summary cache 구현.
- final briefing renderer 구현.
- Markdown/JSON 저장 구현.
- retry/failure log 구현.

Done:

- `run briefing`으로 오늘 briefing을 생성한다.
- `memory/logs/daily/YYYY-MM-DD.md`와 `.json`이 생성된다.
- 실패한 source가 있어도 partial briefing을 만들 수 있다.
- briefing당 usage/cost가 기록된다.

## Milestone 5: Telegram Bot

목표:

- 사용자가 Telegram으로 Dore 상태와 briefing을 받을 수 있다.

Tasks:

- long polling bot 구현.
- allowed user id 검증.
- `/status` 구현.
- `/briefing` 구현.
- `/usage` 구현.
- `/stop` 구현.
- daily briefing push 구현.
- approval notification 구현.

Done:

- 허용되지 않은 사용자는 응답을 받지 못한다.
- 06:00 briefing summary가 Telegram으로 전송된다.
- 실행 중 task 취소 요청이 가능하다.

## Milestone 6: Electron Dashboard

목표:

- Dore의 현재 상태와 승인 대기 작업을 한눈에 본다.

Tasks:

- Electron main/preload/renderer 구조 생성.
- Dashboard screen 구현.
- daemon status card 구현.
- today briefing section 구현.
- pending approvals panel 구현.
- running tasks panel 구현.
- usage/cost panel 구현.
- trading watch status panel 구현.

Done:

- 앱 첫 화면이 Dashboard다.
- daemon 연결 실패 상태를 명확히 보여준다.
- pending approval을 승인/거절할 수 있다.
- secret 값은 UI에 노출되지 않는다.

## Milestone 7: Development Agent MVP

목표:

- 사용자의 아이디어를 요구사항, 설계, 작은 구현 작업으로 바꾼다.

Tasks:

- project intake template 구현.
- requirement draft generator 구현.
- technical design draft generator 구현.
- repo inspection workflow 구현.
- change plan generator 구현.
- test command detection 구현.
- review summary generator 구현.
- memory 반영 workflow 구현.

Done:

- 아이디어 입력으로 PRD/technical design draft를 만든다.
- repo 상태를 읽고 작은 변경 계획을 만든다.
- 테스트 또는 검증 결과가 task log에 남는다.

## Milestone 8: Trading Watch and Dry-run

목표:

- 국내/미국 주식 watch와 dry-run journal을 만든다.

Tasks:

- watchlist store 구현.
- broker capability registry 구현.
- Toss connector placeholder 구현.
- Shinhan connector placeholder 구현.
- Samsung read-only/manual policy 구현.
- market data adapter interface 구현.
- signal object 생성 구현.
- risk check 구현.
- dry-run journal 구현.

Done:

- watchlist를 저장하고 Dashboard에 표시한다.
- broker별 지원 상태가 표시된다.
- signal과 dry-run 기록이 생성된다.
- `real_trading_enabled: false`에서는 주문 API 호출 경로가 실행되지 않는다.

## MVP에서 하지 않는 것

- 실제 주식 주문.
- GUI/RPA 주문 자동화.
- 외부 서버 배포.
- multi-user account.
- 모바일 앱.
- 완전 자동 전략 최적화.
- 수익률 보장 문구.

## 첫 구현 순서 추천

1. Repository bootstrap.
2. Contract types.
3. Config loader와 memory bootstrap.
4. Event/task/usage log.
5. Daemon `/status`.
6. Manual briefing.
7. Telegram `/status`와 `/briefing`.
8. Electron Dashboard.
9. Model Gateway 실제 provider 연결.
10. Trading watch/dry-run.

