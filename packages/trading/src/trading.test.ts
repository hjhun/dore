import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assessBrokerConnectorInputPacket,
  appendDryRunJournalEntry,
  appendPaperJournalEntry,
  createBrokerCapabilityRegistry,
  createDryRunJournalEntry,
  createPaperJournalEntry,
  createStaticMarketDataAdapter,
  createStrategySignal,
  createStrategyTemplates,
  createTradingSignal,
  createTradingStatus,
  createWatchlistStore,
  evaluateMarketDataSources,
  ensureRealTradingBlocked,
  loadWatchlistStore,
  loadBrokerConnectorInputPacketFile,
  loadRealTradingGateControls,
  createRealTradingGateStatus,
  runRiskCheck,
  saveRealTradingGateControls,
  saveWatchlistStore,
  summarizeDryRunJournal,
  summarizeTradingJournal
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

  it("keeps pilot real trading blocked until every M6 gate passes", () => {
    const gate = createRealTradingGateStatus({
      realTradingRequested: true,
      explicitEnable: true,
      officialApiVerified: false,
      termsVerified: false,
      brokerCredentialRefs: {},
      dryRunObservedDays: 0,
      dryRunMinDays: 30,
      killSwitchEnabled: true,
      approvalRequired: true,
      approvalGranted: false,
      riskLimits: {}
    });
    const status = createTradingStatus({
      realTradingEnabled: gate.status === "ready",
      realTradingGate: gate
    });

    expect(gate.status).toBe("blocked");
    expect(gate.blocked_reasons).toEqual([
      "Official broker API is not verified.",
      "Broker API terms are not verified.",
      "Broker credential secret references are missing.",
      "Dry-run history is shorter than the required minimum.",
      "Trading kill switch is enabled.",
      "User approval is required for pilot real trading.",
      "Pilot risk limits are incomplete."
    ]);
    expect(status.real_trading_enabled).toBe(false);
    expect(status.blocked_actions).toContain("Official broker API is not verified.");
  });

  it("marks pilot real trading gates ready only with explicit config and references", () => {
    const gate = createRealTradingGateStatus({
      realTradingRequested: true,
      explicitEnable: true,
      officialApiVerified: true,
      termsVerified: true,
      brokerCredentialRefs: {
        toss: {
          app_key_secret_ref: "secret_ref:brokers/toss/app_key",
          app_secret_secret_ref: "secret_ref:brokers/toss/app_secret",
          account_secret_ref: "secret_ref:brokers/toss/account"
        }
      },
      dryRunObservedDays: 30,
      dryRunMinDays: 30,
      killSwitchEnabled: false,
      approvalRequired: true,
      approvalGranted: true,
      riskLimits: {
        max_order_krw_equivalent: 100_000,
        max_daily_new_buy_krw_equivalent: 300_000,
        max_daily_loss_krw_equivalent: 100_000,
        max_position_pct: 10
      }
    });

    expect(gate.status).toBe("ready");
    expect(gate.blocked_reasons).toEqual([]);
    expect(gate.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("persists pilot real trading gate controls under memory data", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-trading-"));

    const result = await saveRealTradingGateControls(memoryRoot, {
      approval_granted: true,
      kill_switch_enabled: false,
      updated_at: "2026-06-22T09:00:00.000Z",
      updated_by: "user"
    });
    const restored = await loadRealTradingGateControls(memoryRoot);

    expect(result.path).toContain("/data/trading/real-trading-gates.json");
    expect(restored).toEqual({
      approval_granted: true,
      kill_switch_enabled: false,
      updated_at: "2026-06-22T09:00:00.000Z",
      updated_by: "user"
    });
  });

  it("evaluates market data source freshness for Korea and US watchlists", () => {
    const status = evaluateMarketDataSources({
      now: "2026-06-22T09:10:00.000Z",
      maxAgeMs: 5 * 60 * 1000,
      watchlist: createWatchlistStore([
        { market: "korea", symbol: "005930" },
        { market: "us", symbol: "AAPL" }
      ]),
      quotes: [
        {
          market: "korea",
          symbol: "005930",
          price: 70000,
          currency: "KRW",
          timestamp: "2026-06-22T09:09:00.000Z",
          source_refs: ["manual"]
        }
      ]
    });

    expect(status).toEqual([
      {
        market: "korea",
        status: "ok",
        checked_symbols: 1,
        blocked_reasons: [],
        latest_timestamp: "2026-06-22T09:09:00.000Z"
      },
      {
        market: "us",
        status: "missing",
        checked_symbols: 1,
        blocked_reasons: ["Missing market data for AAPL."],
        latest_timestamp: undefined
      }
    ]);
  });

  it("defines strategy templates with review cadence", () => {
    expect(createStrategyTemplates().map((template) => template.id)).toEqual([
      "momentum_watch",
      "mean_reversion_watch",
      "portfolio_rebalance",
      "event_watch",
      "long_term_thesis"
    ]);
    expect(createStrategyTemplates()[0]).toMatchObject({
      review_cadence: "daily"
    });
  });

  it("creates deterministic strategy signals from fresh market data", () => {
    const signal = createStrategySignal({
      templateId: "momentum_watch",
      now: "2026-06-22T09:10:00.000Z",
      quote: {
        market: "us",
        symbol: "AAPL",
        price: 100,
        currency: "USD",
        timestamp: "2026-06-22T09:09:00.000Z",
        source_refs: ["manual"]
      },
      executionMode: "paper",
      marketOpen: true,
      policy: {
        maxOrderKrwEquivalent: 1_000_000,
        maxDailyNewBuyKrwEquivalent: 3_000_000,
        maxDataAgeMs: 5 * 60 * 1000,
        killSwitchEnabled: false
      }
    });

    expect(signal).toMatchObject({
      signal_id: "signal_20260622_AAPL_momentum_watch",
      strategy_id: "momentum_watch",
      execution_mode: "paper",
      risk_check: {
        status: "pass"
      }
    });
  });

  it("blocks strategy signals when market data is missing, stale, or conflicting", () => {
    const statuses = evaluateMarketDataSources({
      now: "2026-06-22T09:10:00.000Z",
      maxAgeMs: 5 * 60 * 1000,
      watchlist: createWatchlistStore([{ market: "us", symbol: "AAPL" }]),
      quotes: [
        {
          market: "us",
          symbol: "AAPL",
          price: 100,
          currency: "USD",
          timestamp: "2026-06-22T08:00:00.000Z",
          source_refs: ["manual"],
          conflict: "manual quote differs from broker quote"
        }
      ]
    });

    expect(statuses.find((status) => status.market === "us")).toMatchObject({
      status: "conflicting",
      blocked_reasons: expect.arrayContaining(["Conflicting market data for AAPL.", "Stale market data for AAPL."])
    });
  });

  it("records paper-mode orders without broker submission", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-trading-"));
    const signal = createStrategySignal({
      templateId: "momentum_watch",
      now: "2026-06-22T09:10:00.000Z",
      quote: {
        market: "us",
        symbol: "AAPL",
        price: 100,
        currency: "USD",
        timestamp: "2026-06-22T09:09:00.000Z",
        source_refs: ["manual"]
      },
      executionMode: "paper",
      marketOpen: true,
      policy: {
        maxOrderKrwEquivalent: 1_000_000,
        maxDailyNewBuyKrwEquivalent: 3_000_000,
        maxDataAgeMs: 5 * 60 * 1000,
        killSwitchEnabled: false
      }
    });

    const result = await appendPaperJournalEntry(
      memoryRoot,
      createPaperJournalEntry({
        signal,
        createdAt: "2026-06-22T09:11:00.000Z",
        simulatedOrder: {
          side: "buy",
          quantity: 1,
          estimatedPrice: 100,
          currency: "USD"
        },
        postReview: "Paper fill tracked locally."
      })
    );

    expect(result.entry).toMatchObject({
      execution_mode: "paper",
      broker_order_submitted: false,
      post_review: "Paper fill tracked locally."
    });
    await expect(summarizeTradingJournal(memoryRoot, "2026-06")).resolves.toMatchObject({
      month: "2026-06",
      dry_run_entries: 0,
      paper_entries: 1,
      latest_signal_id: "signal_20260622_AAPL_momentum_watch"
    });
  });

  it("exposes market data and paper journal summaries through trading status", () => {
    const status = createTradingStatus({
      realTradingEnabled: false,
      marketDataSources: [
        {
          market: "us",
          status: "ok",
          checked_symbols: 1,
          blocked_reasons: [],
          latest_timestamp: "2026-06-22T09:09:00.000Z"
        }
      ],
      paperJournal: {
        month: "2026-06",
        dry_run_entries: 0,
        paper_entries: 1,
        latest_signal_id: "signal_20260622_AAPL_momentum_watch"
      }
    });

    expect(status.market_data_sources).toContainEqual(expect.objectContaining({ market: "us", status: "ok" }));
    expect(status.paper_journal).toMatchObject({ paper_entries: 1 });
  });

  it("keeps M16 broker connector planning blocked when official inputs are missing", () => {
    const readiness = assessBrokerConnectorInputPacket({
      brokerName: "",
      targetMarkets: [],
      officialDocumentationRefs: [],
      officialTermsRefs: [],
      authenticationVerified: false,
      termsAndAccountConstraintsVerified: false,
      credentialRefs: {},
      paperOrSandboxVerified: false,
      pilotRiskLimits: {},
      approvalPolicy: {},
      explicitUserApprovalToStartM16: false
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.can_start_m16).toBe(false);
    expect(readiness.blocked_reasons).toEqual([
      "Broker/API target is missing.",
      "Target market is missing.",
      "Official broker/API documentation is missing.",
      "Official API terms or account constraints are missing.",
      "API authentication requirements are not verified.",
      "Terms and account constraints are not verified.",
      "Broker credential secret references are missing.",
      "Paper/sandbox availability is not verified or explicitly unavailable.",
      "Pilot risk limits are incomplete.",
      "Approval policy is incomplete.",
      "User has not explicitly approved starting M16 connector planning."
    ]);
  });

  it("marks M16 broker connector planning ready only with official refs and secret refs", () => {
    const readiness = assessBrokerConnectorInputPacket({
      brokerName: "Toss Securities",
      targetMarkets: ["korea", "us"],
      officialDocumentationRefs: ["docs/broker/toss-api.md"],
      officialTermsRefs: ["docs/broker/toss-terms.md"],
      authenticationVerified: true,
      termsAndAccountConstraintsVerified: true,
      credentialRefs: {
        toss: {
          app_key_secret_ref: "secret_ref:brokers/toss/app_key",
          app_secret_secret_ref: "secret_ref:brokers/toss/app_secret",
          account_secret_ref: "secret_ref:brokers/toss/account"
        }
      },
      paperOrSandboxVerified: true,
      pilotRiskLimits: {
        max_order_krw_equivalent: 100_000,
        max_daily_new_buy_krw_equivalent: 300_000,
        max_daily_loss_krw_equivalent: 100_000,
        max_position_pct: 10
      },
      approvalPolicy: {
        approvalChannel: "desktop",
        killSwitchOwner: "user"
      },
      explicitUserApprovalToStartM16: true
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.can_start_m16).toBe(true);
    expect(readiness.blocked_reasons).toEqual([]);
    expect(readiness.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("rejects raw credential values in M16 broker connector input", () => {
    const readiness = assessBrokerConnectorInputPacket({
      brokerName: "Toss Securities",
      targetMarkets: ["korea"],
      officialDocumentationRefs: ["docs/broker/toss-api.md"],
      officialTermsRefs: ["docs/broker/toss-terms.md"],
      authenticationVerified: true,
      termsAndAccountConstraintsVerified: true,
      credentialRefs: {
        toss: {
          app_key_secret_ref: "plain-app-key",
          app_secret_secret_ref: "secret_ref:brokers/toss/app_secret",
          account_secret_ref: "secret_ref:brokers/toss/account"
        }
      },
      paperOrSandboxVerified: true,
      pilotRiskLimits: {
        max_order_krw_equivalent: 100_000,
        max_daily_new_buy_krw_equivalent: 300_000,
        max_daily_loss_krw_equivalent: 100_000,
        max_position_pct: 10
      },
      approvalPolicy: {
        approvalChannel: "desktop",
        killSwitchOwner: "user"
      },
      explicitUserApprovalToStartM16: true
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.blocked_reasons).toContain("Broker credential references must use secret_ref: values only.");
  });

  it("loads an M16 broker connector input packet from JSON", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-trading-"));
    const path = join(memoryRoot, "m16-input.json");
    await writeFile(
      path,
      `${JSON.stringify(
        {
          brokerName: "Toss Securities",
          targetMarkets: ["korea"],
          officialDocumentationRefs: ["docs/broker/toss-api.md"],
          officialTermsRefs: ["docs/broker/toss-terms.md"],
          authenticationVerified: true,
          termsAndAccountConstraintsVerified: true,
          credentialRefs: {
            toss: {
              app_key_secret_ref: "secret_ref:brokers/toss/app_key",
              app_secret_secret_ref: "secret_ref:brokers/toss/app_secret",
              account_secret_ref: "secret_ref:brokers/toss/account"
            }
          },
          paperOrSandboxVerified: true,
          pilotRiskLimits: {
            max_order_krw_equivalent: 100_000,
            max_daily_new_buy_krw_equivalent: 300_000,
            max_daily_loss_krw_equivalent: 100_000,
            max_position_pct: 10
          },
          approvalPolicy: {
            approvalChannel: "desktop",
            killSwitchOwner: "user"
          },
          explicitUserApprovalToStartM16: true
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const packet = await loadBrokerConnectorInputPacketFile(path);
    const readiness = assessBrokerConnectorInputPacket(packet);

    expect(packet.brokerName).toBe("Toss Securities");
    expect(readiness.status).toBe("ready");
  });
});
