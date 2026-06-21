# Tools and Data

## 필요한 접근 범위

사용자는 "시스템 전체" 개인 비서를 원한다. 따라서 Agent는 다양한 데이터와 도구에 접근할 수 있어야 한다.

## 데이터 소스 후보

### 개인 정보

- 사용자 프로필.
- 선호도.
- 목표.
- 일정.
- 할 일.
- 메모.
- 연락처.

### 문서

- 로컬 파일.
- Markdown wiki.
- PDF.
- 스프레드시트.
- 프레젠테이션.
- 이미지.
- 코드 저장소.

### 커뮤니케이션

- 이메일.
- 메신저.
- 회의록.
- 알림.

### 개발

- Git 저장소.
- GitHub/GitLab.
- 이슈 트래커.
- CI/CD.
- 패키지 매니저.
- 테스트 도구.
- 배포 환경.

### 트레이딩

- 시장 데이터 API.
- 계좌 조회 API.
- 주문 API.
- 체결 조회 API.
- 환율/뉴스/공시 데이터.
- 전략 설정.

## 도구 분류

### 읽기 도구

- 파일 읽기.
- 검색.
- 웹 검색.
- API 조회.
- 로그 조회.

### 쓰기 도구

- 파일 수정.
- 문서 생성.
- 코드 변경.
- DB 업데이트.
- wiki 업데이트.
- 메시지/이메일 초안 작성.

### 실행 도구

- 로컬 명령 실행.
- 테스트 실행.
- 스크립트 실행.
- 배포.
- API mutation.
- 트레이딩 주문.

## LLM Providers

Dore는 아래 provider를 지원한다.

- OpenAI.
- Claude.
- Gemini.

기본 인증 방식은 API key다.

OpenAI는 API key 외에 OAuth 계열 연결 방식도 지원한다. 구현 시에는 API key 인증과 OAuth 인증을 분리해서 저장하고, 어떤 요청이 어떤 인증 방식으로 실행되었는지 usage log에 기록한다.

## 자격증명 관리

- API 키와 토큰은 평문 문서에 저장하지 않는다.
- `.env` 또는 OS secret store를 사용한다.
- Agent 응답에 비밀값을 출력하지 않는다.
- 키 사용 범위와 권한을 최소화한다.
- 거래 API는 조회 전용 키와 주문 가능 키를 분리하는 것을 권장한다.

## 트레이딩 API 제공 시 필요한 정보

- 증권사 또는 거래소 이름.
- 지원 시장: 국내주식, 미국주식, ETF, 옵션, 선물, 코인 등.
- 인증 방식.
- API 문서.
- sandbox/paper trading 지원 여부.
- 주문 가능 시간.
- 주문 타입.
- 수수료/세금 정보.
- rate limit.
- 계좌 통화.
- 최소 주문 단위.
- 주문 취소/정정 방식.

## `hermes-agent` 분석에 필요한 자료

- 저장소 경로: `/home/hjhun/samba/workspace/ref/hermes-agent`.
- README: 확인됨.
- AGENTS.md: 확인됨.
- docs: 확인됨.
- 설정 예시: 확인됨.
- 사용 중인 명령어: 추후 사용자 사용 패턴 필요.
- 현재 만족하는 기능과 불편한 기능: 추후 확인 필요.

## 실행 인터페이스 요구

### 로컬 상시 실행

- background daemon.
- scheduler.
- local file/code/system access.
- desktop app 및 messenger gateway와 shared state 사용.

### Telegram Bot

- 외부에서 작업 지시.
- 알림 수신.
- 긴 작업 중 중단.
- 인증된 사용자만 접근.
- 초기 메신저 플랫폼은 Telegram만 지원.

### 데스크톱 앱

- memory/wiki 탐색.
- tasks/schedules 확인.
- trading dashboard.
- 개발 작업 상태 확인.
- 위험 작업 승인.
