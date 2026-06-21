import { describe, expect, it } from "vitest";
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
});
