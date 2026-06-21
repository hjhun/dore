import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDaemonApp } from "./server.js";

describe("daemon engineering routes", () => {
  it("creates an engineering intake task with persisted drafts and event log", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-engineering-"));
    const app = createDaemonApp({
      memoryRoot,
      projectRoot: "/workspace/dore",
      packageJson: {
        scripts: {
          test: "vitest run",
          build: "tsc -p tsconfig.json"
        }
      },
      engineeringExecFile: async (_command, args) => {
        if (args.join(" ") === "-C /workspace/dore branch --show-current") {
          return { stdout: "feature/m4\n" };
        }
        if (args.join(" ") === "-C /workspace/dore status --short") {
          return { stdout: "" };
        }
        throw new Error(`unexpected args: ${args.join(" ")}`);
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/engineering/intake",
      payload: {
        idea: "Add daemon task wrapper",
        requested_by: "hjhun",
        now: "2026-06-22T00:00:00.000Z"
      }
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.task_id).toBe("intake_2026_06_22_add_daemon_task_wrapper");
    expect(body.drafts.requirements).toContain("/operations/engineering/");
    expect(await readFile(body.drafts.requirements, "utf8")).toContain("Add daemon task wrapper");
    expect(await readFile(body.event_log, "utf8")).toContain("Engineering intake planned");

    const statusResponse = await app.inject({
      method: "GET",
      url: "/status"
    });
    expect(statusResponse.json().engineering.tasks).toContainEqual(
      expect.objectContaining({
        id: "intake_2026_06_22_add_daemon_task_wrapper",
        title: "Add daemon task wrapper",
        status: "planned"
      })
    );
  });

  it("rejects empty engineering intake ideas", async () => {
    const app = createDaemonApp();

    const response = await app.inject({
      method: "POST",
      url: "/engineering/intake",
      payload: {
        idea: " "
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("idea_required");
  });

  it("records engineering execution outcomes and updates task status", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-engineering-"));
    const app = createDaemonApp({
      memoryRoot,
      projectRoot: "/workspace/dore",
      engineeringExecFile: async (_command, args) => {
        if (args.join(" ") === "-C /workspace/dore branch --show-current") {
          return { stdout: "feature/m4\n" };
        }
        if (args.join(" ") === "-C /workspace/dore status --short") {
          return { stdout: "" };
        }
        throw new Error(`unexpected args: ${args.join(" ")}`);
      }
    });

    const intakeResponse = await app.inject({
      method: "POST",
      url: "/engineering/intake",
      payload: {
        idea: "Record execution route",
        now: "2026-06-22T00:00:00.000Z"
      }
    });
    const taskId = intakeResponse.json().task_id;

    const executionResponse = await app.inject({
      method: "POST",
      url: `/engineering/tasks/${taskId}/executions`,
      payload: {
        command: "pnpm test",
        exit_code: 0,
        started_at: "2026-06-22T00:00:00.000Z",
        completed_at: "2026-06-22T00:00:02.000Z",
        output: "ok"
      }
    });

    expect(executionResponse.statusCode).toBe(201);
    expect(executionResponse.json().task_status).toBe("completed");
    expect(await readFile(executionResponse.json().event_log, "utf8")).toContain("Engineering verification passed");

    const statusResponse = await app.inject({
      method: "GET",
      url: "/status"
    });
    expect(statusResponse.json().engineering.tasks).toContainEqual(
      expect.objectContaining({
        id: taskId,
        status: "completed",
        last_command: "pnpm test"
      })
    );
  });

  it("restores engineering task history from memory after daemon restart", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-engineering-"));
    const firstApp = createDaemonApp({
      memoryRoot,
      projectRoot: "/workspace/dore",
      engineeringExecFile: async (_command, args) => {
        if (args.join(" ") === "-C /workspace/dore branch --show-current") {
          return { stdout: "feature/m4\n" };
        }
        if (args.join(" ") === "-C /workspace/dore status --short") {
          return { stdout: "" };
        }
        throw new Error(`unexpected args: ${args.join(" ")}`);
      }
    });

    const intakeResponse = await firstApp.inject({
      method: "POST",
      url: "/engineering/intake",
      payload: {
        idea: "Restore task history",
        now: "2026-06-22T00:00:00.000Z"
      }
    });

    await firstApp.inject({
      method: "POST",
      url: `/engineering/tasks/${intakeResponse.json().task_id}/executions`,
      payload: {
        command: "pnpm test",
        exit_code: 0,
        started_at: "2026-06-22T00:00:00.000Z",
        completed_at: "2026-06-22T00:00:02.000Z",
        output: "ok"
      }
    });

    const restartedApp = createDaemonApp({
      memoryRoot
    });
    const statusResponse = await restartedApp.inject({
      method: "GET",
      url: "/status"
    });

    expect(statusResponse.json().engineering.tasks).toContainEqual(
      expect.objectContaining({
        id: "intake_2026_06_22_restore_task_history",
        title: "Restore task history",
        status: "completed",
        last_command: "pnpm test"
      })
    );
  });

  it("runs allowed engineering task commands through the executor route", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-engineering-"));
    const app = createDaemonApp({
      memoryRoot,
      projectRoot: "/workspace/dore",
      engineeringExecFile: async (_command, args) => {
        if (args.join(" ") === "-C /workspace/dore branch --show-current") {
          return { stdout: "feature/m4\n" };
        }
        if (args.join(" ") === "-C /workspace/dore status --short") {
          return { stdout: "" };
        }
        throw new Error(`unexpected args: ${args.join(" ")}`);
      },
      engineeringCommandExecFile: async (command, args) => {
        expect(command).toBe("pnpm");
        expect(args).toEqual(["test"]);
        return {
          stdout: "ok",
          stderr: ""
        };
      }
    });

    const intakeResponse = await app.inject({
      method: "POST",
      url: "/engineering/intake",
      payload: {
        idea: "Run executor command",
        now: "2026-06-22T00:00:00.000Z"
      }
    });

    const runResponse = await app.inject({
      method: "POST",
      url: `/engineering/tasks/${intakeResponse.json().task_id}/run-command`,
      payload: {
        command: "pnpm test",
        now: "2026-06-22T00:00:00.000Z"
      }
    });

    expect(runResponse.statusCode).toBe(201);
    expect(runResponse.json().execution.status).toBe("passed");
    expect(runResponse.json().task_status).toBe("completed");
  });

  it("rejects disallowed engineering task commands", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-engineering-"));
    const app = createDaemonApp({
      memoryRoot
    });

    const response = await app.inject({
      method: "POST",
      url: "/engineering/tasks/missing/run-command",
      payload: {
        command: "rm -rf memory"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("command_not_allowed");
  });
});
