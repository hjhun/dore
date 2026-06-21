# MVP Scope

## 목적

Dore의 첫 번째 실제 제품 버전을 정의한다.

MVP의 목표는 "개인 비서 + 개발 파트너 + daily briefing + 안전한 trading watch"를 작동 가능한 형태로 만드는 것이다.

## MVP에 포함한다

### 1. Local Agent Daemon

- 로컬에서 상시 실행.
- memory manager.
- scheduler.
- model gateway.
- tool registry.
- approval queue.
- action/audit log.

### 2. Telegram Bot

- Telegram long polling.
- 인증된 사용자 1명만 허용.
- 명령 입력.
- daily briefing 전달.
- 작업 완료 알림.
- 일반 승인 요청 표시.
- Critical approval은 Electron에서도 확인하도록 유지.

### 3. Electron Desktop App

MVP 화면:

- Dashboard.
- Approvals.
- Chat.
- Logs.
- Settings.

2차 화면:

- Memory Explorer.
- Tasks/Schedules.
- Trading Dashboard 상세 화면.

### 4. Memory

- Markdown 기반 personal wiki.
- `memory/raw/`, `memory/wiki/`, `memory/operations/`, `memory/logs/`.
- 장기 기억 후보 자동 추출.
- 민감 정보 저장 전 approval.
- daily briefing 결과를 wiki/log에 저장.

### 5. Daily 6 AM Briefing

- 매일 오전 6시 KST 실행.
- 전일/당일 주요 정보 수집.
- 국내 증시 준비.
- 미국 증시 마감 요약.
- 관심 종목/포트폴리오 watch.
- 개발 작업 우선순위.
- 개인 일정/할 일.
- token-efficient summary 저장.

### 6. LLM Providers

- OpenAI.
- Claude.
- Gemini.
- API key 인증.
- OpenAI OAuth 계열 연결 지원.
- usage/cost log.

### 7. Development Agent

- 요구사항 정리.
- 설계 문서 작성.
- 코드 작성.
- 코드 리뷰.
- 테스트 실행.
- 변경 요약.

### 8. Trading Watch

- 국내 주식과 미국 주식 market watch.
- API 사용 가능한 증권사 connector 후보 검증.
- 전략 signal 생성.
- paper trading/dry-run.
- 실제 주문은 MVP에서 기본 비활성화.

## MVP에서 제외한다

- 무승인 실제 주식 주문.
- 레버리지/공매도/파생상품 자동매매.
- 모든 Hermes 기능 완전 parity.
- 다중 사용자.
- Discord/Slack/WhatsApp/Signal.
- 서버 배포.
- 완전 자동 self-modification.
- 민감 정보 원문 wiki 저장.

## 성공 기준

- Dore가 매일 오전 6시에 briefing을 생성하고 Telegram으로 보낸다.
- Electron Dashboard에서 현재 상태, 승인 대기, 작업 로그를 볼 수 있다.
- 사용자의 개발 아이디어를 문서/작업/코드 변경으로 이어갈 수 있다.
- LLM 호출 사용량이 provider/model별로 기록된다.
- trading은 실제 주문 없이도 signal, watch, dry-run journal을 남긴다.
- memory가 누적되고 다음 대화/작업에 반영된다.

세부 acceptance criteria는 [26_ACCEPTANCE_CRITERIA.md](26_ACCEPTANCE_CRITERIA.md)를 따른다.
