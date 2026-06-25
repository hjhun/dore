# M16 Broker Connector Input Packet

Purpose: collect the official broker/API evidence required before M16 broker
connector planning or paper/sandbox connector implementation starts.

M16 must not introduce a real order path from assumptions, blog posts, sample
snippets without terms, or reverse-engineered behavior. Every connector
capability must be backed by official source material supplied or approved by
the user.

## How To Use

1. Fill this packet with one broker/API target.
2. Attach or link official documentation and API terms.
3. Store credentials outside the repository and provide only `secret_ref:`
   references.
4. Record desired pilot risk limits and approval policy.
5. Start M16 implementation only after every start gate below is checked.

The file-based validator uses the same gate in code:

```bash
npx --yes pnpm@11.8.0 trading:m16-check configs/m16-broker-input.example.json
```

The example file is intentionally incomplete and should return `blocked` until
the official broker/API fields and explicit approval are filled.

## Broker Target

| Field | Required value |
| --- | --- |
| Broker or exchange name |  |
| Target market | Korea stocks / US stocks / ETF / other |
| Account type | cash / margin / retirement / other |
| API environment | production / sandbox / paper / read-only |
| Official documentation URL or local file |  |
| Official terms URL or local file |  |
| User-approved connector scope | market data / account read / paper order / real order |

## Official Source Evidence

Provide official source links or checked-in redacted notes for each item.

| Evidence item | Source | Verified by | Notes |
| --- | --- | --- | --- |
| Authentication flow |  |  |  |
| Market data API |  |  |  |
| Account balance/position API |  |  |  |
| Order placement API |  |  |  |
| Order cancel/modify API |  |  |  |
| Order status/fill API |  |  |  |
| Rate limits |  |  |  |
| Trading hours |  |  |  |
| Supported order types |  |  |  |
| Minimum order unit |  |  |  |
| Fees/taxes |  |  |  |
| Error codes and retry rules |  |  |  |
| Sandbox or paper support |  |  |  |

## Terms And Account Constraints

| Constraint | Required answer |
| --- | --- |
| API use permitted for personal automation? | yes / no / unclear |
| Real order automation permitted? | yes / no / unclear |
| Paper/sandbox mode available? | yes / no / unclear |
| Read-only key available? | yes / no / unclear |
| Order-capable key separate from read-only key? | yes / no / unclear |
| Account permissions required |  |
| Prohibited use cases |  |
| Data redistribution restrictions |  |
| Audit/log retention requirements |  |
| Any manual confirmation requirement |  |

If any answer is `unclear`, M16 may only implement source review notes and
blocked capability status. It must not implement live broker mutations.

## Credential References

Never write raw credential values in this file, config, logs, tests, or UI.

| Credential | Required reference format | Value |
| --- | --- | --- |
| App key / client id | `secret_ref:brokers/<broker>/app_key` |  |
| App secret / client secret | `secret_ref:brokers/<broker>/app_secret` |  |
| Account id / account token | `secret_ref:brokers/<broker>/account` |  |
| Access token refresh material, if required | `secret_ref:brokers/<broker>/refresh` |  |

Config may reference these values only through `secret_ref:` strings. Tests must
continue proving raw credential values are rejected.

## Paper Connector Scope

M16 should prefer the smallest connector that improves safety evidence:

- read official capability metadata.
- read market data or account data only if the official docs and terms allow it.
- implement paper/sandbox behavior before any real order behavior exists.
- preserve existing M6 real-trading gates.
- keep `real_trading_enabled: false` as the default.
- keep `broker_order_submitted: false` for local paper journal entries unless a
  separate official sandbox broker endpoint is explicitly verified.

## Pilot Risk And Approval Policy

| Policy item | Required value |
| --- | --- |
| Max single order KRW equivalent |  |
| Max daily loss KRW equivalent |  |
| Max symbol exposure percent |  |
| Minimum cash percent |  |
| Allowed instruments |  |
| Leverage/margin allowed? | no unless explicitly approved |
| Short selling allowed? | no unless explicitly approved |
| Derivatives allowed? | no unless explicitly approved |
| Required dry-run/paper period | 30 days minimum before M17 |
| Approval channel | desktop approval / Telegram approval / both |
| Kill-switch owner | user |

## M16 Start Gate

All items must be true before M16 implementation begins:

- [ ] official broker/API target is selected.
- [ ] official API documentation is supplied.
- [ ] official terms and account permission constraints are supplied.
- [ ] API authentication and credential requirements are understood.
- [ ] credential references use `secret_ref:` only.
- [ ] paper/sandbox availability is verified, or unavailable status is explicit.
- [ ] pilot risk limits are filled in.
- [ ] approval policy is filled in.
- [ ] existing M6 gates remain the enforcement boundary.
- [ ] user explicitly approves starting M16 connector planning.

## Stop Conditions

Stop and ask for user review if any of these occur:

- official documentation contradicts existing assumptions.
- terms are unclear about automation or real orders.
- credentials are provided as raw values instead of `secret_ref:` references.
- paper/sandbox behavior is unavailable or materially different from real order
  behavior.
- broker response schemas differ from documentation.
- any implementation change would introduce a real order path before M17.

## M16 Acceptance Evidence

M16 can be accepted only when the implementation records:

- source-cited broker/API review.
- connector capability model backed by official sources.
- paper/sandbox or blocked-readiness behavior tested before real order behavior.
- tests proving missing docs, unclear terms, missing credentials, disabled real
  trading, kill switch, missing approval, and incomplete risk limits block
  execution.
- updated `docs/plan/REQUIREMENTS_TRACE.md`, `docs/plan/ROADMAP.md`, and
  `.dev/DASHBOARD.md`.
