# Rust Agent Workflow Engine Milestone Roadmap

Status: Proposed
Created: 2026-04-25 23:51:54 UTC
Basis: `docs/designs/20260425_235154_agent_workflow_engine_roadmap_design_basis.md`

## 1. Roadmap Goal

Rust 기반 신규 AI Agent / Workflow Engine을 안전한 순서로 개발한다.
전체 기술 목록을 한 번에 구현하지 않고, design-only foundation에서
시작해 local runtime, tool/skill metadata, durable workflow, safety,
production hardening 순서로 확장한다.

초기 제품은 local CLI와 파일 기반 state를 사용하는 design-only workflow
engine이다. 사용자는 goal을 제공하고, runtime은 plan, design proposal,
approval request, run summary를 durable artifact로 남긴다.

## 2. Non-Goals

- Phase 0/1에서 source code 자동 수정 또는 shell/tool 실행을 구현하지 않는다.
- Phase 2 이전에 외부 skill 실행을 구현하지 않는다.
- Phase 3 이전에 complex DAG, distributed workflow, daemon scheduler를
  구현하지 않는다.
- Phase 4 이전에 sandbox를 완성하려 하지 않는다.
- Phase 5 이전에 production-ready release를 선언하지 않는다.
- Telegram, multi-agent/A2A, full provider OAuth, full personal memory
  automation은 이 roadmap의 초기 release gate에 포함하지 않는다.

## 3. Implementation Order

1. 기존 설계 문서와 prompt 요구사항을 정리하고 phase boundary를 확정한다.
2. Goal, plan, state, approval, report, checkpoint schema를 설계한다.
3. CLI UX 초안과 security/policy boundary 초안을 작성한다.
4. Rust CLI scaffold를 만들고 local file state를 읽고 쓰게 한다.
5. Design-only run loop, structured output validation, run summary,
   retry/resume 기본 구조를 구현한다.
6. Tool schema, registry, skill metadata, ClawHub parser, dry-run
   install/inspect를 구현한다.
7. Durable workflow state machine, checkpoint, queue, daemon scheduler,
   locking을 구현한다.
8. Policy engine, capability model, approval enforcement, audit log,
   prompt injection defense, sandbox strategy를 구현한다.
9. Memory/startup benchmark, observability, trace export, regression suite,
   ClawHub compatibility tests, packaging and release process를 완성한다.

## 4. Phase 0: Design-Only Foundation

### Goal

실행 코드보다 먼저 goal management, planning, state management, design
artifact management, approval, CLI UX, security model, ClawHub compatibility
scope를 설계한다. Phase 0의 산출물은 Phase 1 구현자가 바로 Rust schema와
CLI command로 옮길 수 있어야 한다.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P0.M1 Existing design analysis | 기존 CEP, prompt, prior roadmap 분석 문서 | 장기 설계와 초기 구현 범위의 충돌이 정리되어 있고 Phase 0-5 boundary가 명확함 |
| P0.M2 Goal management design | goal class, goal lifecycle, success criteria, report linkage schema | goal file에서 typed goal record로 변환 가능한 field set이 정의됨 |
| P0.M3 Planning design | task decomposition, step ordering, replan trigger, plan artifact schema | plan이 Markdown projection과 JSON source of truth를 모두 가짐 |
| P0.M4 State management design | `state.json`, checkpoint, run history, terminal/resumable state 정의 | 모든 state transition에 input, output, audit event, failure behavior가 있음 |
| P0.M5 Design artifact management | design proposal, ADR candidate, risk summary, review packet format | approved artifact와 operational draft의 저장 위치가 분리됨 |
| P0.M6 Human approval gate | approval request/record schema, approve/reject semantics | approval이 structured transition으로 표현되고 Markdown-only 승인은 금지됨 |
| P0.M7 CLI UX draft | `init`, `goal`, `run`, `status`, `review`, `approve`, `reject`, `resume` command draft | 정상 run, invalid output retry, approval pause, resume 예제가 있음 |
| P0.M8 Security model draft | threat model, capability class, deny/dry-run/approval/allow matrix | dangerous action은 기본적으로 blocked, dry-run, 또는 approval-required임 |
| P0.M9 ClawHub compatibility scope | metadata mapping, inspect, dry-run install, trust lifecycle | `discover != install != enable != trust != execute` 원칙이 문서화됨 |

### Test And Verification Plan

- schema example을 JSON round-trip 관점에서 검토한다.
- state transition table에서 invalid transition을 수동 검증한다.
- CLI UX 예제가 어떤 file artifact를 생성/수정하는지 table로 검토한다.
- policy matrix에서 file write, process spawn, network, env, secret,
  skill execution이 빠지지 않았는지 검토한다.

### Documentation Tasks

- roadmap design basis 문서 작성.
- artifact schema와 state machine 설계 문서 작성.
- CLI UX draft 작성.
- security model과 ClawHub compatibility scope 작성.
- canonical 설계가 안정화된 뒤 필요한 경우 Korean mirror 갱신.

### Risks And Dependencies

- Depends on: 기존 `docs/designs/*.md`, `docs/prompts/*.md`.
- Risk: 설계가 너무 추상적일 수 있음. Mitigation: 모든 schema를 Phase 1
  Rust struct, file path, CLI command와 연결한다.
- Risk: `.dev/` operational state와 `docs/` durable documentation이 혼동될
  수 있음. Mitigation: artifact promotion rule을 명시한다.

## 5. Phase 1: Minimal Local Agent Runtime

### Goal

파일 기반 state와 local CLI만으로 최소 design-only agent runtime을 만든다.
이 phase의 runtime은 goal file을 읽고, state를 load/save하며, design-only
run loop를 수행하고, structured output validation, run summary,
retry/resume 기본 구조를 제공한다.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P1.M1 Rust project scaffold | `Cargo.toml`, `src/`, `tests/`, formatter/linter config, root automation entry point | `cargo fmt`, `cargo clippy`, `cargo test`가 repo root에서 실행됨 |
| P1.M2 CLI foundation | `init`, `goal`, `run`, `status`, `review`, `resume` command | clean workspace에서 state root를 초기화하고 status를 출력함 |
| P1.M3 Goal file loading | `.dev/goal.md` 또는 `--goal-file` loading, typed goal normalization | invalid/missing goal은 typed error와 report를 남김 |
| P1.M4 State file load/save | `state.json`, checkpoints, run-history, reports atomic write | interruption 후 마지막 valid checkpoint에서 resume 가능 |
| P1.M5 Design-only run loop | context selection, prompt packet, mock provider seam, proposal generation | mock provider로 end-to-end design proposal과 review report 생성 |
| P1.M6 Structured output validation | versioned output model, semantic checks, validation errors | malformed output은 trusted state에 저장되지 않고 retry 또는 failure 처리됨 |
| P1.M7 Run summary generation | completed/blocked/failed/cancelled summary Markdown | 모든 terminal 또는 pause 상태가 user-readable report를 가짐 |
| P1.M8 Retry/resume basics | bounded retry, resumable states, `resume` command | retry limit 초과 시 failure artifact를 남기고 infinite retry가 없음 |

### Test And Verification Plan

- Unit tests: schema deserialize, state transition, validation error,
  retry limit, approval decision.
- Integration tests: `init`, `goal`, `run`, `status`, `review`, `resume`.
- Smoke test: mock provider를 사용한 complete design-only run.
- Recovery test: partial checkpoint와 interrupted write 복구.

### Documentation Tasks

- CLI command reference 작성.
- `.dev/` state layout과 file schema 문서화.
- mock provider와 structured output contract 문서화.
- 실제 `src/`, `tests/`, automation entry point가 생기면 `AGENTS.md` 갱신.

### Risks And Dependencies

- Depends on: Phase 0 schema, state machine, CLI UX draft.
- Risk: real provider integration이 MVP를 지연시킬 수 있음. Mitigation:
  mock provider를 먼저 ship하고 real provider는 별도 milestone로 둔다.
- Risk: file corruption. Mitigation: temp file + atomic rename,
  schema version check, recovery test.
- Risk: approval record가 Markdown 중심으로 흐를 수 있음. Mitigation:
  JSON approval record를 source of truth로 둔다.

## 6. Phase 2: Tool And Skill Foundation

### Goal

tool과 skill을 실행하지 않고도 안전하게 설명, 등록, 검사, dry-run할 수 있는
foundation을 만든다. ClawHub는 metadata parser와 inspect/dry-run install
범위로 제한한다.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P2.M1 Tool schema | tool descriptor, input/output schema, error model, capability declaration | tool definition이 실행 없이 validate됨 |
| P2.M2 Tool registry | local registry loader, duplicate detection, disabled/hidden state | CLI가 tool list와 unavailable reason을 설명함 |
| P2.M3 Tool execution policy draft | execution intent, dry-run, deny/approval/allow decision hook | 실제 executor 없이 policy decision을 기록할 수 있음 |
| P2.M4 Skill metadata model | skill ID, source, version, summary, requirements, trust state, capabilities | malformed metadata가 rejected되고 trusted metadata/body가 분리됨 |
| P2.M5 ClawHub metadata parser | registry response mapping, `SKILL.md` parser, raw cache | fixture 기반 ClawHub metadata variant를 parse함 |
| P2.M6 Dry-run inspect/install | temp extraction plan, checksum/path safety, planned lock changes | `install --dry-run`은 file plan/report만 만들고 skill을 활성화/실행하지 않음 |

### Test And Verification Plan

- Unit tests: tool schema, skill metadata, parser, lock/cache record,
  path safety.
- Integration tests: registry fixture load, inspect, dry-run install report.
- Security tests: path traversal, hostile `SKILL.md`, suspicious capability
  declaration.
- Smoke test: fixture registry에서 search/inspect/dry-run install 실행.

### Documentation Tasks

- tool schema reference 작성.
- skill metadata schema와 trust lifecycle 문서화.
- ClawHub metadata mapping과 fixture policy 문서화.
- dry-run install/inspect report format 문서화.

### Risks And Dependencies

- Depends on: Phase 1 CLI, artifact store, report generation, policy draft.
- Risk: ClawHub metadata shape 변경. Mitigation: raw response cache와 mapping
  adapter를 분리한다.
- Risk: skill instruction prompt injection. Mitigation: `SKILL.md` body는
  untrusted content로 유지하고 trusted metadata만 runtime state에 반영한다.

## 7. Phase 3: Durable Workflow Engine

### Goal

단일 local run loop를 durable workflow engine으로 확장한다. checkpoint,
resume, retry policy, queue, daemon scheduler, locking을 구현하되 complex
DAG는 아직 구현하지 않는다.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P3.M1 State machine | explicit transition engine, typed state, invalid transition errors | 모든 transition이 validator와 audit event를 통과함 |
| P3.M2 Checkpoint | checkpoint schema, append-only run history, partial result recovery | process interruption 후 last valid checkpoint에서 재개됨 |
| P3.M3 Resume | resumable state handling, resume command semantics | `waiting_approval`, `blocked`, `checkpointed` 상태에서 안전하게 재개됨 |
| P3.M4 Retry policy | retry class, backoff, max attempt, timeout, cancellation | retry가 무한 반복되지 않고 failure classification이 남음 |
| P3.M5 Queue | file-backed queue, enqueue/dequeue, duplicate prevention | queued work가 순서대로 처리되고 duplicate run이 차단됨 |
| P3.M6 Daemon scheduler | foreground daemon, interval/cron-like trigger, graceful shutdown | scheduled work가 job record와 report로 이어짐 |
| P3.M7 Locking | lock file, stale lock detection, heartbeat | concurrent CLI/daemon 실행이 state corruption을 만들지 않음 |

### Test And Verification Plan

- Unit tests: transition engine, retry/backoff, cancellation, lock expiry.
- Integration tests: enqueue/dequeue, checkpoint recovery, duplicate blocking,
  scheduled trigger.
- Smoke test: daemon start, one scheduled run, report write, graceful stop.
- Failure tests: stale lock, partial checkpoint, timeout, cancelled run.

### Documentation Tasks

- workflow transition table 문서화.
- checkpoint, queue, lock, heartbeat schema 문서화.
- daemon command UX와 scheduler config 문서화.
- DAG 제외 범위와 future extension path 문서화.

### Risks And Dependencies

- Depends on: Phase 1 state store, Phase 2 metadata foundation.
- Risk: DAG engine으로 범위가 커질 수 있음. Mitigation: linear workflow와
  queue를 먼저 안정화하고 DAG는 explicit non-goal로 유지한다.
- Risk: daemon cross-platform complexity. Mitigation: foreground daemon과
  file-backed primitives를 먼저 구현한다.

## 8. Phase 4: Safety And Sandboxing

### Goal

policy engine, capability model, approval gates, sandbox strategy, audit log,
prompt injection defense를 구현한다. 이 phase에서야 제한된 실행을 허용하되,
모든 실행은 policy boundary와 audit를 통과해야 한다.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P4.M1 Policy engine | policy parser, decision API, deny/dry-run/approval/allow outcome | tool/skill/action 실행 전 항상 policy decision이 필요함 |
| P4.M2 Capability model | file read/write, process spawn, network, env, secret, temp workspace, resource limit capability | capability가 least-privilege default로 선언됨 |
| P4.M3 Approval gates | sensitive transition과 capability grant approval enforcement | approval-required action은 approval record 없이 실행되지 않음 |
| P4.M4 Sandbox strategy | restricted runner design, temp workspace, env filtering, network default deny | sandbox guarantee와 non-guarantee가 문서와 test로 일치함 |
| P4.M5 Audit log | append-only event log, actor/action/capability/decision/artifact link | security-sensitive action이 secret 없이 추적 가능함 |
| P4.M6 Prompt injection defense | untrusted content marking, quarantine, redaction, tool result validation | untrusted skill/tool output이 trusted state로 자동 승격되지 않음 |
| P4.M7 Fixture execution pilot | reviewed local fixture skill/tool execution under policy | safe fixture는 실행되고 unsafe fixture는 blocked report를 남김 |

### Test And Verification Plan

- Unit tests: policy decision, capability matching, redaction,
  approval enforcement, audit event.
- Integration tests: restricted command runner, audit logging, approved and
  blocked execution.
- Security tests: prompt injection, path escape, env leak, secret redaction,
  network default deny.
- Smoke test: dry-run action, approved restricted execution, unapproved block.

### Documentation Tasks

- threat model과 trust boundary 문서화.
- policy file schema와 approval matrix 작성.
- audit log schema 작성.
- sandbox strategy와 guarantee/non-guarantee 작성.
- prompt injection handling과 untrusted content lifecycle 문서화.

### Risks And Dependencies

- Depends on: Phase 2 capability metadata, Phase 3 durable workflow and audit
  state.
- Risk: policy bypass. Mitigation: 모든 execution path를 하나의 executor
  boundary로 통합한다.
- Risk: sandbox 보장 과장. Mitigation: 구현 가능한 guarantee만 문서화하고
  test로 검증한다.
- Risk: secret leakage. Mitigation: secret reference type, redaction,
  trace/log tests를 둔다.

## 9. Phase 5: Performance And Production Hardening

### Goal

low-memory, fast-start Rust CLI 요구사항을 benchmark로 검증하고,
observability, trace export, regression test suite, ClawHub compatibility
tests, packaging and release를 완성한다.

### Milestones

| Milestone | Deliverables | Acceptance Criteria |
| --- | --- | --- |
| P5.M1 Memory benchmark | memory usage benchmark for startup, state load, catalog load, run loop | accepted baseline과 regression threshold가 기록됨 |
| P5.M2 Startup benchmark | cold/warm startup benchmark, command latency benchmark | fast-start target을 release gate로 검증함 |
| P5.M3 Observability | structured logs, run IDs, metrics, artifact links | 실패 run을 logs와 artifact만으로 진단 가능함 |
| P5.M4 Trace export | optional trace export for workflow, policy, tool/skill decisions | trace에 raw secret이나 unredacted sensitive content가 없음 |
| P5.M5 Regression test suite | design-only, resume, scheduler, policy, dry-run, sandbox fixture e2e tests | critical flow regression이 release를 차단함 |
| P5.M6 ClawHub compatibility tests | fixture registry, metadata variants, checksum/path safety, offline cache | compatibility fixtures가 stable하게 통과함 |
| P5.M7 Packaging and release | release profile, install script/package, shell completions, config templates, release notes | clean machine에서 install 후 CLI smoke test가 통과함 |

### Test And Verification Plan

- `cargo fmt`, `cargo clippy`, `cargo test` full run.
- integration, smoke, selected e2e tests를 clean temp workspace에서 실행.
- benchmark를 stored baseline과 비교.
- ClawHub fixture compatibility suite 실행.
- packaged artifact로 clean install rehearsal 수행.

### Documentation Tasks

- user guide와 quickstart 작성.
- CLI, config, policy, artifact schema reference 작성.
- troubleshooting guide 작성.
- benchmark baseline과 regression policy 문서화.
- release notes, migration notes, known limitations, rollback guide 작성.

### Risks And Dependencies

- Depends on: Phase 1-4 feature completion.
- Risk: benchmark target이 모호할 수 있음. Mitigation: Phase 5 초기에
  baseline을 측정하고 numeric threshold를 release checklist에 고정한다.
- Risk: observability가 sensitive content를 노출할 수 있음. Mitigation:
  metadata 중심 logging, redaction, trace export tests를 필수화한다.

## 10. Cross-Phase Dependency Map

| Capability | Designed | First Implemented | Hardened |
| --- | --- | --- | --- |
| Goal management | Phase 0 | Phase 1 | Phase 3 |
| Planning | Phase 0 | Phase 1 | Phase 5 |
| File-based state | Phase 0 | Phase 1 | Phase 3 |
| Design artifact management | Phase 0 | Phase 1 | Phase 5 |
| Human approval gate | Phase 0 | Phase 1 | Phase 4 |
| CLI UX | Phase 0 | Phase 1 | Phase 5 |
| Security model | Phase 0 | Phase 4 | Phase 5 |
| Tool schema/registry | Phase 2 | Phase 2 | Phase 4 |
| Skill metadata | Phase 2 | Phase 2 | Phase 5 |
| ClawHub inspect/dry-run | Phase 0 | Phase 2 | Phase 5 |
| Durable workflow | Phase 0 | Phase 3 | Phase 5 |
| Scheduler/locking | Phase 3 | Phase 3 | Phase 5 |
| Sandbox | Phase 0 | Phase 4 | Phase 5 |
| Complex DAG | Post-Phase 5 | Post-Phase 5 | Future |
| External skill execution | Phase 4 | Phase 4 | Phase 5 |

## 11. Release Readiness Checklist

- Existing design analysis has been completed and linked from the roadmap.
- Phase 0 schemas and phase boundaries are reviewed.
- Phase 1 CLI runs in a clean local repository with file-based state only.
- Goal file loading and state file load/save are covered by tests.
- Design-only run loop writes proposal, review packet, approval request, and
  run summary artifacts.
- Structured output validation rejects malformed output and uses bounded retry.
- Resume works from approved, blocked, checkpointed, and interrupted states.
- Tool and skill metadata cannot execute before policy approval.
- ClawHub dry-run install/inspect cannot activate downloaded content.
- Durable workflow prevents duplicate execution through queue and locking.
- Scheduler creates auditable job records and reports.
- Policy engine is the mandatory boundary for all tool/skill execution.
- Approval-required actions cannot execute without structured approval records.
- Audit log records policy, approval, execution, failure, and security events.
- Prompt injection defense marks and quarantines untrusted content.
- Sandbox strategy guarantees and limitations are documented and tested.
- Secrets are redacted from prompts, logs, reports, traces, and audit records.
- Unit, integration, smoke, and selected e2e tests pass.
- Memory and startup benchmark baselines are recorded and checked.
- ClawHub compatibility fixtures pass.
- Packaging is verified on a clean environment.
- Release notes include known limitations, migration notes, rollback guidance,
  and deferred work.

## 12. Deferred Work

- Telegram adapter over the workflow/session core.
- Full OpenAI OAuth and multi-provider routing.
- Personal memory ingestion and LLM Wiki automation.
- External coding worker adapters and multi-agent delegation.
- Peer Dore coordination and A2A-compatible envelopes.
- Complex DAG workflow execution.
- Stronger OS-level sandboxing, signed skill provenance, publisher trust, and
  remote policy distribution.
