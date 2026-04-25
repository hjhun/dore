# CEP-02: Memory And LLM Wiki

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore memory maintainers
Related: `01_system_architecture.md`, `05_scheduler_and_self_improvement.md`, `07_goal_management_and_reporting.md`

## 1. 요약

Dore는 장기 기억 아키텍처로 LLM Wiki 패턴을 사용합니다.

목표는 모든 것을 프롬프트에 싣거나 불투명한 retrieval 계층에 묻어 두는 것이 아닙니다. 목표는 LLM이 유지하는, 점검 가능하고 지속적인 markdown 기반 지식 베이스를 만들고, 이를 통해 사용자 컨텍스트를 durable page와 compact digest로 컴파일하는 것입니다.

이 CEP는 사용자 `llm_wiki.md` 문서를 Dore의 개인 비서 용도에 맞게 구체화하고, 이전에 분석한 Graphify의 그래프 기반 아이디어를 필요한 범위에서 채택합니다.

## 2. 설계 목표

- 중요한 사용자 지식을 장기간 보존한다.
- naive conversation replay보다 retrieval token cost를 명확히 낮춘다.
- 사용자가 durable knowledge를 직접 읽고 수정할 수 있게 한다.
- 모순, 열린 질문, 오래된 가정을 숨기지 않고 드러낸다.
- graph 계층은 선택적이며 보조적으로 유지한다.

## 3. 비목표

- vector search를 source of truth로 만드는 것
- embedding이나 chat log만으로 durable page를 대체하는 것
- retrieval 이득이 없는 작은 corpus에도 큰 graph를 생성하는 것
- provider 종속 저장소에 기억을 가두는 것

## 4. 기억 계층

### 4.1 `raw/`

불변 증거와 source 입력:

- memory 처리를 위해 승격된 대화 발췌
- 사용자 메모
- import 파일
- report
- clipped article
- schedule output
- 외부 연구 결과물

raw source는 append-only입니다. 이것은 증거이지, 최종 기억 요약이 아닙니다.

### 4.2 `wiki/`

Dore가 유지하는 지속 markdown 지식 베이스입니다.

사람이 읽을 수 있는 durable layer이며, primary compiled knowledge store입니다.

### 4.3 `digest/`

wiki에서 파생되는 compact machine-oriented summary:

- active user profile
- active project
- routine과 recurring obligation
- decision register
- open question
- recent changes

digest는 prompt cost를 줄이고 retrieval을 빠르게 하기 위해 존재합니다.

### 4.4 `graph/`

선택적인 파생 graph 아티팩트:

- navigation
- lint
- relationship exploration
- weak-link detection
- 필요할 때만 retrieval expansion

graph 아티팩트는 재생성 가능하며 source of truth가 아닙니다.

## 5. 지식 모델

### 5.1 Page Class

초기 wiki는 다음 page class를 지원해야 합니다.

- `person`
- `preference`
- `project`
- `goal`
- `routine`
- `decision`
- `tool`
- `provider`
- `report`
- `question`

### 5.2 Claim Model

지속 사실은 provenance와 status를 가진 claim으로 표현해야 합니다.

각 claim은 다음을 가져야 합니다.

- stable claim ID
- 하나 이상의 source
- confidence
- last reviewed timestamp
- `active`, `stale`, `contested`, `superseded` 같은 status

첫 마일스톤에서 별도 DB 테이블까지 꼭 필요하지는 않지만, 문서 규약 수준의 모델은 반드시 있어야 합니다.

### 5.3 Page Contract

권장 frontmatter:

```yaml
id: person.user
type: person
status: active
confidence: high
updated_at: 2026-04-19
source_count: 8
tags:
  - user
  - memory
```

권장 섹션:

- Summary
- Stable Facts
- Current State
- Preferences And Constraints
- Open Questions
- Recent Changes
- Sources
- Related Pages

## 6. 파일 구조

```text
memory/
  raw/
    conversations/
    notes/
    imports/
    reports/
  wiki/
    people/
    preferences/
    projects/
    goals/
    routines/
    decisions/
    tools/
    reports/
    questions/
    index.md
    log.md
  digest/
    user_profile.json
    active_context.json
    active_goals.json
    open_questions.json
    recent_changes.json
  graph/
    graph.json
    graph_report.md
```

## 7. Ingestion 흐름

1. source를 `raw/` 아래로 캡처하거나 승격한다.
2. source의 type, scope, 영향을 받는 page를 분류한다.
3. 생성 또는 갱신할 wiki page를 결정한다.
4. claim을 merge, revise, contested 처리한다.
5. `index.md`를 갱신한다.
6. `log.md`에 append 한다.
7. 영향받은 digest를 증분 rebuild 한다.
8. graph 아티팩트는 정책상 가치가 있을 때만 refresh 한다.

이 흐름은 지식이 매번 재발견되는 것이 아니라 누적되어야 한다는 LLM Wiki 원칙과 직접 연결됩니다.

## 8. Retrieval 흐름

Dore는 다음 순서로 기억을 가져와야 합니다.

1. 현재 작업에 필요한 digest slice만 로드한다
2. 더 자세한 정보가 필요하면 직접 연결된 고가치 wiki page를 로드한다
3. 여전히 애매하면 좁은 raw snippet만 로드한다
4. 직접 retrieval이 부족할 때만 graph neighbor를 consult 한다

이 순서는 필수입니다. graph expansion은 기본 경로가 아니라 escalation 경로입니다.

## 9. Token Budget 정책

memory retrieval은 명시적 budget 아래에서 동작해야 합니다.

- `budget.digest_default`
- `budget.page_expansion`
- `budget.raw_evidence_escalation`
- `budget.graph_expansion`

요청이 예산을 초과하면 런타임은:

- 더 강하게 압축하거나
- 작업을 단계로 분리하거나
- 내부적으로 질문을 더 좁히거나
- 저가치 context를 미뤄야 합니다

조용히 프롬프트를 비대하게 만들면 안 됩니다.

## 10. Compiled Digest

최소 digest 집합:

- `user_profile.json`
- `active_context.json`
- `active_goals.json`
- `current_preferences.json`
- `recent_decisions.json`
- `open_questions.json`
- `recent_changes.json`

digest compilation은 증분 방식이어야 합니다. 작은 source update가 전체 memory rebuild를 강제해서는 안 됩니다.

## 11. 인덱싱과 로깅

### 11.1 `index.md`

목적:

- stable navigation
- page discovery
- category browsing
- 저비용 retrieval routing

### 11.2 `log.md`

목적:

- chronological audit trail
- memory evolution timeline
- 나중에 debug할 때의 근거
- grep-friendly inspection

권장 prefix:

```text
## [2026-04-19] ingest | telegram-summary-2026-04-19
```

## 12. Lint와 Health Check

memory lint는 다음을 탐지해야 합니다.

- contradictory claim
- stale summary
- orphan page
- missing backlink
- 분리되어야 할 oversized page
- provenance 없는 claim
- 최근 검토가 없는 open question
- source page와 어긋난 digest

개인 비서의 기억 품질은 선택 사항이 아닙니다. 틀린 것을 자신 있게 기억하는 assistant는 적게 기억하는 assistant보다 더 위험합니다.

## 13. Graphify에서 채택할 부분

이전 Graphify 분석을 바탕으로 Dore는 다음을 채택해야 합니다.

### 13.1 Body-Based Cache Identity

가능하다면 frontmatter-only 변경보다 semantic body 변경을 중심으로 파생 cache identity를 계산합니다. rebuild churn을 줄이는 데 중요합니다.

### 13.2 Relative-Path Cache Key

파생 아티팩트의 cache key는 absolute path보다 stable relative path를 우선해야 합니다.

### 13.3 Corpus Gating

아주 작은 corpus에서는 기본적으로 graph generation을 비활성화합니다. page 수, link density, lint 가치가 충분할 때만 켭니다.

### 13.4 Token Benchmarking

Dore는 주기적으로 다음을 측정해야 합니다.

- naive retrieval token cost
- digest-first retrieval cost
- digest plus page expansion cost
- graph-expanded cost

최적화 경로가 충분히 유리하지 않다면 memory design이 흐트러지고 있는 것입니다.

## 14. 실패 모드

### 14.1 충돌하는 Claim

충돌을 하나의 조용한 summary로 덮어쓰지 않습니다. conflict를 표시하고 confidence를 낮춥니다.

### 14.2 Page 비대화

page 크기가 설정 한도를 넘으면 topic 또는 time horizon 기준으로 분리합니다.

### 14.3 Digest Drift

digest를 신뢰할 수 없으면 stale로 표시하고 사용 전에 rebuild 해야 합니다.

### 14.4 Raw Search 의존 증가

런타임이 반복적으로 raw search에 의존한다면 wiki 또는 digest 계층이 부족한 것이므로 repair가 필요합니다.

## 15. 보안과 소유권

- memory file의 소유자는 사용자입니다.
- Dore 없이도 memory artifact를 읽을 수 있어야 합니다.
- 민감한 secret은 wiki나 digest file에 쓰면 안 됩니다.
- report는 memory fact를 인용할 수 있지만 민감 원문을 불필요하게 복제하면 안 됩니다.

## 16. 테스트 요구사항

- page parsing, claim merge rule, digest compilation, lint rule에 대한 unit test
- source ingestion과 targeted page update에 대한 integration test
- digest-first retrieval에 대한 smoke test
- 사실을 학습하고 저장하고 나중에 다시 사용하고 수정하고 보고하는 e2e test

## 17. 수용 기준

다음이 만족되면 이 CEP를 수용합니다.

- durable user fact가 session을 넘어 유지된다
- token usage가 naive full-history replay보다 명확히 낮다
- memory change가 source, index, log를 통해 감사 가능하다
- contradiction이 계속 visible 하다
- graph layer는 정당화될 때만 retrieval 또는 lint에 기여한다

## 18. 열린 질문

- claim ID는 markdown inline으로 넣을 것인가, sidecar metadata file에 둘 것인가?
- Rust 사용성과 사람 읽기 편의성 측면에서 digest format은 JSON only가 좋은가, TOML 또는 mixed가 좋은가?
- 어떤 corpus 규모에서 graph generation을 기본 활성화할 것인가?
