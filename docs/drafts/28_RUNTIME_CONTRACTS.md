# Runtime Contracts

## 목적

이 문서는 Dore MVP 구현 시 daemon, Electron app, Telegram bot, scheduler, memory, LLM gateway, trading watch가 공유해야 하는 핵심 데이터 계약을 정의한다.

목표는 첫 구현에서 과한 추상화를 만들지 않으면서도, 기능들이 임의 payload에 묶이지 않게 하는 것이다.

## Contract 원칙

- 모든 객체는 `id`, `created_at`, `updated_at`을 가진다.
- 시간은 저장 시 ISO-8601과 timezone을 명시한다.
- 사용자가 보는 메시지와 내부 판단 근거를 분리한다.
- 위험 작업은 항상 `risk_level`과 `approval_state`를 가진다.
- 외부 API 응답 원문은 필요한 경우 `memory/raw` 또는 log에 저장하고, runtime 객체에는 정규화된 값만 둔다.
- secret 값은 contract payload에 들어가지 않는다. 필요한 경우 `secret_ref`만 저장한다.

## Risk Level

```yaml
risk_level: read | write | execute | trade | critical
```

- `read`: 조회만 수행.
- `write`: 파일, memory, 설정, task를 변경.
- `execute`: 코드, 명령, 외부 mutation을 실행.
- `trade`: 주문 생성, 정정, 취소, 청산.
- `critical`: 되돌리기 어렵거나 큰 비용/손실/노출 가능성이 있는 작업.

## Approval State

```yaml
approval_state: not_required | pending | approved | rejected | expired | cancelled
```

정책:

- MVP에서 실제 주문은 항상 `pending` 이상을 요구한다.
- `critical` 작업은 Electron Approvals 화면에서 승인한다.
- Telegram 승인은 알림과 간단한 low-risk 승인에만 사용하고, trade/critical은 데스크톱 확인을 우선한다.

## Agent Task

사용자 요청, scheduled job, 내부 자동 작업은 모두 task로 표현한다.

```yaml
id: task_20260621_000001
type: user_request | scheduled_job | internal_maintenance | approval_followup
title: string
status: queued | running | waiting_approval | completed | failed | cancelled
priority: low | normal | high | urgent
created_at: ISO-8601
updated_at: ISO-8601
requested_by: user | scheduler | dore
source_channel: desktop | telegram | cli | scheduler
risk_level: read | write | execute | trade | critical
approval_state: not_required | pending | approved | rejected | expired | cancelled
inputs_ref: optional path or object id
outputs_ref: optional path or object id
error:
  code: optional string
  message: optional string
```

완료 조건:

- 모든 실행 작업은 task record를 남긴다.
- 실패 task는 원인과 재시도 가능 여부를 남긴다.
- 장시간 작업은 Dashboard와 Telegram `/status`에 표시된다.

## Approval Request

```yaml
id: approval_20260621_000001
task_id: task_20260621_000001
title: string
summary_for_user: string
risk_level: write | execute | trade | critical
requested_action:
  kind: file_write | command_execute | external_send | broker_order | config_change
  target: string
  dry_run_available: true
  reversible: true
created_at: ISO-8601
expires_at: ISO-8601
state: pending | approved | rejected | expired | cancelled
decision:
  decided_at: optional ISO-8601
  decided_by: optional user
  reason: optional string
audit_refs: []
```

UI 요구사항:

- 사용자가 승인 전에 변경 대상, 예상 결과, 되돌릴 수 있는지, 위험도를 볼 수 있어야 한다.
- 승인 후 실행 결과가 같은 approval record 또는 연결된 task log에 남아야 한다.

## Model Selection Request

같은 provider 안에서도 task 난이도와 비용 목표에 따라 다른 모델을 선택한다.

```yaml
id: model_request_20260621_000001
task_id: task_20260621_000001
category: assistant | engineering | review | briefing | trading_report | background
complexity: low | medium | high | critical
latency_preference: low_latency | balanced | quality_first
cost_preference: cheapest | balanced | quality_first
context_size: small | medium | large
requires_tools: true
requires_json: true
preferred_provider: openai | claude | gemini | auto
selected_provider: openai | claude | gemini
selected_model: string
selection_reason: string
```

기본 routing:

- `low + cheapest`: 각 provider의 경량 모델을 우선한다.
- `medium + balanced`: 기본 모델을 사용한다.
- `high/critical + quality_first`: 같은 provider의 고성능 모델 또는 다른 provider의 강한 모델로 escalation한다.
- trading 수치 계산은 LLM이 아니라 deterministic code를 사용하고, LLM은 설명과 리포트에만 사용한다.

## LLM Usage Record

```yaml
id: usage_20260621_000001
task_id: optional task id
provider: openai | claude | gemini
model: string
auth_mode: api_key | workload_identity
category: assistant | engineering | review | briefing | trading_report | background
started_at: ISO-8601
ended_at: ISO-8601
input_tokens: number
output_tokens: number
cache_tokens: number
estimated_cost_usd: number
latency_ms: number
status: success | failed | cancelled
error_code: optional string
```

비용 정책:

- 월 soft limit 초과 시 Dashboard와 Telegram에 경고한다.
- hard approval threshold 초과 예상 시 새 LLM 작업은 approval을 요구한다.
- background 작업은 저비용 모델 routing을 우선한다.

## Daily Briefing

```yaml
id: briefing_YYYY_MM_DD
date: YYYY-MM-DD
timezone: Asia/Seoul
status: generated | partial | failed
generated_at: ISO-8601
telegram_summary: string
dashboard_sections:
  personal:
    top_items: []
  engineering:
    project_status: []
    suggested_next_actions: []
  korea_market:
    summary: string
    watch_items: []
  us_market:
    summary: string
    watch_items: []
  trading:
    signals: []
    blocked_actions: []
  agent_ops:
    pending_approvals: []
    failed_jobs: []
    usage_summary: {}
source_refs: []
usage:
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  estimated_cost_usd: number
```

저장 위치:

- Dashboard JSON: `memory/logs/daily/YYYY-MM-DD.json`.
- 사람이 읽는 Markdown: `memory/logs/daily/YYYY-MM-DD.md`.

## Memory Record

```yaml
id: memory_20260621_000001
kind: profile | project | decision | topic | routine | trading | engineering | daily_log
title: string
path: memory/wiki/... or memory/logs/...
status: active | draft | superseded | archived
sensitivity: public | personal | sensitive | secret_ref
source_refs: []
created_at: ISO-8601
updated_at: ISO-8601
owner: user | dore
```

규칙:

- 원본은 `memory/raw`, 정리본은 `memory/wiki`, 실행 기록은 `memory/logs`에 둔다.
- 민감 정보는 저장 전 approval을 요구한다.
- secret 원문은 절대 저장하지 않는다.

## Trading Signal

```yaml
signal_id: signal_20260621_000001
created_at: ISO-8601
market: korea | us
symbol: string
strategy_id: string
direction: buy | sell | hold | reduce | watch
confidence: low | medium | high
reason: string
data_timestamp: ISO-8601
source_refs: []
risk_check:
  status: pass | fail | blocked | not_applicable
  reasons: []
recommended_action: string
execution_mode: watch | dry_run | paper | real
expires_at: ISO-8601
```

MVP 정책:

- `execution_mode: real`은 config에서 `real_trading_enabled: true`이고, broker API/약관/risk/approval 조건이 모두 충족될 때만 가능하다.
- MVP 기본값에서는 `watch` 또는 `dry_run`만 생성한다.

## Broker Capability

```yaml
broker: toss | shinhan | samsung
status: unavailable | candidate | read_only | paper_supported | real_supported
markets:
  korea: true
  us: true
capabilities:
  market_data: unknown | supported | unsupported
  account_read: unknown | supported | unsupported
  order_create: unknown | supported | unsupported
  order_cancel: unknown | supported | unsupported
  paper_trading: unknown | supported | unsupported
verified_at: optional ISO-8601
source_refs: []
notes: string
```

초기값:

- Toss: `candidate`.
- Shinhan: `candidate`.
- Samsung: `read_only`.

## Event Log

모든 주요 상태 변화는 append-only event로 남긴다.

```yaml
id: event_20260621_000001
time: ISO-8601
actor: user | dore | scheduler | system
event_type: task_started | task_completed | approval_requested | approval_decided | briefing_generated | signal_created | risk_blocked | usage_recorded
entity_type: task | approval | briefing | signal | usage | memory
entity_id: string
summary: string
risk_level: read | write | execute | trade | critical
refs: []
```

MVP 저장:

- SQLite를 쓰기 전까지는 JSONL append log를 허용한다.
- 이후 SQLite metadata index를 붙여도 event contract는 유지한다.

## Daemon API 초안

Electron, Telegram, CLI는 daemon API를 통해 같은 상태를 읽는다.

필수 endpoint 또는 command:

- `GET /status`
- `GET /tasks`
- `GET /tasks/:id`
- `POST /tasks`
- `POST /tasks/:id/cancel`
- `GET /approvals`
- `POST /approvals/:id/approve`
- `POST /approvals/:id/reject`
- `GET /briefings/latest`
- `POST /briefings/run`
- `GET /usage/summary`
- `GET /trading/status`
- `GET /memory/index`

초기 구현은 HTTP localhost API, Unix/Windows local socket, 또는 IPC 중 하나를 선택할 수 있다. Electron 연동을 고려하면 MVP에서는 localhost HTTP API와 token-based local auth가 가장 단순하다.
