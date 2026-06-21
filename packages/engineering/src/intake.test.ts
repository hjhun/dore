import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  appendProjectIntakeEvent,
  createProjectIntake,
  createReviewSummary,
  createTestExecutionRecord,
  detectVerificationCommands,
  inspectRepository,
  persistProjectIntakeDrafts,
  runEngineeringIntake
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
});
