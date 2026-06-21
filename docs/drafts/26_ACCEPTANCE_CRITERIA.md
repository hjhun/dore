# Acceptance Criteria

## 목적

Dore MVP가 실제로 완료되었는지 판단하는 기준을 정의한다.

## MVP 완료 기준

### Local Daemon

- Dore daemon을 시작/중지할 수 있다.
- config를 로드한다.
- memory directory를 생성한다.
- scheduler job을 등록하고 실행한다.
- action log를 기록한다.
- provider credential 누락 시 doctor가 알려준다.

### Telegram Bot

- long polling으로 실행된다.
- 허용된 사용자만 명령을 보낼 수 있다.
- `/status`가 daemon 상태를 반환한다.
- `/briefing`이 최신 briefing을 반환한다.
- `/usage`가 LLM 비용/토큰 요약을 반환한다.
- `/stop`이 실행 중 작업 중단 요청을 만든다.

### Electron App

- Dashboard가 열린다.
- daemon 상태를 표시한다.
- Pending Approvals를 표시한다.
- Approvals에서 승인/거절을 기록한다.
- Logs 화면에서 action log를 볼 수 있다.
- Settings에서 provider/Telegram/memory/trading 설정 상태를 볼 수 있다.

### Daily Briefing

- 06:00 KST scheduler job이 등록된다.
- 수동 실행으로 briefing을 생성할 수 있다.
- Telegram summary가 생성된다.
- Dashboard detail JSON이 생성된다.
- `memory/logs/daily/YYYY-MM-DD.md`에 저장된다.
- 국내 증시, 미국 증시, 개발, 개인 업무, pending approvals, usage가 포함된다.
- 실패 시 retry와 failure log가 남는다.

### Memory

- `memory/raw`, `memory/wiki`, `memory/operations`, `memory/logs`가 생성된다.
- `wiki/index.md`가 생성된다.
- active context가 저장된다.
- daily briefing이 log에 누적된다.
- 민감 정보 저장은 approval을 요구한다.

### LLM Providers

- OpenAI/Claude/Gemini provider 설정을 인식한다.
- API key env var 누락을 감지한다.
- provider/model/auth mode/token/cost/latency를 usage log에 기록한다.
- monthly soft limit과 hard approval threshold를 계산한다.

### Development Agent

- 사용자 아이디어를 requirement draft로 변환한다.
- technical design draft를 생성한다.
- repo를 탐색하고 변경 계획을 만든다.
- 작은 코드 변경을 수행할 수 있다.
- 테스트 또는 검증 결과를 기록한다.

### Trading Watch

- watchlist를 저장한다.
- 국내/미국 market data source 상태를 표시한다.
- broker connector 상태를 표시한다.
- 토스증권/신한증권은 candidate connector로 표시한다.
- 삼성증권은 read-only/manual reference로 표시한다.
- signal object를 생성한다.
- dry-run journal을 기록한다.
- risk rule 위반 시 real execution을 차단한다.
- `real_trading_enabled: false`일 때 실제 주문 API를 호출하지 않는다.

## MVP 실패 기준

아래 중 하나라도 해당하면 MVP 완료가 아니다.

- 인증되지 않은 Telegram 사용자가 접근 가능하다.
- secret이 로그나 UI에 노출된다.
- 실제 주문 비활성화 상태에서 주문 API가 호출된다.
- daily briefing이 저장되지 않는다.
- token/cost usage가 기록되지 않는다.
- approval 없이 Critical 작업이 실행된다.
- memory와 raw source가 섞여 원본 추적이 불가능하다.

## Pilot Real Trading 완료 기준

MVP 이후 별도 단계다.

- 공식 broker API 문서 확보.
- 약관 검토.
- 30일 dry-run journal.
- risk defaults 적용.
- kill switch 검증.
- Electron approval 검증.
- 소액 주문 1건 실행.
- 체결 확인.
- journal 기록.
- 실패 시 rollback/stop 절차 검증.

