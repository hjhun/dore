# CEP-08: Multi-Agent And A2A

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore agent runtime maintainers
Related: `01_system_architecture.md`, `04_telegram_and_session_runtime.md`, `05_scheduler_and_self_improvement.md`

## 1. 요약

Dore는 결국 하나의 실행 스레드만으로 머무르지 않아야 합니다.

사용자 요구는 세 가지 축으로 정리됩니다.

- 자연스럽게 bounded work를 수행하는 내부 sub-agent
- Codex, Claude, Gemini CLI 같은 외부 worker 실행
- pair 되었거나 같은 네트워크에 있는 Dore 인스턴스 간 협업과 A2A 고려

이 CEP는 그 기능들을 단계적으로 도입하기 위한 계층 모델을 정의합니다.

## 2. 목표

- 먼저 child-session delegation을 지원한다.
- 나중에 external worker adapter를 런타임 재설계 없이 추가할 수 있게 한다.
- 디바이스 간 peer Dore coordination을 가능하게 한다.
- 모든 delegation을 auditable, policy-aware, test-gated 상태로 유지한다.
- 기본 경로는 여전히 simple local execution으로 둔다.

## 3. 비목표

- 첫 마일스톤에서 완전한 분산 cluster scheduler를 만드는 것
- 일반 assistant 사용에 multi-agent를 강제하는 것
- 신뢰 모델 없이 임의 peer discovery를 허용하는 것
- external worker를 기본적으로 privileged 하게 취급하는 것

## 4. Delegation 계층

### 4.1 Layer 1: Internal Child Session

기본 sub-agent 메커니즘입니다.

용도:

- research
- summarization
- memory maintenance
- bounded planning
- controlled improvement task

### 4.2 Layer 2: External Worker Adapter

다음과 같은 도구를 adapter로 호출할 수 있습니다.

- Codex CLI
- Claude CLI
- Gemini CLI

이 worker는 다음을 받아야 합니다.

- bounded objective
- explicit write scope
- required test
- return-channel expectation

### 4.3 Layer 3: Peer Dore Node

서로 다른 Dore 설치본은 명시적으로 pair 되었거나, 사용자가 승인한 신뢰 모델 아래 같은 네트워크에서 발견된 경우 협업할 수 있습니다.

## 5. Work Contract

모든 delegated task는 공통 work contract를 사용해야 합니다.

- work ID
- parent goal 또는 session
- objective
- allowed tool/capability
- write scope
- timeout
- test requirement
- result promotion policy

이 계약은 internal delegation과 external delegation을 개념적으로 정렬해 줍니다.

## 6. Peer Discovery And Pairing

첫 peer 모델은 보수적이어야 합니다.

- manual pairing이 필수
- 각 peer는 stable node ID를 가짐
- pairing은 signed challenge 또는 명시적 trust exchange 사용
- 발견되었다고 해서 자동 신뢰하지 않음

향후 local-network discovery는 mDNS 같은 단순 broadcast를 쓸 수 있지만, 신뢰는 항상 명시적이어야 합니다.

## 7. Capability Registry

각 worker 또는 peer는 다음을 광고해야 합니다.

- supported task class
- available provider
- tool execution capability
- max concurrency
- health status
- version 또는 compatibility level

이를 통해 scheduler나 runtime이 위임 대상을 의도적으로 선택할 수 있습니다.

## 8. A2A Compatibility

Dore는 너무 일찍 하나의 peer protocol에 고정되면 안 되지만, 미래의 A2A 정렬을 위해 message envelope는 미리 정돈해 둘 필요가 있습니다.

권장 envelope field:

- sender
- receiver
- message type
- work ID
- session 또는 goal reference
- capability requirement
- payload
- signature 또는 trust metadata

이렇게 하면 첫 마일스톤에서 프로토콜을 강제하지 않고도 진화 여지를 남길 수 있습니다.

## 9. Result Promotion

delegated result가 자동으로 durable truth가 되어서는 안 됩니다.

promotion 규칙:

- 결과를 요약한다
- scope와 status를 검증한다
- code나 behavior가 바뀌었으면 required test를 실행한다
- report를 첨부한다
- 검증 이후에만 parent session, goal, memory를 업데이트한다

## 10. 실패 처리

delegation failure 예시:

- lease timeout
- worker unavailable
- policy rejection
- incompatible capability
- test failure
- conflicting write scope

실패 이후에도 parent session 또는 goal의 상태는 사람이 이해할 수 있어야 합니다.

## 11. 보안 모델

- peer는 pair 전까지 untrusted
- external worker에는 필요한 최소 context만 전달
- secret은 capability-specific token이 정책적으로 허용되지 않는 한 전달 금지
- write scope는 좁고 inspectable 해야 함
- code-changing work는 기본적으로 test-gated acceptance를 따라야 함

## 12. 테스트 요구사항

- work contract validation과 lease logic에 대한 unit test
- child-session delegation과 result promotion에 대한 integration test
- 간단한 external worker round-trip에 대한 smoke test
- delegated research 또는 code improvement와 report를 검증하는 e2e test

## 13. 도입 단계

### Phase 1

- internal child session only

### Phase 2

- external CLI worker adapter

### Phase 3

- paired peer Dore node
- A2A-compatible envelope

## 14. 수용 기준

다음이 만족되면 이 CEP를 수용합니다.

- Dore가 child session을 통해 bounded work를 위임할 수 있다
- Codex, Claude, Gemini CLI worker를 런타임 재설계 없이 추가할 수 있다
- peer coordination에 명시적 trust model이 존재한다
- delegated work가 auditable 하고 policy-aware 하다

## 15. 열린 질문

- 첫 external worker는 무엇부터 구현할 것인가?
- code-changing delegation은 초기에 local-only로 제한할 것인가?
- 첫 마일스톤에서 안정화할 최소 A2A envelope field는 무엇인가?
