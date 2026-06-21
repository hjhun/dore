import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseConfig } from "../../../packages/config/src/index.js";
import {
  appendDryRunJournalEntry,
  createDryRunJournalEntry,
  createTradingSignal,
  createWatchlistStore,
  saveWatchlistStore
} from "../../../packages/trading/src/index.js";
import { createDaemonApp } from "./server.js";

describe("daemon status", () => {
  it("returns local runtime status without requiring credentials", async () => {
    const app = createDaemonApp({
      startedAt: new Date("2026-06-21T00:00:00.000Z"),
      configLoaded: true,
      memoryReady: true
    });

    const response = await app.inject({
      method: "GET",
      url: "/status"
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.app.name).toBe("Dore");
    expect(body.trading.real_trading_enabled).toBe(false);
    expect(body.trading.watchlist.count).toBe(0);
    expect(body.trading.blocked_actions).toContain("Real trading disabled.");
    expect(body.trading.broker_capabilities).toContainEqual(
      expect.objectContaining({
        broker: "toss",
        status: "candidate"
      })
    );
    expect(body.providers.openai.configured).toBe(false);
    expect(body.telegram.adapter.state).toBe("disabled");
    expect(body.telegram.adapter.reason).toBe("missing_token");
    expect(body.scheduler.jobs).toContainEqual(
      expect.objectContaining({
        id: "daily_briefing_0600_kst",
        time: "06:00",
        timezone: "Asia/Seoul"
      })
    );
  });

  it("returns trading status without enabling real trading", async () => {
    const app = createDaemonApp();

    const response = await app.inject({
      method: "GET",
      url: "/trading/status"
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.real_trading_enabled).toBe(false);
    expect(body.watchlist.count).toBe(0);
    expect(body.broker_capabilities).toContainEqual(
      expect.objectContaining({
        broker: "samsung",
        status: "read_only"
      })
    );
    expect(body.blocked_actions).toContain("Real trading disabled.");
  });

  it("includes dry-run journal summary in trading status", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-trading-"));
    const signal = createTradingSignal({
      signalId: "signal_20260622_AAPL_status",
      createdAt: "2026-06-22T09:00:00.000Z",
      market: "us",
      symbol: "AAPL",
      strategyId: "watch_momentum",
      direction: "watch",
      confidence: "low",
      reason: "Status summary candidate.",
      dataTimestamp: "2026-06-22T08:59:00.000Z",
      sourceRefs: ["watchlist"],
      riskCheck: {
        status: "pass",
        reasons: []
      },
      recommendedAction: "Record dry-run candidate only.",
      executionMode: "dry_run",
      expiresAt: "2026-06-22T15:30:00.000Z"
    });
    await appendDryRunJournalEntry(
      memoryRoot,
      createDryRunJournalEntry({
        signal,
        createdAt: "2026-06-22T09:00:00.000Z",
        simulatedOrder: {
          side: "buy",
          quantity: 1,
          estimatedPrice: 100,
          currency: "USD"
        }
      })
    );
    const app = createDaemonApp({
      memoryRoot,
      startedAt: new Date("2026-06-22T00:00:00.000Z")
    });

    const response = await app.inject({
      method: "GET",
      url: "/trading/status"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().dry_run_journal).toMatchObject({
      month: "2026-06",
      entries: 1,
      passed: 1,
      blocked: 0,
      latest_signal_id: "signal_20260622_AAPL_status"
    });
  });

  it("includes persisted watchlist items in trading status", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-trading-"));
    await saveWatchlistStore(
      memoryRoot,
      createWatchlistStore([
        {
          market: "korea",
          symbol: "005930",
          name: "Samsung Electronics"
        }
      ])
    );
    const app = createDaemonApp({
      memoryRoot,
      startedAt: new Date("2026-06-22T00:00:00.000Z")
    });

    const response = await app.inject({
      method: "GET",
      url: "/trading/status"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().watchlist.count).toBe(1);
    expect(response.json().watchlist.items).toContainEqual(
      expect.objectContaining({
        id: "watch_korea_005930",
        symbol: "005930"
      })
    );
  });

  it("creates a manual dry-run trading signal and journal entry", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-trading-"));
    const app = createDaemonApp({
      memoryRoot,
      startedAt: new Date("2026-06-22T00:00:00.000Z")
    });

    const response = await app.inject({
      method: "POST",
      url: "/trading/signals/dry-run",
      payload: {
        signal_id: "signal_20260622_AAPL_manual",
        now: "2026-06-22T09:00:00.000Z",
        market: "us",
        symbol: "aapl",
        strategy_id: "manual_watch",
        direction: "watch",
        confidence: "low",
        reason: "Manual dry-run candidate.",
        data_timestamp: "2026-06-22T08:59:00.000Z",
        source_refs: ["manual"],
        recommended_action: "Record dry-run candidate only.",
        expires_at: "2026-06-22T15:30:00.000Z",
        market_open: true,
        order_amount_krw_equivalent: 50_000,
        daily_new_buy_krw_equivalent: 50_000,
        simulated_order: {
          side: "buy",
          quantity: 1,
          estimated_price: 100,
          currency: "USD"
        }
      }
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.signal).toMatchObject({
      signal_id: "signal_20260622_AAPL_manual",
      symbol: "AAPL",
      execution_mode: "dry_run",
      risk_check: {
        status: "pass",
        reasons: []
      }
    });
    expect(body.journal.entry).toMatchObject({
      signal_id: "signal_20260622_AAPL_manual",
      execution_mode: "dry_run",
      simulated_order: {
        side: "buy",
        quantity: 1
      }
    });
    expect(await readFile(body.journal.path, "utf8")).toContain("signal_20260622_AAPL_manual");
  });

  it("rejects real execution mode through the manual dry-run route", async () => {
    const app = createDaemonApp();

    const response = await app.inject({
      method: "POST",
      url: "/trading/signals/dry-run",
      payload: {
        signal_id: "signal_20260622_AAPL_real",
        now: "2026-06-22T09:00:00.000Z",
        market: "us",
        symbol: "AAPL",
        strategy_id: "manual_watch",
        direction: "watch",
        confidence: "low",
        reason: "Manual real candidate.",
        data_timestamp: "2026-06-22T08:59:00.000Z",
        source_refs: ["manual"],
        execution_mode: "real",
        market_open: true,
        order_amount_krw_equivalent: 50_000,
        daily_new_buy_krw_equivalent: 50_000,
        simulated_order: {
          side: "buy",
          quantity: 1,
          estimated_price: 100,
          currency: "USD"
        }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "real_trading_disabled"
    });
  });

  it("exposes blocked pilot real trading gates without enabling real trading", async () => {
    const app = createDaemonApp({
      tradingConfig: parseConfig({
        trading: {
          real_trading_enabled: true,
          real_trading_gates: {
            explicit_enable: true,
            official_api_verified: false,
            terms_verified: false,
            broker_credentials: {},
            dry_run_min_days: 30,
            dry_run_observed_days: 0,
            kill_switch_enabled: true,
            approval_required: true,
            approval_granted: false,
            risk_limits: {}
          }
        }
      }).trading
    });

    const response = await app.inject({
      method: "GET",
      url: "/trading/status"
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.real_trading_enabled).toBe(false);
    expect(body.real_trading_gate).toMatchObject({
      enabled_requested: true,
      status: "blocked",
      blocked_reasons: expect.arrayContaining([
        "Official broker API is not verified.",
        "Trading kill switch is enabled."
      ])
    });
    expect(body.blocked_actions).toContain("Trading kill switch is enabled.");
  });

  it("records approval control changes without enabling real trading", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-trading-"));
    const app = createDaemonApp({
      memoryRoot,
      tradingConfig: parseConfig({
        trading: {
          real_trading_enabled: true,
          real_trading_gates: {
            explicit_enable: true,
            official_api_verified: false,
            terms_verified: false,
            dry_run_observed_days: 30,
            kill_switch_enabled: true,
            approval_required: true,
            approval_granted: false,
            risk_limits: {
              max_order_krw_equivalent: 100_000,
              max_daily_new_buy_krw_equivalent: 300_000,
              max_daily_loss_krw_equivalent: 100_000,
              max_position_pct: 10
            }
          }
        }
      }).trading
    });

    const control = await app.inject({
      method: "POST",
      url: "/trading/gates/approval",
      payload: {
        approved: true,
        now: "2026-06-22T09:00:00.000Z",
        reason: "Allow gate evaluation only."
      }
    });

    expect(control.statusCode).toBe(201);
    const controlBody = control.json();
    expect(controlBody.controls.approval_granted).toBe(true);
    expect(await readFile(controlBody.event_log, "utf8")).toContain("approval_decided");

    const status = await app.inject({
      method: "GET",
      url: "/trading/status"
    });
    const statusBody = status.json();
    expect(statusBody.real_trading_enabled).toBe(false);
    expect(statusBody.real_trading_gate.checks).toContainEqual(
      expect.objectContaining({
        id: "approval",
        status: "pass"
      })
    );
    expect(statusBody.real_trading_gate.blocked_reasons).toContain("Official broker API is not verified.");
  });

  it("persists kill-switch control changes across daemon restarts without real orders", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-trading-"));
    const tradingConfig = parseConfig({
      trading: {
        real_trading_enabled: true,
        real_trading_gates: {
          explicit_enable: true,
          official_api_verified: false,
          terms_verified: false,
          dry_run_observed_days: 30,
          kill_switch_enabled: true,
          approval_required: true,
          approval_granted: true,
          risk_limits: {
            max_order_krw_equivalent: 100_000,
            max_daily_new_buy_krw_equivalent: 300_000,
            max_daily_loss_krw_equivalent: 100_000,
            max_position_pct: 10
          }
        }
      }
    }).trading;
    const app = createDaemonApp({
      memoryRoot,
      tradingConfig
    });

    const control = await app.inject({
      method: "POST",
      url: "/trading/gates/kill-switch",
      payload: {
        enabled: false,
        now: "2026-06-22T09:05:00.000Z",
        reason: "Operator verified emergency stop reset."
      }
    });

    expect(control.statusCode).toBe(201);
    expect(control.json().controls.kill_switch_enabled).toBe(false);
    expect(await readFile(control.json().event_log, "utf8")).toContain("trading_kill_switch_updated");

    const restarted = createDaemonApp({
      memoryRoot,
      tradingConfig
    });
    const status = await restarted.inject({
      method: "GET",
      url: "/trading/status"
    });
    const body = status.json();
    expect(body.real_trading_enabled).toBe(false);
    expect(body.real_trading_gate.checks).toContainEqual(
      expect.objectContaining({
        id: "kill_switch",
        status: "pass"
      })
    );
    expect(body.real_trading_gate.blocked_reasons).not.toContain("Trading kill switch is enabled.");
    expect(body.real_trading_gate.blocked_reasons).toContain("Official broker API is not verified.");
  });
});
