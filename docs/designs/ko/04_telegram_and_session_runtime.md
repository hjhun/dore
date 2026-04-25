# CEP-04: Telegram And Session Runtime

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore runtime maintainers
Related: `01_system_architecture.md`, `02_memory_and_llm_wiki.md`, `03_provider_and_auth.md`, `07_goal_management_and_reporting.md`

## 1. 요약

Telegram은 Dore의 첫 운영 채널이지만, 진짜 도메인 모델은 session입니다.

이 CEP는 Telegram event가 어떻게 session 작업으로 변환되는지, 어떻게 compact context를 조립하는지, 어떻게 report를 전달하는지, 그리고 child session이 sub-agent 역할을 하면서도 메인 사용자 스레드를 더럽히지 않도록 하는지를 정의합니다.

## 2. 목표

- 하나의 깨끗하고 신뢰 가능한 채널로 시작한다.
- Telegram 로직을 얇고 교체 가능하게 유지한다.
- session을 통해 장기 대화 연속성을 보존한다.
- 전체 히스토리 재생 대신 compact context를 사용한다.
- delegated work와 scheduled job을 위한 child session을 지원한다.

## 3. 비목표

- Telegram 개념을 시스템 중심 모델로 만드는 것
- 첫 마일스톤에서 큰 명령 집합을 지원하는 것
- 모든 요청마다 전체 메시지 이력을 재생하는 것
- memory update를 Telegram transport handler에 직접 섞는 것

## 4. 핵심 결정

### AD-1: Session을 주 런타임 객체로 사용한다

모든 사용자 또는 시스템 상호작용은 session에 연결됩니다.

### AD-2: Telegram은 transport adapter다

Telegram module은 update를 파싱하고 actor와 대상 session을 식별한 뒤, 실제 작업을 session runtime으로 넘깁니다.

### AD-3: Child session을 첫 sub-agent 구현으로 사용한다

위임 작업은 child session에서 수행하고, 유용한 결과만 parent로 승격합니다.

## 5. Session 모델

각 session은 다음을 추적해야 합니다.

- session ID
- owner ID
- session kind: user, child, system, scheduled
- parent session ID
- current objective
- compact summary
- linked goal
- linked memory reference
- recent turn ledger
- last report
- active task state

권장 state:

- `active`
- `waiting`
- `blocked`
- `completed`
- `archived`

## 6. Telegram 매핑

권장 매핑 규칙:

- 하나의 private Telegram chat은 하나의 primary user session lineage에 매핑
- scheduled job은 user에 연결된 system 또는 child session을 사용
- delegated work는 현재 session 아래 child session을 생성

Telegram message ID는 참고값일 뿐이고, 런타임 상태의 source of truth가 아닙니다.

## 7. 최소 명령 집합

첫 명령 집합은 작게 유지해야 합니다.

- `/status`
- `/help`
- `/memory`
- `/goals`
- `/report`
- `/schedule`
- `/approve`
- `/skills`

일반 대화는 free text가 기본 경로입니다.

## 8. 요청 처리 흐름

1. Telegram update를 수신한다.
2. 허용된 actor와 chat인지 검증한다.
3. command로 파싱하거나 free text로 분류한다.
4. 대상 session을 조회하거나 생성한다.
5. task class와 linked goal을 결정한다.
6. 최소 context를 조립한다.
7. provider와 model을 선택한다.
8. 작업을 실행한다.
9. session 변경사항을 저장한다.
10. 필요 시 memory 또는 report side effect를 발생시킨다.
11. Telegram으로 응답을 전달한다.

## 9. Context Assembly 정책

기본 context stack:

1. current request text
2. session compact summary
3. active goal slice
4. memory의 relevant digest slice
5. 필요 시 매우 작은 recent-turn window
6. 그래도 모호할 때만 direct wiki page

피해야 할 것:

- full conversation replay
- normal chat에서의 raw source ingestion
- large unfiltered goal/report dump

## 10. Session Compaction

compaction은 다음 때 수행해야 합니다.

- substantial exchange 이후
- idle archival 전에
- 큰 parent session에서 child work를 spawn 하기 전에

compaction 산출물:

- compact summary
- updated key reference
- unresolved question
- memory-worthy durable fact

## 11. Child Session 설계

child session 사용 용도:

- research task
- memory maintenance
- self-improvement run
- multi-step delegated work

규칙:

- child session은 필요한 최소 context만 상속한다
- parent와 child의 write scope를 명시한다
- 최종 결과는 promotion 전에 summary로 압축한다
- child session이 parent summary를 조용히 바꾸면 안 된다

## 12. Telegram 내 Reporting

report는 기본적으로 짧아야 하며 다음을 포함해야 합니다.

- Dore가 무엇을 했는지
- 성공 여부
- 무엇이 바뀌었는지
- 사용자가 검토할 것이 있는지

report 유형:

- scheduled task result
- memory update summary
- provider/auth issue
- improvement proposal 또는 completion
- goal review summary
- skill 설치, 업데이트, readiness issue

## 13. Telegram 운영 요구사항

Telegram adapter는 다음을 처리해야 합니다.

- chat/user allow-list
- outgoing rate limit
- transient send failure retry
- safe startup/shutdown
- 나중 notification을 위한 known-chat persistence
- command-level error message

이 관심사는 Telegram module 안에만 머물러야 합니다.

## 14. Persistence 요구사항

session store는 다음을 저장해야 합니다.

- session metadata
- compact summary
- turn ledger excerpt
- goal link
- memory link
- parent-child session link
- report reference

초기 store가 file-backed든 SQLite-backed든 상관없지만, interface는 backend를 가정하면 안 됩니다.

## 15. 테스트 요구사항

- command parsing, session resolution, compaction rule에 대한 unit test
- Telegram-to-session routing에 대한 integration test
- 기본 Telegram request/response cycle에 대한 smoke test
- 여러 대화에 걸친 memory continuity를 검증하는 e2e test

## 16. 수용 기준

다음이 만족되면 이 CEP를 수용합니다.

- Telegram이 business logic을 소유하지 않고 assistant를 구동한다
- session이 상호작용 간 연속성을 보존한다
- context가 compact하고 budget-aware 하다
- child session이 delegated work를 깔끔하게 수행한다
- report가 Telegram에서 짧고 이해 가능하게 전달된다

## 17. 열린 질문

- 첫 마일스톤은 private chat만 지원할 것인가, group chat도 일부 지원할 것인가?
- 어떤 command는 명시적 user approval이 필요하고, 어떤 것은 passive status viewing으로 충분한가?
- compaction 전까지 session에 남길 recent-turn history의 적절한 크기는 얼마인가?
