# Product Requirements

## 제품명

Dore.

## 제품 정의

Dore는 사용자의 장기 기억, 개발 업무, 일상 운영, 투자 watch를 한곳에서 관리하는 개인 AI Agent다.

Dore는 단순 질의응답 도구가 아니라 사용자의 아이디어를 제품으로 발전시키고, 매일 필요한 정보를 정리하며, 국내/미국 주식 트레이딩을 안전하게 준비하는 실행형 개인 비서다.

## 대상 사용자

단일 사용자:

- SW 개발자.
- 아키텍트.
- 직접 설계, 개발, 테스트를 수행하는 사람.
- 개인 지식과 투자 정보를 장기적으로 축적하고 싶은 사람.

## 핵심 문제

- 정보와 아이디어가 여러 곳에 흩어진다.
- 매일 아침 확인해야 할 정보가 많다.
- 개발 아이디어가 실제 제품 작업으로 이어지지 못하고 사라진다.
- LLM 사용량과 비용이 관리되지 않으면 장기 운영이 어렵다.
- 트레이딩 자동화는 수익 욕구가 크지만 실수 비용도 크다.
- 기존 Agent는 장기 개인화와 안전한 실행 정책이 충분히 통합되어 있지 않다.

## 핵심 가치 제안

- Dore는 사용자의 지식과 업무 방식을 기억한다.
- 매일 오전 6시에 오늘 필요한 정보를 정리해준다.
- 사용자의 아이디어를 요구사항, 설계, 구현, 테스트로 발전시킨다.
- LLM 비용을 기록하고 절약한다.
- 트레이딩은 실제 주문보다 먼저 검증과 기록을 우선한다.
- 위험 작업은 명확한 승인 UX를 거친다.

## 사용자 목표

### Daily Operating

- 아침에 오늘 할 일과 중요한 정보를 빠르게 파악한다.
- 개발, 일정, 투자 정보를 한 번에 본다.
- 중요한 승인 요청을 놓치지 않는다.

### Software Engineering

- 아이디어를 제품 문서로 만든다.
- Dore가 설계 대안을 제시한다.
- Dore가 코드 구현과 리뷰, 테스트를 돕는다.
- 반복 업무는 Dore가 도구화한다.

### Personal Knowledge

- 대화와 문서에서 장기 가치가 있는 정보를 저장한다.
- 원본 자료와 정리본을 분리한다.
- Obsidian 호환 Markdown wiki로 지식을 탐색한다.
- Dore가 시간이 갈수록 사용자에게 맞게 발전한다.

### Trading

- 국내 주식과 미국 주식을 watch한다.
- 공식 API가 있는 broker를 우선한다.
- 실제 주문 전 dry-run journal을 축적한다.
- 손실 제한과 승인 정책 없이는 주문하지 않는다.

## MVP 요구사항

### Local Daemon

- Dore runtime은 로컬에서 실행된다.
- scheduler, memory, model gateway, approval queue를 가진다.
- action log를 기록한다.

### Telegram Bot

- Telegram long polling으로 동작한다.
- 허용된 사용자만 접근한다.
- daily briefing을 보낸다.
- `/status`, `/briefing`, `/usage`, `/stop`을 지원한다.

### Electron App

- 첫 화면은 Dashboard다.
- Approvals, Chat, Logs, Settings 화면을 제공한다.
- 위험 작업은 Approvals에서 승인/거절한다.

### Daily Briefing

- 매일 06:00 KST에 실행된다.
- Telegram 요약과 Dashboard 상세를 만든다.
- 개인/개발/국내증시/미국증시/Agent 운영 상태를 포함한다.
- memory log에 저장한다.

### Memory

- Markdown 기반 directory 구조를 만든다.
- raw source, wiki, operations, logs를 분리한다.
- 일반 장기 기억은 자동 저장 가능하다.
- 민감 정보는 저장 전 승인을 요구한다.

### LLM Providers

- OpenAI, Claude, Gemini를 지원한다.
- 기본 인증은 API key다.
- OpenAI OAuth 계열 연결도 지원한다.
- provider/model/auth mode/token/cost를 기록한다.

### Trading Watch

- 국내/미국 주식 watchlist를 관리한다.
- 토스증권을 1차 connector 후보로 둔다.
- 신한증권을 2차 connector 후보로 둔다.
- 삼성증권은 read-only/manual reference로 둔다.
- MVP에서는 실제 주문하지 않는다.
- dry-run journal을 만든다.

## 비기능 요구사항

### 안전

- Critical 작업은 approval 없이는 실행하지 않는다.
- 실제 주문은 기본 비활성화다.
- secret은 설정 파일에 평문 저장하지 않는다.
- 모든 위험 작업은 audit log에 남긴다.

### 비용 효율

- daily briefing은 diff와 summary cache를 사용한다.
- 긴 raw source를 반복해서 LLM에 넣지 않는다.
- background 작업은 저비용 모델을 우선한다.
- 월 비용 soft/hard threshold를 가진다.

### 신뢰성

- scheduled job 실패 시 retry한다.
- 실패 원인을 log에 남긴다.
- source timestamp를 기록한다.
- market/trading 데이터 충돌 시 signal을 보류한다.

### 확장성

- core는 좁게 유지한다.
- provider, broker, tool, skill은 adapter/registry로 확장한다.
- MCP/plugin 구조를 장기 확장 경로로 둔다.

## 성공 지표

- 매일 오전 6시 briefing 성공률.
- daily briefing당 평균 비용.
- memory 업데이트 정확도.
- 개발 작업 완료율.
- 테스트/검증 실행률.
- dry-run trading journal 축적 일수.
- 승인 요청 처리 시간.
- 사용자가 다시 설명하지 않아도 되는 정보의 비율.

