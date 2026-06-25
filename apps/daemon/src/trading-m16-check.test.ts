import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveM16InputPacketPath, runM16BrokerInputCheck } from "./trading-m16-check.js";

describe("M16 broker input check CLI helpers", () => {
  it("resolves the input packet path from argv or environment", () => {
    expect(resolveM16InputPacketPath(["node", "cli", "packet.json"], {})).toBe("packet.json");
    expect(resolveM16InputPacketPath(["node", "cli"], { DORE_M16_INPUT_PACKET: "env-packet.json" })).toBe(
      "env-packet.json"
    );
    expect(resolveM16InputPacketPath(["node", "cli"], {})).toBeNull();
  });

  it("returns exit code 0 when a filled M16 input packet is ready", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dore-m16-"));
    const path = join(dir, "ready.json");
    await writeFile(
      path,
      JSON.stringify({
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
          max_order_krw_equivalent: 100000,
          max_daily_new_buy_krw_equivalent: 300000,
          max_daily_loss_krw_equivalent: 100000,
          max_position_pct: 10
        },
        approvalPolicy: {
          approvalChannel: "desktop",
          killSwitchOwner: "user"
        },
        explicitUserApprovalToStartM16: true
      }),
      "utf8"
    );

    const result = await runM16BrokerInputCheck({ packetPath: path });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain("M16 broker input: ready");
    expect(result.readiness.can_start_m16).toBe(true);
  });

  it("returns exit code 1 and blocked reasons when the packet is incomplete", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dore-m16-"));
    const path = join(dir, "blocked.json");
    await writeFile(path, JSON.stringify({ brokerName: "" }), "utf8");

    const result = await runM16BrokerInputCheck({ packetPath: path });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain("M16 broker input: blocked");
    expect(result.readiness.blocked_reasons).toContain("Official broker/API documentation is missing.");
  });
});
