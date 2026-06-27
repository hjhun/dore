import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  applyControlledFileEdit,
  appendCodeReviewReportEvent,
  appendEngineeringBackgroundReviewTriggerEvent,
  appendFileEditEvent,
  appendReviewSummaryEvent,
  appendTestExecutionEvent,
  appendProjectIntakeEvent,
  assessEngineeringActionRisk,
  createCodeReviewReport,
  createDefaultToolRegistry,
  createDevelopmentWorkflow,
  createEngineeringRiskReview,
  createEngineeringBackgroundReviewTrigger,
  createEngineeringLoopFinalizerSummary,
  createFailedVerificationSummary,
  createFileMutationProof,
  createEngineeringLoopGuardrailSummary,
  summarizeDevelopmentAgentLoopStatus,
  reflectEngineeringMemory,
  createProjectIntake,
  createReviewSummary,
  createTestExecutionRecord,
  detectVerificationCommands,
  executeAllowedCommand,
  inspectRepository,
  persistProjectIntakeDrafts,
  runEngineeringIntake,
  summarizeDevelopmentTaskStages
} from "./index.js";

describe("engineering project intake", () => {
  it("turns a user idea into requirement, design, change, and verification plans", () => {
    const intake = createProjectIntake({
      idea: "Add a safe trading watchlist dashboard",
      requestedBy: "hjhun",
      now: "2026-06-21T00:00:00.000Z",
      repo: {
        branch: "codex/add-agent-development-guide",
        dirty: false,
        changedFiles: []
      },
      packageJson: {
        scripts: {
          test: "vitest run",
          build: "tsc -p tsconfig.json",
          "build:desktop": "vite build --config apps/desktop/vite.config.ts"
        }
      }
    });

    expect(intake.id).toBe("intake_2026_06_21_add_a_safe_trading_watchlist_dashboard");
    expect(intake.requirementDraft.title).toBe("Add a safe trading watchlist dashboard");
    expect(intake.requirementDraft.sections.map((section) => section.heading)).toEqual([
      "Problem",
      "Users",
      "Scope",
      "Acceptance Criteria"
    ]);
    expect(intake.technicalDesignDraft.sections.map((section) => section.heading)).toContain("Testing");
    expect(intake.changePlan.steps[0]).toContain("Inspect current repo state");
    expect(intake.verificationPlan.commands.map((command) => command.command)).toEqual([
      "pnpm test",
      "pnpm build",
      "pnpm build:desktop"
    ]);
    expect(intake.executionRecord.status).toBe("planned");
  });

  it("rejects empty ideas before creating drafts", () => {
    expect(() =>
      createProjectIntake({
        idea: "   ",
        requestedBy: "hjhun",
        now: "2026-06-21T00:00:00.000Z"
      })
    ).toThrow("Project intake idea is required.");
  });

  it("detects verification commands from package scripts in a stable order", () => {
    expect(
      detectVerificationCommands({
        scripts: {
          lint: "tsc -p tsconfig.json --noEmit",
          test: "vitest run",
          doctor: "tsx apps/daemon/src/doctor.ts"
        }
      })
    ).toEqual([
      {
        kind: "test",
        command: "pnpm test"
      },
      {
        kind: "lint",
        command: "pnpm lint"
      },
      {
        kind: "doctor",
        command: "pnpm doctor"
      }
    ]);
  });

  it("records test execution without leaking secret-like output", () => {
    const openAiKeyName = ["OPENAI", "API", "KEY"].join("_");
    const telegramTokenName = ["TELEGRAM", "BOT", "TOKEN"].join("_");
    const record = createTestExecutionRecord({
      command: "pnpm test",
      exitCode: 0,
      startedAt: "2026-06-21T00:00:00.000Z",
      completedAt: "2026-06-21T00:00:02.000Z",
      output: `ok\n${openAiKeyName}=abc123\n${telegramTokenName}=telegram-secret`
    });

    expect(record.status).toBe("passed");
    expect(record.durationMs).toBe(2000);
    expect(record.outputSummary).toContain(`${openAiKeyName}=<redacted>`);
    expect(record.outputSummary).toContain(`${telegramTokenName}=<redacted>`);
    expect(record.outputSummary).not.toContain("abc123");
    expect(record.outputSummary).not.toContain("telegram-secret");
  });

  it("summarizes failed verification with a likely next action", () => {
    const record = createTestExecutionRecord({
      command: "pnpm build",
      exitCode: 2,
      startedAt: "2026-06-22T09:00:00.000Z",
      completedAt: "2026-06-22T09:00:04.000Z",
      output: "src/app.ts(12,5): error TS2304: Cannot find name 'missingValue'."
    });

    expect(createFailedVerificationSummary(record)).toEqual({
      command: "pnpm build",
      summary: "pnpm build failed with exit code 2.",
      likelyNextAction: "Fix the TypeScript/build error, then rerun pnpm build.",
      outputSummary: "src/app.ts(12,5): error TS2304: Cannot find name 'missingValue'."
    });
  });

  it("inspects repository branch and changed files through git", async () => {
    const repo = await inspectRepository("/workspace/dore", {
      execFile: async (_command, args) => {
        if (args.join(" ") === "-C /workspace/dore branch --show-current") {
          return { stdout: "feature/m4\n" };
        }
        if (args.join(" ") === "-C /workspace/dore status --short") {
          return { stdout: " M packages/engineering/src/index.ts\n?? packages/engineering/src/repo.test.ts\n" };
        }
        throw new Error(`unexpected args: ${args.join(" ")}`);
      }
    });

    expect(repo).toEqual({
      branch: "feature/m4",
      dirty: true,
      changedFiles: ["packages/engineering/src/index.ts", "packages/engineering/src/repo.test.ts"]
    });
  });

  it("returns an unknown clean snapshot when repo inspection fails", async () => {
    const repo = await inspectRepository("/not-a-repo", {
      execFile: async () => {
        throw new Error("not a git repository");
      }
    });

    expect(repo).toEqual({
      branch: "unknown",
      dirty: false,
      changedFiles: []
    });
  });

  it("logs project intake as a safe task event", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-engineering-"));
    const eventLogPath = join(memoryRoot, "logs", "events", "engineering.jsonl");
    const intake = createProjectIntake({
      idea: "Add repo inspection workflow",
      requestedBy: "hjhun",
      now: "2026-06-21T00:00:00.000Z"
    });

    await appendProjectIntakeEvent(eventLogPath, intake);

    const [line] = (await readFile(eventLogPath, "utf8")).trim().split("\n");
    const record = JSON.parse(line);
    expect(record).toMatchObject({
      actor: "dore",
      event_type: "task_started",
      entity_type: "task",
      entity_id: intake.id,
      risk_level: "write",
      summary: "Engineering intake planned: Add repo inspection workflow"
    });
    expect(JSON.stringify(record)).not.toContain("api_key");
    expect(JSON.stringify(record)).not.toContain("token");
  });

  it("creates a review summary from verification records", () => {
    const intake = createProjectIntake({
      idea: "Add review summary generator",
      requestedBy: "hjhun",
      now: "2026-06-22T00:00:00.000Z"
    });
    const summary = createReviewSummary({
      intake,
      repo: {
        branch: "feature/m4",
        dirty: true,
        changedFiles: ["packages/engineering/src/index.ts"]
      },
      executions: [
        createTestExecutionRecord({
          command: "pnpm test",
          exitCode: 0,
          startedAt: "2026-06-22T00:00:00.000Z",
          completedAt: "2026-06-22T00:00:01.000Z",
          output: "ok"
        }),
        createTestExecutionRecord({
          command: "pnpm build",
          exitCode: 1,
          startedAt: "2026-06-22T00:00:01.000Z",
          completedAt: "2026-06-22T00:00:02.000Z",
          output: "type error"
        })
      ]
    });

    expect(summary.status).toBe("needs_work");
    expect(summary.findings).toContain("Verification failed: pnpm build");
    expect(summary.residualRisks).toContain("Working tree still has 1 changed file.");
  });

  it("persists requirement, design, change plan, and intake JSON under memory operations", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-engineering-"));
    const intake = createProjectIntake({
      idea: "Persist development drafts",
      requestedBy: "hjhun",
      now: "2026-06-22T00:00:00.000Z"
    });

    const result = await persistProjectIntakeDrafts(memoryRoot, intake);

    expect(await readFile(result.requirementPath, "utf8")).toContain("# Requirements - Persist development drafts");
    expect(await readFile(result.technicalDesignPath, "utf8")).toContain("# Technical Design - Persist development drafts");
    expect(await readFile(result.changePlanPath, "utf8")).toContain("# Change Plan - Persist development drafts");
    expect(JSON.parse(await readFile(result.intakeJsonPath, "utf8")).id).toBe(intake.id);
  });

  it("runs project intake end-to-end with repo inspection, draft persistence, and event logging", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-engineering-"));
    const result = await runEngineeringIntake({
      idea: "Add daemon engineering intake command",
      requestedBy: "hjhun",
      now: "2026-06-22T00:00:00.000Z",
      memoryRoot,
      projectRoot: "/workspace/dore",
      packageJson: {
        scripts: {
          test: "vitest run",
          build: "tsc -p tsconfig.json"
        }
      },
      execFile: async (_command, args) => {
        if (args.join(" ") === "-C /workspace/dore branch --show-current") {
          return { stdout: "feature/m4\n" };
        }
        if (args.join(" ") === "-C /workspace/dore status --short") {
          return { stdout: "" };
        }
        throw new Error(`unexpected args: ${args.join(" ")}`);
      }
    });

    expect(result.intake.changePlan.steps[0]).toContain("Repo branch feature/m4");
    expect(await readFile(result.drafts.requirementPath, "utf8")).toContain("Add daemon engineering intake command");
    expect(await readFile(result.eventLogPath, "utf8")).toContain("Engineering intake planned");
  });

  it("logs review summaries as task completion events", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-engineering-"));
    const eventLogPath = join(memoryRoot, "logs", "events", "engineering.jsonl");
    const intake = createProjectIntake({
      idea: "Record review summary",
      requestedBy: "hjhun",
      now: "2026-06-22T00:00:00.000Z"
    });
    const summary = createReviewSummary({
      intake,
      repo: {
        branch: "feature/m4",
        dirty: false,
        changedFiles: []
      },
      executions: [
        createTestExecutionRecord({
          command: "pnpm test",
          exitCode: 0,
          startedAt: "2026-06-22T00:00:00.000Z",
          completedAt: "2026-06-22T00:00:01.000Z",
          output: "ok"
        })
      ]
    });

    await appendReviewSummaryEvent(eventLogPath, intake, summary);

    const [line] = (await readFile(eventLogPath, "utf8")).trim().split("\n");
    const record = JSON.parse(line);
    expect(record).toMatchObject({
      actor: "dore",
      event_type: "task_completed",
      entity_type: "task",
      entity_id: intake.id,
      summary: "Engineering review summary: ready_for_review"
    });
    expect(record.verification_passed).toEqual(["pnpm test"]);
  });

  it("logs test execution records against an engineering task", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-engineering-"));
    const eventLogPath = join(memoryRoot, "logs", "events", "engineering.jsonl");
    const intake = createProjectIntake({
      idea: "Record execution outcome",
      requestedBy: "hjhun",
      now: "2026-06-22T00:00:00.000Z"
    });
    const execution = createTestExecutionRecord({
      command: "pnpm test",
      exitCode: 0,
      startedAt: "2026-06-22T00:00:00.000Z",
      completedAt: "2026-06-22T00:00:02.000Z",
      output: "ok"
    });

    await appendTestExecutionEvent(eventLogPath, intake, execution);

    const [line] = (await readFile(eventLogPath, "utf8")).trim().split("\n");
    const record = JSON.parse(line);
    expect(record).toMatchObject({
      actor: "dore",
      event_type: "task_completed",
      entity_type: "task",
      entity_id: intake.id,
      summary: "Engineering verification passed: pnpm test"
    });
    expect(record.exit_code).toBe(0);
    expect(record.output_summary).toBe("ok");
  });

  it("executes allowed verification commands and redacts secret-like output", async () => {
    const openAiKeyName = ["OPENAI", "API", "KEY"].join("_");
    const execution = await executeAllowedCommand({
      command: "pnpm test",
      projectRoot: "/workspace/dore",
      now: "2026-06-22T00:00:00.000Z",
      execFile: async (command, args) => {
        expect(command).toBe("pnpm");
        expect(args).toEqual(["test"]);
        return {
          stdout: `ok\n${openAiKeyName}=abc123`,
          stderr: ""
        };
      }
    });

    expect(execution.status).toBe("passed");
    expect(execution.outputSummary).toContain(`${openAiKeyName}=<redacted>`);
    expect(execution.outputSummary).not.toContain("abc123");
  });

  it("blocks commands outside the executor allowlist", async () => {
    await expect(
      executeAllowedCommand({
        command: "rm -rf memory",
        projectRoot: "/workspace/dore",
        now: "2026-06-22T00:00:00.000Z",
        execFile: async () => ({ stdout: "", stderr: "" })
      })
    ).rejects.toThrow("Command is not allowed for engineering executor: rm -rf memory");
  });

  it("records failed allowed command output without leaking secret-like values", async () => {
    const tokenName = ["CUSTOM", "TOKEN"].join("_");
    const failure = new Error("Command failed");
    Object.assign(failure, {
      code: 2,
      stdout: "partial output",
      stderr: `${tokenName}=token-value`
    });

    const execution = await executeAllowedCommand({
      command: "pnpm build",
      projectRoot: "/workspace/dore",
      now: "2026-06-22T00:00:00.000Z",
      execFile: async () => {
        throw failure;
      }
    });

    expect(execution.status).toBe("failed");
    expect(execution.exitCode).toBe(2);
    expect(execution.outputSummary).toContain("partial output");
    expect(execution.outputSummary).toContain(`${tokenName}=<redacted>`);
    expect(execution.outputSummary).not.toContain("token-value");
  });

  it("applies a controlled exact file edit inside the project root", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "dore-engineering-edit-"));
    const targetPath = join(projectRoot, "README.md");
    await writeFile(targetPath, "Before\n", "utf8");

    const edit = await applyControlledFileEdit({
      projectRoot,
      relativePath: "README.md",
      find: "Before",
      replace: "After"
    });

    expect(edit).toMatchObject({
      status: "applied",
      relativePath: "README.md",
      replacements: 1
    });
    expect(await readFile(targetPath, "utf8")).toBe("After\n");
  });

  it("blocks controlled file edits outside the project root", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "dore-engineering-edit-"));

    await expect(
      applyControlledFileEdit({
        projectRoot,
        relativePath: "../outside.md",
        find: "Before",
        replace: "After"
      })
    ).rejects.toThrow("Controlled file edit path must stay inside the project root.");
  });

  it("blocks controlled file edits that would write secret-like values", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "dore-engineering-edit-"));
    await writeFile(join(projectRoot, "config.example"), "token=\n", "utf8");
    const openAiKeyName = ["OPENAI", "API", "KEY"].join("_");

    await expect(
      applyControlledFileEdit({
        projectRoot,
        relativePath: "config.example",
        find: "token=",
        replace: `${openAiKeyName}=abc123`
      })
    ).rejects.toThrow("Controlled file edit replacement must not contain secret-like values.");
  });

  it("logs controlled file edits without leaking secret-like values", async () => {
    const eventLogPath = join(await mkdtemp(join(tmpdir(), "dore-engineering-events-")), "events.jsonl");
    const intake = createProjectIntake({
      idea: "Log file edit",
      requestedBy: "hjhun",
      now: "2026-06-22T00:00:00.000Z"
    });
    const edit = {
      relativePath: "config.example",
      status: "applied" as const,
      replacements: 1,
      summary: `Set ${["OPENAI", "API", "KEY"].join("_")}=abc123 placeholder`
    };

    await appendFileEditEvent(eventLogPath, intake, edit);

    const [line] = (await readFile(eventLogPath, "utf8")).trim().split("\n");
    const record = JSON.parse(line);
    expect(record).toMatchObject({
      actor: "dore",
      event_type: "task_updated",
      entity_type: "task",
      entity_id: intake.id,
      summary: "Engineering file edit applied: config.example",
      relative_path: "config.example",
      replacements: 1,
      mutation_proof: {
        target: "config.example",
        landed: true,
        status: "applied",
        evidence: "applied 1 exact replacement"
      }
    });
    expect(record.edit_summary).toContain(`${["OPENAI", "API", "KEY"].join("_")}=<redacted>`);
    expect(record.edit_summary).not.toContain("abc123");
  });

  it("classifies controlled file mutation proof without raw patch content", () => {
    expect(
      createFileMutationProof({
        relativePath: "src/app.ts",
        status: "applied",
        replacements: 2,
        summary: "Applied two replacements"
      })
    ).toEqual({
      target: "src/app.ts",
      landed: true,
      status: "applied",
      evidence: "applied 2 exact replacements"
    });
    expect(
      createFileMutationProof({
        relativePath: "src/app.ts",
        status: "blocked",
        replacements: 0,
        summary: "Exact text not found"
      })
    ).toEqual({
      target: "src/app.ts",
      landed: false,
      status: "blocked",
      evidence: "mutation not applied"
    });
  });

  it("summarizes repeated failure and no-progress guardrails", () => {
    expect(
      createEngineeringLoopGuardrailSummary({
        observations: [
          {
            kind: "verification",
            signature: "pnpm test",
            status: "failed",
            summary: "same test failure"
          },
          {
            kind: "verification",
            signature: "pnpm test",
            status: "failed",
            summary: "same test failure"
          }
        ]
      })
    ).toEqual({
      action: "warn",
      code: "repeated_failure",
      count: 2,
      signature: "pnpm test",
      message: "Repeated verification failure detected for pnpm test.",
      nextAction: "Stop retrying the same failure; inspect the latest output and change the patch before retrying."
    });
    expect(
      createEngineeringLoopGuardrailSummary({
        observations: [
          {
            kind: "file_mutation",
            signature: "src/app.ts",
            status: "blocked",
            summary: "exact text not found"
          },
          {
            kind: "file_mutation",
            signature: "src/app.ts",
            status: "blocked",
            summary: "exact text not found"
          }
        ]
      })
    ).toMatchObject({
      action: "warn",
      code: "no_progress",
      count: 2,
      signature: "src/app.ts",
      nextAction: "Reread the target and update the edit plan before retrying."
    });
    expect(
      createEngineeringLoopGuardrailSummary({
        observations: [
          {
            kind: "verification",
            signature: "pnpm test",
            status: "passed",
            summary: "ok"
          }
        ]
      })
    ).toEqual({
      action: "allow",
      code: "ok",
      count: 0,
      signature: "",
      message: "No repeated failure or no-progress loop detected.",
      nextAction: "Continue the current workflow."
    });
  });

  it("finalizes engineering loop endings for normal and abnormal stops", () => {
    const intake = createProjectIntake({
      idea: "Finalize loop status",
      requestedBy: "hjhun",
      now: "2026-06-27T10:00:00.000Z"
    });
    const completed = summarizeDevelopmentAgentLoopStatus({
      intake,
      taskStatus: "completed"
    });
    const exhausted = summarizeDevelopmentAgentLoopStatus({
      intake,
      taskStatus: "planned",
      usedIterations: 7
    });

    expect(createEngineeringLoopFinalizerSummary({ loopStatus: completed })).toEqual({
      completed: true,
      abnormal: false,
      exitReason: "completed",
      message: "Engineering loop completed normally.",
      nextAction: "No loop action is required."
    });
    expect(createEngineeringLoopFinalizerSummary({ loopStatus: exhausted })).toEqual({
      completed: false,
      abnormal: true,
      exitReason: "iteration_budget_exhausted",
      message: "Engineering loop stopped because the iteration budget was exhausted.",
      nextAction: "Stop the loop and summarize progress before continuing."
    });
    expect(
      createEngineeringLoopFinalizerSummary({
        loopStatus: completed,
        guardrailSummary: {
          action: "warn",
          code: "repeated_failure",
          count: 2,
          signature: "pnpm test",
          message: "Repeated verification failure detected for pnpm test.",
          nextAction: "Stop retrying the same failure; inspect the latest output and change the patch before retrying."
        }
      })
    ).toMatchObject({
      completed: false,
      abnormal: true,
      exitReason: "repeated_failure",
      message: "Repeated verification failure detected for pnpm test."
    });
  });

  it("creates and logs background review trigger records after loop activity thresholds", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-engineering-"));
    const eventLogPath = join(memoryRoot, "logs", "events", "engineering.jsonl");
    const intake = createProjectIntake({
      idea: "Trigger background review",
      requestedBy: "hjhun",
      now: "2026-06-27T10:00:00.000Z"
    });
    const trigger = createEngineeringBackgroundReviewTrigger({
      taskId: intake.id,
      threshold: 3,
      observations: [
        { kind: "verification", signature: "pnpm test", status: "failed", summary: "failed" },
        { kind: "file_mutation", signature: "src/app.ts", status: "blocked", summary: "blocked" },
        { kind: "review", signature: "review", status: "passed", summary: "reviewed" }
      ]
    });

    expect(trigger).toEqual({
      shouldTrigger: true,
      reason: "engineering_loop_activity_threshold",
      activityCount: 3,
      threshold: 3,
      refs: [intake.id],
      nextAction: "Queue a background review of loop progress, guardrails, and memory reflection candidates."
    });

    await appendEngineeringBackgroundReviewTriggerEvent(eventLogPath, intake, trigger);

    const [line] = (await readFile(eventLogPath, "utf8")).trim().split("\n");
    const record = JSON.parse(line);
    expect(record).toMatchObject({
      event_type: "task_updated",
      entity_id: intake.id,
      summary: "Engineering background review triggered: engineering_loop_activity_threshold",
      background_review_trigger: {
        should_trigger: true,
        activity_count: 3,
        threshold: 3
      }
    });
  });

  it("defines a default tool registry with approval boundaries", () => {
    const registry = createDefaultToolRegistry();

    expect(registry.tools.map((tool) => tool.id)).toEqual([
      "file.read",
      "file.edit.controlled",
      "command.verify",
      "repo.inspect",
      "documentation.write"
    ]);
    expect(registry.tools.find((tool) => tool.id === "file.edit.controlled")).toMatchObject({
      category: "file",
      approvalRequiredFor: ["broad_file_edit", "secret_write"]
    });
  });

  it("creates a task-logged development workflow from intake through memory reflection", () => {
    const intake = createProjectIntake({
      idea: "Add workflow productization",
      requestedBy: "hjhun",
      now: "2026-06-22T08:00:00.000Z"
    });
    const workflow = createDevelopmentWorkflow({
      intake,
      runtimeTaskId: "task_dev_workflow",
      now: "2026-06-22T08:00:00.000Z"
    });

    expect(workflow.runtimeTaskId).toBe("task_dev_workflow");
    expect(workflow.steps.map((step) => step.kind)).toEqual([
      "intake",
      "plan",
      "patch",
      "verify",
      "review",
      "summarize",
      "memory_reflection"
    ]);
    expect(workflow.steps.every((step) => step.taskLogEvent)).toBe(true);
  });

  it("summarizes development workflow stages for task visibility", () => {
    const intake = createProjectIntake({
      idea: "Expose workflow stages",
      requestedBy: "hjhun",
      now: "2026-06-22T08:00:00.000Z"
    });

    expect(summarizeDevelopmentTaskStages({ intake, taskStatus: "planned" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "intake", status: "completed" }),
        expect.objectContaining({ kind: "plan", status: "in_progress" }),
        expect.objectContaining({ kind: "patch", status: "pending" }),
        expect.objectContaining({ kind: "verify", status: "pending" }),
        expect.objectContaining({ kind: "review", status: "pending" }),
        expect.objectContaining({ kind: "memory_reflection", status: "pending" })
      ])
    );
    expect(summarizeDevelopmentTaskStages({ intake, taskStatus: "completed" }).every((stage) => stage.status === "completed")).toBe(
      true
    );
    expect(summarizeDevelopmentTaskStages({ intake, taskStatus: "failed" })).toContainEqual(
      expect.objectContaining({ kind: "verify", status: "blocked" })
    );
  });

  it("summarizes Hermes-style agent loop status for development tasks", () => {
    const intake = createProjectIntake({
      idea: "Expose loop status",
      requestedBy: "hjhun",
      now: "2026-06-27T08:00:00.000Z"
    });
    const failedVerification = createFailedVerificationSummary(
      createTestExecutionRecord({
        command: "pnpm test",
        exitCode: 1,
        startedAt: "2026-06-27T08:00:00.000Z",
        completedAt: "2026-06-27T08:00:03.000Z",
        output: "FAIL packages/engineering/src/intake.test.ts"
      })
    );

    expect(
      summarizeDevelopmentAgentLoopStatus({
        intake,
        taskStatus: "planned"
      })
    ).toEqual({
      iterationBudget: {
        max: 7,
        used: 2,
        remaining: 5,
        exhausted: false
      },
      retryState: {
        failedVerificationRetryAttempted: false,
        fileMutationRetryAttempted: false,
        reviewRetryAttempted: false
      },
      exitReason: "workflow_in_progress",
      nextAction: "Continue the development workflow at the current in-progress stage."
    });
    expect(
      summarizeDevelopmentAgentLoopStatus({
        intake,
        taskStatus: "failed",
        failedVerification
      })
    ).toMatchObject({
      iterationBudget: {
        max: 7,
        used: 4,
        remaining: 3,
        exhausted: false
      },
      retryState: {
        failedVerificationRetryAttempted: true
      },
      exitReason: "failed_verification",
      nextAction: "Inspect the failing test output, fix the behavior or test fixture, then rerun pnpm test."
    });
    expect(
      summarizeDevelopmentAgentLoopStatus({
        intake,
        taskStatus: "planned",
        usedIterations: 7
      })
    ).toMatchObject({
      iterationBudget: {
        exhausted: true
      },
      exitReason: "iteration_budget_exhausted",
      nextAction: "Stop the loop and summarize progress before continuing."
    });
  });

  it("orders code review findings by behavioral severity with file and line references", () => {
    const report = createCodeReviewReport({
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
        },
        {
          category: "missing_test",
          severity: "medium",
          file: "src/runner.test.ts",
          line: 1,
          message: "No regression test for failed command."
        }
      ]
    });

    expect(report.findings.map((finding) => finding.category)).toEqual(["bug", "missing_test", "style"]);
    expect(report.findings[0].reference).toBe("src/runner.ts:12");
  });

  it("logs code review reports with severity-ordered findings", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-engineering-review-report-"));
    const eventLogPath = join(memoryRoot, "logs", "events", "engineering.jsonl");
    const intake = createProjectIntake({
      idea: "Persist code review report",
      requestedBy: "hjhun",
      now: "2026-06-22T10:00:00.000Z"
    });
    const report = createCodeReviewReport({
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
    });

    await appendCodeReviewReportEvent(eventLogPath, intake, report);
    const log = await readFile(eventLogPath, "utf8");

    expect(log).toContain("Engineering code review report recorded: 2 findings");
    expect(log.indexOf("src/runner.ts:12")).toBeLessThan(log.indexOf("src/view.ts:40"));
  });

  it("reflects engineering outcomes into project memory and decision records", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-engineering-memory-"));
    const intake = createProjectIntake({
      idea: "Reflect engineering memory",
      requestedBy: "hjhun",
      now: "2026-06-22T08:00:00.000Z"
    });
    const review = createReviewSummary({
      intake,
      repo: {
        branch: "feature/m13",
        dirty: false,
        changedFiles: []
      },
      executions: [
        createTestExecutionRecord({
          command: "pnpm test",
          exitCode: 0,
          startedAt: "2026-06-22T08:00:00.000Z",
          completedAt: "2026-06-22T08:00:01.000Z",
          output: "ok"
        })
      ]
    });

    const reflection = await reflectEngineeringMemory({
      memoryRoot,
      intake,
      review,
      now: "2026-06-22T08:05:00.000Z"
    });

    expect(await readFile(reflection.projectPath, "utf8")).toContain("Reflect engineering memory");
    expect(await readFile(reflection.decisionPath, "utf8")).toContain("Engineering review summary: ready_for_review");
  });

  it("reflects decisions, regressions, and follow-up tasks into engineering memory", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-engineering-memory-"));
    const intake = createProjectIntake({
      idea: "Reflect engineering regressions",
      requestedBy: "hjhun",
      now: "2026-06-22T08:00:00.000Z"
    });
    const review = createReviewSummary({
      intake,
      repo: {
        branch: "feature/m21",
        dirty: true,
        changedFiles: ["packages/engineering/src/index.ts"]
      },
      executions: [
        createTestExecutionRecord({
          command: "pnpm test",
          exitCode: 1,
          startedAt: "2026-06-22T08:00:00.000Z",
          completedAt: "2026-06-22T08:00:01.000Z",
          output: "failed"
        })
      ]
    });

    const reflection = await reflectEngineeringMemory({
      memoryRoot,
      intake,
      review,
      now: "2026-06-22T08:05:00.000Z"
    });

    const decisionText = await readFile(reflection.decisionPath, "utf8");
    expect(decisionText).toContain("Decisions:");
    expect(decisionText).toContain("Regressions: pnpm test");
    expect(decisionText).toContain("Follow-up tasks: Working tree still has 1 changed file.");

    const followUpText = await readFile(reflection.followUpPath, "utf8");
    expect(followUpText).toContain("Decisions:");
    expect(followUpText).toContain("Regressions: pnpm test");
    expect(followUpText).toContain("Follow-up tasks: Working tree still has 1 changed file.");
  });

  it("requires approval for broad or destructive engineering actions", () => {
    expect(assessEngineeringActionRisk({ kind: "broad_file_edit", target: "packages" })).toMatchObject({
      approvalRequired: true,
      riskLevel: "critical"
    });
    expect(assessEngineeringActionRisk({ kind: "destructive_command", target: "rm -rf memory" })).toMatchObject({
      approvalRequired: true,
      riskLevel: "critical"
    });
    expect(assessEngineeringActionRisk({ kind: "single_file_edit", target: "README.md" })).toMatchObject({
      approvalRequired: false,
      riskLevel: "write"
    });
  });

  it("creates workflow risk reviews with requested action context", () => {
    expect(createEngineeringRiskReview({ kind: "broad_file_edit", target: "packages" })).toEqual({
      kind: "broad_file_edit",
      target: "packages",
      approvalRequired: true,
      riskLevel: "critical",
      reason: "Broad file edit requires approval: packages"
    });
    expect(createEngineeringRiskReview({ kind: "single_file_edit", target: "README.md" })).toEqual({
      kind: "single_file_edit",
      target: "README.md",
      approvalRequired: false,
      riskLevel: "write",
      reason: "Single controlled file edit allowed: README.md"
    });
  });
});
