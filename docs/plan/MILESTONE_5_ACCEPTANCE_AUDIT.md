# M5 Acceptance Audit

Audit date: 2026-06-22

Scope: M5 Trading Watch and Dry-run from [ROADMAP.md](ROADMAP.md).

## Result

M5 is accepted for the current MVP scope.

The implementation supports safe Korea/US watchlists, broker capability visibility,
deterministic risk checks, dry-run signal and journal workflows, daemon status
visibility, desktop visibility, and a manual dry-run signal route. Real trading
paths remain disabled until the M6 prerequisites are satisfied.

## Acceptance Evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| Broker capability status is visible. | `createBrokerCapabilityRegistry` defines Toss, Shinhan, and Samsung defaults in `packages/trading/src/index.ts`; `createTradingStatus` exposes `broker_capabilities` and `brokers`. Tests: `packages/trading/src/trading.test.ts`, `apps/daemon/src/status.test.ts`. | Accepted |
| Signal and dry-run journal entries are created. | `createTradingSignal`, `createDryRunJournalEntry`, and `appendDryRunJournalEntry` create contract-shaped signals and append JSONL records under `memory/logs/trading/YYYY-MM.jsonl`. Tests cover direct package usage and daemon route usage. | Accepted |
| `real_trading_enabled: false` prevents every real order path in M5. | `ensureRealTradingBlocked` rejects `real`; `runRiskCheck` blocks `real` when disabled; `POST /trading/signals/dry-run` rejects `execution_mode: real`; dry-run journal rejects real execution signals. Tests cover package and daemon paths. | Accepted |
| Risk rule tests pass. | `runRiskCheck` covers disabled real trading, kill switch, market closed, stale data, order size, and daily limit rules. Tests cover real-disabled, stale data, order size, and daily limit behavior. | Accepted |
| Manual signal creation route rejects real execution mode. | `apps/daemon/src/server.ts` implements `POST /trading/signals/dry-run`; `apps/daemon/src/status.test.ts` verifies 400 `real_trading_disabled` for `execution_mode: real`. | Accepted |

## Deliverable Evidence

- Watchlist store:
  `createWatchlistStore`, `saveWatchlistStore`, and `loadWatchlistStore` are
  implemented in `packages/trading/src/index.ts`.
- Broker capability registry:
  `createBrokerCapabilityRegistry` exposes Toss, Shinhan, and Samsung.
- Toss candidate connector placeholder:
  Toss defaults to `candidate` capability status until official API details are
  supplied.
- Shinhan candidate connector placeholder:
  Shinhan defaults to `candidate` capability status until official API details
  are supplied.
- Samsung read-only/manual policy:
  Samsung defaults to `read_only_manual_reference` and order creation is not
  supported.
- Market data adapter interface:
  `MarketDataAdapter` and `createStaticMarketDataAdapter` are implemented for
  local/manual quote inputs.
- Signal object:
  `createTradingSignal` validates through the runtime contract schema.
- Risk manager:
  `runRiskCheck` provides deterministic rule evaluation.
- Dry-run journal:
  `createDryRunJournalEntry`, `appendDryRunJournalEntry`, and
  `summarizeDryRunJournal` are implemented.
- Manual dry-run signal route:
  `POST /trading/signals/dry-run` creates a dry-run signal and journal entry and
  rejects real execution mode.

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

- No official broker API or credential integration is included in M5.
- No real order creation or cancellation route exists in M5.
- Real trading remains disabled by default and requires M6 gates before any
  future enablement.
- M6 must add explicit config, approval, risk-limit, kill-switch, and credential
  reference gates before any pilot real trading work.
