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
  trading: {
    enabled: boolean;
    real_trading_enabled: boolean;
    brokers: Record<string, string>;
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
    }
  };
}

function formatUptime(milliseconds: number): string {
  if (milliseconds < 60_000) {
    return `${Math.floor(milliseconds / 1000)}s`;
  }
  return `${Math.floor(milliseconds / 60_000)}m`;
}

