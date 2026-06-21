import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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
});
