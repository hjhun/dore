import { describe, expect, it } from "vitest";
import { createTelegramAdapterStatus, handleTelegramCommand } from "./index.js";

const context = {
  getStatus: async () => "Dore is running.",
  getBriefing: async () => "Latest briefing summary.",
  getUsage: async () => "Usage: 0 USD today.",
  requestStop: async () => "Stop requested."
};

describe("telegram command handling", () => {
  it("ignores commands when allowlist is empty", async () => {
    const response = await handleTelegramCommand(
      {
        userId: 123,
        text: "/status"
      },
      {
        allowedUserIds: [],
        context
      }
    );

    expect(response.action).toBe("ignored");
  });

  it("rejects users outside the allowlist", async () => {
    const response = await handleTelegramCommand(
      {
        userId: 999,
        text: "/status"
      },
      {
        allowedUserIds: [123],
        context
      }
    );

    expect(response.action).toBe("rejected");
  });

  it("routes supported commands for allowed users", async () => {
    await expect(command("/status")).resolves.toMatchObject({ action: "reply", text: "Dore is running." });
    await expect(command("/briefing")).resolves.toMatchObject({
      action: "reply",
      text: "Latest briefing summary."
    });
    await expect(command("/usage")).resolves.toMatchObject({ action: "reply", text: "Usage: 0 USD today." });
    await expect(command("/stop")).resolves.toMatchObject({ action: "reply", text: "Stop requested." });
  });

  it("keeps the adapter disabled without token or allowlist", () => {
    expect(
      createTelegramAdapterStatus({
        enabled: true,
        botToken: "",
        allowedUserIds: [123]
      })
    ).toMatchObject({ state: "disabled", reason: "missing_token" });

    expect(
      createTelegramAdapterStatus({
        enabled: true,
        botToken: "secret-ref-present",
        allowedUserIds: []
      })
    ).toMatchObject({ state: "disabled", reason: "empty_allowlist" });
  });
});

function command(text: string) {
  return handleTelegramCommand(
    {
      userId: 123,
      text
    },
    {
      allowedUserIds: [123],
      context
    }
  );
}
