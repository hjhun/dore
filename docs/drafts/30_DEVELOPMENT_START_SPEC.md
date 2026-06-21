# Development Start Spec

## 목적

이 문서는 Dore MVP를 바로 구현하기 위한 첫 개발 기준을 고정한다.

앞선 문서들이 제품과 정책을 정의했다면, 이 문서는 첫 scaffold와 첫 PR 단위를 정의한다.

## 기술 스택 결정

### Language

- TypeScript를 기본 언어로 사용한다.
- 이유: Electron, daemon API, shared contract, LLM adapter, Telegram bot을 같은 타입 시스템으로 묶기 쉽다.

### Package Manager

- `pnpm` workspace를 기본으로 사용한다.
- 이유: monorepo 의존성 관리가 단순하고, Electron/Node package 분리에 적합하다.

### Desktop

- Electron + React + Vite.
- Electron main/preload/renderer 경계를 분리한다.
- renderer는 직접 filesystem/secret에 접근하지 않고 preload API 또는 daemon API를 사용한다.

### Daemon

- Node.js TypeScript daemon.
- MVP transport는 localhost HTTP API로 시작한다.
- local auth token을 요구한다.
- 장기적으로 Windows service 또는 startup task로 등록할 수 있게 process lifecycle을 분리한다.

### API Framework

- Fastify를 1차 후보로 사용한다.
- 이유: TypeScript 친화적이고, schema 기반 route 작성이 쉽고, daemon API에 충분히 가볍다.

### Validation

- Zod를 runtime schema validation에 사용한다.
- runtime contract type과 config validation에 함께 사용한다.

### Storage

MVP 저장:

- Markdown: memory/wiki와 daily log.
- JSON: briefing dashboard payload.
- JSONL: append-only event/task/usage log.
- YAML: config.

MVP 이후:

- SQLite metadata index.
- BM25 또는 vector index.

### Telegram

- Telegram long polling으로 시작한다.
- webhook은 외부 서버가 필요하므로 MVP에서는 제외한다.

### Testing

- Vitest를 기본 unit/integration test runner로 사용한다.
- Electron UI smoke test는 Playwright를 후보로 둔다.
- trading risk rule은 unit test를 반드시 작성한다.

## Repo 구조

```text
dore/
  apps/
    daemon/
      src/
        main.ts
        api/
        scheduler/
        telegram/
    desktop/
      src/
        main/
        preload/
        renderer/
  packages/
    contracts/
      src/
        task.ts
        approval.ts
        briefing.ts
        llm.ts
        trading.ts
    config/
      src/
        load-config.ts
        schema.ts
    core/
      src/
        events/
        tasks/
        approvals/
        usage/
    model-gateway/
      src/
        gateway.ts
        providers/
    memory/
      src/
        bootstrap.ts
        index.ts
    trading/
      src/
        broker-capabilities.ts
        risk-manager.ts
        signals.ts
    engineering/
      src/
        intake.ts
        repo-inspector.ts
  configs/
    dore.config.example.yaml
  memory/
  docs/
    drafts/
  scripts/
  tests/
```

## 초기 명령

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm dev:daemon
pnpm dev:desktop
pnpm doctor
pnpm briefing:run
```

## 첫 Scaffold 작업

첫 구현은 아래 순서로 진행한다.

1. `pnpm` workspace 생성.
2. TypeScript base config 생성.
3. `packages/contracts`에 [28_RUNTIME_CONTRACTS.md](28_RUNTIME_CONTRACTS.md)의 Zod schema와 TypeScript type 작성.
4. `packages/config`에 [22_CONFIG_SCHEMA_DRAFT.md](22_CONFIG_SCHEMA_DRAFT.md)의 config schema 작성.
5. `packages/memory`에 memory directory bootstrap 작성.
6. `packages/core`에 event JSONL writer 작성.
7. `apps/daemon`에 `/status` API 작성.
8. `pnpm doctor` command 작성.

첫 scaffold 완료 기준:

- `pnpm build` 성공.
- `pnpm test` 성공.
- `pnpm doctor`가 config, memory, provider credential 상태를 출력.
- `pnpm dev:daemon` 실행 후 `/status` 응답.
- secret 값이 log/UI/console에 노출되지 않음.

## 첫 기능 작업

첫 기능은 Daily Briefing 수동 실행이다.

범위:

- 개인/task/approval/usage 상태 수집.
- repo 상태 수집.
- market/trading source는 placeholder와 freshness status만 구현.
- LLM 호출이 가능하면 summary 생성.
- LLM credential이 없으면 deterministic fallback briefing 생성.
- Markdown과 JSON 저장.

완료 기준:

- `pnpm briefing:run` 실행 시 `memory/logs/daily/YYYY-MM-DD.md` 생성.
- Dashboard용 `memory/logs/daily/YYYY-MM-DD.json` 생성.
- usage record 생성.
- source 실패가 있어도 partial briefing 생성.

## Model Routing 구현 기준

Model routing은 첫 Model Gateway 구현부터 포함한다.

입력:

- category.
- complexity.
- latency preference.
- cost preference.
- context size.
- provider availability.
- monthly budget state.

출력:

- selected provider.
- selected model.
- selection reason.
- expected cost tier.

기본 동작:

- 단순 상태 응답, 짧은 요약, Telegram 빠른 응답은 economy tier.
- 일반 비서 응답과 daily briefing 최종 정리는 standard tier.
- architecture, code review, 긴 context 분석은 premium tier.
- budget soft limit 근처에서는 background 작업을 연기하거나 economy로 낮춘다.
- trading 수치 계산은 Model Gateway를 통과하지 않고 deterministic trading module에서 처리한다.

테스트:

- 같은 OpenAI provider 안에서 `low` complexity는 경량 모델을 선택한다.
- 같은 OpenAI provider 안에서 `high` complexity는 고성능 모델을 선택한다.
- Gemini도 low/high routing이 분리된다.
- Claude는 setup에서 검증된 model id가 없으면 role 기반 unavailable 상태를 반환한다.

## 첫 PR 분할

### PR 1: Workspace and Contracts

- monorepo scaffold.
- contract schemas.
- config schema.
- basic tests.

### PR 2: Daemon Core

- config loader.
- memory bootstrap.
- event/task/usage log.
- `/status`.
- `doctor`.

### PR 3: Model Gateway MVP

- provider interface.
- OpenAI adapter.
- Claude/Gemini adapter skeleton.
- model routing.
- usage logging.

### PR 4: Daily Briefing MVP

- manual briefing pipeline.
- Markdown/JSON output.
- retry/failure handling.

### PR 5: Telegram MVP

- long polling.
- allowlist.
- `/status`, `/briefing`, `/usage`, `/stop`.

### PR 6: Electron Dashboard MVP

- Dashboard.
- Approvals panel.
- Logs view.
- Settings status.

### PR 7: Trading Watch MVP

- watchlist.
- broker capability registry.
- signal object.
- risk manager.
- dry-run journal.

## 개발 중단 조건

아래 중 하나라도 발생하면 구현을 멈추고 승인 또는 재설계를 요구한다.

- secret이 로그 또는 UI에 노출될 위험.
- 실제 주문 API 호출 가능성이 생김.
- provider 비용 추정 없이 대량 LLM 호출이 필요함.
- market/account 데이터 timestamp가 불명확함.
- Telegram allowlist가 비어 있는데 bot이 외부 메시지를 받음.
- Electron renderer가 직접 secret/filesystem에 접근하려 함.

