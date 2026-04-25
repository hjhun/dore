# CEP-06: Quality And Test Strategy

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore quality maintainers
Related: `01_system_architecture.md`, `05_scheduler_and_self_improvement.md`

## 1. 요약

Dore는 품질을 사후 엔지니어링 작업이 아니라 제품 기능으로 취급해야 합니다.

사용자 요구사항은 명확합니다. unit, integration, smoke, end-to-end 테스트가 모두 개발 과정에 존재해야 합니다. 특히 사용자를 기억하고 스스로 개선할 수 있는 시스템에서는 테스트되지 않은 코드는 수용될 수 없습니다.

## 2. 목표

- 의미 있는 기능에는 항상 테스트를 요구한다.
- 각 서브시스템을 맞는 테스트 계층에서 검증한다.
- 자기개선이 검증을 우회하지 못하게 한다.
- 테스트 스위트를 의식적인 설계 자산으로 유지한다.
- 시스템이 진화할수록 신뢰를 높인다.

## 3. 품질 정책

핵심 규칙:

의미 있는 기능은 필요한 테스트가 존재하고 통과하기 전까지 완료가 아니다.

추가 규칙:

- 치명적 회귀에는 regression test가 필요하다
- flaky test는 별개의 버그로 취급한다
- 주요 운영 경로에는 smoke coverage가 필수다
- 테스트 없는 self-improvement는 성공이 아니라 실패한 시도다

## 4. 테스트 계층

### 4.1 Unit Test

목적:

- 고립된 로직 검증
- 빠른 피드백
- edge-case 강제

주요 대상:

- memory parsing과 claim merge rule
- digest compilation
- routing과 auth policy
- session compaction
- scheduler calculation
- improvement policy guard

### 4.2 Integration Test

목적:

- 모듈 경계 협업 검증

주요 대상:

- Telegram adapter에서 session runtime으로의 연결
- session runtime에서 provider selection으로의 연결
- task completion 이후 memory update
- scheduler에서 job creation
- improvement runner에서 quality gate

### 4.3 Smoke Test

목적:

- 주요 happy path가 아직 부팅되고 실행되는지 확인

초기 smoke 대상:

- startup과 기본 Telegram request handling
- default provider initialization
- memory digest read path
- report를 생성하는 scheduled job

### 4.4 End-To-End Test

목적:

- 완전한 user-visible flow 검증

초기 e2e 대상:

- 사용자 사실을 학습하고 저장하고 나중에 다시 활용
- scheduled review를 실행하고 report 전송
- bounded improvement task 실행 후 테스트와 report 수행

## 5. 모듈별 커버리지 기대치

## `memory`

- page update
- contradiction detection
- digest correctness
- provenance retention

## `provider`

- OAuth와 refresh behavior
- API-key resolution
- fallback policy
- failure classification

## `session`

- context assembly
- compaction
- child session promotion

## `channel::telegram`

- command parsing
- session mapping
- message delivery error handling

## `scheduler`

- trigger calculation
- deduplication
- retry/cooldown behavior

## `improvement`

- candidate creation
- policy enforcement
- report creation
- test gate handling

## `goal`

- goal creation
- priority update
- review state
- report linkage

## `agent`

- worker assignment
- result promotion
- lease timeout/cancellation

## `skill`

- ClawHub search/install flow
- origin/lockfile persistence
- trust policy와 allowlist enforcement
- readiness와 security scan result

## 6. Fixture와 Mocking 정책

다음에 대해 explicit fixture를 사용합니다.

- Telegram update
- provider response
- OAuth callback data
- memory page와 digest
- job record
- report

mock는 외부 경계에서 사용합니다.

- Telegram API
- remote provider API
- 필요 시 local provider HTTP surface

검증하려는 핵심 도메인 로직 자체를 그 테스트에서 mock 하면 안 됩니다.

## 7. CI와 실행 전략

권장 pipeline 순서:

1. format
2. lint
3. unit test
4. integration test
5. smoke test
6. selected e2e test

장시간 e2e suite는 분리된 job으로 돌릴 수 있지만, 반드시 존재하고 건강하게 유지되어야 합니다.

## 8. Release와 Acceptance 규칙

다음이면 change를 신뢰할 수 없습니다.

- 필요한 test layer가 빠져 있다
- test가 실패한다
- self-improvement work에 report artifact가 없다
- critical boundary를 건드렸는데 regression coverage가 없다

critical boundary:

- auth
- memory correctness
- scheduler deduplication
- session continuity
- report integrity

## 9. 관측성과 메트릭

추적 대상:

- layer별 pass/fail rate
- flaky test count
- suite별 mean runtime
- regression escape
- blocked self-improvement attempt
- critical module coverage

목적은 예쁜 숫자가 아니라 신뢰가 올라가고 있는지, 무너지고 있는지를 보는 것입니다.

## 10. Self-Improvement에서의 Testing

self-improvement run은 다음을 선언해야 합니다.

- touched file 또는 module
- required test
- optional extra validation
- acceptance condition

test gate를 만족하지 못하면 결과는 다음 중 하나여야 합니다.

- `failed`
- `deferred`
- `requires_review`

절대로 `successful`이면 안 됩니다.

## 11. 문서화 요구사항

변경이 다음에 영향을 준다면:

- user-visible behavior
- command
- schedule semantic
- memory convention
- provider configuration

동일 작업 안에서 관련 문서도 함께 갱신해야 합니다.

## 12. 수용 기준

다음이 만족되면 이 CEP를 수용합니다.

- 모든 critical module에 unit과 integration coverage가 있다
- 주요 운영 경로를 cover 하는 smoke test가 있다
- memory continuity, scheduling, self-improvement에 대한 e2e flow가 있다
- quality gate가 unsafe change를 막을 수 있다
- 프로젝트가 untested code를 미완성 작업으로 취급한다

## 13. 열린 질문

- Telegram e2e simulation에는 어떤 test harness가 적절한가?
- 첫 마일스톤의 적절한 minimum coverage threshold는 얼마인가?
- self-improvement run은 기본적으로 focused test와 smoke subset 둘 다 요구해야 하는가?
