# Assumed Answers

이 문서는 사용자가 아직 세부 답을 주지 않은 항목에 대해, Dore가 사용자의 입장에서 채택할 기본 답을 정리한다.

원칙:

- 사용자는 SW 개발자이자 아키텍트다.
- 사용자는 Dore가 단순 비서가 아니라 제품을 실제로 만들고 개선하는 파트너가 되길 원한다.
- 사용자는 토큰 사용량을 효율화하고 싶다.
- 사용자는 매일 오전 6시에 필요한 정보를 모아 받고 싶다.
- 사용자는 국내 주식과 미국 주식을 트레이딩하고 싶다.
- 사용 증권사는 삼성증권, 신한증권, 토스증권이며, 자동화는 API 사용이 가능한 곳을 우선한다.

## Hermes Agent

### 반드시 동일하게 수행해야 하는 기능의 우선순위

1. 장기 memory.
2. skill 기반 자기 개선.
3. scheduler.
4. session lifecycle.
5. Telegram gateway.
6. token/cost tracking.
7. local tool execution.
8. subagent delegation.
9. MCP/plugin 확장성.

CLI/TUI parity는 MVP 이후로 둔다.

### 자주 사용할 워크플로우

- 아침 6시 briefing.
- 개발 아이디어 정리.
- 요구사항 문서화.
- 설계 문서 작성.
- 코드 구현.
- 코드 리뷰.
- 테스트/검증.
- 주식 시장 요약과 trading watch.
- 장기 memory 업데이트.

### Hermes에서 다르게 가져갈 점

- Dore는 Hermes fork가 아니다.
- 기능은 참고하되 Dore의 memory, trading, daily briefing, 개발 agent 경험에 맞춰 별도 설계한다.
- core는 좁게 유지하고, 기능은 provider/skill/tool registry로 확장한다.

## 개인 비서

### 기억 범위

Dore는 아래 정보를 장기 기억 후보로 삼는다.

- 사용자의 목표.
- 프로젝트와 제품 아이디어.
- 개발 선호와 설계 원칙.
- 반복 업무 방식.
- 중요한 일정과 할 일.
- 투자 관심사와 리스크 성향.
- 자주 보는 정보 소스.
- 장기적으로 의미 있는 대화 요약.

아래 정보는 민감 정보로 취급한다.

- 계좌 정보.
- API key.
- OAuth token.
- 인증서/비밀번호.
- 주민등록번호 등 식별정보.
- 의료/가족/인간관계 등 매우 사적인 정보.

민감 정보는 원문 저장을 피하고, 꼭 필요한 경우 별도 secret store 또는 암호화 저장을 사용한다.

### 일정/할 일 연동

MVP에서는 Dore 내부 task store를 사용한다. 이후 Google Calendar, Outlook, Notion 등은 connector로 확장한다.

### 알림 채널

- 1순위: Telegram.
- 2순위: Electron desktop notification.
- 3순위: Dashboard.

Critical approval은 Telegram만으로 완료하지 않고 Electron Approvals에서도 확인 가능해야 한다.

### 필요 시점 정의

- 매일 오전 6시.
- 시장 개장 전.
- 미국장 종료 후.
- 사용자가 지정한 일정 전.
- 작업이 막혔거나 오래 방치된 경우.
- trading signal 또는 risk event가 발생한 경우.
- 개발 작업에서 다음 행동이 명확해진 경우.

### 제안 빈도

- 기본은 하루 1회 morning briefing.
- 긴급/위험 이벤트만 즉시 알림.
- 일반 제안은 Dashboard에 쌓고 Telegram interruption은 최소화한다.

## Memory

### 개인 wiki

개인 wiki는 Markdown 기반으로 시작하며 Obsidian으로 볼 수 있게 설계한다.

### 원본 자료

원본 자료는 `memory/raw/`에 저장한다. Agent가 만든 정리본은 `memory/wiki/`에 저장한다.

### 민감 정보

민감 정보는 기본적으로 wiki에 원문 저장하지 않는다. secret은 `.env`, OS keychain, 별도 encrypted store를 사용한다.

### 장기 기억 승인

기본 정책:

- 일반 정보: Agent가 자동 저장 가능.
- 민감 정보: 저장 전 승인 필요.
- 투자/트레이딩 정책: 저장 전 승인 필요.
- 사용자가 "기억하지 마"라고 한 정보: 저장 금지.

## 개발 Agent

### 주요 언어와 프레임워크

Dore는 특정 언어에 고정하지 않는다. 다만 MVP 개발은 아래를 기본으로 가정한다.

- Backend/daemon: Python 또는 TypeScript 중 구현 편의에 따라 선택.
- Electron app: TypeScript.
- Trading connector: Python 우선 검토.
- 문서: Markdown.

### 의존성 설치

개발 Agent는 의존성 설치를 수행할 수 있다. 단, 설치 전 변경 목적과 대상 package를 로그에 남긴다.

### 배포

MVP에서는 자동 배포하지 않는다. 배포는 approval 대상이다.

### 리뷰 기준

- 버그와 회귀 위험을 우선한다.
- 테스트 누락을 중요하게 본다.
- 설계 일관성과 유지보수성을 본다.
- 사소한 스타일 지적은 자동 포맷터로 처리한다.

## 운영

### Local daemon

MVP는 로컬 PC에서 상시 실행한다. Windows 환경에서는 작업 스케줄러 또는 시작 프로그램 등록을 우선 검토한다. WSL에서 실행할 경우 Windows 시작 시 WSL daemon을 함께 올리는 방식을 검토한다.

### Telegram bot 운영

MVP는 long polling으로 시작한다. 이유는 로컬 상시 실행 환경에서 webhook보다 설정이 단순하고 외부 공개 URL이 필요 없기 때문이다.

### 외부 접근

MVP에서는 외부 서버를 두지 않는다. Telegram bot이 외부 입력 채널 역할을 한다.

### 로그 보관

- action/audit log: 최소 1년.
- trading log: 영구 보관.
- raw tool output: 30일 후 요약본만 유지.
- token/cost log: 월별 summary 생성 후 원본은 1년 보관.

### 비용 한도

초기 기본값:

- 월 전체 LLM 예산: 사용자가 설정할 때까지 soft limit만 운영.
- soft limit 도달 시 고비용 작업은 approval 요청.
- background 작업은 저비용 모델 우선.

## LLM Providers

### 기본 provider

기본 provider는 OpenAI로 둔다.

### 기본 model

구체 모델명은 구현 시점의 최신 공식 문서를 기준으로 선택한다. 문서상 기본 정책은 아래와 같다.

- OpenAI: 기본 assistant, tool use, daily briefing의 1순위.
- Claude: 긴 코드 리뷰, 대규모 리팩터링, 설계 비평의 보조 provider.
- Gemini: 긴 문서/멀티모달/대안 관점 생성의 보조 provider.

### OpenAI OAuth

OpenAI OAuth는 사용자가 OpenAI 계정 기반 연결을 원할 때 선택한다. 기본은 API key다.

### Model routing

MVP에서는 수동 provider/model 선택을 지원한다. 이후 작업별 자동 routing을 추가한다.

