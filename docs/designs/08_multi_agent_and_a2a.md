# CEP-08: Multi-Agent And A2A

Status: Proposed
Last Updated: 2026-04-19
Owners: Dore agent runtime maintainers
Related: `01_system_architecture.md`, `04_telegram_and_session_runtime.md`, `05_scheduler_and_self_improvement.md`

## 1. Summary

Dore should eventually operate beyond a single execution thread.

The user wants three related capabilities:

- internal sub-agents that can naturally take bounded work
- external worker execution using tools such as Codex, Claude, and Gemini CLI
- coordination between Dore instances on paired or same-network devices, with A2A compatibility in mind

This CEP defines the layered model for those capabilities.

## 2. Goals

- Support child-session delegation first.
- Allow external worker adapters later without redesigning the runtime.
- Enable peer Dore coordination across devices.
- Keep all delegation auditable, policy-aware, and test-gated where relevant.
- Preserve simple local execution as the default path.

## 3. Non-Goals

- Building a full distributed cluster scheduler in milestone one
- Requiring multi-agent execution for normal assistant use
- Allowing arbitrary peer discovery with no trust model
- Treating external workers as privileged by default

## 4. Delegation Layers

### 4.1 Layer 1: Internal Child Sessions

This is the default sub-agent mechanism.

Use for:

- research
- summarization
- memory maintenance
- bounded planning
- controlled improvement tasks

### 4.2 Layer 2: External Worker Adapters

Adapters can invoke external tools such as:

- Codex CLI
- Claude CLI
- Gemini CLI

These workers should receive:

- a bounded objective
- an explicit write scope
- required tests
- return-channel expectations

### 4.3 Layer 3: Peer Dore Nodes

Separate Dore installations may coordinate if they are explicitly paired or discovered on the same network with user-approved trust.

## 5. Work Contract

Every delegated task should use a common work contract:

- work ID
- parent goal or session
- objective
- allowed tools or capabilities
- write scope
- timeout
- test requirements
- result promotion policy

This contract keeps internal and external delegation conceptually aligned.

## 6. Peer Discovery And Pairing

The first peer model should be conservative:

- manual pairing is mandatory
- each peer has a stable node ID
- pairing uses a signed challenge or explicit trust exchange
- discovered peers are not automatically trusted

Local-network discovery may later use mDNS or another simple broadcast mechanism, but trust must remain explicit.

## 7. Capability Registry

Each worker or peer should advertise:

- supported task classes
- available providers
- tool execution capabilities
- max concurrency
- health status
- version or compatibility level

This allows the scheduler or runtime to choose delegation targets intentionally.

## 8. A2A Compatibility

Dore should not hardcode itself to one peer protocol too early, but it should use message envelopes that are compatible with future A2A alignment.

Recommended envelope fields:

- sender
- receiver
- message type
- work ID
- session or goal reference
- capability requirements
- payload
- signature or trust metadata

This keeps room for protocol evolution without forcing it in milestone one.

## 9. Result Promotion

Delegated results should not become durable truth automatically.

Promotion rules:

- summarize the result
- validate scope and status
- run required tests if code or behavior changed
- attach a report
- update parent session, goal, or memory only after validation

## 10. Failure Handling

Delegation failures should include:

- lease timeout
- worker unavailable
- policy rejection
- incompatible capability
- test failure
- conflicting write scope

The parent session or goal should remain understandable after failure.

## 11. Security Model

- peers are untrusted until paired
- external workers get only the minimum context needed
- secrets are never forwarded unless the policy explicitly allows a capability-specific token
- write scopes must be narrow and inspectable
- code-changing work should default to test-gated result acceptance

## 12. Testing Requirements

- Unit tests for work contract validation and lease logic
- Integration tests for child-session delegation and result promotion
- Smoke tests for a simple external worker round-trip
- End-to-end tests for delegated research or code improvement with reporting

## 13. Rollout Plan

### Phase 1

- internal child sessions only

### Phase 2

- external CLI worker adapters

### Phase 3

- paired peer Dore nodes
- A2A-compatible envelopes

## 14. Acceptance Criteria

This CEP is accepted when:

- Dore can delegate bounded work through child sessions
- the architecture can add Codex, Claude, and Gemini CLI workers without runtime redesign
- peer coordination has an explicit trust model
- delegated work remains auditable and policy-aware

## 15. Open Questions

- Which external worker should be implemented first?
- Should code-changing delegation be local-only at first?
- Which minimum A2A envelope fields should become stable in milestone one?
