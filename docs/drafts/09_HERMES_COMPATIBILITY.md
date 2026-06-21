# Hermes Agent Compatibility

## 목적

Dore는 `/home/hjhun/samba/workspace/ref/hermes-agent`에 있는 `hermes-agent`의 기능을 동일하게 수행할 수 있어야 한다.

이 문서는 Hermes 기능을 inventory로 정리하고, Dore에서 어떤 방식으로 구현하거나 호환할지 추적한다.

## 참조 경로

```text
/home/hjhun/samba/workspace/ref/hermes-agent
```

## Hermes 핵심 정체성

Hermes는 CLI, 메시징 게이트웨이, TUI, Electron 데스크톱 앱에서 같은 Agent core를 실행하는 개인 AI Agent다. 세션 간 memory와 skill을 학습하고, subagent 위임, scheduled job, terminal/browser 조작을 지원한다.

## 핵심 설계 원칙

### Prompt caching 보존

Hermes는 long-lived conversation에서 prompt cache를 중요하게 취급한다. Dore도 세션 중 system prompt와 tool schema가 불필요하게 흔들리지 않도록 설계해야 한다.

### Narrow core, expandable edges

Hermes는 core tool surface를 좁게 유지하고 기능 확장은 CLI command, skill, service-gated tool, plugin, MCP server로 처리한다. Dore도 개인용 기능이 많아질수록 core를 키우기보다 plugin/skill/tool registry로 확장해야 한다.

## 기능 Inventory

| 영역 | Hermes 기능 | Dore 요구 |
| --- | --- | --- |
| CLI | `hermes` 대화형 CLI | 로컬 관리/디버깅용 CLI 제공 |
| TUI | multiline editing, slash command, history, streaming output | 개발/운영용 TUI 또는 equivalent UX 제공 |
| Messaging Gateway | Telegram, Discord, Slack, WhatsApp, Signal, Email 등 | 초기에는 Telegram만 지원하고 gateway 구조는 유지 |
| Desktop | Electron desktop app | 데스크톱 앱 제공 |
| Memory | persistent memory, user profile, session recall | 개인 장기 기억/wiki와 operational memory 제공 |
| Skills | skill list/view/manage, skill hub, curator | 개인 skill 생성/수정/보관/활성화 제공 |
| Scheduled Jobs | cron scheduler, platform delivery | 로컬 상시 실행 scheduler와 메신저 알림 제공 |
| Delegation | isolated subagents, parallel workstreams | SW 개발/리서치/트레이딩 작업 subagent 분리 |
| Tools | terminal, file, browser, image, transcription, TTS 등 | 개인 비서 기능별 tool registry 제공 |
| MCP | MCP server/client integration | 외부 도구 연결 표준으로 MCP 지원 |
| Session Lifecycle | session persistence, reset, resume, stop, token/cost tracking | 로컬/메신저/데스크톱 간 세션 연속성 제공 |
| Token/Cost | usage, compression, cache tracking | 토큰 최적화와 비용 추적 필수 |
| Terminal Backends | local, Docker, SSH, Singularity, Modal, Daytona | 초기에는 local 중심, 이후 Docker/SSH 확장 |
| Browser/Computer Use | browser and computer control | 필요 시 브라우저/데스크톱 자동화 제공 |
| Voice | transcription, TTS, voice mode | 선택 기능으로 설계 |
| Migration | OpenClaw migration | Hermes migration 또는 import path 검토 |
| Setup/Doctor | setup wizard, diagnostics | 설정 검증과 doctor command 제공 |

## Slash Command Parity 초안

| Hermes command | Dore command 후보 | 비고 |
| --- | --- | --- |
| `/new`, `/reset` | `/new`, `/reset` | 세션 초기화 |
| `/model` | `/model` | provider/model 선택 |
| `/personality` | `/profile` 또는 `/persona` | 개인 비서 persona |
| `/retry`, `/undo` | `/retry`, `/undo` | 대화 되돌리기 |
| `/compress` | `/compress` | context 압축 |
| `/usage` | `/usage` | 토큰/비용 조회 |
| `/insights` | `/insights` | 최근 대화/작업 통찰 |
| `/skills` | `/skills` | skill 관리 |
| `/stop` | `/stop` | 현재 작업 중단 |
| `/status` | `/status` | gateway/session 상태 |
| `/sethome` | `/sethome` | 메신저 작업 디렉터리 설정 |

## 세션 요구사항

- 플랫폼별 conversation lane을 분리한다.
- CLI, Telegram, 데스크톱 앱에서 같은 장기 memory를 공유한다.
- 세션 reset/resume/stop을 명확히 지원한다.
- 메시지 queue와 interrupt를 지원한다.
- 세션별 token/cost를 기록한다.
- crash/restart 후 최근 작업을 복구한다.

## Skill 요구사항

Hermes의 skill 구조는 progressive disclosure를 사용한다.

- system prompt에는 skill 이름/설명 index만 포함한다.
- 실제 skill 본문은 필요할 때만 로드한다.
- 사용자가 만든 skill과 bundled skill을 구분한다.
- 큰 참고 자료는 `references/`, `templates/`, `scripts/`, `assets/`로 분리한다.
- 사용 빈도가 낮거나 중복되는 skill은 정리하되 삭제보다 archive를 우선한다.

Dore도 이 구조를 채택한다.

## Scheduler 요구사항

- 로컬 상시 실행에서는 in-process scheduler를 사용한다.
- 장기적으로 scale-to-zero 또는 외부 scheduler도 고려한다.
- 예약 작업은 메신저/데스크톱 알림으로 전달한다.
- 각 job은 at-most-once 실행을 목표로 한다.
- 실행 결과와 실패 사유를 log에 남긴다.

## Desktop App 요구사항

- 사용자의 개인 Agent 상태를 볼 수 있어야 한다.
- memory/wiki, tasks, schedules, trading status, development jobs를 탐색할 수 있어야 한다.
- 위험 작업 승인 UI를 제공해야 한다.
- background daemon 상태와 로그를 확인할 수 있어야 한다.

## Telegram Bot 요구사항

- 외부에서 Agent에게 작업을 지시할 수 있어야 한다.
- 긴 작업 중 interrupt/stop이 가능해야 한다.
- 작업 완료, 알림, trading signal, 오류를 받을 수 있어야 한다.
- 인증된 사용자만 사용할 수 있어야 한다.

## 호환성 구현 전략

1. Hermes는 fork하지 않고 Dore를 별도 제작한다.
2. Hermes 기능을 MVP/Phase 2/Phase 3로 나눈다.
3. Dore에 필요한 core interface를 먼저 정의한다.
4. 기능 확장은 skill/plugin/tool registry를 기본 경로로 한다.
5. Hermes 호환 command와 session behavior를 테스트로 고정한다.

## 1차 결론

Dore의 목표는 Hermes의 core concept을 모두 포함한다. 특히 아래는 필수 요구사항으로 승격한다.

- multi-interface: local daemon, Telegram bot, desktop app.
- persistent memory and user modeling.
- skill-based self-improvement.
- scheduler.
- subagent delegation.
- token/cost optimization.
- plugin/MCP extensibility.
- session lifecycle and recovery.
