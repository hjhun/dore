import { describe, expect, it } from "vitest";
import { fetchDashboardStatus, mapDaemonStatusToDashboard } from "./daemon-status.js";

describe("daemon status mapping", () => {
  it("maps daemon /status payload into Dashboard state", () => {
    const dashboard = mapDaemonStatusToDashboard({
      app: {
        name: "Dore",
        mode: "local",
        uptime_ms: 65000
      },
      scheduler: {
        jobs: [
          {
            id: "daily_briefing_0600_kst",
            kind: "daily_briefing",
            time: "06:00",
            timezone: "Asia/Seoul",
            enabled: true
          }
        ]
      },
      telegram: {
        configured: false,
        allowlist_required: true,
        adapter: {
          state: "disabled",
          reason: "missing_token"
        }
      },
      providers: {
        openai: {
          configured: true
        },
        claude: {
          configured: false
        },
        gemini: {
          configured: false
        }
      },
      memory: {
        ready: true
      },
      trading: {
        enabled: true,
        real_trading_enabled: false,
        dry_run_journal: {
          month: "2026-06",
          entries: 2,
          passed: 1,
          blocked: 1,
          latest_signal_id: "signal_20260622_AAPL_status"
        },
        real_trading_gate: {
          enabled_requested: true,
          status: "blocked",
          blocked_reasons: ["Trading kill switch is enabled."]
        },
        brokers: {
          toss: "candidate",
          shinhan: "candidate",
          samsung: "read_only_manual_reference"
        }
      },
      engineering: {
        tasks: [
          {
            id: "intake_2026_06_22_add_daemon_task_wrapper",
            title: "Add daemon task wrapper",
            status: "completed",
            last_command: "pnpm test"
          }
        ]
      }
    });

    expect(dashboard.daemon.mode).toBe("local");
    expect(dashboard.daemon.uptimeLabel).toBe("1m");
    expect(dashboard.scheduler.jobs[0].id).toBe("daily_briefing_0600_kst");
    expect(dashboard.telegram.adapterState).toBe("disabled");
    expect(dashboard.telegram.detail).toBe("missing_token");
    expect(dashboard.trading.realTradingEnabled).toBe(false);
    expect(dashboard.trading.dryRunJournal).toEqual({
      month: "2026-06",
      entries: 2,
      passed: 1,
      blocked: 1,
      latestSignalId: "signal_20260622_AAPL_status"
    });
    expect(dashboard.trading.realTradingGate).toEqual({
      enabledRequested: true,
      status: "blocked",
      blockedReasons: ["Trading kill switch is enabled."]
    });
    expect(dashboard.settings.providers.OpenAI).toBe("configured");
    expect(dashboard.settings.providers.Claude).toBe("missing");
    expect(dashboard.settings.memory).toBe("ready");
    expect(dashboard.settings.trading).toBe("dry_run");
    expect(dashboard.engineering.tasks[0].status).toBe("completed");
  });

  it("returns an offline dashboard state when daemon fetch fails", async () => {
    const status = await fetchDashboardStatus({
      baseUrl: "http://127.0.0.1:3173",
      fetchImpl: async () => {
        throw new Error("daemon down");
      }
    });

    expect(status.daemon.mode).toBe("offline");
    expect(status.scheduler.jobs).toEqual([]);
    expect(status.telegram.adapterState).toBe("disabled");
    expect(status.trading.realTradingEnabled).toBe(false);
  });
});
