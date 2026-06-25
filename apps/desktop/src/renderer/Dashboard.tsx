import { useEffect, useState } from "react";
import type React from "react";

export interface DashboardStatus {
  daemon: {
    mode: string;
    uptimeLabel: string;
    health?: {
      status: "ok" | "degraded" | "failed";
      ok: number;
      warning: number;
      failed: number;
    };
  };
  critical: {
    pendingApprovals: number;
    failedJobs: number;
    riskHalt: boolean;
    usageCostUsd: number;
  };
  todayTop3: Array<{
    title: string;
    reason: string;
    source: string;
  }>;
  dailyBriefing?: {
    summary: string;
    generatedAt?: string;
    status?: string;
  };
  usage: {
    records: number;
    estimatedCostUsd: number;
    inputTokens: number;
    outputTokens: number;
    failed: number;
  };
  memory: {
    entries: number;
    indexPath?: string;
    recentTitles: string[];
    records?: Array<{
      title: string;
      path: string;
      type?: string;
      status?: string;
      sourceRefs?: string[];
      stale?: boolean;
      conflicts?: string[];
      sensitivity?: string;
    }>;
    quality?: {
      duplicateSuggestions: number;
      staleRecords: number;
      conflictRecords: number;
      duplicateTitles: string[];
      staleTitles: string[];
      conflictTitles: string[];
    };
  };
  scheduler: {
    jobs: Array<{
      id: string;
      time: string;
      timezone: string;
      enabled?: boolean;
      lastRunAt?: string;
      lastRunStatus?: string;
      nextRunAt?: string;
      failureCount?: number;
      retryStatus?: string;
      recentRuns?: Array<{
        id: string;
        jobId: string;
        time: string;
        status: string;
        summary: string;
      }>;
    }>;
  };
  telegram: {
    configured: boolean;
    adapterState: "disabled" | "ready" | "running" | "stopped";
    detail?: string;
  };
  trading: {
    realTradingEnabled: boolean;
    brokers: Record<string, string>;
    dryRunJournal?: {
      month: string;
      entries: number;
      passed: number;
      blocked: number;
      latestSignalId?: string;
    };
    paperJournal?: {
      month: string;
      dryRunEntries: number;
      paperEntries: number;
      latestSignalId?: string;
    };
    marketDataSources?: Array<{
      market: string;
      status: string;
      checkedSymbols: number;
      blockedReasons: string[];
    }>;
    realTradingGate?: {
      enabledRequested: boolean;
      status: "ready" | "blocked";
      blockedReasons: string[];
    };
  };
  approvals: Array<{
    id: string;
    title: string;
    riskLevel: string;
    state: string;
    summary?: string;
    requestedAction?: {
      kind: string;
      target: string;
      dryRunAvailable: boolean;
      reversible: boolean;
    };
  }>;
  logs: Array<{
    id: string;
    time?: string;
    category: "action" | "approval" | "trading" | "usage" | "error";
    eventType: string;
    summary: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority?: string;
  }>;
  settings: {
    providers: Record<string, "configured" | "missing">;
    telegram: "configured" | "missing";
    memory: "ready" | "missing";
    trading: "dry_run" | "real_enabled";
  };
  engineering: {
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      lastCommand?: string;
      failedVerification?: {
        command: string;
        summary: string;
        likelyNextAction: string;
        outputSummary: string;
      };
      reviewReport?: {
        findings: Array<{
          category: string;
          severity: string;
          file: string;
          line: number;
          message: string;
          reference: string;
        }>;
      };
      riskReview?: {
        kind: string;
        target: string;
        approvalRequired: boolean;
        riskLevel: string;
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

type ApprovalDecision = "approved" | "rejected";
type LogFilter = "all" | DashboardStatus["logs"][number]["category"];

export interface ApprovalClient {
  decideApproval(id: string, decision: ApprovalDecision): Promise<void>;
}

export interface TaskClient {
  cancelTask(id: string): Promise<void>;
}

export function createMockDashboardStatus(): DashboardStatus {
  return {
    daemon: {
      mode: "local",
      uptimeLabel: "0s",
      health: {
        status: "degraded",
        ok: 2,
        warning: 4,
        failed: 0
      }
    },
    critical: {
      pendingApprovals: 1,
      failedJobs: 0,
      riskHalt: true,
      usageCostUsd: 0
    },
    todayTop3: [
      {
        title: "Review generated plan",
        reason: "Pending write approval",
        source: "approval_demo_001"
      },
      {
        title: "Run daily briefing",
        reason: "Scheduled at 06:00 Asia/Seoul",
        source: "daily_briefing_0600_kst"
      },
      {
        title: "Continue active roadmap",
        reason: "M11 desktop product screens",
        source: "docs/plan/ROADMAP.md"
      }
    ],
    dailyBriefing: {
      summary: "No briefing has been generated yet.",
      status: "missing"
    },
    usage: {
      records: 0,
      estimatedCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      failed: 0
    },
    memory: {
      entries: 1,
      indexPath: "memory/wiki/index.md",
      recentTitles: ["Dore"]
    },
    scheduler: {
      jobs: [
        {
          id: "daily_briefing_0600_kst",
          time: "06:00",
          timezone: "Asia/Seoul"
        }
      ]
    },
    telegram: {
      configured: false,
      adapterState: "disabled",
      detail: "missing_token"
    },
    trading: {
      realTradingEnabled: false,
      dryRunJournal: {
        month: "2026-06",
        entries: 0,
        passed: 0,
        blocked: 0
      },
      paperJournal: {
        month: "2026-06",
        dryRunEntries: 0,
        paperEntries: 0
      },
      marketDataSources: [
        {
          market: "us",
          status: "ok",
          checkedSymbols: 1,
          blockedReasons: []
        }
      ],
      realTradingGate: {
        enabledRequested: false,
        status: "blocked",
        blockedReasons: ["Trading kill switch is enabled."]
      },
      brokers: {
        toss: "candidate",
        shinhan: "candidate",
        samsung: "read_only_manual_reference"
      }
    },
    approvals: [
      {
        id: "approval_demo_001",
        title: "Review generated plan",
        riskLevel: "write",
        state: "pending",
        summary: "Review generated plan before writing."
      }
    ],
    logs: [
      {
        id: "event_demo_001",
        category: "action",
        eventType: "daemon_status_loaded",
        summary: "Dashboard loaded daemon status."
      }
    ],
    tasks: [
      {
        id: "task_demo_001",
        title: "Continue M11 desktop product screens",
        status: "running",
        priority: "high"
      }
    ],
    settings: {
      providers: {
        OpenAI: "missing",
        Claude: "missing",
        Gemini: "missing"
      },
      telegram: "missing",
      memory: "ready",
      trading: "dry_run"
    },
    engineering: {
      tasks: [
        {
          id: "intake_demo_001",
          title: "Review generated plan",
          status: "planned",
          lastCommand: "pnpm test",
          stages: [
            {
              kind: "plan",
              title: "Prepare requirements, design, and change plan",
              status: "in_progress"
            },
            {
              kind: "patch",
              title: "Apply focused implementation patch",
              status: "pending"
            },
            {
              kind: "verify",
              title: "Run detected verification commands",
              status: "pending"
            },
            {
              kind: "review",
              title: "Review findings by severity",
              status: "pending"
            },
            {
              kind: "memory_reflection",
              title: "Reflect durable engineering knowledge into memory",
              status: "pending"
            }
          ]
        }
      ]
    }
  };
}

export function Dashboard({
  status,
  approvalClient,
  taskClient
}: {
  status: DashboardStatus;
  approvalClient?: ApprovalClient;
  taskClient?: TaskClient;
}) {
  const [approvals, setApprovals] = useState(status.approvals);
  const [logs, setLogs] = useState(status.logs);
  const [tasks, setTasks] = useState(status.tasks);
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [logSearch, setLogSearch] = useState("");
  const [logDate, setLogDate] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<string[]>(["Dore desktop chat ready."]);
  const tradingState = status.trading.realTradingEnabled ? "Real trading enabled" : "Real trading disabled";
  const telegramState = status.telegram.configured ? "Configured" : "Not configured";
  const filteredLogs = filterLogs(logs, logFilter, logSearch, logDate);
  const settingsValidation = createSettingsValidation(status);

  useEffect(() => {
    setApprovals(status.approvals);
    setLogs(status.logs);
    setTasks(status.tasks);
  }, [status.approvals, status.logs, status.tasks]);

  async function recordApprovalDecision(approval: DashboardStatus["approvals"][number], decision: ApprovalDecision) {
    if (approvalClient) {
      await approvalClient.decideApproval(approval.id, decision);
    }
    setApprovals((currentApprovals) => currentApprovals.filter((candidate) => candidate.id !== approval.id));
    setLogs((currentLogs) => [
      {
        id: `approval_${approval.id}_${decision}`,
        category: "approval",
        eventType: "approval_decision_recorded",
        summary: `${approval.id} ${decision}`
      },
      ...currentLogs
    ]);
  }

  async function cancelRuntimeTask(task: DashboardStatus["tasks"][number]) {
    if (taskClient) {
      await taskClient.cancelTask(task.id);
    }
    setTasks((currentTasks) =>
      currentTasks.map((candidate) => (candidate.id === task.id ? { ...candidate, status: "cancelled" } : candidate))
    );
    setLogs((currentLogs) => [
      {
        id: `task_${task.id}_cancelled`,
        category: "action",
        eventType: "task_cancelled",
        summary: `${task.id} cancelled`
      },
      ...currentLogs
    ]);
  }

  function submitChatCommand() {
    const command = chatInput.trim();
    if (!command) {
      return;
    }
    setChatMessages((current) => [runLocalChatCommand(command, status), ...current]);
    setChatInput("");
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.kicker}>Personal AI Agent</p>
          <h1 style={styles.title}>Dore</h1>
        </div>
      </header>

      <section style={styles.criticalStrip} aria-label="Critical Strip">
        <Metric label="Pending approvals" value={status.critical.pendingApprovals} />
        <Metric label="Failed jobs" value={status.critical.failedJobs} />
        <Metric label="Risk halt" value={status.critical.riskHalt ? "active" : "clear"} />
        <Metric label="Month usage" value={`$${formatUsd(status.critical.usageCostUsd)}`} />
      </section>

      <section style={styles.grid} aria-label="Dashboard status">
        <StatusPanel title="Critical Strip">
          <p>Pending approvals: {status.critical.pendingApprovals}</p>
          <p>Failed jobs: {status.critical.failedJobs}</p>
          <p>Risk halt: {status.critical.riskHalt ? "active" : "clear"}</p>
          <p>Usage: ${formatUsd(status.critical.usageCostUsd)}</p>
        </StatusPanel>

        <StatusPanel title="Today Top 3">
          {status.todayTop3.length === 0 ? (
            <p>No priority items</p>
          ) : (
            status.todayTop3.slice(0, 3).map((item, index) => (
              <div key={`${item.source}-${index}`} style={styles.stack}>
                <p>{`${index + 1}. ${item.title}`}</p>
                <p>{item.reason}</p>
                <p>Source: {item.source}</p>
              </div>
            ))
          )}
        </StatusPanel>

        <StatusPanel title="Active Work">
          {tasks.length === 0 && status.engineering.tasks.length === 0 ? (
            <p>No active work</p>
          ) : (
            [...tasks, ...status.engineering.tasks].slice(0, 5).map((task) => (
              <div key={task.id} style={styles.stack}>
                <p>{task.title}</p>
                <p>Status: {task.status}</p>
              </div>
            ))
          )}
        </StatusPanel>

        <StatusPanel title="Daily Briefing">
          {status.dailyBriefing ? (
            <>
              <p>{status.dailyBriefing.summary}</p>
              {status.dailyBriefing.generatedAt ? <p>Generated: {status.dailyBriefing.generatedAt}</p> : null}
              {status.dailyBriefing.status ? <p>Status: {status.dailyBriefing.status}</p> : null}
            </>
          ) : (
            <p>No briefing available</p>
          )}
        </StatusPanel>

        <StatusPanel title="Daemon">
          <p>Mode: {status.daemon.mode}</p>
          <p>Uptime: {status.daemon.uptimeLabel}</p>
          {status.daemon.health ? (
            <>
              <p>Health: {status.daemon.health.status}</p>
              <p>{`Checks ok: ${status.daemon.health.ok} Warning: ${status.daemon.health.warning} Failed: ${status.daemon.health.failed}`}</p>
            </>
          ) : null}
        </StatusPanel>

        <StatusPanel title="Scheduler">
          {status.scheduler.jobs.length === 0 ? (
            <p>No scheduled jobs</p>
          ) : (
            status.scheduler.jobs.map((job) => (
              <p key={job.id}>
                <strong>{job.id}</strong> {job.time} {job.timezone}
              </p>
            ))
          )}
        </StatusPanel>

        <StatusPanel title="Telegram">
          <p>{telegramState}</p>
          <p>Adapter: {status.telegram.adapterState}</p>
        </StatusPanel>

        <StatusPanel title="Trading">
          <p>{tradingState}</p>
          {status.trading.realTradingGate ? <p>Real gate: {status.trading.realTradingGate.status}</p> : null}
          {status.trading.realTradingGate?.blockedReasons[0] ? (
            <p>Gate blocked: {status.trading.realTradingGate.blockedReasons[0]}</p>
          ) : null}
          <p>Dry-run entries: {status.trading.dryRunJournal?.entries ?? 0}</p>
          {status.trading.dryRunJournal ? (
            <p>
              Passed: {status.trading.dryRunJournal.passed} Blocked: {status.trading.dryRunJournal.blocked}
            </p>
          ) : null}
          {status.trading.dryRunJournal?.latestSignalId ? (
            <p>Latest signal: {status.trading.dryRunJournal.latestSignalId}</p>
          ) : null}
          {status.trading.paperJournal ? (
            <p>
              Paper entries: {status.trading.paperJournal.paperEntries} Journal dry-run:{" "}
              {status.trading.paperJournal.dryRunEntries}
            </p>
          ) : null}
          {status.trading.marketDataSources?.map((source) => (
            <p key={source.market}>
              Market data {source.market}: {source.status}
            </p>
          ))}
          {Object.entries(status.trading.brokers).map(([broker, state]) => (
            <p key={broker}>
              {broker}: {state}
            </p>
          ))}
        </StatusPanel>

        <StatusPanel title="Usage">
          <p>Calls: {status.usage.records}</p>
          <p>Month cost: ${formatUsd(status.usage.estimatedCostUsd)}</p>
          <p>Input tokens: {status.usage.inputTokens}</p>
          <p>Output tokens: {status.usage.outputTokens}</p>
          <p>Failed: {status.usage.failed}</p>
        </StatusPanel>

        <StatusPanel title="Memory Updates">
          <p>Indexed pages: {status.memory.entries}</p>
          {status.memory.indexPath ? <p>Index: {status.memory.indexPath}</p> : null}
          {status.memory.recentTitles.length === 0 ? (
            <p>No recent memory pages</p>
          ) : (
            status.memory.recentTitles.slice(0, 3).map((title) => <p key={title}>{title}</p>)
          )}
        </StatusPanel>

        <StatusPanel title="Memory Explorer">
          {status.memory.quality ? (
            <div style={styles.stack}>
              <p>Duplicate suggestions: {status.memory.quality.duplicateSuggestions}</p>
              <p>Stale records: {status.memory.quality.staleRecords}</p>
              <p>Conflict records: {status.memory.quality.conflictRecords}</p>
              {status.memory.quality.duplicateTitles.length > 0 ? (
                <p>Duplicate candidates: {status.memory.quality.duplicateTitles.join(", ")}</p>
              ) : null}
              {status.memory.quality.staleTitles.length > 0 ? (
                <p>Stale candidates: {status.memory.quality.staleTitles.join(", ")}</p>
              ) : null}
              {status.memory.quality.conflictTitles.length > 0 ? (
                <p>Conflict candidates: {status.memory.quality.conflictTitles.join(", ")}</p>
              ) : null}
            </div>
          ) : null}
          {status.memory.records && status.memory.records.length > 0 ? (
            status.memory.records.slice(0, 5).map((record) => (
              <div key={record.path} style={styles.stack}>
                <p>{record.title}</p>
                <p>Path: {record.path}</p>
                {record.type ? <p>Type: {record.type}</p> : null}
                {record.status ? <p>Status: {record.status}</p> : null}
                {record.sensitivity ? <p>Sensitivity: {record.sensitivity}</p> : null}
                <p>Stale: {record.stale ? "yes" : "no"}</p>
                {record.sourceRefs?.map((sourceRef) => <p key={sourceRef}>Source: {sourceRef}</p>)}
                {record.conflicts?.map((conflict) => <p key={conflict}>Conflict: {conflict}</p>)}
              </div>
            ))
          ) : (
            <p>No memory detail records</p>
          )}
        </StatusPanel>

        <StatusPanel title="Chat">
          <div style={styles.actionRow}>
            <input
              aria-label="Chat command"
              value={chatInput}
              placeholder="/usage"
              style={styles.input}
              onChange={(event) => setChatInput(event.target.value)}
            />
            <button type="button" aria-label="Send chat command" style={styles.primaryButton} onClick={submitChatCommand}>
              Send
            </button>
          </div>
          {chatMessages.map((message, index) => (
            <p key={`${message}-${index}`}>{message}</p>
          ))}
        </StatusPanel>

        <StatusPanel title="Approvals">
          {approvals.length === 0 ? (
            <p>No pending approvals</p>
          ) : (
            approvals.map((approval) => (
              <div key={approval.id} style={styles.stack}>
                <p>{approval.id}</p>
                <p>{approval.title}</p>
                {approval.summary ? <p>{approval.summary}</p> : null}
                <p>Risk context: {approval.riskLevel}</p>
                <p>
                  {approval.riskLevel}: {approval.state}
                </p>
                {approval.requestedAction ? (
                  <>
                    <p>{`Action: ${approval.requestedAction.kind} -> ${approval.requestedAction.target}`}</p>
                    <p>{`Dry-run available: ${approval.requestedAction.dryRunAvailable ? "yes" : "no"}`}</p>
                    <p>{`Reversible: ${approval.requestedAction.reversible ? "yes" : "no"}`}</p>
                  </>
                ) : null}
                <div style={styles.actionRow}>
                  <button
                    type="button"
                    aria-label={`Approve ${approval.id}`}
                    style={styles.primaryButton}
                    onClick={() => recordApprovalDecision(approval, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    aria-label={`Reject ${approval.id}`}
                    style={styles.secondaryButton}
                    onClick={() => recordApprovalDecision(approval, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </StatusPanel>

        <StatusPanel title="Logs">
          <input
            aria-label="Search logs"
            value={logSearch}
            placeholder="Search logs"
            style={styles.input}
            onChange={(event) => setLogSearch(event.target.value)}
          />
          <input
            aria-label="Log date"
            value={logDate}
            type="date"
            style={styles.input}
            onChange={(event) => setLogDate(event.target.value)}
          />
          <div style={styles.filterRow}>
            {(["all", "action", "approval", "trading", "usage", "error"] as LogFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                aria-label={`Show ${filter} logs`}
                style={filter === logFilter ? styles.primaryButton : styles.secondaryButton}
                onClick={() => setLogFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          {filteredLogs.length === 0 ? (
            <p>No recent logs</p>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} style={styles.stack}>
                <p>{log.eventType}</p>
                <p>Category: {log.category}</p>
                <p>{log.summary}</p>
              </div>
            ))
          )}
        </StatusPanel>

        <StatusPanel title="Tasks & Schedules">
          {tasks.length === 0 ? (
            <p>No runtime tasks</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} style={styles.stack}>
                <p>{task.id}</p>
                <p>{task.title}</p>
                <p>Status: {task.status}</p>
                {task.priority ? <p>Priority: {task.priority}</p> : null}
                {isTaskCancellable(task.status) ? (
                  <button
                    type="button"
                    aria-label={`Cancel ${task.id}`}
                    style={styles.secondaryButton}
                    onClick={() => cancelRuntimeTask(task)}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            ))
          )}
          {status.scheduler.jobs.map((job) => (
            <div key={job.id} style={styles.stack}>
              <p>{`Schedule: ${job.id} at ${job.time} ${job.timezone}`}</p>
              {typeof job.enabled === "boolean" ? <p>{`Enabled: ${job.enabled ? "yes" : "no"}`}</p> : null}
              {job.lastRunAt && job.lastRunStatus ? <p>{`Last run: ${job.lastRunStatus} at ${job.lastRunAt}`}</p> : null}
              {job.nextRunAt ? <p>{`Next run: ${job.nextRunAt}`}</p> : null}
              {typeof job.failureCount === "number" ? <p>{`Failure count: ${job.failureCount}`}</p> : null}
              {job.retryStatus ? <p>{`Retry status: ${job.retryStatus}`}</p> : null}
              {job.recentRuns?.slice(0, 3).map((run) => (
                <p key={run.id}>{`Recent run: ${run.status} ${run.summary}`}</p>
              ))}
            </div>
          ))}
        </StatusPanel>

        <StatusPanel title="Engineering">
          {status.engineering.tasks.length === 0 ? (
            <p>No engineering tasks</p>
          ) : (
            status.engineering.tasks.map((task) => (
              <div key={task.id} style={styles.stack}>
                <p>{task.id}</p>
                <p>{task.title}</p>
                <p>Status: {task.status}</p>
                {task.lastCommand ? <p>Last command: {task.lastCommand}</p> : null}
                {task.failedVerification ? (
                  <>
                    <p>Failure: {task.failedVerification.summary}</p>
                    <p>Next action: {task.failedVerification.likelyNextAction}</p>
                    <p>Failure output: {task.failedVerification.outputSummary}</p>
                  </>
                ) : null}
                {task.reviewReport?.findings.map((finding) => (
                  <p key={finding.reference}>{`Review finding: ${finding.severity} ${finding.category} ${finding.reference} ${finding.message}`}</p>
                ))}
                {task.riskReview ? (
                  <>
                    <p>{`Risk review: ${task.riskReview.riskLevel} ${task.riskReview.kind} ${task.riskReview.target}`}</p>
                    <p>{`Approval required: ${task.riskReview.approvalRequired ? "yes" : "no"}`}</p>
                    <p>{`Risk reason: ${task.riskReview.reason}`}</p>
                  </>
                ) : null}
                {task.stages?.map((stage) => (
                  <p key={stage.kind}>{`Stage ${stage.kind}: ${stage.status}`}</p>
                ))}
              </div>
            ))
          )}
        </StatusPanel>

        <StatusPanel title="Settings">
          {Object.entries(status.settings.providers).map(([provider, state]) => (
            <p key={provider}>{`${provider}: ${state}`}</p>
          ))}
          <p>{`Telegram: ${status.settings.telegram}`}</p>
          <p>{`Memory: ${status.settings.memory}`}</p>
          <p>{`Trading: ${status.settings.trading}`}</p>
        </StatusPanel>

        <StatusPanel title="Config Validation">
          {settingsValidation.map((item) => (
            <div key={item.id} style={styles.stack}>
              <p>{`${item.label}: ${item.status}`}</p>
              <p>{item.detail}</p>
            </div>
          ))}
        </StatusPanel>
      </section>
    </main>
  );
}

function StatusPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article style={styles.panel}>
      <h2 style={styles.panelTitle}>{title}</h2>
      <div style={styles.panelBody}>{children}</div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
    </div>
  );
}

function formatUsd(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function runLocalChatCommand(command: string, status: DashboardStatus): string {
  switch (command.split(/\s+/)[0]) {
    case "/usage":
      return `Usage: $${formatUsd(status.usage.estimatedCostUsd)}, ${status.usage.records} calls, ${status.usage.failed} failed.`;
    case "/status":
      return `Status: ${status.daemon.mode}, ${status.critical.pendingApprovals} approvals, risk halt ${status.critical.riskHalt ? "active" : "clear"}.`;
    case "/reset":
      return "Chat context reset.";
    case "/new":
      return "New task draft ready.";
    default:
      return "Unknown local command.";
  }
}

function filterLogs(
  logs: DashboardStatus["logs"],
  logFilter: LogFilter,
  search: string,
  date: string
): DashboardStatus["logs"] {
  const needle = search.trim().toLowerCase();
  const day = date.trim();
  return logs.filter((log) => {
    if (logFilter !== "all" && log.category !== logFilter) {
      return false;
    }
    if (day && !log.time?.startsWith(day)) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return `${log.eventType} ${log.summary} ${log.category}`.toLowerCase().includes(needle);
  });
}

function isTaskCancellable(status: string): boolean {
  return status === "queued" || status === "running" || status === "waiting_approval";
}

function createSettingsValidation(status: DashboardStatus): Array<{
  id: string;
  label: string;
  status: "ok" | "missing" | "blocked";
  detail: string;
}> {
  const providerItems = Object.entries(status.settings.providers).map(([provider, state]) => ({
    id: `provider_${provider}`,
    label: `Provider ${provider}`,
    status: state === "configured" ? ("ok" as const) : ("missing" as const),
    detail: state === "configured" ? "Credential environment is available." : "Credential environment is missing."
  }));
  return [
    ...providerItems,
    {
      id: "telegram",
      label: "Telegram",
      status: status.settings.telegram === "configured" ? "ok" : "missing",
      detail: status.settings.telegram === "configured" ? "Bot token and allowlist are ready." : "Token or allowlist is missing."
    },
    {
      id: "memory",
      label: "Memory",
      status: status.settings.memory === "ready" ? "ok" : "missing",
      detail: status.settings.memory === "ready" ? "Memory root is ready." : "Memory root is missing."
    },
    {
      id: "trading",
      label: "Trading",
      status: status.trading.realTradingGate?.status === "blocked" ? "blocked" : "ok",
      detail: status.trading.realTradingEnabled
        ? "Real trading is enabled."
        : "Real trading remains disabled; watch, dry-run, and paper mode only."
    }
  ];
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    margin: 0,
    background: "#f6f7f9",
    color: "#20242a",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    padding: "32px"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px"
  },
  kicker: {
    margin: 0,
    fontSize: "13px",
    color: "#667085"
  },
  title: {
    margin: "4px 0 0",
    fontSize: "34px",
    fontWeight: 700
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px"
  },
  criticalStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "8px",
    marginBottom: "16px",
    border: "1px solid #bec6d4",
    background: "#fefefe",
    padding: "10px"
  },
  metric: {
    display: "grid",
    gap: "4px",
    minHeight: "56px",
    padding: "10px",
    background: "#eef2f7",
    border: "1px solid #d9dee7"
  },
  metricLabel: {
    fontSize: "12px",
    color: "#475467"
  },
  metricValue: {
    fontSize: "18px",
    color: "#101828"
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #d9dee7",
    borderRadius: "8px",
    padding: "16px",
    minHeight: "150px"
  },
  panelTitle: {
    margin: "0 0 12px",
    fontSize: "16px",
    fontWeight: 700
  },
  panelBody: {
    display: "grid",
    gap: "8px",
    fontSize: "14px",
    color: "#344054"
  },
  stack: {
    display: "grid",
    gap: "4px"
  },
  actionRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "4px"
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px"
  },
  primaryButton: {
    border: "1px solid #175cd3",
    borderRadius: "6px",
    background: "#175cd3",
    color: "#ffffff",
    padding: "6px 10px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer"
  },
  secondaryButton: {
    border: "1px solid #d0d5dd",
    borderRadius: "6px",
    background: "#ffffff",
    color: "#344054",
    padding: "6px 10px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer"
  },
  input: {
    minWidth: 0,
    flex: "1 1 140px",
    border: "1px solid #d0d5dd",
    borderRadius: "6px",
    padding: "6px 8px",
    fontSize: "13px",
    color: "#20242a"
  }
};
