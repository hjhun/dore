# M6 Acceptance Audit

Audit date: 2026-06-22

Scope: M6 Pilot Real Trading Preparation from [ROADMAP.md](ROADMAP.md).

## Result

M6 is accepted for the current pre-broker-integration scope.

The implementation prepares pilot real trading gates without enabling real
orders. It exposes explicit config, secret-reference-only broker credential
fields, deterministic gate checks, daemon/desktop status, approval controls,
kill-switch controls, local persistence, and append-only trading audit events.
Because official broker API details and terms are not yet supplied, all real
order paths remain blocked.

## Acceptance Evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| Real trading remains disabled by default. | `packages/config/src/index.ts` defaults `trading.real_trading_enabled` and `real_trading_gates.explicit_enable` to `false`; `kill_switch_enabled` defaults to `true`. Tests: `packages/config/src/config.test.ts`, `apps/daemon/src/status.test.ts`. | Accepted |
| Enabling real trading requires explicit config. | `createRealTradingGateStatus` requires both `realTradingRequested` and `explicitEnable` to pass the `explicit_enable` check. Tests cover blocked and ready gate states in `packages/trading/src/trading.test.ts`. | Accepted |
| Enabling real trading requires approval. | `approval_required` defaults to `true`; the `approval` gate passes only when approval is not required or `approval_granted` is true. `POST /trading/gates/approval` persists local approval control state and appends an audit event. | Accepted |
| Enabling real trading requires passing risk gates. | `createRealTradingGateStatus` requires complete pilot risk limits before gate readiness. Tests verify incomplete risk limits block pilot real trading. | Accepted |
| Broker credentials are configurable without raw secrets. | Config accepts only `secret_ref:` broker credential references and rejects raw values. Tests: `packages/config/src/config.test.ts`. | Accepted |
| Kill switch is represented and defaults to blocking. | `kill_switch_enabled` defaults to `true`; gate status includes the kill-switch check; daemon and desktop status expose blocked gate state. `POST /trading/gates/kill-switch` persists local control state. | Accepted |
| Approval and kill-switch changes are audited. | `apps/daemon/src/server.ts` writes trading events to `memory/logs/events/trading.jsonl` through `appendEvent`. Tests verify event logs contain `approval_decided` and `trading_kill_switch_updated`. | Accepted |
| Missing official broker API details keep real paths blocked. | Gate checks require `official_api_verified` and `terms_verified`; tests show approval/kill-switch controls do not enable real trading when these are false. | Accepted |

## Deliverable Evidence

- Config gates:
  `trading.real_trading_gates` is implemented in `packages/config/src/index.ts`
  and represented in `configs/dore.config.example.yaml`.
- Secret reference checks:
  broker credential fields use `secret_ref:` validation and reject raw values.
- Gate evaluator:
  `createRealTradingGateStatus` checks explicit enablement, official API
  verification, terms verification, broker credential refs, dry-run history,
  kill switch, approval, and risk limits.
- Daemon status:
  `GET /status` and `GET /trading/status` expose `real_trading_gate`.
- Desktop status:
  `apps/desktop/src/renderer/daemon-status.ts` maps gate status and
  `Dashboard.tsx` renders real gate state and blocked reason.
- Approval control route:
  `POST /trading/gates/approval` persists `approval_granted` and appends an
  audit event.
- Kill-switch control route:
  `POST /trading/gates/kill-switch` persists `kill_switch_enabled`, appends an
  audit event, and restores state across daemon restarts.
- Real order boundary:
  no real order creation or cancellation route exists; dry-run routes continue
  to reject `execution_mode: real`.

## Verification Commands

Last verified on 2026-06-22:

```bash
npx --yes pnpm@11.8.0 test
npx --yes pnpm@11.8.0 build
npx --yes pnpm@11.8.0 build:desktop
```

Additional checks:

- docs relative link check passed.
- changed-file secret-like scan found no plaintext secret values.

## Known Boundaries

- Official broker API documents, terms, and account permissions still require
  user-provided details before connector work.
- The current system prepares gates only; it does not execute real orders.
- Approval and kill-switch controls are local gate controls, not broker API
  permissions.
- Future broker connector work must add source-cited API verification,
  credential handling through secret references, and separate approval before
  any real order path is introduced.
