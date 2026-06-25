import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDaemonTelegramContext,
  createHttpTelegramDaemonClient,
  createTelegramAdapter,
  createTelegramAdapterStatus,
  handleTelegramCommand,
  notifyTelegramUsers,
  pushDailyBriefingSummary,
  redactTelegramSecrets
} from "./index.js";

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

  it("backs supported commands with daemon state", async () => {
    const cancelled: string[] = [];
    const daemonContext = createDaemonTelegramContext({
      getStatus: async () => ({
        app: {
          name: "Dore",
          mode: "local",
          uptime_ms: 125000
        },
        health: {
          status: "degraded",
          summary: {
            ok: 2,
            warning: 4,
            failed: 0
          }
        },
        runtime: {
          tasks: [
            {
              id: "task_running",
              title: "Build roadmap slice",
              status: "running"
            }
          ],
          approvals: [
            {
              id: "approval_1",
              title: "Approve file write",
              summary_for_user: "Write memory update",
              risk_level: "write",
              state: "pending"
            }
          ]
        }
      }),
      getLatestBriefing: async () => ({
        briefing: {
          date: "2026-06-22",
          status: "generated",
          delivery: {
            telegram_summary: "Dore Morning Briefing - 2026-06-22"
          }
        }
      }),
      getUsageSummary: async () => ({
        records: 3,
        estimated_cost_usd: 1.25,
        input_tokens: 300,
        output_tokens: 120,
        failed: 1
      }),
      listTasks: async () => [
        {
          id: "task_running",
          title: "Build roadmap slice",
          status: "running"
        }
      ],
      cancelTask: async (taskId, input) => {
        cancelled.push(`${taskId}:${input.reason}`);
        return {
          id: taskId,
          title: "Build roadmap slice",
          status: "cancelled"
        };
      }
    });

    await expect(command("/status", daemonContext)).resolves.toMatchObject({
      action: "reply",
      text: expect.stringContaining("Dore local")
    });
    await expect(command("/status", daemonContext)).resolves.toMatchObject({
      text: expect.stringContaining("running tasks: 1")
    });
    await expect(command("/status", daemonContext)).resolves.toMatchObject({
      text: expect.stringContaining("health: degraded")
    });
    await expect(command("/briefing", daemonContext)).resolves.toMatchObject({
      action: "reply",
      text: "Dore Morning Briefing - 2026-06-22"
    });
    await expect(command("/usage", daemonContext)).resolves.toMatchObject({
      text: "Usage: $1.25 month, 3 calls, 300 input tokens, 120 output tokens, 1 failed."
    });
    await expect(command("/stop", daemonContext)).resolves.toMatchObject({
      text: "Stop requested for task_running: Build roadmap slice."
    });
    expect(cancelled).toEqual(["task_running:Requested from Telegram /stop."]);
  });

  it("creates an HTTP daemon client for Telegram command handlers", async () => {
    const calls: Array<{ url: string; method: string; authorization?: string; body?: string }> = [];
    const client = createHttpTelegramDaemonClient({
      baseUrl: "http://127.0.0.1:4765",
      authToken: "secret_ref:daemon-token",
      fetch: async (url, init) => {
        calls.push({
          url: String(url),
          method: init?.method ?? "GET",
          authorization: init?.headers instanceof Headers ? init.headers.get("authorization") ?? undefined : undefined,
          body: typeof init?.body === "string" ? init.body : undefined
        });
        if (String(url).endsWith("/status")) {
          return jsonResponse({
            app: {
              name: "Dore",
              mode: "local",
              uptime_ms: 1000
            },
            runtime: {
              tasks: [],
              approvals: []
            }
          });
        }
        if (String(url).endsWith("/briefings/latest")) {
          return jsonResponse({
            briefing: {
              delivery: {
                telegram_summary: "Briefing from daemon"
              }
            }
          });
        }
        if (String(url).endsWith("/usage/summary")) {
          return jsonResponse({
            summary: {
              records: 1,
              estimated_cost_usd: 0.5,
              input_tokens: 10,
              output_tokens: 5,
              failed: 0
            }
          });
        }
        if (String(url).endsWith("/tasks")) {
          return jsonResponse({
            tasks: [
              {
                id: "task_1",
                title: "Running task",
                status: "running"
              }
            ]
          });
        }
        if (String(url).endsWith("/tasks/task_1/cancel")) {
          return jsonResponse({
            task: {
              id: "task_1",
              title: "Running task",
              status: "cancelled"
            }
          });
        }
        return jsonResponse({}, 404);
      }
    });

    await expect(client.getStatus()).resolves.toMatchObject({ app: { name: "Dore" } });
    await expect(client.getLatestBriefing()).resolves.toMatchObject({
      briefing: {
        delivery: {
          telegram_summary: "Briefing from daemon"
        }
      }
    });
    await expect(client.getUsageSummary()).resolves.toMatchObject({ estimated_cost_usd: 0.5 });
    await expect(client.listTasks?.()).resolves.toEqual([
      {
        id: "task_1",
        title: "Running task",
        status: "running"
      }
    ]);
    await expect(client.cancelTask("task_1", { reason: "Requested from Telegram /stop." })).resolves.toMatchObject({
      id: "task_1",
      status: "cancelled"
    });

    expect(calls).toContainEqual({
      url: "http://127.0.0.1:4765/tasks/task_1/cancel",
      method: "POST",
      authorization: "Bearer secret_ref:daemon-token",
      body: JSON.stringify({ reason: "Requested from Telegram /stop." })
    });
  });

  it("pushes daily briefing summaries to allowlisted users", async () => {
    const sent: Array<{ userId: number; text: string }> = [];

    const result = await pushDailyBriefingSummary({
      allowedUserIds: [123, 456],
      briefing: {
        date: "2026-06-22",
        status: "generated",
        delivery: {
          telegram_summary: "Dore Morning Briefing - 2026-06-22"
        }
      },
      outbound: {
        sendMessage: async (userId, text) => {
          sent.push({ userId, text });
        }
      }
    });

    expect(result).toEqual({ attempted: 2, delivered: 2, failed: 0 });
    expect(sent).toEqual([
      { userId: 123, text: "Dore Morning Briefing - 2026-06-22" },
      { userId: 456, text: "Dore Morning Briefing - 2026-06-22" }
    ]);
  });

  it("sends task, error, and approval notifications", async () => {
    const sent: string[] = [];

    const task = await notifyTelegramUsers({
      allowedUserIds: [123],
      notification: {
        type: "task_completed",
        task: {
          id: "task_done",
          title: "Finish roadmap update",
          status: "completed"
        }
      },
      outbound: {
        sendMessage: async (_userId, text) => {
          sent.push(text);
        }
      }
    });
    const error = await notifyTelegramUsers({
      allowedUserIds: [123],
      notification: {
        type: "task_failed",
        task: {
          id: "task_failed",
          title: "Run verifier",
          status: "failed"
        },
        error: "command exited 1"
      },
      outbound: {
        sendMessage: async (_userId, text) => {
          sent.push(text);
        }
      }
    });
    const approval = await notifyTelegramUsers({
      allowedUserIds: [123],
      notification: {
        type: "approval_requested",
        approval: {
          id: "approval_1",
          title: "Approve file write",
          summary_for_user: "Write local memory record",
          risk_level: "write",
          state: "pending"
        }
      },
      outbound: {
        sendMessage: async (_userId, text) => {
          sent.push(text);
        }
      }
    });

    expect(task.delivered).toBe(1);
    expect(error.delivered).toBe(1);
    expect(approval.delivered).toBe(1);
    expect(sent).toEqual([
      "Task completed: Finish roadmap update (task_done).",
      "Task failed: Run verifier (task_failed). command exited 1",
      "Approval requested: Approve file write [write]. Write local memory record"
    ]);
  });

  it("logs Telegram delivery failures without leaking tokens or secret references", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-telegram-"));
    const result = await notifyTelegramUsers({
      allowedUserIds: [123],
      memoryRoot,
      notification: {
        type: "task_failed",
        task: {
          id: "task_failed",
          title: "Run verifier",
          status: "failed"
        },
        error: "Bearer raw-token-123 failed with secret_ref:telegram-token and TELEGRAM_BOT_TOKEN=123456:ABC"
      },
      outbound: {
        sendMessage: async () => {
          throw new Error("send failed for Bearer raw-token-123 secret_ref:telegram-token 123456:ABC");
        }
      }
    });

    expect(result).toEqual({ attempted: 1, delivered: 0, failed: 1 });
    const log = await readFile(join(memoryRoot, "logs", "events", "telegram.jsonl"), "utf8");
    expect(log).toContain("telegram_delivery_failed");
    expect(log).toContain("[REDACTED_BEARER]");
    expect(log).toContain("[REDACTED_SECRET_REF]");
    expect(log).toContain("[REDACTED_TELEGRAM_TOKEN]");
    expect(log).not.toContain("raw-token-123");
    expect(log).not.toContain("secret_ref:telegram-token");
    expect(log).not.toContain("123456:ABC");
  });

  it("redacts Telegram token patterns from text", () => {
    expect(
      redactTelegramSecrets("TELEGRAM_BOT_TOKEN=123456:ABC Bearer raw-token secret_ref:telegram-token")
    ).toBe("TELEGRAM_BOT_TOKEN=[REDACTED_TELEGRAM_TOKEN] [REDACTED_BEARER] [REDACTED_SECRET_REF]");
  });
});

function command(text: string, commandContext = context) {
  return handleTelegramCommand(
    {
      userId: 123,
      text
    },
    {
      allowedUserIds: [123],
      context: commandContext
    }
  );
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}
