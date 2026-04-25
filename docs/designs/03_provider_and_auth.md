# CEP-03: Provider And Authentication

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore provider maintainers
Related: `01_system_architecture.md`, `04_telegram_and_session_runtime.md`, `08_multi_agent_and_a2a.md`

## 1. Summary

Dore must connect to language models through a provider architecture that is:

- OpenAI-first through OAuth
- extensible to API-key-backed providers such as Claude and Gemini
- compatible with local LLMs
- isolated from memory, session, and channel logic

This CEP adopts the useful boundary style observed in OpenClaw: authentication concerns are separated from runtime model execution, and provider-specific details stay behind narrow adapters.

## 2. Goals

- Make OpenAI OAuth the default and lowest-friction path.
- Allow provider routing without vendor logic leaking into the session runtime.
- Support user-configured API keys cleanly.
- Preserve room for local LLM operation.
- Keep secrets out of chat, memory, and report artifacts.

## 3. Non-Goals

- Hardcoding vendor-specific logic into session code
- Storing raw secrets in wiki pages, reports, or session ledgers
- Assuming all providers support the same features
- Making provider failover invisible and unobservable

## 4. Requirements

- PR-1: Dore must support OpenAI via OAuth as the default path.
- PR-2: Dore must support API-key-backed profiles for other providers.
- PR-3: Dore must allow local providers through the same runtime contract.
- PR-4: Provider selection must be policy-driven by task class.
- PR-5: Auth resolution must be auditable.
- PR-6: Failures must be typed and reportable.

## 5. Domain Model

### 5.1 `ProviderId`

Examples:

- `openai`
- `anthropic`
- `google.gemini`
- `local.ollama`
- `local.lmstudio`

### 5.2 `AuthMode`

Supported initial modes:

- `oauth`
- `api_key`
- `none`

### 5.3 `ProviderProfile`

Defines:

- provider ID
- auth mode
- allowed models
- endpoint overrides
- policy tags

### 5.4 `CredentialRef`

References where credentials live:

- direct secret reference
- environment variable
- OS keychain entry
- encrypted local store entry

### 5.5 `RoutingPolicy`

Maps task classes to provider candidates and fallback order.

Task classes should include:

- chat
- memory_maintenance
- summarization
- planning
- coding
- self_improvement
- reporting

## 6. Architectural Decisions

### AD-1: OpenAI OAuth is the default happy path

If no explicit override is configured, Dore should prefer the OpenAI OAuth profile.

### AD-2: Auth resolution is separate from provider execution

The runtime asks for a resolved credential envelope. It does not inspect refresh tokens, API-key material, or environment lookup logic.

### AD-3: Local providers implement the same adapter contract

Local LLMs must not create a special branch in session logic.

### AD-4: Routing is policy-driven by task class

Provider choice should reflect workload needs, not just a global default.

## 7. OpenAI OAuth Flow

The initial OAuth implementation should support:

- PKCE
- localhost callback when possible
- manual code-paste fallback
- refresh token storage
- expiry tracking
- re-auth prompts when refresh fails

The runtime contract should expose only:

- access token availability
- expiry
- resolved provider profile
- typed auth errors

## 8. API-Key Provider Support

API-key-backed providers should use the same configuration shape:

- provider ID
- profile label
- credential reference
- allowed models
- endpoint override if needed

This supports:

- Claude via API key
- Gemini via API key
- future providers with similar auth models

If the user stores an API key, that provider becomes eligible according to routing policy.

## 9. Local LLM Support

Local providers should be modeled as first-class adapters.

Expected capabilities:

- configurable base URL or local socket
- model discovery if available
- request timeout policy
- capability flags such as tool support or streaming support

Local LLMs should remain optional, but the architecture must not block them.

## 10. Credential Resolution Order

Recommended resolution order:

1. explicit task or session override
2. explicit task-class routing policy
3. user-configured preferred provider profile
4. default OpenAI OAuth profile
5. local provider fallback if policy allows

The chosen profile and reason should be recorded in the execution metadata.

## 11. Secret Storage

Secrets must live in a dedicated secret subsystem.

The first implementation may support:

- environment variable references
- encrypted local file entries
- future OS keychain integration

Hard requirements:

- never write raw secret material to memory/wiki
- never include raw secret material in session summaries
- redact secrets from reports and logs

## 12. Failure Handling

Failures should be typed at minimum as:

- `auth_failed`
- `auth_expired`
- `quota_exhausted`
- `provider_unavailable`
- `model_unavailable`
- `network_error`
- `policy_rejected`
- `malformed_response`

Failover is allowed only if the routing policy explicitly permits it.

## 13. Observability

For each execution, record:

- task class
- selected provider profile
- auth mode
- model name
- fallback usage
- token usage if available
- latency
- failure class if any

This is needed for both debugging and self-improvement.

## 14. Testing Requirements

- Unit tests for routing policy and credential resolution
- Integration tests for OAuth happy path and refresh handling
- Integration tests for API-key-backed providers
- Smoke tests for default provider boot and execution
- End-to-end tests proving provider selection behavior in realistic task flows

## 15. Acceptance Criteria

This CEP is accepted when:

- OpenAI OAuth works as the default provider path
- API-key providers can be enabled without changes to session logic
- local providers fit the same adapter boundary
- failures are typed, observable, and reportable
- secrets remain isolated from business artifacts

## 16. Open Questions

- Which local secret backend should be implemented first?
- Should the first milestone support multiple OpenAI OAuth profiles or only one?
- Which provider capability flags are required for the initial adapter trait?
