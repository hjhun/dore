import type { DashboardStatus } from "./Dashboard.js";

export interface DaemonStatusPayload {
  app: {
    name: string;
    mode: string;
    uptime_ms: number;
  };
  scheduler?: {
    jobs: Array<{
      id: string;
      kind?: string;
      time: string;
      timezone: string;
      enabled?: boolean;
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
  trading: {
    enabled: boolean;
    real_trading_enabled: boolean;
    brokers: Record<string, string>;
  };
  engineering?: {
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      last_command?: string;
    }>;
  };
}

export interface FetchDashboardStatusOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export function mapDaemonStatusToDashboard(payload: DaemonStatusPayload): DashboardStatus {
  return {
    daemon: {
      mode: payload.app.mode,
      uptimeLabel: formatUptime(payload.app.uptime_ms)
    },
    scheduler: {
      jobs:
        payload.scheduler?.jobs.map((job) => ({
          id: job.id,
          time: job.time,
          timezone: job.timezone
        })) ?? []
    },
    telegram: {
      configured: payload.telegram?.configured ?? false,
      adapterState: payload.telegram?.adapter?.state ?? "disabled",
      detail: payload.telegram?.adapter?.reason
    },
    trading: {
      realTradingEnabled: payload.trading.real_trading_enabled,
      brokers: payload.trading.brokers
    },
    approvals: [],
    logs: [],
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
          lastCommand: task.last_command
        })) ?? []
    }
  };
}

export async function fetchDashboardStatus(options: FetchDashboardStatusOptions): Promise<DashboardStatus> {
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(`${options.baseUrl.replace(/\/$/, "")}/status`);
    if (!response.ok) {
      return createOfflineDashboardStatus();
    }
    return mapDaemonStatusToDashboard((await response.json()) as DaemonStatusPayload);
  } catch {
    return createOfflineDashboardStatus();
  }
}

export function createOfflineDashboardStatus(): DashboardStatus {
  return {
    daemon: {
      mode: "offline",
      uptimeLabel: "n/a"
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
      brokers: {
        toss: "unknown",
        shinhan: "unknown",
        samsung: "unknown"
      }
    },
    approvals: [],
    logs: [],
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

function providerState(configured: boolean | undefined): "configured" | "missing" {
  return configured ? "configured" : "missing";
}

function formatUptime(milliseconds: number): string {
  if (milliseconds < 60_000) {
    return `${Math.floor(milliseconds / 1000)}s`;
  }
  return `${Math.floor(milliseconds / 60_000)}m`;
}
