# CEP-07: Goal Management And Reporting

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore planning maintainers
Related: `01_system_architecture.md`, `04_telegram_and_session_runtime.md`, `05_scheduler_and_self_improvement.md`

## 1. 요약

Dore는 단순히 프롬프트에 반응하는 시스템이 되어서는 안 됩니다. 목표를 추적하고, 시간이 지나도 진행 상태를 유지하고, 유용한 다음 행동을 찾고, 그 결과를 절제된 방식으로 사용자에게 보고해야 합니다.

이 CEP는 사용자 목표, 시스템 목표, 자기개선 목표를 어떻게 표현하고 검토할지, 그리고 Dore가 notification spam 없이 어떻게 사용자를 계속 informed 상태로 유지할지를 정의합니다.

## 2. 목표

- durable user goal을 명시적으로 표현한다.
- 시스템 목표와 self-improvement goal을 사용자 생활 목표와 분리해 관리한다.
- Dore가 필요한 research 또는 maintenance work를 발견할 수 있게 한다.
- report를 짧고 유용하며 검토 가능하게 유지한다.
- Dore가 사용자와 함께 발전하도록 한다.

## 3. 비목표

- goal system으로 memory system을 대체하는 것
- 모든 reminder를 long-lived goal로 취급하는 것
- 저가치 상태 메시지로 사용자를 스팸하는 것
- agent activity를 silent background loop에 숨기는 것

## 4. Goal Class

초기 taxonomy:

- `user_long_term`
- `user_operational`
- `project`
- `routine`
- `research`
- `maintenance`
- `improvement`

예시:

- 개인 계획과 선호는 보통 `user_long_term`
- "Telegram scheduling command 추가"는 `project`
- "token budget regression 주간 검토"는 `maintenance`
- "opencode session pattern과 Dore runtime 비교"는 `research`

## 5. Goal Record

각 goal은 다음을 포함해야 합니다.

- goal ID
- title
- class
- description
- source
- owner
- status
- priority
- review cadence
- linked session
- linked report
- linked memory page
- success criteria

권장 status:

- `proposed`
- `active`
- `blocked`
- `waiting`
- `completed`
- `archived`

## 6. Goal Source

goal은 다음에서 올 수 있습니다.

- 직접적인 사용자 요청
- 대화 분석
- scheduled review
- memory lint finding
- 반복되는 failure
- self-improvement analysis

시스템이 생성한 goal은 항상 source와 confidence를 기록해야 합니다.

## 7. Goal Review Loop

Dore는 goal을 정기적으로 검토해야 합니다.

- active operational item은 daily
- project와 maintenance goal은 weekly
- 사용자가 요청하면 on-demand

각 review는 다음에 답해야 합니다.

- 무엇이 바뀌었는가
- 무엇이 막혀 있는가
- 다음에 무엇을 해야 하는가
- goal을 split, downgrade, archive 해야 하는가

## 8. Memory와의 관계

goal은 memory wiki의 대체제가 아닙니다.

권장 분리:

- memory는 durable knowledge를 저장
- goal은 desired outcome과 execution state를 저장
- report는 실제로 일어난 일을 저장

cross-link는 필요하지만 책임은 분리되어야 합니다.

## 9. Reporting 모델

report는 두 가지 형태로 존재해야 합니다.

### 9.1 Short Report

Telegram으로 전달합니다. 짧고 action-oriented 해야 합니다.

### 9.2 Durable Report

영속 아티팩트로 저장하고 goal, session, memory page에 연결합니다.

각 durable report는 다음을 포함해야 합니다.

- report ID
- origin
- time range
- summary
- action taken
- change 또는 finding
- relevant test
- recommended next step

## 10. Notification 정책

즉시 통지할 것:

- 중요한 goal이 blocked 되었을 때
- 정상 동작을 막는 provider/auth failure
- 완료된 고가치 작업
- 승인 필요한 improvement proposal

batch 또는 summary로 충분한 것:

- routine maintenance
- low-risk memory refresh
- 반복적인 health check

## 11. Research And Discovery Work

Dore는 다음과 같은 bounded research goal을 만들 수 있어야 합니다.

- 새로운 provider option 조사
- 다른 프로젝트의 architecture pattern 비교
- memory retrieval의 token inefficiency 분석

research work는 조용한 내부 지식에 머물지 말고 반드시 report로 끝나야 합니다.

## 12. 테스트 요구사항

- goal state transition과 report policy에 대한 unit test
- session-to-goal, schedule-to-goal linkage에 대한 integration test
- weekly review report에 대한 smoke test
- goal이 생성되고 진행되고 보고되고 archive 되는 e2e test

## 13. 수용 기준

다음이 만족되면 이 CEP를 수용합니다.

- Dore가 goal을 명시적으로 표현할 수 있다
- goal을 시간이 지나도 검토하고 업데이트할 수 있다
- report가 Telegram에서는 짧고 storage에서는 durable 하다
- 사용자가 Dore가 어떻게 돕고 있고 어떻게 개선되고 있는지 볼 수 있다

## 14. 열린 질문

- 첫 마일스톤에서 어떤 goal class를 자동 생성할 것인가?
- 자동 research-goal 생성은 얼마나 공격적으로 할 것인가?
- 유용하면서도 noisy 하지 않은 기본 report cadence는 무엇인가?
