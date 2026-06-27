# LLM Providers

## 목적

Dore는 여러 LLM provider를 사용할 수 있어야 한다.

지원 provider:

- OpenAI.
- Claude.
- Gemini.

## 기본 원칙

- 기본 인증 방식은 API key다.
- provider별 인증 정보는 평문 문서에 저장하지 않는다.
- provider 선택과 model 선택은 runtime 설정으로 바꿀 수 있어야 한다.
- Agent core는 특정 provider SDK에 강하게 묶이지 않는다.
- provider별 기능 차이는 adapter에서 흡수한다.

## Provider Adapter 구조

각 provider는 동일한 interface를 구현한다.

```text
ModelGateway
  |-- OpenAIProvider
  |-- ClaudeProvider
  `-- GeminiProvider
```

Provider adapter는 아래 기능을 제공한다.

- 모델 목록 또는 설정된 모델 조회.
- chat/response 생성.
- tool calling 지원.
- streaming 지원.
- token usage 수집.
- 비용 추정에 필요한 usage metadata 반환.
- provider별 오류를 공통 오류 타입으로 변환.

## 인증 방식

### API Key

모든 provider의 기본 인증 방식이다.

대상:

- OpenAI.
- Claude.
- Gemini.

요구사항:

- `.env` 또는 OS secret store를 사용한다.
- desktop app과 Telegram bot 응답에 secret을 출력하지 않는다.
- provider별 key 검증 기능을 제공한다.
- key rotation을 지원할 수 있게 설계한다.

### OpenAI OAuth

OpenAI는 API key 외에 OAuth 계열 연결 방식을 지원한다.

요구사항:

- OpenAI provider는 일반 API 호출에 `api_key`를 기본으로 사용한다.
- 장기 비밀 키를 피해야 하는 신뢰된 workload에서는 공식 OpenAI workload
  identity federation을 통해 `workload_identity` auth mode를 사용할 수 있다.
- 브라우저 OAuth 또는 ChatGPT/Codex 로그인 세션은 Dore의 OpenAI API
  credential로 재사용하지 않는다.
- 기본값은 `api_key`다.
- OAuth 연결은 사용자가 명시적으로 선택했을 때만 수행한다.
- OAuth token은 안전한 credential store에 저장한다.
- token refresh, 만료, revoke 상태를 처리한다.
- OAuth로 사용할 수 있는 기능 범위는 구현 시점의 OpenAI 공식 문서를 기준으로 검증한다.

주의:

- OpenAI API key 인증과 OAuth/ChatGPT sign-in 기반 인증은 적용되는 정책, 권한, 과금, 기능 범위가 다를 수 있다.
- Dore는 두 방식을 내부적으로 명확히 구분해서 기록해야 한다.

## 설정 예시

```yaml
llm:
  default_provider: openai
  default_model: gpt-5.4
  routing_mode: manual_first
  providers:
    openai:
      enabled: true
      auth_mode: api_key
      api_key_env: OPENAI_API_KEY
      workload_identity:
        subject_token_env: OPENAI_WIF_SUBJECT_TOKEN
        identity_provider_id_env: OPENAI_WIF_IDENTITY_PROVIDER_ID
        service_account_id_env: OPENAI_WIF_SERVICE_ACCOUNT_ID
        token_url: https://auth.openai.com/oauth/token
      default_model: gpt-5.4
      task_models:
        high_reasoning: gpt-5.5
        low_cost: gpt-5.4-mini
        fast_response: gpt-5.4-mini
    claude:
      enabled: true
      auth_mode: api_key
      api_key_env: ANTHROPIC_API_KEY
      default_model_role: Claude Sonnet 4.6
      resolve_model_id_at_setup: true
    gemini:
      enabled: true
      auth_mode: api_key
      api_key_env: GEMINI_API_KEY
      api_version: v1
      default_model: gemini-3.5-flash
      task_models:
        low_cost: gemini-2.5-flash
        cheapest_background: gemini-2.5-flash-lite
        complex_reasoning: gemini-2.5-pro
```

## Model Selection

Dore는 작업 종류별로 provider/model을 선택할 수 있어야 한다.

예시:

- general assistant.
- software engineering.
- code review.
- long context reading.
- trading analysis.
- low-cost background summarization.
- fast Telegram response.

초기 기본 provider는 OpenAI다.

같은 provider 안에서도 하나의 모델만 고정하지 않는다. Dore는 `category`, `complexity`, `latency_preference`, `cost_preference`, `context_size`를 보고 모델을 고른다.

Routing tier:

- economy: 단순 요약, 상태 응답, background 정리, Telegram 빠른 응답.
- standard: 일반 비서 대화, daily briefing 최종 정리, 보통 난이도 개발 문서화.
- premium: 복잡한 설계, 코드 리뷰, 장기 context 분석, 중요한 의사결정 지원.

기본 규칙:

- 단순하고 반복적인 작업은 같은 provider의 경량 모델을 우선한다.
- 사용자의 아이디어를 제품 설계로 발전시키거나 코드 리뷰를 수행하는 작업은 standard 이상을 사용한다.
- 위험도 높은 판단, 복잡한 architecture, 중요한 trading 설명은 premium으로 escalation한다.
- 월 비용 soft limit 근처에서는 background 작업을 줄이고, interactive 작업도 economy/standard 우선으로 낮춘다.
- 단, trading의 주문 판단 수치 계산은 LLM이 아니라 deterministic code가 수행한다.

2026-06-21 기준 기본 모델 정책:

- OpenAI 기본 모델: `gpt-5.4`.
- OpenAI 고난도 reasoning/coding escalation: `gpt-5.5`.
- OpenAI 저비용/저지연 background: `gpt-5.4-mini`.
- Claude 기본 역할: Claude Sonnet 4.6.
- Claude 고난도 장기 coding/review 후보: Claude Opus 4.8 또는 Claude Fable 5.
- Claude 저비용/고속 후보: Claude Haiku 4.5.
- Gemini 기본 모델: `gemini-3.5-flash`.
- Gemini 저비용/대량 작업: `gemini-2.5-flash`.
- Gemini 최저비용 background: `gemini-2.5-flash-lite`.
- Gemini 복잡 reasoning/coding fallback: `gemini-2.5-pro`.

주의:

- OpenAI와 Gemini는 공식 문서에 확인된 model id를 초기 설정값으로 사용한다.
- Claude는 문서의 제품명/모델군을 기준으로 role을 고정하고, 실제 API model id는 setup wizard에서 Anthropic 공식 Models API 또는 최신 문서로 검증한 뒤 저장한다.
- Gemini는 production에서 stable model id와 `v1` API를 우선 사용한다. Preview/alias 모델은 명시적으로 opt-in한 경우에만 사용한다.

초기 routing 정책:

- general assistant: OpenAI `gpt-5.4`.
- software engineering: OpenAI `gpt-5.4`, 필요 시 `gpt-5.5` 또는 Claude Sonnet/Opus/Fable.
- code review: Claude Sonnet/Opus 또는 OpenAI `gpt-5.5`.
- long context reading: Gemini `gemini-3.5-flash` 또는 Claude.
- trading analysis: deterministic code 우선, LLM은 설명과 리포트에 사용.
- low-cost background summarization: OpenAI `gpt-5.4-mini`, Gemini `gemini-2.5-flash-lite`, Claude Haiku.
- fast Telegram response: OpenAI `gpt-5.4-mini` 또는 Gemini `gemini-2.5-flash`.

## Usage and Cost Tracking

모든 provider 호출은 usage log를 남긴다.

기록 항목:

- provider.
- model.
- auth mode.
- request category.
- input token.
- output token.
- cache token 또는 provider별 equivalent.
- estimated cost.
- latency.
- success/failure.

## Cost Defaults

초기 비용 기본값은 [18_RISK_AND_COST_DEFAULTS.md](18_RISK_AND_COST_DEFAULTS.md)를 따른다.

- 전체 LLM soft limit: 50 USD/month.
- 전체 LLM hard approval threshold: 100 USD/month.
- daily briefing budget: 1 USD/day soft limit.
- OpenAI/Claude/Gemini 예산 비율: 60%/25%/15%.

## Implementation Follow-ups

- OpenAI OAuth는 API key MVP 이후 연결 flow를 구현한다. API key mode가 먼저 동작해야 한다.
- Claude의 실제 API model id는 setup wizard에서 공식 Models API 또는 최신 문서로 검증한 뒤 저장한다.
- 이 항목들은 MVP scaffold와 Model Gateway interface 구현을 막지 않는다.
