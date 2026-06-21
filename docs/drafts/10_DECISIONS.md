# Decisions

이 문서는 대화 중 확정된 결정을 기록한다.

## 2026-06-21

### 제품명

- 이름: Dore.
- 성격: 사용자의 개인 AI Agent.

### Hermes 관계

- Hermes를 fork/확장하지 않는다.
- Dore는 별도 제작한다.
- Hermes는 기능 parity와 설계 참고 대상으로 사용한다.

### 메신저 플랫폼

- 초기 메신저 봇은 Telegram만 지원한다.
- Discord, Slack, WhatsApp, Signal 등은 MVP 범위에서 제외한다.
- gateway 구조는 장기 확장을 막지 않는 형태로 설계한다.

### 실행 형태

- 로컬 상시 실행 daemon.
- Telegram bot.
- Electron 데스크톱 앱.
- CLI/TUI는 운영, 디버깅, 개발 보조 인터페이스로 유지한다.

### 데스크톱 앱 기술

- Electron으로 제작한다.
- 이유: 빠른 MVP 구현, 풍부한 dashboard UI, Hermes desktop 구조 참고 가능성, 웹 프론트엔드 생태계 활용.
- Tauri와 native는 선택지로 검토했으나 현재 범위에서는 채택하지 않는다.

### Electron 앱 UX

- 첫 화면은 Dashboard로 한다.
- 위험 작업 승인은 Approvals 패널과 별도 화면으로 분리한다.
- Dashboard에는 현재 상태, 오늘의 우선순위, 진행 중인 작업, 대기 중 승인, scheduled job, 최근 memory 업데이트, 오류, trading watch, 개발 작업 상태를 보여준다.

### 트레이딩 정책

- 트레이딩 정책은 설정 파일 또는 Agent에게 전달되는 policy 문서로 확정한다.
- 정책이 없거나 불완전하면 실제 주문은 실행하지 않는다.

### LLM Provider

- 지원 provider는 OpenAI, Claude, Gemini다.
- 기본 인증 방식은 API key다.
- OpenAI는 API key 외에 OAuth 계열 연결 방식도 지원한다.
- provider 선택과 model 선택은 runtime 설정으로 바꿀 수 있어야 한다.

### 사용자의 기본 목표

- Dore는 사용자의 아이디어를 실제 제품으로 발전시키는 개발 파트너여야 한다.
- 사용자의 지식과 정보를 모아 개인화된 장기 비서로 성장해야 한다.
- 토큰 사용량은 효율적으로 관리해야 한다.
- 매일 오전 6시 KST에 정보를 모아 briefing해야 한다.

### MVP 기본 범위

- Local Agent Daemon.
- Telegram bot.
- Electron Dashboard.
- Approvals.
- Chat.
- Logs.
- Settings.
- Markdown memory.
- Daily 6 AM briefing.
- LLM provider gateway.
- Trading watch와 dry-run journal.

### Trading 기본 결정

- 대상 시장은 국내 주식과 미국 주식이다.
- 자동 주문은 공식 API가 확인되는 증권사만 대상으로 한다.
- 사용 증권사는 삼성증권, 신한증권, 토스증권이다.
- 1차 connector 후보는 토스증권이다.
- 2차 connector 후보는 신한증권이다.
- 삼성증권은 공식 개인용 Open API 확인 전까지 자동 주문 대상에서 제외한다.
- 실제 주문은 별도 활성화 전까지 비활성화하고, paper trading/dry-run을 먼저 수행한다.
- LLM은 trading signal 계산의 주체가 아니라 아이디어 생성, 설명, 리포트에 사용한다.
- 실제 signal 계산과 risk check는 deterministic code로 수행한다.
- 전략은 idea -> backtest -> dry-run -> paper -> pilot real trading 순서로 승격한다.

### Trading 리스크 기본값

- 파일럿 실제주문 활성화 시 1회 주문 최대 금액은 `min(NAV * 1%, 100,000 KRW equivalent)`로 시작한다.
- 1일 신규 매수 총액은 `min(NAV * 3%, 300,000 KRW equivalent)`로 제한한다.
- 1일 손실 한도는 `min(NAV * 1%, 100,000 KRW equivalent)`로 시작한다.
- 종목당 최대 비중은 `NAV * 10%`, 신규 종목 첫 진입은 `NAV * 2%` 이하로 제한한다.
- 현금 최소 보유 비율은 `NAV * 20%`로 둔다.

### LLM 비용 기본값

- 전체 LLM soft limit은 50 USD/month다.
- 전체 LLM hard approval threshold는 100 USD/month다.
- background 작업 soft limit은 15 USD/month다.
- daily briefing budget은 1 USD/day soft limit으로 둔다.
- OpenAI/Claude/Gemini 예산 비율은 초기값으로 60%/25%/15%를 사용한다.

### LLM 모델 기본값

- 기본 provider는 OpenAI다.
- OpenAI 기본 모델은 `gpt-5.4`, 고난도 reasoning/coding은 `gpt-5.5`, 저비용/저지연 작업은 `gpt-5.4-mini`로 시작한다.
- Claude는 기본 역할을 Claude Sonnet 4.6으로 두고, 고난도 작업은 Claude Opus 4.8 또는 Claude Fable 5, 저비용 작업은 Claude Haiku 4.5를 후보로 둔다.
- Gemini 기본 모델은 `gemini-3.5-flash`이며, 저비용 작업은 `gemini-2.5-flash`, 최저비용 background는 `gemini-2.5-flash-lite`, 복잡 reasoning fallback은 `gemini-2.5-pro`를 사용한다.
- Claude의 실제 API model id는 setup wizard에서 공식 Models API 또는 최신 문서로 검증한다.

### MVP 완료 판정

- MVP 완료 여부는 [26_ACCEPTANCE_CRITERIA.md](26_ACCEPTANCE_CRITERIA.md)를 기준으로 판단한다.

### 개발 시작 기술 스택

- 구현 언어는 TypeScript다.
- package manager는 `pnpm` workspace를 사용한다.
- Desktop은 Electron + React + Vite로 만든다.
- Daemon은 Node.js TypeScript daemon으로 만들고, MVP transport는 localhost HTTP API로 시작한다.
- API framework 1차 후보는 Fastify다.
- runtime validation은 Zod를 사용한다.
- MVP storage는 Markdown, JSON, JSONL, YAML 조합으로 시작하고, 이후 SQLite metadata index를 붙인다.
- 구체 개발 시작 기준은 [30_DEVELOPMENT_START_SPEC.md](30_DEVELOPMENT_START_SPEC.md)를 따른다.
