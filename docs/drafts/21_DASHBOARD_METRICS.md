# Dashboard Metrics

## 목적

Electron Dashboard의 첫 화면에서 보여줄 핵심 지표와 우선순위를 정의한다.

Dashboard의 목표는 사용자가 앱을 열었을 때 "지금 Dore가 무엇을 하고 있고, 내가 무엇을 결정해야 하는지"를 10초 안에 파악하게 하는 것이다.

## 우선순위

### Priority 1: 지금 봐야 하는 것

항상 첫 화면 상단에 둔다.

- Pending Approvals.
- Risk Halt 또는 Critical Warning.
- 오늘의 Top 3.
- 진행 중인 작업.
- Daily Briefing 요약.

### Priority 2: 오늘의 운영 상태

- Scheduled jobs.
- Telegram bot 상태.
- Local daemon 상태.
- 최근 오류.
- token/cost usage.

### Priority 3: 개인화 memory

- 최근 memory 업데이트.
- 새로 생긴 open question.
- 오래된 정보 또는 충돌 후보.
- 오늘 제안된 자동화 후보.

### Priority 4: Trading Watch

- 국내장 watch.
- 미국장 마감 요약.
- 관심 종목 signal.
- 보유 종목 risk.
- dry-run 주문 후보.
- broker connector 상태.

### Priority 5: Development Work

- 활성 프로젝트.
- 최근 변경 파일.
- 미실행 테스트.
- 다음 개발 action.
- code review 대기 항목.

## Dashboard Layout

```text
┌──────────────────────────────────────────────┐
│ Header: Dore status / time / model / cost    │
├──────────────────────────────────────────────┤
│ Critical strip: approvals / risk / failures  │
├───────────────────────┬──────────────────────┤
│ Today Top 3           │ Active Work           │
├───────────────────────┼──────────────────────┤
│ Daily Briefing        │ Trading Watch         │
├───────────────────────┼──────────────────────┤
│ Development           │ Memory Updates        │
├───────────────────────┴──────────────────────┤
│ Logs / Usage summary                         │
└──────────────────────────────────────────────┘
```

## 카드별 기본 필드

### Pending Approvals

- count.
- highest risk level.
- oldest waiting time.
- top approval title.
- approve/reject/open buttons.

### Today Top 3

- priority.
- reason.
- source.
- suggested action.
- create task/snooze buttons.

### Daily Briefing

- generated_at.
- summary.
- domestic market section.
- US market section.
- development section.
- personal section.
- open full briefing button.

### Trading Watch

- market status.
- broker connector status.
- watchlist signal count.
- dry-run candidates.
- risk halt state.
- last data timestamp.

### Development

- active repo.
- current task.
- tests status.
- pending review.
- next action.

### Memory Updates

- new pages.
- updated pages.
- sensitive items awaiting approval.
- conflicts.
- stale items.

### Usage

- today tokens.
- month estimated cost.
- soft limit percentage.
- provider split.
- cache savings estimate if available.

## 상태 색상 원칙

- Normal: 정보 표시.
- Attention: 확인 필요.
- Warning: 지연/실패/비용 증가.
- Critical: 승인 필요 또는 risk halt.

Trading critical state는 일반 warning보다 더 눈에 띄게 표시한다.

