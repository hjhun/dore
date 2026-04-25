# CEP-09: ClawHub Skill Integration

Status: Proposed
Last Updated: 2026-04-20
Owners: Dore skill runtime maintainers
Related: `01_system_architecture.md`, `04_telegram_and_session_runtime.md`, `06_quality_and_test_strategy.md`

## 1. 요약

Dore는 ClawHub 기반 skill을 직접 설치할 수 있어야 하며, 사용자는 필요한 skill을 내려받아 곧바로 Dore에서 사용할 수 있어야 합니다.

이 CEP는 OpenClaw의 검증된 구조를 Dore에 맞게 가져옵니다.

- ClawHub에서 skill search/install/update
- active workspace에 설치
- 나중 update를 위한 origin과 version metadata 유지
- activation 전 security scan과 readiness check 수행
- 승인된 skill만 active session에 노출

목표는 OpenClaw 구현을 그대로 복사하는 것이 아니라, registry access, installation, trust evaluation, runtime visibility를 분리된 단계로 설계하는 것입니다.

## 2. 배경

사용자는 Dore 사용자가 ClawHub에서 skill을 받아 곧바로 사용할 수 있기를 원합니다. OpenClaw는 이미 다음과 같은 실용적인 형태를 보여주고 있습니다.

- ClawHub 대상 `skills search/install/update`
- workspace-local `skills/` 설치
- update를 위한 per-skill origin metadata
- 설치 버전을 추적하는 lockfile 유사 구조
- security scanning과 readiness check
- visible skill set이 바뀌면 snapshot invalidation 수행

Dore도 같은 제품 속성을 가져야 하지만, 런타임은 작고 명시적으로 유지해야 합니다.

## 3. 목표

- ClawHub 대상 search, install, update, list, info 흐름을 지원한다.
- 사용자가 수동 파일 복사 없이 skill을 설치하고 Dore에서 사용할 수 있게 한다.
- 설치된 skill 상태를 origin과 lock metadata로 감사 가능하게 유지한다.
- skill이 active 되기 전에 security와 readiness check를 적용한다.
- registry refresh 또는 snapshot invalidation으로 설치 직후 사용 가능하게 한다.

## 4. 비목표

- 첫 마일스톤에서 모든 remote skill registry를 지원하는 것
- 내려받은 모든 skill을 무조건 자동 활성화하는 것
- 다운로드한 skill이 Dore trust policy를 우회하도록 허용하는 것
- registry download 코드를 Telegram이나 session logic에 섞는 것

## 5. 핵심 결정

### AD-1: ClawHub를 첫 번째 remote skill source로 채택한다

Dore는 설치 가능한 skill의 첫 remote registry로 ClawHub를 사용합니다.

### AD-2: Skill은 active Dore workspace에 설치한다

설치된 skill은 application binary나 memory store가 아니라 workspace-local `skills/` 아래에 설치해야 합니다.

### AD-3: Installation과 activation은 분리한다

skill을 다운로드했다고 해서 자동으로 모든 run에 노출되면 안 됩니다. trust와 readiness check를 통과해야 활성화됩니다.

### AD-4: Skill visibility는 snapshot 기반으로 관리한다

active session은 안정된 skill snapshot을 사용해야 합니다. skill inventory가 바뀌면 snapshot을 무효화해서 이후 turn이 결정론적으로 새 목록을 반영하도록 합니다.

## 6. Skill Runtime 모델

`skill` subsystem이 담당해야 할 것:

- local skill discovery
- ClawHub registry client
- download/extract pipeline
- origin metadata
- lockfile tracking
- readiness check
- security scan
- activation policy
- visible-skill snapshot build

`session` subsystem은 현재 run에 대해 visible skill set만 요청해야 합니다.

## 7. 디렉토리와 메타데이터 구조

권장 workspace 구조:

```text
workspace/
  skills/
    <skill-slug>/
      SKILL.md
      ...
      .clawhub/
        origin.json
  .clawhub/
    lock.json
```

권장 `origin.json` 필드:

- version
- registry
- slug
- installed_version
- installed_at

권장 `lock.json` 필드:

- version
- installed skill map
- per-skill installed version
- installed timestamp

이는 OpenClaw의 검증된 구조와 매우 가깝고, update를 결정론적으로 유지하는 데 도움이 됩니다.

## 8. Skill 생명주기

### 8.1 Search

Dore는 다음 형태의 ClawHub 검색을 지원해야 합니다.

- keyword query
- 추후 tag 검색
- query가 없을 때 기본 browse feed

### 8.2 Install

설치 흐름:

1. ClawHub에서 요청한 skill과 version을 resolve 한다
2. archive를 다운로드한다
3. 임시 safe directory에 extract 한다
4. `SKILL.md` 같은 필수 root file을 검증한다
5. path safety check를 수행한다
6. security와 readiness check를 수행한다
7. `workspace/skills/<slug>` 로 복사한다
8. `.clawhub/origin.json` 을 기록한다
9. workspace `.clawhub/lock.json` 을 갱신한다
10. skill snapshot을 무효화한다
11. 설치 결과를 사용자에게 보고한다

### 8.3 Update

update 흐름은 origin과 lock metadata를 이용해 다음을 판단해야 합니다.

- 해당 skill이 ClawHub 출신인지
- 현재 설치 버전이 무엇인지
- 최신 버전이 무엇인지

### 8.4 Remove Or Disable

remove와 disable은 분리해야 합니다.

- disable은 file은 남기되 새 run에서 skill을 숨긴다
- remove는 skill directory를 삭제하고 metadata를 갱신한다

## 9. Trust와 Security 정책

ClawHub는 public registry입니다. public이라는 말은 trusted를 뜻하지 않습니다.

activation 전에 Dore는 다음을 평가해야 합니다.

- archive path safety
- 예상 root file 존재 여부
- 필요 시 banned file pattern
- security scan finding
- declared dependency 또는 environment requirement
- local policy allowlist/denylist

skill scan severity:

- `info`
- `warn`
- `critical`

activation policy:

- `critical` finding은 activation 차단
- `warn` finding은 사용자 승인 필요 가능
- `info` finding은 기록만 수행

## 10. Readiness Check

skill은 안전하지만 ready하지 않을 수 있습니다.

readiness check는 다음을 검증해야 합니다.

- required binary
- required environment variable
- required local file 또는 credential
- 필요한 경우 platform compatibility

이렇게 해야 "설치는 됐지만 실제로는 못 쓰는 skill"이 런타임에서 조용히 실패하지 않습니다.

## 11. Runtime Visibility

session runtime이 매 turn마다 filesystem을 다시 스캔하면 안 됩니다.

대신 Dore는 다음을 포함한 visible-skill snapshot을 생성해야 합니다.

- skill ID
- summary
- resolved path
- source type: bundled, local, ClawHub
- readiness status
- trust status
- 필요 시 command exposure

install, update, disable, remove가 발생하면 snapshot version을 증가시켜 이후 turn이 결정론적으로 새 목록을 반영하도록 해야 합니다.

## 12. Telegram과 UX 표면

Telegram 채널은 제한된 skill 관리 표면을 제공해야 합니다.

- `/skills` for list and status
- `/skills search <query>`
- `/skills install <slug>`
- `/skills update <slug|all>`
- `/skills enable <slug>`
- `/skills disable <slug>`
- `/skills info <slug>`

초기 UX는 여러 native command 대신 하나의 `/skills` command family로 라우팅해도 충분합니다.

설치 응답은 다음을 알려줘야 합니다.

- 무엇이 설치되었는지
- source와 version
- 지금 active 한지 여부
- 아직 무엇이 부족한지

## 13. 설치 직후 Session 동작

"설치 후 바로 사용" 요구사항을 만족하려면:

- 성공적인 install 후 현재 long-running session의 skill snapshot을 무효화한다
- 다음 turn에서 새 visible skill set을 resolve 한다
- dependency가 부족하면 설치는 유지하되 active 상태로 만들지 않는다

Dore는 partial activation ambiguity를 피해야 합니다.

## 14. 실패 모드

예상 실패:

- skill not found
- version not found
- download failure
- archive extraction failure
- unsafe path 또는 archive layout
- missing `SKILL.md`
- critical security finding
- missing runtime dependency
- policy rejection

이 모든 경우는 짧은 Telegram report와 durable install record를 남겨야 합니다.

## 15. 향후 확장

이 설계는 다음을 수용할 수 있어야 합니다.

- additional registry
- signed skill bundle
- publisher verification level
- community trust score
- per-agent skill allowlist
- channel 표면에 노출되는 native skill command

ClawHub는 첫 번째 source이지, 영원히 유일한 source는 아닙니다.

## 16. 테스트 요구사항

- origin metadata, lockfile update, activation policy에 대한 unit test
- search/install/update/remove flow에 대한 integration test
- install 이후 snapshot invalidation에 대한 integration test
- 안전한 skill을 설치하고 다음 turn에서 사용하는 smoke test
- ClawHub skill이 검색되고 설치되고 필요 시 승인되고 실제로 사용되는 e2e test

## 17. 수용 기준

다음이 만족되면 이 CEP를 수용합니다.

- 사용자가 Dore 안에서 ClawHub skill을 검색하고 설치할 수 있다
- 설치된 skill이 origin과 lock metadata로 추적된다
- unsafe 또는 unready skill이 조용히 활성화되지 않는다
- 새로 설치된 ready skill이 수동 파일 작업 없이 다음 Dore turn에서 사용 가능하다

## 18. 열린 질문

- 첫 마일스톤에서 ClawHub skill만 지원할 것인가, plugin도 함께 지원할 것인가?
- 어떤 readiness rule을 표준화하고 어떤 것은 skill 정의에 맡길 것인가?
- `warn` 수준 finding은 전역 승인 정책으로 다룰 것인가, skill별 정책으로 둘 것인가?
