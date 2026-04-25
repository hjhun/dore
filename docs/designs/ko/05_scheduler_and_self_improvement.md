# CEP-05: Scheduler And Self-Improvement

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore automation maintainers
Related: `01_system_architecture.md`, `06_quality_and_test_strategy.md`, `07_goal_management_and_reporting.md`, `08_multi_agent_and_a2a.md`

## 1. 요약

Dore는 메시지에 반응만 하는 시스템이어서는 안 됩니다. 스케줄 작업을 실행하고, 스스로의 부족한 점을 검토하고, 개선안을 제안하거나 구현하고, 그 결과를 사용자에게 보고할 수 있어야 합니다.

이 CEP는 제한된 자율성 모델을 정의합니다. scheduled work와 self-improvement는 제품 기능이지만, 언제나 명시적 정책, goal state, test gate 아래에서 동작합니다.

## 2. 목표

- cron, interval, daily, weekly 실행을 지원한다.
- 스케줄 작업을 durable goal 또는 job으로 표현한다.
- Dore가 자신의 weakness와 improvement point를 검토할 수 있게 한다.
- 자기개선을 observable, bounded, test-gated 하게 유지한다.
- background churn이 아니라 사용자 가치에 맞춰 자동화를 동작시킨다.

## 3. 비목표

- 무제한 autonomous code editing
- report trail 없는 silent change
- scheduling logic을 Telegram이나 provider module에 섞는 것
- 모든 관찰을 자동 구현 작업으로 취급하는 것

## 4. Scheduler 모델

scheduler는 시간 계산과 enqueueing만 담당합니다. business work를 직접 수행하지 않습니다.

지원 trigger type:

- cron expression
- fixed interval
- daily window
- weekly window

각 schedule definition은 다음을 포함해야 합니다.

- schedule ID
- trigger type
- next run time
- cooldown policy
- retry policy
- target task type
- linked goal 또는 objective
- approval policy

## 5. Job 모델

trigger가 발화되면 scheduler는 job record를 생성하거나 재개합니다.

각 job은 다음을 추적해야 합니다.

- job ID
- originating schedule ID
- target goal ID
- status
- attempt count
- start and finish timestamp
- linked session ID
- report reference
- failure classification

## 6. 지원할 Scheduled Task Class

초기 scheduled task는 다음 정도로 제한합니다.

- memory lint
- digest rebuild
- provider health check
- goal review
- weekly report generation
- improvement backlog review
- project research review

첫 마일스톤에서는 목록을 작게 유지하는 편이 맞습니다.

## 7. Improvement Source

Dore는 다음에서 improvement candidate를 감지할 수 있습니다.

- 반복되는 사용자 friction
- provider failure
- token budget regression
- stale memory 또는 digest drift
- test failure 또는 flaky test
- 부족한 command 또는 workflow
- 사용자의 반복적인 수동 개입

## 8. Improvement Workflow

통제된 흐름은 다음과 같습니다.

1. observe
2. analyze
3. improvement candidate 등록
4. risk와 required approval 분류
5. bounded plan 생성
6. dedicated session 또는 worker에서 실행
7. required test 실행
8. report 생성
9. policy에 따라 apply, defer, reject

각 단계는 artifact를 남겨야 합니다.

## 9. 정책 클래스

개선 작업은 다음 정책 클래스로 나눕니다.

- `report_only`
- `safe_auto_apply`
- `requires_user_approval`
- `forbidden`

예시:

- stale digest 갱신은 `safe_auto_apply`일 수 있음
- provider routing default 변경은 대개 `requires_user_approval`
- secret exfiltration은 항상 `forbidden`

## 10. 제한된 실행 규칙

self-improvement task는 반드시 다음을 지켜야 합니다.

- narrow write scope
- explicit objective
- explicit test plan
- explicit rollback 또는 failure handling path
- report generation mandatory

write scope나 test plan을 설명할 수 없다면 자동 실행하면 안 됩니다.

## 11. Session 통합

scheduled work와 improvement work는 다음에서 실행됩니다.

- low-risk maintenance용 system session
- user 또는 goal 문맥 아래의 child session
- external coding agent나 peer를 쓸 때 worker session

이렇게 해야 audit trail이 대화형 작업과 일관됩니다.

## 12. Reporting 요구사항

의미 있는 실행은 항상 다음을 포함한 report를 남겨야 합니다.

- 실행 이유
- 입력 goal 또는 schedule
- 수행한 action
- 변경한 file 또는 artifact
- 실행한 test
- pass/fail status
- recommended follow-up

Telegram에서는 짧게, durable artifact에서는 자세하게 남깁니다.

## 13. 실패 처리

실패 시 Dore는 다음을 수행해야 합니다.

- failure classification
- 관련 evidence 기록
- backoff 또는 cooldown 정책 적용
- 중요한 실패는 사용자에게 통지
- 무한 retry loop 방지

failure class 예시:

- dependency failure
- auth failure
- test failure
- policy rejection
- timeout
- conflicting state

## 14. 관측성

최소 다음을 추적합니다.

- 생성된 job 수
- 완료된 job 수
- 실패한 job 수
- 사용된 retry 수
- 열린 improvement candidate 수
- accepted improvement candidate 수
- policy에 막힌 change 수
- test에 막힌 change 수

이 지표는 debug뿐 아니라 improvement priority 결정에도 필요합니다.

## 15. 테스트 요구사항

- schedule math, cooldown logic, policy evaluation에 대한 unit test
- trigger-to-job creation과 job-to-session execution에 대한 integration test
- scheduled task가 user-visible report를 만드는 smoke test
- full improvement cycle과 mandatory test gate를 검증하는 e2e test

## 16. 수용 기준

다음이 만족되면 이 CEP를 수용합니다.

- scheduled job이 예측 가능하게 실행된다
- scheduled work가 auditable job 또는 goal record로 남는다
- improvement task가 bounded 하고 policy-aware 하다
- 테스트 없이 self-improvement 결과가 accepted 되지 않는다
- 사용자가 Dore가 왜 움직였고 무엇이 바뀌었는지 이해할 수 있다

## 17. 열린 질문

- 첫 마일스톤에서 어떤 schedule definition을 기본 제공할 것인가?
- 강한 테스트가 있어도 끝까지 manual-only로 남겨야 할 improvement class는 무엇인가?
- weekly review는 처음부터 report-plus-proposal로 갈 것인가, pure report로 시작할 것인가?
