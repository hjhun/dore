import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
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
}

export interface ManualBriefingInput {
  memoryRoot: string;
  projectRoot: string;
  date?: string;
  timezone?: string;
  generatedAt?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ManualBriefingResult {
  markdownPath: string;
  jsonPath: string;
  usagePath: string;
}

export function generateDailyBriefing(input: GenerateDailyBriefingInput) {
  const status = input.llmAvailable ? "generated" : "partial";
  const taskItems = input.sources.tasks.length > 0 ? input.sources.tasks : ["No personal tasks configured yet."];
  const approvalItems =
    input.sources.approvals.length > 0 ? input.sources.approvals : ["No pending approvals."];
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
        failed_jobs: [],
        usage_summary: {
          calls_today: input.sources.usage.callsToday,
          estimated_cost_usd_month: input.sources.usage.estimatedCostUsdMonth
        }
      }
    },
    source_refs: ["local_repo", "local_memory", "market_placeholders"],
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
  const timezone = input.timezone ?? "Asia/Seoul";
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const date = input.date ?? formatDateForTimezone(new Date(), timezone);
  const sources = await collectBriefingSources(input.projectRoot, input.memoryRoot);
  const llmAvailable = Boolean(input.env?.OPENAI_API_KEY || input.env?.ANTHROPIC_API_KEY || input.env?.GEMINI_API_KEY);
  const briefing = generateDailyBriefing({
    date,
    timezone,
    generatedAt,
    llmAvailable,
    sources
  });

  const dailyDir = join(input.memoryRoot, "logs", "daily");
  const usageDir = join(input.memoryRoot, "logs", "usage");
  await mkdir(dailyDir, { recursive: true });
  await mkdir(usageDir, { recursive: true });

  const markdownPath = join(dailyDir, `${date}.md`);
  const jsonPath = join(dailyDir, `${date}.json`);
  const usagePath = join(usageDir, `${date.slice(0, 7)}.jsonl`);

  await writeFile(markdownPath, renderBriefingMarkdown(briefing), "utf8");
  await writeFile(jsonPath, `${JSON.stringify(briefing, null, 2)}\n`, "utf8");
  await writeFile(usagePath, `${JSON.stringify(createUsageRecord(briefing))}\n`, { flag: "a" });

  return { markdownPath, jsonPath, usagePath };
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

function renderBriefingMarkdown(briefing: ReturnType<typeof generateDailyBriefing>): string {
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

function createUsageRecord(briefing: ReturnType<typeof generateDailyBriefing>) {
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

function formatDateForTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

