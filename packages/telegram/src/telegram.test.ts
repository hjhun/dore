import { describe, expect, it } from "vitest";
import { createTelegramAdapter, createTelegramAdapterStatus, handleTelegramCommand } from "./index.js";

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

  it("does not start long polling when disabled", async () => {
    let starts = 0;
    const adapter = createTelegramAdapter({
      enabled: true,
      botToken: "",
      allowedUserIds: [123],
      poll: async () => {
        starts += 1;
      }
    });

    const start = await adapter.start();

    expect(start).toMatchObject({ started: false, reason: "missing_token" });
    expect(adapter.getState()).toBe("disabled");
    expect(starts).toBe(0);
  });

  it("starts and stops long polling without real network calls", async () => {
    let starts = 0;
    let stops = 0;
    const adapter = createTelegramAdapter({
      enabled: true,
      botToken: "token-ref",
      allowedUserIds: [123],
      poll: async (signal) => {
        starts += 1;
        signal.addEventListener("abort", () => {
          stops += 1;
        });
      }
    });

    const start = await adapter.start();
    adapter.stop();

    expect(start).toMatchObject({ started: true });
    expect(adapter.getState()).toBe("stopped");
    expect(starts).toBe(1);
    expect(stops).toBe(1);
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
