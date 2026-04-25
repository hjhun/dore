# Prompt: Security, Policy, Guardrails, and Sandboxing

이 문서는 Rust 기반 AI Agent / Workflow Engine의 security model, policy engine, guardrails, sandboxing을 설계하기 위한 prompt이다.

반드시 이 내용을 기반으로 설계와 개발 로드맵 문서를 작성해야 한다.

## File Writing Rules

- 기존 설계 문서를 먼저 분석하고 정리한 뒤 새 설계 문서나 로드맵 문서를 작성한다.
- 설계 문서는 `docs/designs/<date_utc_time>_<title>.md` 경로에 작성한다.
- 개발 로드맵 문서는 `docs/roadmaps/<date_utc_time>_<title>.md` 경로에 작성한다.
- `<date_utc_time>`은 UTC 기준 `YYYYMMDD_HHMMSS` 형식을 사용한다.
- `<title>`은 소문자 `snake_case`를 사용한다.
- 최종 개발 로드맵은 기존 설계 분석과 새 설계 정리가 끝난 뒤 작성한다.

## Context

외부 tool, skill registry, `SKILL.md`, MCP-like server, shell command, network access는 모두 위험한 경계다. 기본값은 dry-run, explicit approval, least privilege, auditable execution이어야 한다.

## Task

다음 보안 기능을 설계하라.

- Trust Boundary
- Capability-Based Permission
- Sandbox
- Secrets Management
- Policy Enforcement
- Supply Chain Security
- Prompt Injection Defense
- Audit Log
- Least Privilege
- Safe Defaults
- Input Guardrail
- Output Guardrail
- Tool Guardrail
- Policy Engine
- Validation Pipeline
- Safety Classifier
- Process Isolation
- Filesystem Restriction
- Network Restriction
- Environment Filtering
- Resource Limits
- Command Allowlist
- Temporary Workspace

## Required Policy Questions

문서에서 최소한 다음 질문에 답하라.

- 어떤 action이 항상 approval을 요구하는가?
- 어떤 action이 dry-run만 허용되는가?
- file read, file write, process spawn, network access는 어떻게 선언되는가?
- skill metadata와 skill execution의 trust level은 어떻게 분리되는가?
- secrets는 state, logs, prompts에서 어떻게 제외되는가?
- audit log는 어떤 event를 반드시 기록해야 하는가?
- prompt injection이 의심되는 문서는 어떻게 격리되는가?

## Required Output

작성할 문서는 다음을 포함해야 한다.

- threat model
- trust boundary diagram 설명
- capability model
- policy file schema
- approval policy
- tool guardrail pipeline
- sandbox MVP
- audit log schema
- security test strategy
- 개발 로드맵 및 milestone 연결

## Constraints

- MVP에서는 완전한 OS sandbox보다 policy + dry-run + explicit approval + restricted command runner를 우선한다.
- 기본값은 실행 차단 또는 승인 대기여야 한다.
- 외부 skill은 metadata read, install, enable, execute 단계를 분리한다.
- 보안 설계는 CLI UX와 함께 검토 가능해야 한다.
