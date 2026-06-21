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
});
