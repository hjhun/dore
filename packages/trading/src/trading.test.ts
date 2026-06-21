import { describe, expect, it } from "vitest";
import {
  createBrokerCapabilityRegistry,
  createTradingStatus,
  createWatchlistStore,
  ensureRealTradingBlocked
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
});
