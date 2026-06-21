import { describe, expect, it } from "vitest";
import {
  createProjectIntake,
  createTestExecutionRecord,
  detectVerificationCommands
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
});
