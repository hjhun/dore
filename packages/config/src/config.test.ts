import { describe, expect, it } from "vitest";
import { parseConfig } from "./index.js";

describe("config schema", () => {
  it("defaults real trading to disabled", () => {
    const config = parseConfig({
      app: {
        name: "Dore",
        timezone: "Asia/Seoul",
        locale: "ko-KR"
      }
    });

    expect(config.trading.real_trading_enabled).toBe(false);
  });

  it("accepts broker configuration without credentials", () => {
    const config = parseConfig({
      app: {
        name: "Dore",
        timezone: "Asia/Seoul",
        locale: "ko-KR"
      },
      trading: {
        brokers: {
          toss: {
            enabled: true,
            priority: 1,
            mode: "candidate"
          }
        }
      }
    });

    expect(config.trading.brokers.toss.mode).toBe("candidate");
  });
});

