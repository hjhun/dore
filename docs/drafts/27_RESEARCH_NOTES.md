# Research Notes

## 목적

이 문서는 Dore 설계 문서에 반영한 외부 공식 자료 확인 내용을 기록한다.

확인일: 2026-06-21.

## LLM Provider Notes

### OpenAI

공식 모델 문서 기준:

- 복잡한 reasoning, coding, agentic 작업은 GPT-5.5 계열을 우선 검토한다.
- 비용과 지연 시간이 더 중요한 작업은 GPT-5.4 mini 또는 nano 계열을 고려한다.
- Dore 초기 기본값은 균형형 `gpt-5.4`로 두고, 고난도 작업은 `gpt-5.5`, 저비용/저지연 작업은 `gpt-5.4-mini`로 routing한다.

설계 반영:

- 기본 provider: OpenAI.
- 기본 모델: `gpt-5.4`.
- escalation 모델: `gpt-5.5`.
- background/Telegram fast response 모델: `gpt-5.4-mini`.

출처:

- https://developers.openai.com/api/docs/models

### Claude

공식 모델 선택 문서 기준:

- 모델 선택은 capability, speed, cost, effort 기준으로 결정한다.
- 고속/저비용 작업은 Claude Haiku 4.5 계열을 고려한다.
- 복잡한 task는 가장 강한 모델에서 시작한 뒤 cost/latency를 최적화하는 접근이 권장된다.
- 문서상 Claude Sonnet 4.6은 coding, agent, enterprise 작업의 기본 후보로 적합하다.
- Claude Opus 4.8 또는 Claude Fable 5는 장기 coding, 깊은 reasoning, 높은 자율성이 필요한 작업의 escalation 후보로 둔다.

설계 반영:

- Dore의 Claude 기본 role: Claude Sonnet 4.6.
- 고난도 review/coding 후보: Claude Opus 4.8 또는 Claude Fable 5.
- 저비용 후보: Claude Haiku 4.5.
- 실제 API model id는 setup wizard에서 공식 Models API 또는 최신 문서로 검증한다.

출처:

- https://docs.anthropic.com/en/docs/about-claude/models/choosing-a-model

### Gemini

공식 모델 문서와 API version 문서 기준:

- production에서는 stable model id와 `v1` API 사용을 우선한다.
- `gemini-3.5-flash`는 stable model로 안내되어 있으며, agentic/coding 작업의 기본 후보로 적합하다.
- `gemini-2.5-flash`는 저지연/고처리량 price-performance 후보로 적합하다.
- `gemini-2.5-flash-lite`는 가장 빠르고 비용 효율적인 background 후보로 적합하다.
- `gemini-2.5-pro`는 깊은 reasoning/coding fallback 후보로 둔다.
- Preview 모델과 latest alias는 명시적 opt-in 없이 production 기본값으로 사용하지 않는다.

설계 반영:

- Gemini API version: `v1`.
- 기본 모델: `gemini-3.5-flash`.
- 저비용 모델: `gemini-2.5-flash`.
- 최저비용 background 모델: `gemini-2.5-flash-lite`.
- 복잡 reasoning fallback: `gemini-2.5-pro`.

출처:

- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/api-versions

## Broker Notes

### 토스증권

공식 Open API 페이지가 확인된다.

설계 반영:

- 1차 broker connector 후보로 둔다.
- 국내/해외주식 주문, 계좌 조회, 잔고/주문 가능 금액, 체결 조회 범위를 공식 문서와 약관으로 재확인한다.
- sandbox 또는 paper trading 지원 여부가 확인되기 전에는 실제 주문을 막는다.

출처:

- https://corp.tossinvest.com/ko/open-api

### 신한증권

신한 Open API 포털이 확인된다.

설계 반영:

- 2차 broker connector 후보로 둔다.
- 계좌/시세/주문 API 범위, 신청 방식, Windows 의존성, sandbox 여부를 재확인한다.

출처:

- https://openapi.shinhan.com/

### 삼성증권

공식적으로 HTS/DTS/Web trading 관련 자료는 확인되지만, Dore가 직접 사용할 개인용 주문 Open API 근거는 아직 확인하지 못했다.

설계 반영:

- MVP에서는 자동 주문 connector 대상에서 제외한다.
- 보유 계좌 리포트, 수동 참고, 사용자가 직접 확인하는 자료 정도로 제한한다.
- GUI/RPA 주문 자동화는 기본 금지한다.

출처:

- https://www.samsungpop.com/
