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
  };
}

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
      brokers: {
        toss: "candidate",
        shinhan: "candidate",
        samsung: "read_only_manual_reference"
      }
    }
  };
}

export function Dashboard({ status }: { status: DashboardStatus }) {
  const tradingState = status.trading.realTradingEnabled ? "Real trading enabled" : "Real trading disabled";
  const telegramState = status.telegram.configured ? "Configured" : "Not configured";

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
          {Object.entries(status.trading.brokers).map(([broker, state]) => (
            <p key={broker}>
              {broker}: {state}
            </p>
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
  }
};
