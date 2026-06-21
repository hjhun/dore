import { useEffect, useState } from "react";
import type React from "react";

export interface DashboardStatus {
  daemon: {
    mode: string;
    uptimeLabel: string;
  };
  scheduler: {
    jobs: Array<{
      id: string;
      time: string;
      timezone: string;
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
  }>;
  logs: Array<{
    id: string;
    eventType: string;
    summary: string;
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
    }>;
  };
}

type ApprovalDecision = "approved" | "rejected";

export function createMockDashboardStatus(): DashboardStatus {
  return {
    daemon: {
      mode: "local",
      uptimeLabel: "0s"
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
        state: "pending"
      }
    ],
    logs: [
      {
        id: "event_demo_001",
        eventType: "daemon_status_loaded",
        summary: "Dashboard loaded daemon status."
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
          lastCommand: "pnpm test"
        }
      ]
    }
  };
}

export function Dashboard({ status }: { status: DashboardStatus }) {
  const [approvals, setApprovals] = useState(status.approvals);
  const [logs, setLogs] = useState(status.logs);
  const tradingState = status.trading.realTradingEnabled ? "Real trading enabled" : "Real trading disabled";
  const telegramState = status.telegram.configured ? "Configured" : "Not configured";

  useEffect(() => {
    setApprovals(status.approvals);
    setLogs(status.logs);
  }, [status.approvals, status.logs]);

  function recordApprovalDecision(approval: DashboardStatus["approvals"][number], decision: ApprovalDecision) {
    setApprovals((currentApprovals) => currentApprovals.filter((candidate) => candidate.id !== approval.id));
    setLogs((currentLogs) => [
      {
        id: `approval_${approval.id}_${decision}`,
        eventType: "approval_decision_recorded",
        summary: `${approval.id} ${decision}`
      },
      ...currentLogs
    ]);
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.kicker}>Personal AI Agent</p>
          <h1 style={styles.title}>Dore</h1>
        </div>
      </header>

      <section style={styles.grid} aria-label="Dashboard status">
        <StatusPanel title="Daemon">
          <p>Mode: {status.daemon.mode}</p>
          <p>Uptime: {status.daemon.uptimeLabel}</p>
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
          {Object.entries(status.trading.brokers).map(([broker, state]) => (
            <p key={broker}>
              {broker}: {state}
            </p>
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
                <p>
                  {approval.riskLevel}: {approval.state}
                </p>
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
          {logs.length === 0 ? (
            <p>No recent logs</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} style={styles.stack}>
                <p>{log.eventType}</p>
                <p>{log.summary}</p>
              </div>
            ))
          )}
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
  }
};
