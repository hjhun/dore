import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface BriefingSources {
  repo: {
    branch: string;
    dirty: boolean;
    summary: string;
  };
  memory: {
    rootExists: boolean;
    latestDailyLog: string | null;
  };
  tasks: string[];
  approvals: string[];
  usage: {
    estimatedCostUsdMonth: number;
    callsToday: number;
  };
  markets: {
    korea: {
      status: "not_configured" | "ok" | "partial" | "failed";
      summary: string;
    };
    us: {
      status: "not_configured" | "ok" | "partial" | "failed";
      summary: string;
    };
  };
  trading: {
    realTradingEnabled: boolean;
    brokerCapabilities: Record<string, string>;
  };
}

export interface GenerateDailyBriefingInput {
  date: string;
  timezone: string;
  generatedAt: string;
  llmAvailable: boolean;
  sources: BriefingSources;
  failedJobs?: string[];
}

export interface ManualBriefingInput {
  memoryRoot: string;
  projectRoot: string;
  date?: string;
  timezone?: string;
  generatedAt?: string;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}

export interface BriefingDelivery {
  telegram_summary: string;
  dashboard_json_path: string;
  markdown_path: string;
}

export type DailyBriefingRecord = Omit<ReturnType<typeof generateDailyBriefing>, "status"> & {
  status: "generated" | "partial" | "failed";
  attempts?: BriefingAttempt[];
};

export interface ManualBriefingResult {
  markdownPath: string;
  jsonPath: string;
  usagePath: string;
  briefing: DailyBriefingRecord & { delivery: BriefingDelivery };
  delivery: BriefingDelivery;
}

export interface BriefingAttempt {
  attempt: number;
  scheduled_time: string;
  status: "failed" | "generated";
  error_code?: string;
}

export interface BriefingJobInput extends ManualBriefingInput {
  trigger: "manual" | "scheduled";
  retrySchedule?: string[];
  collectSources?: (input: { projectRoot: string; memoryRoot: string }) => Promise<BriefingSources>;
}

export interface BriefingJobResult extends ManualBriefingResult {
  status: "generated" | "partial" | "failed";
  attempts: BriefingAttempt[];
  eventLogPath: string;
}

export function generateDailyBriefing(input: GenerateDailyBriefingInput) {
  const status: "generated" | "partial" = input.llmAvailable ? "generated" : "partial";
  const taskItems = input.sources.tasks.length > 0 ? input.sources.tasks : ["No personal tasks configured yet."];
  const approvalItems = input.sources.approvals.length > 0 ? input.sources.approvals : ["No pending approvals."];
  const blockedActions = input.sources.trading.realTradingEnabled ? [] : ["Real trading disabled."];

  return {
    id: `briefing_${input.date.replaceAll("-", "_")}`,
    date: input.date,
    timezone: input.timezone,
    status,
    generated_at: input.generatedAt,
    telegram_summary: `Dore briefing ${input.date}: ${status}. ${taskItems[0]}`,
    dashboard_sections: {
      personal: {
        top_items: taskItems
      },
      engineering: {
        project_status: [
          `Repo branch ${input.sources.repo.branch}; ${input.sources.repo.summary}; dirty=${input.sources.repo.dirty}`
        ],
        suggested_next_actions: ["Continue the active roadmap item from .dev/DASHBOARD.md."]
      },
      korea_market: {
        summary: input.sources.markets.korea.summary,
        watch_items: []
      },
      us_market: {
        summary: input.sources.markets.us.summary,
        watch_items: []
      },
      trading: {
        signals: [],
        blocked_actions: blockedActions,
        broker_capabilities: input.sources.trading.brokerCapabilities
      },
      agent_ops: {
        pending_approvals: approvalItems,
        failed_jobs: input.failedJobs ?? [],
        usage_summary: {
          calls_today: input.sources.usage.callsToday,
          estimated_cost_usd_month: input.sources.usage.estimatedCostUsdMonth
        }
      }
    },
    source_refs: ["local_repo", "local_memory", "market_placeholders"],
    source_freshness: createSourceFreshness(input.sources),
    usage: {
      provider: "deterministic",
      model: "fallback",
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_usd: 0
    }
  };
}

export async function runManualBriefing(input: ManualBriefingInput): Promise<ManualBriefingResult> {
  return runBriefingJob({
    ...input,
    trigger: "manual",
    retrySchedule: ["manual"]
  });
}

export async function runBriefingJob(input: BriefingJobInput): Promise<BriefingJobResult> {
  const timezone = input.timezone ?? "Asia/Seoul";
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const date = input.date ?? formatDateForTimezone(new Date(generatedAt), timezone);
  const retrySchedule = input.retrySchedule ?? (input.trigger === "scheduled" ? ["06:00", "06:10", "06:30"] : ["manual"]);
  const collect = input.collectSources ?? ((context: { projectRoot: string; memoryRoot: string }) => collectBriefingSources(context.projectRoot, context.memoryRoot));
  const llmAvailable = Boolean(input.env?.OPENAI_API_KEY || input.env?.ANTHROPIC_API_KEY || input.env?.GEMINI_API_KEY);
  const attempts: BriefingAttempt[] = [];
  const eventLogPath = join(input.memoryRoot, "logs", "events", "briefing.jsonl");

  for (let index = 0; index < retrySchedule.length; index += 1) {
    const scheduledTime = retrySchedule[index] ?? "manual";
    try {
      const sources = await collect({
        projectRoot: input.projectRoot,
        memoryRoot: input.memoryRoot
      });
      attempts.push({
        attempt: index + 1,
        scheduled_time: scheduledTime,
        status: "generated"
      });
      const briefing = generateDailyBriefing({
        date,
        timezone,
        generatedAt,
        llmAvailable,
        sources
      });
      const written = await writeBriefingRecord(input.memoryRoot, briefing);
      await appendBriefingEvent(eventLogPath, {
        id: createBriefingEventId(generatedAt, "generated", index + 1),
        time: generatedAt,
        event_type: "briefing_generated",
        summary: `Daily briefing generated on attempt ${index + 1}.`,
        status: briefing.status,
        attempt: index + 1,
        scheduled_time: scheduledTime,
        refs: [written.markdownPath, written.jsonPath, written.usagePath]
      });

      return {
        ...written,
        status: briefing.status,
        attempts,
        eventLogPath
      };
    } catch {
      attempts.push({
        attempt: index + 1,
        scheduled_time: scheduledTime,
        status: "failed",
        error_code: "source_collection_failed"
      });
      await appendBriefingEvent(eventLogPath, {
        id: createBriefingEventId(generatedAt, "failed_attempt", index + 1),
        time: generatedAt,
        event_type: "briefing_failed_attempt",
        summary: `Daily briefing attempt ${index + 1} failed.`,
        status: "failed",
        attempt: index + 1,
        scheduled_time: scheduledTime,
        refs: []
      });
    }
  }

  const briefing = createFailedBriefing({
    date,
    timezone,
    generatedAt,
    attempts
  });
  const written = await writeBriefingRecord(input.memoryRoot, briefing);
  await appendBriefingEvent(eventLogPath, {
    id: createBriefingEventId(generatedAt, "failed_final", attempts.length),
    time: generatedAt,
    event_type: "briefing_failed_final",
    summary: "Daily briefing failed after all retry attempts.",
    status: "failed",
    attempt: attempts.length,
    scheduled_time: attempts.at(-1)?.scheduled_time ?? "unknown",
    refs: [written.markdownPath, written.jsonPath, written.usagePath]
  });

  return {
    ...written,
    status: "failed",
    attempts,
    eventLogPath
  };
}

async function writeBriefingRecord(
  memoryRoot: string,
  briefing: DailyBriefingRecord
): Promise<ManualBriefingResult> {
  const dailyDir = join(memoryRoot, "logs", "daily");
  const usageDir = join(memoryRoot, "logs", "usage");
  await mkdir(dailyDir, { recursive: true });
  await mkdir(usageDir, { recursive: true });

  const markdownPath = join(dailyDir, `${briefing.date}.md`);
  const jsonPath = join(dailyDir, `${briefing.date}.json`);
  const usagePath = join(usageDir, `${briefing.date.slice(0, 7)}.jsonl`);
  const delivery: BriefingDelivery = {
    telegram_summary: renderTelegramSummary(briefing),
    dashboard_json_path: jsonPath,
    markdown_path: markdownPath
  };
  const record = {
    ...briefing,
    delivery
  };

  await writeFile(markdownPath, renderBriefingMarkdown(briefing), "utf8");
  await writeFile(jsonPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await writeFile(usagePath, `${JSON.stringify(createUsageRecord(briefing))}\n`, { flag: "a" });

  return { markdownPath, jsonPath, usagePath, briefing: record, delivery };
}

async function collectBriefingSources(projectRoot: string, memoryRoot: string): Promise<BriefingSources> {
  const repo = await collectRepoSource(projectRoot);
  const latestDailyLog = await readLatestDailyLog(memoryRoot);

  return {
    repo,
    memory: {
      rootExists: true,
      latestDailyLog
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
  };
}

async function collectRepoSource(projectRoot: string): Promise<BriefingSources["repo"]> {
  try {
    const [{ stdout: branch }, { stdout: status }] = await Promise.all([
      execFileAsync("git", ["-C", projectRoot, "branch", "--show-current"]),
      execFileAsync("git", ["-C", projectRoot, "status", "--short"])
    ]);
    const dirty = status.trim().length > 0;
    return {
      branch: branch.trim() || "detached",
      dirty,
      summary: dirty ? "working tree has changes" : "working tree clean"
    };
  } catch {
    return {
      branch: "unknown",
      dirty: false,
      summary: "not a git repository"
    };
  }
}

async function readLatestDailyLog(memoryRoot: string): Promise<string | null> {
  try {
    return await readFile(join(memoryRoot, "logs", "daily", "latest.md"), "utf8");
  } catch {
    return null;
  }
}

function createFailedBriefing(input: { date: string; timezone: string; generatedAt: string; attempts: BriefingAttempt[] }) {
  const sources: BriefingSources = {
    repo: {
      branch: "unknown",
      dirty: false,
      summary: "source collection failed"
    },
    memory: {
      rootExists: false,
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
        status: "failed",
        summary: "Korea market source collection failed."
      },
      us: {
        status: "failed",
        summary: "US market source collection failed."
      }
    },
    trading: {
      realTradingEnabled: false,
      brokerCapabilities: {}
    }
  };
  return {
    ...generateDailyBriefing({
      date: input.date,
      timezone: input.timezone,
      generatedAt: input.generatedAt,
      llmAvailable: false,
      sources,
      failedJobs: ["daily_briefing"]
    }),
    status: "failed" as const,
    attempts: input.attempts
  };
}

function renderBriefingMarkdown(briefing: DailyBriefingRecord): string {
  const sections = briefing.dashboard_sections;
  return [
    `# Daily Briefing - ${briefing.date}`,
    "",
    `- status: ${briefing.status}`,
    `- generated_at: ${briefing.generated_at}`,
    `- timezone: ${briefing.timezone}`,
    "",
    "## Personal",
    ...sections.personal.top_items.map((item) => `- ${item}`),
    "",
    "## Engineering",
    ...sections.engineering.project_status.map((item) => `- ${item}`),
    "",
    "## Korea Market",
    sections.korea_market.summary,
    "",
    "## US Market",
    sections.us_market.summary,
    "",
    "## Trading",
    ...sections.trading.blocked_actions.map((item) => `- ${item}`),
    "",
    "## Agent Operations",
    ...sections.agent_ops.pending_approvals.map((item) => `- ${item}`),
    "",
    "## Usage",
    `- calls_today: ${sections.agent_ops.usage_summary.calls_today}`,
    `- estimated_cost_usd_month: ${sections.agent_ops.usage_summary.estimated_cost_usd_month}`,
    ""
  ].join("\n");
}

function renderTelegramSummary(briefing: DailyBriefingRecord): string {
  const sections = briefing.dashboard_sections;
  return [
    `Dore Morning Briefing - ${briefing.date}`,
    "",
    `1. ${sections.personal.top_items[0] ?? "No personal tasks configured yet."}`,
    `2. ${sections.engineering.project_status[0] ?? "No engineering status."}`,
    `3. ${sections.korea_market.summary}`,
    `4. ${sections.us_market.summary}`,
    `5. ${sections.agent_ops.pending_approvals[0] ?? "No pending approvals."}`,
    `6. ${sections.trading.blocked_actions[0] ?? "No trading blocks."}`
  ].join("\n");
}

function createUsageRecord(briefing: DailyBriefingRecord) {
  return {
    id: `usage_${briefing.date.replaceAll("-", "_")}_briefing`,
    category: "briefing",
    provider: briefing.usage.provider,
    model: briefing.usage.model,
    input_tokens: briefing.usage.input_tokens,
    output_tokens: briefing.usage.output_tokens,
    estimated_cost_usd: briefing.usage.estimated_cost_usd,
    created_at: briefing.generated_at
  };
}

function createSourceFreshness(sources: BriefingSources) {
  return [
    {
      source: "local_repo",
      status: sources.repo.summary === "source collection failed" ? "failed" : "ok",
      observed_at: null
    },
    {
      source: "local_memory",
      status: sources.memory.rootExists ? "ok" : "failed",
      observed_at: null
    },
    {
      source: "korea_market",
      status: sources.markets.korea.status,
      observed_at: null
    },
    {
      source: "us_market",
      status: sources.markets.us.status,
      observed_at: null
    }
  ];
}

async function appendBriefingEvent(
  path: string,
  event: {
    id: string;
    time: string;
    event_type: "briefing_generated" | "briefing_failed_attempt" | "briefing_failed_final";
    summary: string;
    status: string;
    attempt: number;
    scheduled_time: string;
    refs: string[];
  }
) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({
      actor: "scheduler",
      entity_type: "briefing",
      entity_id: "daily_briefing",
      risk_level: "read",
      ...event
    })}\n`,
    { flag: "a" }
  );
}

function createBriefingEventId(now: string, suffix: string, attempt: number): string {
  const timestamp = now.replace(/\D/g, "").slice(0, 14) || "manual";
  return `event_${timestamp}_briefing_${suffix}_${attempt}`;
}

function formatDateForTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === "year" || part.type === "month" || part.type === "day") && parts.find((part) => part.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
