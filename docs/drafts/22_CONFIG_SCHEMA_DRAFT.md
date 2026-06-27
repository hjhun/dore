# Config Schema Draft

## 목적

Dore의 초기 설정 파일 구조를 정의한다.

실제 구현에서는 YAML 또는 TOML 중 하나를 선택한다. 초안은 YAML로 작성한다.

## 예시

```yaml
app:
  name: Dore
  timezone: Asia/Seoul
  locale: ko-KR

runtime:
  mode: local
  daemon:
    enabled: true
    startup: windows_startup
  logs:
    retention_days: 365
    raw_tool_output_retention_days: 30

llm:
  default_provider: openai
  default_model: gpt-5.4
  routing_mode: manual_first
  cost:
    monthly_soft_limit_usd: 50
    monthly_hard_approval_usd: 100
    background_soft_limit_usd: 15
    daily_briefing_soft_limit_usd: 1
    provider_budget_ratio:
      openai: 0.60
      claude: 0.25
      gemini: 0.15
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
      task_model_roles:
        high_reasoning: Claude Opus 4.8
        maximum_reasoning: Claude Fable 5
        low_cost: Claude Haiku 4.5
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

telegram:
  enabled: true
  mode: long_polling
  bot_token_env: TELEGRAM_BOT_TOKEN
  allowed_user_ids: []
  notify:
    daily_briefing: true
    approvals: true
    trading_risk: true
    job_failures: true

desktop:
  enabled: true
  framework: electron
  first_screen: dashboard
  approvals:
    critical_requires_desktop: true

memory:
  root: memory
  raw_dir: memory/raw
  wiki_dir: memory/wiki
  operations_dir: memory/operations
  logs_dir: memory/logs
  obsidian_compatible: true
  sensitive_storage: encrypted_or_secret_store
  auto_save_general_memory: true
  require_approval_for_sensitive_memory: true

daily_briefing:
  enabled: true
  time: "06:00"
  timezone: Asia/Seoul
  retry_times:
    - "06:10"
    - "06:30"
  telegram_summary: true
  dashboard_detail: true
  save_to_memory: true
  token_mode: efficient

trading:
  enabled: true
  real_trading_enabled: false
  markets:
    korea: true
    us: true
  instruments:
    stocks: true
    etf: true
    leverage: false
    short_selling: false
    derivatives: false
    margin: false
  brokers:
    toss:
      enabled: true
      priority: 1
      mode: candidate
    shinhan:
      enabled: true
      priority: 2
      mode: candidate
    samsung:
      enabled: true
      priority: 3
      mode: read_only_manual_reference
  risk:
    real_trading_requires_approval: true
    dry_run_days_before_real_trading: 30
    max_order:
      nav_percent: 1
      absolute_krw_equivalent: 100000
    max_daily_new_buy:
      nav_percent: 3
      absolute_krw_equivalent: 300000
    max_daily_loss:
      nav_percent: 1
      absolute_krw_equivalent: 100000
    max_position_percent: 10
    max_first_entry_percent: 2
    min_cash_percent: 20
    kill_switch: true
```

## Secret 처리

설정 파일에는 secret 값을 직접 저장하지 않는다.

허용:

- `OPENAI_API_KEY`.
- `OPENAI_AUTH_MODE=workload_identity` can switch OpenAI provider readiness
  checks to official workload identity federation inputs.
- `OPENAI_WIF_SUBJECT_TOKEN`, `OPENAI_WIF_IDENTITY_PROVIDER_ID`, and
  `OPENAI_WIF_SERVICE_ACCOUNT_ID` are used only for official OpenAI workload
  identity federation token exchange. Browser OAuth sessions are not treated as
  OpenAI API credentials.
- `ANTHROPIC_API_KEY`.
- `GEMINI_API_KEY`.
- `TELEGRAM_BOT_TOKEN`.

금지:

- 실제 API key 값.
- OAuth access token.
- broker secret.
- 계좌 비밀번호.

## 구현 원칙

- 기본 모델값은 2026-06-21 공식 문서 기준 초안이다.
- OpenAI/Gemini는 확인된 stable model id를 우선 사용한다.
- Claude는 role 이름을 먼저 저장하고, 실제 API model id는 setup wizard에서 공식 Models API 또는 최신 문서로 검증한다.
- `allowed_user_ids`가 비어 있으면 Telegram bot은 시작하지 않거나 setup wizard를 요구한다.
- `real_trading_enabled: false`가 기본이다.
- broker `mode: candidate`는 공식 API 문서 확인 전 real execution을 막는다.
