# CEP-03: Provider And Authentication

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore provider maintainers
Related: `01_system_architecture.md`, `04_telegram_and_session_runtime.md`, `08_multi_agent_and_a2a.md`

## 1. 요약

Dore는 다음 특성을 가진 provider 아키텍처를 통해 LLM에 연결되어야 합니다.

- 기본 경로는 OpenAI OAuth
- Claude, Gemini 등 API-key provider로 확장 가능
- local LLM과도 호환 가능
- memory, session, channel 로직과 분리됨

이 CEP는 OpenClaw에서 확인한 유용한 경계 방식을 채택합니다. 인증은 런타임 모델 실행과 분리되고, provider별 구현은 좁은 adapter 뒤에 숨깁니다.

## 2. 목표

- OpenAI OAuth를 기본이자 가장 마찰이 적은 경로로 만든다.
- vendor 로직이 session runtime으로 새지 않게 한다.
- 사용자가 저장한 API key를 깨끗하게 사용할 수 있게 한다.
- local LLM 운용 여지를 남긴다.
- secret을 chat, memory, report 아티팩트로부터 분리한다.

## 3. 비목표

- vendor 특화 로직을 session code에 하드코딩하는 것
- raw secret을 wiki, report, session ledger에 저장하는 것
- 모든 provider가 같은 기능을 가진다고 가정하는 것
- provider failover를 보이지 않게 숨기는 것

## 4. 요구사항

- PR-1: Dore는 기본 경로로 OpenAI OAuth를 지원해야 한다.
- PR-2: Dore는 다른 provider를 위한 API-key profile을 지원해야 한다.
- PR-3: Dore는 local provider도 동일한 runtime contract 아래 수용해야 한다.
- PR-4: provider 선택은 task class 기반 정책으로 이루어져야 한다.
- PR-5: auth resolution은 감사 가능해야 한다.
- PR-6: 실패는 typed error와 reportable state로 표현되어야 한다.

## 5. 도메인 모델

### 5.1 `ProviderId`

예시:

- `openai`
- `anthropic`
- `google.gemini`
- `local.ollama`
- `local.lmstudio`

### 5.2 `AuthMode`

초기 지원 모드:

- `oauth`
- `api_key`
- `none`

### 5.3 `ProviderProfile`

포함 항목:

- provider ID
- auth mode
- allowed model
- endpoint override
- policy tag

### 5.4 `CredentialRef`

credential 위치를 가리키는 reference:

- direct secret reference
- environment variable
- OS keychain entry
- encrypted local store entry

### 5.5 `RoutingPolicy`

task class를 provider 후보와 fallback 순서에 매핑합니다.

task class 예시:

- chat
- memory_maintenance
- summarization
- planning
- coding
- self_improvement
- reporting

## 6. 아키텍처 결정

### AD-1: OpenAI OAuth를 기본 happy path로 사용한다

명시적 override가 없다면 Dore는 OpenAI OAuth profile을 우선 사용해야 합니다.

### AD-2: Auth resolution과 provider execution을 분리한다

런타임은 resolved credential envelope만 받습니다. refresh token, API key 저장 방식, env lookup 세부사항을 직접 알지 않습니다.

### AD-3: local provider도 동일 adapter contract를 구현한다

local LLM이 session logic의 특수 분기점이 되면 안 됩니다.

### AD-4: routing은 task class 기반 정책으로 결정한다

provider 선택은 단순 global default가 아니라 workload 특성을 반영해야 합니다.

## 7. OpenAI OAuth 흐름

초기 OAuth 구현은 다음을 지원해야 합니다.

- PKCE
- 가능할 때 localhost callback
- manual code-paste fallback
- refresh token 저장
- expiry tracking
- refresh 실패 시 재인증 유도

런타임 계약이 노출하는 정보는 다음 정도면 충분합니다.

- access token availability
- expiry
- resolved provider profile
- typed auth error

## 8. API-Key Provider 지원

API-key provider는 동일한 설정 형태를 따라야 합니다.

- provider ID
- profile label
- credential reference
- allowed model
- 필요 시 endpoint override

이를 통해 다음을 수용합니다.

- Claude via API key
- Gemini via API key
- 유사 인증 모델을 가진 future provider

사용자가 API key를 저장하면, 정책에 따라 해당 provider가 실행 후보가 됩니다.

## 9. Local LLM 지원

local provider는 1급 adapter로 모델링해야 합니다.

예상 capability:

- configurable base URL 또는 local socket
- 가능하면 model discovery
- request timeout policy
- tool support, streaming support 같은 capability flag

local LLM은 선택 사항이지만 구조상 막히면 안 됩니다.

## 10. Credential Resolution 순서

권장 순서:

1. explicit task 또는 session override
2. explicit task-class routing policy
3. user-configured preferred provider profile
4. default OpenAI OAuth profile
5. 정책이 허용하면 local provider fallback

선택된 profile과 이유는 execution metadata에 기록해야 합니다.

## 11. Secret Storage

secret은 전용 secret subsystem에 저장해야 합니다.

초기 구현은 다음을 지원할 수 있습니다.

- environment variable reference
- encrypted local file entry
- 향후 OS keychain integration

강제 규칙:

- raw secret을 memory/wiki에 쓰면 안 된다
- raw secret을 session summary에 포함하면 안 된다
- report와 log에서 secret은 반드시 redaction 해야 한다

## 12. 실패 처리

최소 다음과 같이 실패를 구분해야 합니다.

- `auth_failed`
- `auth_expired`
- `quota_exhausted`
- `provider_unavailable`
- `model_unavailable`
- `network_error`
- `policy_rejected`
- `malformed_response`

failover는 routing policy가 명시적으로 허용할 때만 가능합니다.

## 13. 관측성

각 execution마다 다음을 기록합니다.

- task class
- selected provider profile
- auth mode
- model name
- fallback usage
- 가능하면 token usage
- latency
- failure class

이는 debug와 self-improvement 모두에 필요합니다.

## 14. 테스트 요구사항

- routing policy와 credential resolution에 대한 unit test
- OAuth happy path와 refresh handling에 대한 integration test
- API-key provider에 대한 integration test
- default provider 부팅과 실행에 대한 smoke test
- 실제 task flow에서 provider selection behavior를 검증하는 e2e test

## 15. 수용 기준

다음이 만족되면 이 CEP를 수용합니다.

- OpenAI OAuth가 기본 provider 경로로 동작한다
- session logic 변경 없이 API-key provider를 추가할 수 있다
- local provider가 동일 adapter boundary에 들어온다
- 실패가 typed, observable, reportable 하다
- secret이 business artifact로부터 분리된다

## 16. 열린 질문

- 첫 secret backend는 무엇이 적절한가?
- 첫 마일스톤에서 OpenAI OAuth profile을 여러 개 지원할 것인가, 하나만 지원할 것인가?
- 초기 adapter trait에 꼭 필요한 provider capability flag는 무엇인가?
