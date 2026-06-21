# Electron App Spec

## 목적

Dore의 Electron desktop app은 Agent 본체가 아니라 사용자가 Dore의 상태를 확인하고, 위험 작업을 승인하며, memory와 로그를 탐색하는 운영 화면이다.

## 1차 화면 결정

첫 화면은 Dashboard로 한다.

Dashboard는 사용자가 앱을 열었을 때 지금 Dore가 무엇을 알고 있고, 무엇을 하고 있으며, 무엇을 기다리고 있는지 즉시 파악하게 한다.

Dashboard 상세 지표와 레이아웃은 [21_DASHBOARD_METRICS.md](21_DASHBOARD_METRICS.md)를 따른다.

## 주요 화면

### Dashboard

첫 화면이다.

포함 요소:

- 현재 Agent 상태.
- 오늘의 우선순위.
- 진행 중인 작업.
- 대기 중인 승인 요청.
- 예정된 리마인더와 scheduled job.
- 최근 memory 업데이트.
- 최근 오류 또는 주의가 필요한 이벤트.
- trading watch 상태.
- 개발 작업 상태.

### Approvals

위험 작업 승인 전용 화면이다. Dashboard에서도 항상 눈에 띄는 패널로 노출한다.

승인 대상:

- 실제 주식 주문.
- 외부 메시지/이메일 전송.
- 배포.
- 시스템 설정 변경.
- 대량 파일 수정/삭제.
- 보안 자격증명 변경.

각 승인 요청은 아래 정보를 포함한다.

- 요청 제목.
- 작업 분류.
- 위험도.
- Agent가 하려는 행동.
- 예상 영향.
- 관련 파일/API/계좌.
- 되돌리기 가능 여부.
- 승인/거절/수정 요청 버튼.

### Chat

Dore와 직접 대화하는 화면이다.

역할:

- 로컬에서 긴 작업을 지시.
- Telegram보다 자세한 맥락으로 대화.
- 작업 중 로그와 tool output 확인.
- `/new`, `/reset`, `/usage`, `/skills` 같은 command 실행.

### Memory Explorer

개인 wiki와 operational memory를 탐색하는 화면이다.

역할:

- profile, projects, topics, trading, engineering 문서 탐색.
- 최근 memory 변경 확인.
- 충돌/오래된 정보 확인.
- 사용자가 직접 수정하거나 삭제 요청.

### Tasks and Schedules

할 일, 리마인더, scheduler job을 관리하는 화면이다.

역할:

- 오늘/이번 주 할 일.
- 반복 작업.
- 예약된 Agent 실행.
- 실패한 job 재시도.

### Logs

Agent 실행 이력과 오류를 확인하는 화면이다.

역할:

- Agent action log.
- tool call log.
- trading log.
- approval audit log.
- token/cost usage.

### Settings

Dore 설정을 관리하는 화면이다.

역할:

- LLM provider/model.
- Telegram bot 설정.
- memory 경로.
- 권한 정책.
- trading API 설정.
- desktop app 시작 옵션.

## Navigation

초기 navigation은 아래 항목을 가진다.

- Dashboard.
- Chat.
- Approvals.
- Memory.
- Tasks.
- Logs.
- Settings.

## UX 원칙

- 첫 화면에서 "지금 중요한 것"을 보여준다.
- 위험 작업 승인은 절대 묻히지 않는다.
- Agent의 실제 행동은 사람이 추적 가능한 로그로 이어진다.
- 정보는 카드식 장식보다 작업 상태를 빠르게 스캔하는 구조를 우선한다.
- 승인 요청은 사용자가 이유, 영향, 되돌리기 가능성을 보고 판단할 수 있어야 한다.
- trading 관련 행동은 다른 알림보다 더 강한 시각적 구분을 둔다.

## MVP 범위

MVP에서 필요한 화면:

1. Dashboard.
2. Approvals.
3. Chat.
4. Logs.
5. Settings.

Memory Explorer와 Tasks/Schedules는 2차 구현으로 넘길 수 있지만, Dashboard에는 해당 요약 영역을 미리 둔다.
