# Dore Docs

이 디렉터리는 개인 AI Agent `Dore`를 개발하기 전에 합의해야 할 제품, 기능, 기억, 안전, 기술 설계를 정리한다.

## 읽는 순서

1. [00_PRODUCT_BRIEF.md](00_PRODUCT_BRIEF.md)
2. [01_AGENT_SPEC.md](01_AGENT_SPEC.md)
3. [02_MEMORY_KNOWLEDGE.md](02_MEMORY_KNOWLEDGE.md)
4. [03_WORKFLOWS.md](03_WORKFLOWS.md)
5. [04_TOOLS_AND_DATA.md](04_TOOLS_AND_DATA.md)
6. [05_SAFETY_AND_PERMISSIONS.md](05_SAFETY_AND_PERMISSIONS.md)
7. [06_TECHNICAL_DESIGN.md](06_TECHNICAL_DESIGN.md)
8. [07_EVAL_PLAN.md](07_EVAL_PLAN.md)
9. [08_OPEN_QUESTIONS.md](08_OPEN_QUESTIONS.md)
10. [09_HERMES_COMPATIBILITY.md](09_HERMES_COMPATIBILITY.md)
11. [10_DECISIONS.md](10_DECISIONS.md)
12. [11_DESKTOP_APP_OPTIONS.md](11_DESKTOP_APP_OPTIONS.md)
13. [12_ELECTRON_APP_SPEC.md](12_ELECTRON_APP_SPEC.md)
14. [13_LLM_PROVIDERS.md](13_LLM_PROVIDERS.md)
15. [14_ASSUMED_ANSWERS.md](14_ASSUMED_ANSWERS.md)
16. [15_MVP_SCOPE.md](15_MVP_SCOPE.md)
17. [16_DAILY_BRIEFING_SPEC.md](16_DAILY_BRIEFING_SPEC.md)
18. [17_TRADING_POLICY_DRAFT.md](17_TRADING_POLICY_DRAFT.md)
19. [18_RISK_AND_COST_DEFAULTS.md](18_RISK_AND_COST_DEFAULTS.md)
20. [19_DATA_SOURCES.md](19_DATA_SOURCES.md)
21. [20_IMPLEMENTATION_ROADMAP.md](20_IMPLEMENTATION_ROADMAP.md)
22. [21_DASHBOARD_METRICS.md](21_DASHBOARD_METRICS.md)
23. [22_CONFIG_SCHEMA_DRAFT.md](22_CONFIG_SCHEMA_DRAFT.md)
24. [23_PRODUCT_REQUIREMENTS.md](23_PRODUCT_REQUIREMENTS.md)
25. [24_MEMORY_SCHEMA.md](24_MEMORY_SCHEMA.md)
26. [25_TRADING_STRATEGY_FRAMEWORK.md](25_TRADING_STRATEGY_FRAMEWORK.md)
27. [26_ACCEPTANCE_CRITERIA.md](26_ACCEPTANCE_CRITERIA.md)
28. [27_RESEARCH_NOTES.md](27_RESEARCH_NOTES.md)
29. [28_RUNTIME_CONTRACTS.md](28_RUNTIME_CONTRACTS.md)
30. [29_MVP_ENGINEERING_BACKLOG.md](29_MVP_ENGINEERING_BACKLOG.md)
31. [30_DEVELOPMENT_START_SPEC.md](30_DEVELOPMENT_START_SPEC.md)

## 현재 상태

- 사용자의 초기 요구사항을 바탕으로 한 1차 초안이다.
- `refs/llm-wiki.md`의 지속형 개인 wiki 아이디어를 memory 설계에 반영했다.
- `hermes-agent` 경로는 `/home/hjhun/samba/workspace/ref/hermes-agent`로 확인했고, 1차 compatibility inventory를 작성했다.
- Dore는 Hermes fork가 아니라 별도 Agent로 제작한다.
- 초기 메신저 봇은 Telegram만 지원한다.
- 데스크톱 앱은 Electron으로 제작한다.
- Electron 앱 첫 화면은 Dashboard이며, 위험 작업은 Approvals 패널에서 승인한다.
- LLM provider는 OpenAI, Claude, Gemini를 지원한다. 기본 인증은 API key이며, OpenAI는 OAuth 계열 연결도 지원한다.
- 실제 주식 주문 실행은 가능 요구사항으로 포함했지만, MVP에서는 비활성화한다. 파일럿 실제주문 단계의 리스크 제한과 승인 정책은 [18_RISK_AND_COST_DEFAULTS.md](18_RISK_AND_COST_DEFAULTS.md)를 기본값으로 사용한다.
- 사용자의 입장에서 미정 질문에 대한 기본 답을 채운 [14_ASSUMED_ANSWERS.md](14_ASSUMED_ANSWERS.md)를 추가했다.
- MVP 범위, 매일 오전 6시 briefing, trading 정책 초안을 분리했다.
- trading risk와 LLM 비용 기본값을 [18_RISK_AND_COST_DEFAULTS.md](18_RISK_AND_COST_DEFAULTS.md)에 정리했다.
- data source와 구현 roadmap을 분리했다.
- Dashboard 지표와 초기 config schema 초안을 추가했다.
- PRD, memory schema, trading strategy framework, acceptance criteria를 추가했다.
- 2026-06-21 기준 공식 문서 확인 결과를 바탕으로 LLM provider/model 기본 정책과 broker API 판단 근거를 추가했다.
- 구현 착수에 필요한 runtime contract와 MVP engineering backlog를 추가했다.
- TypeScript/pnpm/Electron/Fastify/Zod 기반의 개발 시작 스펙과 첫 PR 분할을 추가했다.

## 다음 대화에서 정할 것

우선순위는 아래 순서가 좋다.

1. 기본 가정 문서가 사용자의 의도와 맞는지 검토.
2. 토스증권/신한증권 API 신청 가능 여부, 약관, sandbox/paper trading 지원 여부 확인.
3. Claude 실제 API model id를 setup wizard 또는 공식 Models API로 검증.
4. [30_DEVELOPMENT_START_SPEC.md](30_DEVELOPMENT_START_SPEC.md)의 첫 scaffold 작업부터 MVP 구현 시작.
