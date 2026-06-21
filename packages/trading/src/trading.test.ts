import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendDryRunJournalEntry,
  createBrokerCapabilityRegistry,
  createDryRunJournalEntry,
  createStaticMarketDataAdapter,
  createTradingSignal,
  createTradingStatus,
  createWatchlistStore,
  ensureRealTradingBlocked,
  loadWatchlistStore,
  runRiskCheck,
  saveWatchlistStore,
  summarizeDryRunJournal
} from "./index.js";

describe("trading watch and dry-run foundations", () => {
  it("normalizes Korea and US watchlist symbols without credentials", () => {
    const store = createWatchlistStore([
      {
        market: "korea",
        symbol: " 005930 ",
        name: "Samsung Electronics"
      },
      {
        market: "us",
        symbol: " aapl ",
        name: "Apple"
      }
    ]);

    expect(store.items).toEqual([
      {
        id: "watch_korea_005930",
        market: "korea",
        symbol: "005930",
        name: "Samsung Electronics",
        enabled: true
      },
      {
        id: "watch_us_AAPL",
        market: "us",
        symbol: "AAPL",
        name: "Apple",
        enabled: true
      }
    ]);
  });

  it("creates default broker capabilities for configured broker candidates", () => {
    const registry = createBrokerCapabilityRegistry({
      toss: {
        enabled: true,
        priority: 1,
        mode: "candidate"
      },
      shinhan: {
        enabled: true,
        priority: 2,
        mode: "candidate"
      },
      samsung: {
        enabled: true,
        priority: 3,
        mode: "read_only_manual_reference"
      }
    });

    expect(registry.map((capability) => [capability.broker, capability.status])).toEqual([
      ["toss", "candidate"],
      ["shinhan", "candidate"],
      ["samsung", "read_only"]
    ]);
    expect(registry.every((capability) => capability.capabilities.order_create !== "supported")).toBe(true);
  });

  it("blocks every real order path when real trading is disabled", () => {
    expect(() =>
      ensureRealTradingBlocked({
        realTradingEnabled: false,
        requestedExecutionMode: "real"
      })
    ).toThrow("Real trading is disabled.");
  });

  it("creates visible trading status without enabling real trading", () => {
    const status = createTradingStatus({
      realTradingEnabled: false,
      brokers: {
        toss: {
          enabled: true,
          priority: 1,
          mode: "candidate"
        }
      },
      watchlist: [
        {
          market: "korea",
          symbol: "005930"
        }
      ]
    });

    expect(status.real_trading_enabled).toBe(false);
    expect(status.watchlist.count).toBe(1);
    expect(status.broker_capabilities).toContainEqual(
      expect.objectContaining({
        broker: "toss",
        status: "candidate"
      })
    );
    expect(status.blocked_actions).toContain("Real trading disabled.");
  });

  it("blocks real execution mode through deterministic risk checks", () => {
    const risk = runRiskCheck({
      now: "2026-06-22T09:00:00.000Z",
      dataTimestamp: "2026-06-22T08:59:00.000Z",
      executionMode: "real",
      realTradingEnabled: false,
      marketOpen: true,
      orderAmountKrwEquivalent: 50_000,
      dailyNewBuyKrwEquivalent: 50_000,
      policy: {
        maxOrderKrwEquivalent: 100_000,
        maxDailyNewBuyKrwEquivalent: 300_000,
        maxDataAgeMs: 5 * 60 * 1000,
        killSwitchEnabled: false
      }
    });

    expect(risk.status).toBe("blocked");
    expect(risk.reasons).toContain("Real trading is disabled.");
  });

  it("blocks stale data and oversized dry-run candidates", () => {
    const risk = runRiskCheck({
      now: "2026-06-22T09:10:00.000Z",
      dataTimestamp: "2026-06-22T09:00:00.000Z",
      executionMode: "dry_run",
      realTradingEnabled: false,
      marketOpen: true,
      orderAmountKrwEquivalent: 150_000,
      dailyNewBuyKrwEquivalent: 350_000,
      policy: {
        maxOrderKrwEquivalent: 100_000,
        maxDailyNewBuyKrwEquivalent: 300_000,
        maxDataAgeMs: 5 * 60 * 1000,
        killSwitchEnabled: false
      }
    });

    expect(risk.status).toBe("blocked");
    expect(risk.reasons).toEqual([
      "Market data is stale.",
      "Order amount exceeds max order limit.",
      "Daily new buy amount exceeds max daily limit."
    ]);
  });

  it("creates trading signals with runtime contract shape", () => {
    const signal = createTradingSignal({
      signalId: "signal_20260622_005930_watch",
      createdAt: "2026-06-22T09:00:00.000Z",
      market: "korea",
      symbol: "005930",
      strategyId: "watch_momentum",
      direction: "watch",
      confidence: "low",
      reason: "Initial deterministic watch candidate.",
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

    expect(signal.execution_mode).toBe("dry_run");
    expect(signal.risk_check.status).toBe("pass");
  });

  it("appends dry-run journal entries under memory logs", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-trading-"));
    const signal = createTradingSignal({
      signalId: "signal_20260622_AAPL_watch",
      createdAt: "2026-06-22T09:00:00.000Z",
      market: "us",
      symbol: "AAPL",
      strategyId: "watch_momentum",
      direction: "watch",
      confidence: "low",
      reason: "Initial deterministic watch candidate.",
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
    const entry = createDryRunJournalEntry({
      signal,
      createdAt: "2026-06-22T09:00:00.000Z",
      simulatedOrder: {
        side: "buy",
        quantity: 1,
        estimatedPrice: 100,
        currency: "USD"
      }
    });

    const result = await appendDryRunJournalEntry(memoryRoot, entry);

    expect(result.path).toContain("/logs/trading/2026-06.jsonl");
    const [line] = (await readFile(result.path, "utf8")).trim().split("\n");
    expect(JSON.parse(line)).toMatchObject({
      signal_id: "signal_20260622_AAPL_watch",
      execution_mode: "dry_run",
      simulated_order: {
        side: "buy",
        quantity: 1
      }
    });
  });

  it("reads quotes through a static market data adapter interface", async () => {
    const adapter = createStaticMarketDataAdapter({
      name: "manual_fixture",
      quotes: [
        {
          market: "us",
          symbol: "aapl",
          price: 100,
          currency: "USD",
          timestamp: "2026-06-22T09:00:00.000Z",
          sourceRefs: ["manual"]
        }
      ]
    });

    await expect(adapter.getQuote({ market: "us", symbol: "AAPL" })).resolves.toMatchObject({
      market: "us",
      symbol: "AAPL",
      price: 100,
      currency: "USD",
      timestamp: "2026-06-22T09:00:00.000Z",
      source_refs: ["manual"]
    });
    await expect(adapter.getQuote({ market: "korea", symbol: "005930" })).resolves.toBeNull();
  });

  it("summarizes dry-run journal history for trading status", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-trading-"));
    const signal = createTradingSignal({
      signalId: "signal_20260622_005930_blocked",
      createdAt: "2026-06-22T09:00:00.000Z",
      market: "korea",
      symbol: "005930",
      strategyId: "watch_momentum",
      direction: "watch",
      confidence: "low",
      reason: "Blocked deterministic watch candidate.",
      dataTimestamp: "2026-06-22T08:59:00.000Z",
      sourceRefs: ["watchlist"],
      riskCheck: {
        status: "blocked",
        reasons: ["Market data is stale."]
      },
      recommendedAction: "Review data freshness before dry-run.",
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
          estimatedPrice: 70_000,
          currency: "KRW"
        }
      })
    );

    await expect(summarizeDryRunJournal(memoryRoot, "2026-06")).resolves.toEqual({
      month: "2026-06",
      entries: 1,
      passed: 0,
      blocked: 1,
      latest_signal_id: "signal_20260622_005930_blocked"
    });
    await expect(summarizeDryRunJournal(memoryRoot, "2026-07")).resolves.toEqual({
      month: "2026-07",
      entries: 0,
      passed: 0,
      blocked: 0
    });
  });

  it("persists and restores a safe watchlist under memory data", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-trading-"));
    const store = createWatchlistStore([
      {
        market: "korea",
        symbol: "005930",
        name: "Samsung Electronics"
      },
      {
        market: "us",
        symbol: "msft",
        name: "Microsoft",
        enabled: false
      }
    ]);

    const result = await saveWatchlistStore(memoryRoot, store);
    const restored = await loadWatchlistStore(memoryRoot);

    expect(result.path).toContain("/data/trading/watchlist.json");
    expect(restored.items).toEqual([
      {
        id: "watch_korea_005930",
        market: "korea",
        symbol: "005930",
        name: "Samsung Electronics",
        enabled: true
      },
      {
        id: "watch_us_MSFT",
        market: "us",
        symbol: "MSFT",
        name: "Microsoft",
        enabled: false
      }
    ]);
  });
});
