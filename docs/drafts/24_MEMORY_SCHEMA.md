# Memory Schema

## 목적

Dore의 장기 기억을 사람이 읽을 수 있고 Agent가 효율적으로 사용할 수 있는 형태로 정의한다.

기본 저장 형식은 Markdown이다. 검색과 metadata 처리를 위해 YAML frontmatter를 사용한다.

## Directory Layout

```text
memory/
  raw/
    inbox/
    market/
    broker/
    news/
    projects/
    attachments/
  wiki/
    index.md
    profile/
    goals/
    projects/
    people/
    topics/
    trading/
    engineering/
    decisions/
    routines/
  operations/
    active_context.md
    tasks.md
    reminders.md
    open_questions.md
    approvals.md
  logs/
    agent_log.md
    decisions.md
    daily/
    trading/
    usage/
```

## 공통 Frontmatter

```yaml
---
type: profile | project | topic | trading | engineering | decision | routine | log
title: string
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
status: active | archived | superseded | draft
tags: []
source_refs: []
sensitivity: public | personal | sensitive | secret_ref
owner: user | dore
---
```

## Profile Page

위치:

```text
memory/wiki/profile/user.md
```

포함:

- 사용자 역할.
- 개발 선호.
- 투자 성향.
- 알림 선호.
- 기억 금지 항목.
- 장기 목표.

민감 정보 원문은 저장하지 않는다.

## Project Page

위치:

```text
memory/wiki/projects/<project-id>.md
```

Frontmatter:

```yaml
type: project
title:
status: active
priority: 1
created_at:
updated_at:
related_repos: []
next_actions: []
```

본문:

- 목적.
- 현재 상태.
- 요구사항.
- 설계 결정.
- 진행 중 작업.
- 위험 요소.
- 다음 행동.

## Trading Page

위치:

```text
memory/wiki/trading/<topic-or-symbol>.md
```

본문:

- 관심 이유.
- thesis.
- risk.
- 관련 뉴스/데이터.
- 전략 후보.
- dry-run 결과.
- 결정 기록.

## Daily Log

위치:

```text
memory/logs/daily/YYYY-MM-DD.md
```

본문:

- morning briefing.
- 오늘의 top 3.
- 개발 상태.
- 국내 증시.
- 미국 증시.
- pending approvals.
- Dore 제안.
- 사용된 source.
- token/cost.

## Trading Journal

위치:

```text
memory/logs/trading/YYYY-MM.md
```

항목:

```markdown
## YYYY-MM-DD HH:mm | SYMBOL | signal

- market:
- broker:
- source_time:
- strategy:
- signal:
- candidate_order:
- risk_check:
- execution_mode: watch | dry_run | paper | real
- approval:
- result:
- post_review:
```

## Decision Log

위치:

```text
memory/logs/decisions.md
```

항목:

```markdown
## YYYY-MM-DD | title

- context:
- decision:
- alternatives:
- reason:
- impact:
- revisit_at:
```

## Memory Update Rules

- 같은 사실을 여러 페이지에 중복 저장하지 않는다.
- 핵심 요약은 wiki에, 원문은 raw에 둔다.
- 변경될 수 있는 정보에는 `updated_at`과 source를 남긴다.
- 충돌하는 정보는 삭제하지 않고 `conflict` 섹션을 만든다.
- 오래된 정보는 `superseded`로 표시한다.
- secret은 `secret_ref`만 저장한다.

## Token Efficiency

- Agent는 먼저 `memory/wiki/index.md`를 읽는다.
- active 작업은 `operations/active_context.md`에 짧게 유지한다.
- daily briefing은 전일 log와 변경분만 읽는다.
- 긴 raw source는 extract/summary를 먼저 만든다.

