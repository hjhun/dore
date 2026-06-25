import type { DashboardStatus } from "./Dashboard.js";

export interface DaemonStatusPayload {
  app: {
    name: string;
    mode: string;
    uptime_ms: number;
  };
  health?: {
    status: "ok" | "degraded" | "failed";
    summary: {
      ok: number;
      warning: number;
      failed: number;
    };
  };
  scheduler?: {
    jobs: Array<{
      id: string;
      kind?: string;
      time: string;
      timezone: string;
      enabled?: boolean;
      last_run_at?: string;
      last_run_status?: string;
      next_run_at?: string;
      failure_count?: number;
      retry_status?: string;
      recent_runs?: Array<{
        id: string;
        job_id: string;
        time: string;
        status: string;
        summary: string;
      }>;
    }>;
  };
  telegram?: {
    configured: boolean;
    allowlist_required: boolean;
    adapter?: {
      state: "disabled" | "ready" | "running" | "stopped";
      reason?: string;
      mode?: string;
    };
  };
  providers?: {
    openai?: {
      configured: boolean;
    };
    claude?: {
      configured: boolean;
    };
    gemini?: {
      configured: boolean;
    };
  };
  memory?: {
    ready: boolean;
  };
  runtime?: {
    tasks?: Array<{
      id: string;
      title: string;
      status: string;
      priority?: string;
    }>;
    approvals?: Array<{
      id: string;
      title: string;
      summary_for_user?: string;
      risk_level: string;
      state: string;
      requested_action?: {
        kind: string;
        target: string;
        dry_run_available: boolean;
        reversible: boolean;
      };
    }>;
  };
  trading: {
    enabled: boolean;
    real_trading_enabled: boolean;
    brokers: Record<string, string>;
    dry_run_journal?: {
      month: string;
      entries: number;
      passed: number;
      blocked: number;
      latest_signal_id?: string;
    };
    paper_journal?: {
      month: string;
      dry_run_entries: number;
      paper_entries: number;
      latest_signal_id?: string;
    };
    market_data_sources?: Array<{
      market: string;
      status: string;
      checked_symbols: number;
      blocked_reasons: string[];
    }>;
    real_trading_gate?: {
      enabled_requested: boolean;
      status: "ready" | "blocked";
      blocked_reasons: string[];
    };
  };
  engineering?: {
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      last_command?: string;
      failed_verification?: {
        command: string;
        summary: string;
        likely_next_action: string;
        output_summary: string;
      };
      review_report?: {
        findings?: Array<{
          category: string;
          severity: string;
          file: string;
          line: number;
          message: string;
          reference: string;
        }>;
      };
      risk_review?: {
        kind: string;
        target: string;
        approval_required: boolean;
        risk_level: string;
        reason: string;
      };
      stages?: Array<{
        kind: string;
        title: string;
        status: string;
      }>;
    }>;
  };
}

export interface LatestBriefingPayload {
  briefing?: {
    status?: string;
    generated_at?: string;
    telegram_summary?: string;
    delivery?: {
      telegram_summary?: string;
    };
  };
}

export interface UsageSummaryPayload {
  summary?: {
    records: number;
    estimated_cost_usd: number;
    input_tokens: number;
    output_tokens: number;
    failed: number;
  };
}

export interface MemoryIndexPayload {
  index_path?: string;
  entries?: Array<{
    path: string;
    title: string;
    type?: string;
    status?: string;
    source_refs?: string[];
    stale?: boolean;
    conflicts?: string[];
    sensitivity?: string;
  }>;
}

export interface MemoryQualityPayload {
  quality?: {
    duplicateSuggestions?: Array<{
      records?: Array<{
        title: string;
      }>;
    }>;
    staleQueue?: Array<{
      title: string;
    }>;
    conflictQueue?: Array<{
      title: string;
    }>;
  };
}

export interface RecentLogsPayload {
  logs?: Array<{
    id: string;
    time?: string;
    category: "action" | "approval" | "trading" | "usage" | "error";
    event_type: string;
    summary: string;
  }>;
}

export interface FetchDashboardStatusOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export function mapDaemonStatusToDashboard(
  payload: DaemonStatusPayload,
  extras: {
    briefing?: LatestBriefingPayload | null;
    usage?: UsageSummaryPayload | null;
    memoryIndex?: MemoryIndexPayload | null;
    memoryQuality?: MemoryQualityPayload | null;
    recentLogs?: RecentLogsPayload | null;
  } = {}
): DashboardStatus {
  const approvals =
    payload.runtime?.approvals?.map((approval) => ({
      id: approval.id,
      title: approval.title,
      riskLevel: approval.risk_level,
      state: approval.state,
      summary: approval.summary_for_user,
      requestedAction: approval.requested_action
        ? {
            kind: approval.requested_action.kind,
            target: approval.requested_action.target,
            dryRunAvailable: approval.requested_action.dry_run_available,
            reversible: approval.requested_action.reversible
          }
        : undefined
    })) ?? [];
  const tasks =
    payload.runtime?.tasks?.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority
    })) ?? [];
  const usage = {
    records: extras.usage?.summary?.records ?? 0,
    estimatedCostUsd: extras.usage?.summary?.estimated_cost_usd ?? 0,
    inputTokens: extras.usage?.summary?.input_tokens ?? 0,
    outputTokens: extras.usage?.summary?.output_tokens ?? 0,
    failed: extras.usage?.summary?.failed ?? 0
  };
  const recentLogs =
    extras.recentLogs?.logs?.map((log) => ({
      id: log.id,
      time: log.time,
      category: log.category,
      eventType: log.event_type,
      summary: log.summary
    })) ?? [];
  const riskHalt = payload.trading.real_trading_gate?.status === "blocked";
  return {
    daemon: {
      mode: payload.app.mode,
      uptimeLabel: formatUptime(payload.app.uptime_ms),
      health: payload.health
        ? {
            status: payload.health.status,
            ok: payload.health.summary.ok,
            warning: payload.health.summary.warning,
            failed: payload.health.summary.failed
          }
        : undefined
    },
    critical: {
      pendingApprovals: approvals.filter((approval) => approval.state === "pending").length,
      failedJobs: usage.failed + recentLogs.filter((log) => log.category === "error").length,
      riskHalt,
      usageCostUsd: usage.estimatedCostUsd
    },
    todayTop3: createTodayTop3(approvals, tasks, payload.scheduler?.jobs ?? []),
    dailyBriefing: briefingSummary(extras.briefing),
    usage,
    memory: {
      entries: extras.memoryIndex?.entries?.length ?? 0,
      indexPath: extras.memoryIndex?.index_path,
      recentTitles: extras.memoryIndex?.entries?.map((entry) => entry.title) ?? [],
      records: extras.memoryIndex?.entries?.map((entry) => ({
        title: entry.title,
        path: entry.path,
        type: entry.type,
        status: entry.status,
        sourceRefs: entry.source_refs,
        stale: entry.stale,
        conflicts: entry.conflicts,
        sensitivity: entry.sensitivity
      })),
      quality: memoryQualitySummary(extras.memoryQuality)
    },
    scheduler: {
      jobs:
        payload.scheduler?.jobs.map((job) => ({
          id: job.id,
          time: job.time,
          timezone: job.timezone,
          enabled: job.enabled,
          lastRunAt: job.last_run_at,
          lastRunStatus: job.last_run_status,
          nextRunAt: job.next_run_at,
          failureCount: job.failure_count,
          retryStatus: job.retry_status,
          recentRuns: job.recent_runs?.map((run) => ({
            id: run.id,
            jobId: run.job_id,
            time: run.time,
            status: run.status,
            summary: run.summary
          }))
        })) ?? []
    },
    telegram: {
      configured: payload.telegram?.configured ?? false,
      adapterState: payload.telegram?.adapter?.state ?? "disabled",
      detail: payload.telegram?.adapter?.reason
    },
    trading: {
      realTradingEnabled: payload.trading.real_trading_enabled,
      brokers: payload.trading.brokers,
      dryRunJournal: payload.trading.dry_run_journal
        ? {
            month: payload.trading.dry_run_journal.month,
            entries: payload.trading.dry_run_journal.entries,
            passed: payload.trading.dry_run_journal.passed,
            blocked: payload.trading.dry_run_journal.blocked,
            latestSignalId: payload.trading.dry_run_journal.latest_signal_id
          }
        : undefined,
      paperJournal: payload.trading.paper_journal
        ? {
            month: payload.trading.paper_journal.month,
            dryRunEntries: payload.trading.paper_journal.dry_run_entries,
            paperEntries: payload.trading.paper_journal.paper_entries,
            latestSignalId: payload.trading.paper_journal.latest_signal_id
          }
        : undefined,
      marketDataSources: payload.trading.market_data_sources?.map((source) => ({
        market: source.market,
        status: source.status,
        checkedSymbols: source.checked_symbols,
        blockedReasons: source.blocked_reasons
      })),
      realTradingGate: payload.trading.real_trading_gate
        ? {
            enabledRequested: payload.trading.real_trading_gate.enabled_requested,
            status: payload.trading.real_trading_gate.status,
            blockedReasons: payload.trading.real_trading_gate.blocked_reasons
          }
        : undefined
    },
    approvals,
    logs: recentLogs,
    tasks,
    settings: {
      providers: {
        OpenAI: providerState(payload.providers?.openai?.configured),
        Claude: providerState(payload.providers?.claude?.configured),
        Gemini: providerState(payload.providers?.gemini?.configured)
      },
      telegram: payload.telegram?.configured ? "configured" : "missing",
      memory: payload.memory?.ready ? "ready" : "missing",
      trading: payload.trading.real_trading_enabled ? "real_enabled" : "dry_run"
    },
    engineering: {
      tasks:
        payload.engineering?.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          lastCommand: task.last_command,
          failedVerification: task.failed_verification
            ? {
                command: task.failed_verification.command,
                summary: task.failed_verification.summary,
                likelyNextAction: task.failed_verification.likely_next_action,
                outputSummary: task.failed_verification.output_summary
              }
            : undefined,
          reviewReport: task.review_report
            ? {
                findings:
                  task.review_report.findings?.map((finding) => ({
                    category: finding.category,
                    severity: finding.severity,
                    file: finding.file,
                    line: finding.line,
                    message: finding.message,
                    reference: finding.reference
                  })) ?? []
              }
            : undefined,
          riskReview: task.risk_review
            ? {
                kind: task.risk_review.kind,
                target: task.risk_review.target,
                approvalRequired: task.risk_review.approval_required,
                riskLevel: task.risk_review.risk_level,
                reason: task.risk_review.reason
              }
            : undefined,
          stages: task.stages?.map((stage) => ({
            kind: stage.kind,
            title: stage.title,
            status: stage.status
          }))
        })) ?? []
    }
  };
}

export async function fetchDashboardStatus(options: FetchDashboardStatusOptions): Promise<DashboardStatus> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  try {
    const response = await fetchImpl(`${baseUrl}/status`);
    if (!response.ok) {
      return createOfflineDashboardStatus();
    }
    const [briefing, usage, memoryIndex, memoryQuality, recentLogs] = await Promise.all([
      fetchOptionalJson<LatestBriefingPayload>(fetchImpl, `${baseUrl}/briefings/latest`),
      fetchOptionalJson<UsageSummaryPayload>(fetchImpl, `${baseUrl}/usage/summary`),
      fetchOptionalJson<MemoryIndexPayload>(fetchImpl, `${baseUrl}/memory/index`),
      fetchOptionalJson<MemoryQualityPayload>(fetchImpl, `${baseUrl}/memory/quality`),
      fetchOptionalJson<RecentLogsPayload>(fetchImpl, `${baseUrl}/logs/recent`)
    ]);
    return mapDaemonStatusToDashboard((await response.json()) as DaemonStatusPayload, {
      briefing,
      usage,
      memoryIndex,
      memoryQuality,
      recentLogs
    });
  } catch {
    return createOfflineDashboardStatus();
  }
}

export function createDaemonTaskClient(options: FetchDashboardStatusOptions): {
  cancelTask(id: string): Promise<void>;
} {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  return {
    async cancelTask(id: string): Promise<void> {
      const response = await fetchImpl(`${baseUrl}/tasks/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          reason: "Cancelled from desktop."
        })
      });
      if (!response.ok) {
        throw new Error(`Failed to cancel task ${id}.`);
      }
    }
  };
}

export function createOfflineDashboardStatus(): DashboardStatus {
  return {
    daemon: {
      mode: "offline",
      uptimeLabel: "n/a",
      health: {
        status: "failed",
        ok: 0,
        warning: 0,
        failed: 1
      }
    },
    critical: {
      pendingApprovals: 0,
      failedJobs: 1,
      riskHalt: true,
      usageCostUsd: 0
    },
    todayTop3: [
      {
        title: "Reconnect daemon",
        reason: "Dashboard could not reach local daemon",
        source: "desktop"
      }
    ],
    dailyBriefing: undefined,
    usage: {
      records: 0,
      estimatedCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      failed: 0
    },
    memory: {
      entries: 0,
      recentTitles: []
    },
    scheduler: {
      jobs: []
    },
    telegram: {
      configured: false,
      adapterState: "disabled",
      detail: "daemon_offline"
    },
    trading: {
      realTradingEnabled: false,
      dryRunJournal: {
        month: "offline",
        entries: 0,
        passed: 0,
        blocked: 0
      },
      paperJournal: {
        month: "offline",
        dryRunEntries: 0,
        paperEntries: 0
      },
      marketDataSources: [],
      realTradingGate: {
        enabledRequested: false,
        status: "blocked",
        blockedReasons: ["daemon_offline"]
      },
      brokers: {
        toss: "unknown",
        shinhan: "unknown",
        samsung: "unknown"
      }
    },
    approvals: [],
    logs: [],
    tasks: [],
    settings: {
      providers: {
        OpenAI: "missing",
        Claude: "missing",
        Gemini: "missing"
      },
      telegram: "missing",
      memory: "missing",
      trading: "dry_run"
    },
    engineering: {
      tasks: []
    }
  };
}

async function fetchOptionalJson<T>(fetchImpl: typeof fetch, url: string): Promise<T | null> {
  try {
    const response = await fetchImpl(url);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function briefingSummary(payload: LatestBriefingPayload | null | undefined): DashboardStatus["dailyBriefing"] {
  const briefing = payload?.briefing;
  if (!briefing) {
    return undefined;
  }
  return {
    summary: briefing.delivery?.telegram_summary ?? briefing.telegram_summary ?? "Latest briefing has no summary.",
    generatedAt: briefing.generated_at,
    status: briefing.status
  };
}

function memoryQualitySummary(payload: MemoryQualityPayload | null | undefined): DashboardStatus["memory"]["quality"] | undefined {
  const quality = payload?.quality;
  if (!quality) {
    return undefined;
  }
  const duplicateTitles = uniqueTitles(
    (quality.duplicateSuggestions ?? []).flatMap((suggestion) => suggestion.records?.map((record) => record.title) ?? [])
  );
  return {
    duplicateSuggestions: quality.duplicateSuggestions?.length ?? 0,
    staleRecords: quality.staleQueue?.length ?? 0,
    conflictRecords: quality.conflictQueue?.length ?? 0,
    duplicateTitles,
    staleTitles: uniqueTitles((quality.staleQueue ?? []).map((record) => record.title)),
    conflictTitles: uniqueTitles((quality.conflictQueue ?? []).map((record) => record.title))
  };
}

function uniqueTitles(titles: string[]): string[] {
  return [...new Set(titles.filter((title) => title.trim().length > 0))];
}

function createTodayTop3(
  approvals: DashboardStatus["approvals"],
  tasks: DashboardStatus["tasks"],
  jobs: Array<{ id: string; time: string; timezone: string }>
): DashboardStatus["todayTop3"] {
  const items: DashboardStatus["todayTop3"] = [];
  for (const approval of approvals.filter((approval) => approval.state === "pending")) {
    items.push({
      title: approval.title,
      reason: `${approval.riskLevel} approval is waiting`,
      source: approval.id
    });
  }
  for (const task of tasks.filter((task) => task.status === "running" || task.status === "queued")) {
    items.push({
      title: task.title,
      reason: `${task.status}${task.priority ? ` / ${task.priority}` : ""}`,
      source: task.id
    });
  }
  for (const job of jobs) {
    items.push({
      title: job.id,
      reason: `${job.time} ${job.timezone}`,
      source: "scheduler"
    });
  }
  return items.slice(0, 3);
}

function providerState(configured: boolean | undefined): "configured" | "missing" {
  return configured ? "configured" : "missing";
}

function formatUptime(milliseconds: number): string {
  if (milliseconds < 60_000) {
    return `${Math.floor(milliseconds / 1000)}s`;
  }
  return `${Math.floor(milliseconds / 60_000)}m`;
}
