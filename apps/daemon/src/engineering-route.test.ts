import { mkdtemp, readFile, writeFile } from "node:fs/promises";
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
        status: "planned",
        loop_status: {
          iteration_budget: {
            max: 7,
            used: 2,
            remaining: 5,
            exhausted: false
          },
          retry_state: {
            failed_verification_retry_attempted: false,
            file_mutation_retry_attempted: false,
            review_retry_attempted: false
          },
          exit_reason: "workflow_in_progress",
          next_action: "Continue the development workflow at the current in-progress stage."
        },
        stages: expect.arrayContaining([
          expect.objectContaining({ kind: "plan", status: "in_progress" }),
          expect.objectContaining({ kind: "patch", status: "pending" }),
          expect.objectContaining({ kind: "verify", status: "pending" }),
          expect.objectContaining({ kind: "review", status: "pending" }),
          expect.objectContaining({ kind: "memory_reflection", status: "pending" })
        ])
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

  it("records failed engineering verification summaries and likely next actions", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-engineering-"));
    const app = createDaemonApp({
      memoryRoot,
      projectRoot: "/workspace/dore",
      engineeringExecFile: async (_command, args) => {
        if (args.join(" ") === "-C /workspace/dore branch --show-current") {
          return { stdout: "feature/m21\n" };
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
        idea: "Summarize failed verification",
        now: "2026-06-22T09:00:00.000Z"
      }
    });
    const taskId = intakeResponse.json().task_id;

    const executionResponse = await app.inject({
      method: "POST",
      url: `/engineering/tasks/${taskId}/executions`,
      payload: {
        command: "pnpm build",
        exit_code: 2,
        started_at: "2026-06-22T09:00:00.000Z",
        completed_at: "2026-06-22T09:00:04.000Z",
        output: "src/app.ts(12,5): error TS2304: Cannot find name 'missingValue'."
      }
    });

    expect(executionResponse.statusCode).toBe(201);
    expect(executionResponse.json()).toMatchObject({
      task_status: "failed",
      failed_verification: {
        command: "pnpm build",
        summary: "pnpm build failed with exit code 2.",
        likely_next_action: "Fix the TypeScript/build error, then rerun pnpm build.",
        output_summary: "src/app.ts(12,5): error TS2304: Cannot find name 'missingValue'."
      },
      loop_status: {
        iteration_budget: {
          max: 7,
          used: 4,
          remaining: 3,
          exhausted: false
        },
        retry_state: {
          failed_verification_retry_attempted: true,
          file_mutation_retry_attempted: false,
          review_retry_attempted: false
        },
        exit_reason: "failed_verification",
        next_action: "Fix the TypeScript/build error, then rerun pnpm build."
      }
    });

    const statusResponse = await app.inject({
      method: "GET",
      url: "/status"
    });
    expect(statusResponse.json().engineering.tasks).toContainEqual(
      expect.objectContaining({
        id: taskId,
        status: "failed",
        failed_verification: expect.objectContaining({
          summary: "pnpm build failed with exit code 2.",
          likely_next_action: "Fix the TypeScript/build error, then rerun pnpm build."
        })
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

  it("stores severity-ordered code review reports for engineering tasks", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-engineering-"));
    const app = createDaemonApp({
      memoryRoot,
      projectRoot: "/workspace/dore",
      engineeringExecFile: async (_command, args) => {
        if (args.join(" ") === "-C /workspace/dore branch --show-current") {
          return { stdout: "feature/m21\n" };
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
        idea: "Store code review report",
        now: "2026-06-22T10:00:00.000Z"
      }
    });
    const taskId = intakeResponse.json().task_id;

    const reviewResponse = await app.inject({
      method: "POST",
      url: `/engineering/tasks/${taskId}/review-report`,
      payload: {
        findings: [
          {
            category: "style",
            severity: "low",
            file: "src/view.ts",
            line: 40,
            message: "Name can be clearer."
          },
          {
            category: "bug",
            severity: "high",
            file: "src/runner.ts",
            line: 12,
            message: "Cancellation result is ignored."
          }
        ]
      }
    });

    expect(reviewResponse.statusCode).toBe(201);
    expect(reviewResponse.json().review_report.findings.map((finding: { reference: string }) => finding.reference)).toEqual([
      "src/runner.ts:12",
      "src/view.ts:40"
    ]);
    expect(await readFile(reviewResponse.json().event_log, "utf8")).toContain("Engineering code review report recorded");

    const statusResponse = await app.inject({
      method: "GET",
      url: "/status"
    });
    expect(statusResponse.json().engineering.tasks).toContainEqual(
      expect.objectContaining({
        id: taskId,
        review_report: expect.objectContaining({
          findings: [
            expect.objectContaining({ category: "bug", reference: "src/runner.ts:12" }),
            expect.objectContaining({ category: "style", reference: "src/view.ts:40" })
          ]
        })
      })
    );
  });

  it("stores high-risk engineering action reviews for workflow visibility", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-engineering-"));
    const app = createDaemonApp({
      memoryRoot,
      projectRoot: "/workspace/dore",
      engineeringExecFile: async (_command, args) => {
        if (args.join(" ") === "-C /workspace/dore branch --show-current") {
          return { stdout: "feature/m21\n" };
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
        idea: "Review workflow risk",
        now: "2026-06-22T10:30:00.000Z"
      }
    });
    const taskId = intakeResponse.json().task_id;

    const riskResponse = await app.inject({
      method: "POST",
      url: `/engineering/tasks/${taskId}/risk-review`,
      payload: {
        kind: "destructive_command",
        target: "rm -rf memory"
      }
    });

    expect(riskResponse.statusCode).toBe(201);
    expect(riskResponse.json()).toMatchObject({
      risk_review: {
        kind: "destructive_command",
        target: "rm -rf memory",
        approval_required: true,
        risk_level: "critical",
        reason: "Destructive command requires approval: rm -rf memory"
      }
    });
    expect(await readFile(riskResponse.json().event_log, "utf8")).toContain("Engineering risk review recorded");

    const statusResponse = await app.inject({
      method: "GET",
      url: "/status"
    });
    expect(statusResponse.json().engineering.tasks).toContainEqual(
      expect.objectContaining({
        id: taskId,
        risk_review: expect.objectContaining({
          approval_required: true,
          risk_level: "critical"
        })
      })
    );
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

  it("applies controlled file edits through the engineering task route", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-engineering-"));
    const projectRoot = await mkdtemp(join(tmpdir(), "dore-daemon-project-"));
    const targetPath = join(projectRoot, "notes.md");
    await writeFile(targetPath, "status: planned\n", "utf8");
    const app = createDaemonApp({
      memoryRoot,
      projectRoot,
      engineeringExecFile: async (_command, args) => {
        if (args.join(" ") === `-C ${projectRoot} branch --show-current`) {
          return { stdout: "feature/m4\n" };
        }
        if (args.join(" ") === `-C ${projectRoot} status --short`) {
          return { stdout: "" };
        }
        throw new Error(`unexpected args: ${args.join(" ")}`);
      }
    });

    const intakeResponse = await app.inject({
      method: "POST",
      url: "/engineering/intake",
      payload: {
        idea: "Apply file edit",
        now: "2026-06-22T00:00:00.000Z"
      }
    });

    const editResponse = await app.inject({
      method: "POST",
      url: `/engineering/tasks/${intakeResponse.json().task_id}/apply-edit`,
      payload: {
        path: "notes.md",
        find: "planned",
        replace: "implemented"
      }
    });

    expect(editResponse.statusCode).toBe(201);
    expect(editResponse.json().edit.status).toBe("applied");
    expect(editResponse.json().mutation_proof).toEqual({
      target: "notes.md",
      landed: true,
      status: "applied",
      evidence: "applied 1 exact replacement"
    });
    expect(editResponse.json().task_status).toBe("planned");
    expect(await readFile(targetPath, "utf8")).toBe("status: implemented\n");
    const eventLog = await readFile(editResponse.json().event_log, "utf8");
    expect(eventLog).toContain("Engineering file edit applied");
    expect(eventLog).toContain('"landed":true');
  });

  it("rejects controlled file edits outside the project root", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-engineering-"));
    const projectRoot = await mkdtemp(join(tmpdir(), "dore-daemon-project-"));
    const app = createDaemonApp({
      memoryRoot,
      projectRoot
    });

    const response = await app.inject({
      method: "POST",
      url: "/engineering/tasks/missing/apply-edit",
      payload: {
        path: "../outside.md",
        find: "planned",
        replace: "implemented"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("file_edit_not_allowed");
  });

  it("rejects controlled file edits when the exact text is not found", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-daemon-engineering-"));
    const projectRoot = await mkdtemp(join(tmpdir(), "dore-daemon-project-"));
    await writeFile(join(projectRoot, "notes.md"), "status: planned\n", "utf8");
    const app = createDaemonApp({
      memoryRoot,
      projectRoot
    });

    const intakeResponse = await app.inject({
      method: "POST",
      url: "/engineering/intake",
      payload: {
        idea: "Reject missing edit text",
        now: "2026-06-22T00:00:00.000Z"
      }
    });

    const response = await app.inject({
      method: "POST",
      url: `/engineering/tasks/${intakeResponse.json().task_id}/apply-edit`,
      payload: {
        path: "notes.md",
        find: "missing",
        replace: "implemented"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("file_edit_not_allowed");
    expect(await readFile(join(projectRoot, "notes.md"), "utf8")).toBe("status: planned\n");
  });
});
