import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateDailyBriefing, runBriefingJob, runManualBriefing } from "./index.js";

describe("manual daily briefing", () => {
  it("generates deterministic fallback briefing sections without LLM credentials", async () => {
    const briefing = generateDailyBriefing({
      date: "2026-06-21",
      timezone: "Asia/Seoul",
      generatedAt: "2026-06-21T06:00:00+09:00",
      llmAvailable: false,
      sources: {
        repo: {
          branch: "codex/test",
          dirty: false,
          summary: "working tree clean"
        },
        memory: {
          rootExists: true,
          latestDailyLog: null
        },
        tasks: [],
        approvals: [],
        usage: {
          estimatedCostUsdMonth: 0,
          callsToday: 0
        },
        markets: {
          korea: {
            status: "not_configured",
            summary: "Korea market data source is not configured yet."
          },
          us: {
            status: "not_configured",
            summary: "US market data source is not configured yet."
          }
        },
        trading: {
          realTradingEnabled: false,
          brokerCapabilities: {
            toss: "candidate",
            shinhan: "candidate",
            samsung: "read_only_manual_reference"
          }
        }
      }
    });

    expect(briefing.status).toBe("partial");
    expect(briefing.dashboard_sections.personal.top_items).toContain("No personal tasks configured yet.");
    expect(briefing.dashboard_sections.engineering.project_status[0]).toContain("codex/test");
    expect(briefing.dashboard_sections.korea_market.summary).toContain("not configured");
    expect(briefing.dashboard_sections.us_market.summary).toContain("not configured");
    expect(briefing.dashboard_sections.trading.blocked_actions).toContain("Real trading disabled.");
    expect(briefing.dashboard_sections.agent_ops.usage_summary.calls_today).toBe(0);
    expect(briefing.telegram_summary).toContain("Dore briefing");
  });

  it("writes Markdown, JSON, and usage records under memory logs", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-briefing-"));
    try {
      const result = await runManualBriefing({
        memoryRoot: root,
        date: "2026-06-21",
        timezone: "Asia/Seoul",
        generatedAt: "2026-06-21T06:00:00+09:00",
        projectRoot: root,
        env: {}
      });

      const markdown = await readFile(join(root, "logs", "daily", "2026-06-21.md"), "utf8");
      const dashboard = JSON.parse(
        await readFile(join(root, "logs", "daily", "2026-06-21.json"), "utf8")
      );
      const usage = await readFile(join(root, "logs", "usage", "2026-06.jsonl"), "utf8");

      expect(result.markdownPath).toBe(join(root, "logs", "daily", "2026-06-21.md"));
      expect(markdown).toContain("# Daily Briefing - 2026-06-21");
      expect(markdown).toContain("## Korea Market");
      expect(markdown).toContain("## US Market");
      expect(markdown).toContain("## Trading");
      expect(dashboard.id).toBe("briefing_2026_06_21");
      expect(dashboard.status).toBe("partial");
      expect(JSON.parse(usage.trim()).category).toBe("briefing");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("runs the scheduled briefing job and writes one shared Telegram/dashboard record", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-briefing-job-"));
    try {
      const result = await runBriefingJob({
        memoryRoot: root,
        projectRoot: root,
        date: "2026-06-22",
        timezone: "Asia/Seoul",
        generatedAt: "2026-06-22T06:00:00+09:00",
        trigger: "scheduled",
        env: {}
      });

      expect(result.status).toBe("partial");
      expect(result.attempts).toHaveLength(1);
      expect(result.delivery.telegram_summary).toContain("Dore Morning Briefing - 2026-06-22");
      expect(result.delivery.dashboard_json_path).toBe(join(root, "logs", "daily", "2026-06-22.json"));

      const dashboard = JSON.parse(await readFile(result.delivery.dashboard_json_path, "utf8"));
      expect(result.delivery.telegram_summary).toContain(dashboard.date);
      expect(dashboard.delivery.telegram_summary).toBe(result.delivery.telegram_summary);
      expect(dashboard.source_freshness).toContainEqual(
        expect.objectContaining({
          source: "local_repo",
          status: "ok"
        })
      );
      const events = await readFile(join(root, "logs", "events", "briefing.jsonl"), "utf8");
      expect(events).toContain("briefing_generated");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("retries failed briefing attempts and records the final success", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-briefing-job-"));
    let attempts = 0;
    try {
      const result = await runBriefingJob({
        memoryRoot: root,
        projectRoot: root,
        date: "2026-06-22",
        timezone: "Asia/Seoul",
        generatedAt: "2026-06-22T06:00:00+09:00",
        trigger: "scheduled",
        env: {},
        retrySchedule: ["06:00", "06:10", "06:30"],
        collectSources: async () => {
          attempts += 1;
          if (attempts < 2) {
            throw new Error("temporary source failure");
          }
          return {
            repo: {
              branch: "codex/m9",
              dirty: false,
              summary: "working tree clean"
            },
            memory: {
              rootExists: true,
              latestDailyLog: null
            },
            tasks: ["Continue M9"],
            approvals: [],
            usage: {
              estimatedCostUsdMonth: 0,
              callsToday: 0
            },
            markets: {
              korea: {
                status: "not_configured",
                summary: "Korea market data source is not configured yet."
              },
              us: {
                status: "not_configured",
                summary: "US market data source is not configured yet."
              }
            },
            trading: {
              realTradingEnabled: false,
              brokerCapabilities: {
                toss: "candidate"
              }
            }
          };
        }
      });

      expect(result.status).toBe("partial");
      expect(result.attempts).toEqual([
        expect.objectContaining({
          attempt: 1,
          status: "failed",
          scheduled_time: "06:00",
          error_code: "source_collection_failed"
        }),
        expect.objectContaining({
          attempt: 2,
          status: "generated",
          scheduled_time: "06:10"
        })
      ]);
      const events = await readFile(join(root, "logs", "events", "briefing.jsonl"), "utf8");
      expect(events).toContain("briefing_failed_attempt");
      expect(events).toContain("briefing_generated");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes a failed briefing record when all retry attempts fail", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-briefing-job-"));
    try {
      const result = await runBriefingJob({
        memoryRoot: root,
        projectRoot: root,
        date: "2026-06-22",
        timezone: "Asia/Seoul",
        generatedAt: "2026-06-22T06:00:00+09:00",
        trigger: "scheduled",
        env: {},
        retrySchedule: ["06:00", "06:10"],
        collectSources: async () => {
          throw new Error("persistent source failure");
        }
      });

      expect(result.status).toBe("failed");
      expect(result.attempts).toHaveLength(2);
      const dashboard = JSON.parse(await readFile(join(root, "logs", "daily", "2026-06-22.json"), "utf8"));
      expect(dashboard.status).toBe("failed");
      expect(dashboard.dashboard_sections.agent_ops.failed_jobs).toContain("daily_briefing");
      const events = await readFile(join(root, "logs", "events", "briefing.jsonl"), "utf8");
      expect(events).toContain("briefing_failed_final");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
