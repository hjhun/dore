import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface TelegramCommand {
  userId: number;
  text: string;
}

export interface TelegramCommandContext {
  getStatus(): Promise<string>;
  getBriefing(): Promise<string>;
  getUsage(): Promise<string>;
  requestStop(): Promise<string>;
}

export interface TelegramCommandOptions {
  allowedUserIds: number[];
  context: TelegramCommandContext;
}

export interface TelegramAdapterConfig {
  enabled: boolean;
  botToken: string | undefined;
  allowedUserIds: number[];
}

export interface TelegramAdapterRuntimeConfig extends TelegramAdapterConfig {
  poll(signal: AbortSignal): Promise<void>;
}

export interface TelegramRuntimeTask {
  id: string;
  title: string;
  status: "queued" | "running" | "waiting_approval" | "completed" | "failed" | "cancelled";
}

export interface TelegramApprovalSnapshot {
  id: string;
  title: string;
  summary_for_user: string;
  risk_level: "write" | "execute" | "trade" | "critical";
  state: "pending" | "approved" | "rejected" | "expired" | "cancelled";
}

export interface TelegramDaemonStatus {
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
  runtime?: {
    tasks?: TelegramRuntimeTask[];
    approvals?: TelegramApprovalSnapshot[];
  };
}

export interface TelegramBriefingSnapshot {
  date?: string;
  status?: string;
  telegram_summary?: string;
  delivery?: {
    telegram_summary?: string;
  };
}

export interface TelegramLatestBriefing {
  briefing: TelegramBriefingSnapshot;
  path?: string;
}

export interface TelegramUsageSummary {
  records: number;
  estimated_cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  failed: number;
}

export interface TelegramDaemonClient {
  getStatus(): Promise<TelegramDaemonStatus>;
  getLatestBriefing(): Promise<TelegramLatestBriefing | null>;
  getUsageSummary(): Promise<TelegramUsageSummary>;
  listTasks?(): Promise<TelegramRuntimeTask[]>;
  cancelTask(taskId: string, input: { reason: string }): Promise<TelegramRuntimeTask>;
}

export interface TelegramOutbound {
  sendMessage(userId: number, text: string): Promise<void>;
}

export type TelegramNotification =
  | {
      type: "daily_briefing";
      briefing: TelegramBriefingSnapshot;
    }
  | {
      type: "task_completed" | "task_failed";
      task: TelegramRuntimeTask;
      error?: string;
    }
  | {
      type: "approval_requested";
      approval: TelegramApprovalSnapshot;
    };

export interface TelegramDeliveryInput {
  allowedUserIds: number[];
  outbound: TelegramOutbound;
  memoryRoot?: string;
}

export interface TelegramDeliveryResult {
  attempted: number;
  delivered: number;
  failed: number;
}

export interface HttpTelegramDaemonClientOptions {
  baseUrl: string;
  authToken?: string;
  fetch?: typeof fetch;
}

export type TelegramAdapterStatus =
  | { state: "disabled"; reason: "disabled_by_config" | "missing_token" | "empty_allowlist" }
  | { state: "ready"; mode: "long_polling" };

export type TelegramCommandResponse =
  | { action: "ignored"; text?: undefined }
  | { action: "rejected"; text: string }
  | { action: "reply"; text: string };

export function createTelegramAdapterStatus(config: TelegramAdapterConfig): TelegramAdapterStatus {
  if (!config.enabled) {
    return { state: "disabled", reason: "disabled_by_config" };
  }
  if (!config.botToken || config.botToken.trim().length === 0) {
    return { state: "disabled", reason: "missing_token" };
  }
  if (config.allowedUserIds.length === 0) {
    return { state: "disabled", reason: "empty_allowlist" };
  }
  return { state: "ready", mode: "long_polling" };
}

export function createTelegramAdapter(config: TelegramAdapterRuntimeConfig) {
  const status = createTelegramAdapterStatus(config);
  let controller: AbortController | null = null;
  let state: "disabled" | "ready" | "running" | "stopped" = status.state === "ready" ? "ready" : "disabled";

  return {
    getStatus: () => status,
    getState: () => state,
    async start(): Promise<
      | { started: false; reason: "disabled_by_config" | "missing_token" | "empty_allowlist" }
      | { started: true }
    > {
      if (status.state === "disabled") {
        state = "disabled";
        return { started: false, reason: status.reason };
      }
      if (controller) {
        return { started: true };
      }
      controller = new AbortController();
      state = "running";
      await config.poll(controller.signal);
      return { started: true };
    },
    stop(): void {
      if (controller) {
        controller.abort();
        controller = null;
      }
      if (status.state === "ready") {
        state = "stopped";
      }
    }
  };
}

export function createDaemonTelegramContext(client: TelegramDaemonClient): TelegramCommandContext {
  return {
    async getStatus(): Promise<string> {
      const status = await client.getStatus();
      const tasks = status.runtime?.tasks ?? [];
      const approvals = status.runtime?.approvals ?? [];
      const runningTasks = tasks.filter((task) => task.status === "running").length;
      const queuedTasks = tasks.filter((task) => task.status === "queued" || task.status === "waiting_approval").length;
      const pendingApprovals = approvals.filter((approval) => approval.state === "pending").length;
      const health = status.health
        ? `, health: ${status.health.status} (${status.health.summary.failed} failed, ${status.health.summary.warning} warning)`
        : "";
      return `${status.app.name} ${status.app.mode}: uptime ${formatDuration(status.app.uptime_ms)}, running tasks: ${runningTasks}, queued tasks: ${queuedTasks}, pending approvals: ${pendingApprovals}${health}.`;
    },
    async getBriefing(): Promise<string> {
      const latest = await client.getLatestBriefing();
      if (!latest) {
        return "No briefing has been generated yet.";
      }
      return briefingSummary(latest.briefing);
    },
    async getUsage(): Promise<string> {
      const summary = await client.getUsageSummary();
      return `Usage: $${formatUsd(summary.estimated_cost_usd)} month, ${summary.records} calls, ${summary.input_tokens} input tokens, ${summary.output_tokens} output tokens, ${summary.failed} failed.`;
    },
    async requestStop(): Promise<string> {
      const task = await findCancelableTask(client);
      if (!task) {
        return "No running or queued task to stop.";
      }
      if (!client.cancelTask) {
        return `Stop requested for ${task.id}, but daemon cancellation is not configured.`;
      }
      const cancelled = await client.cancelTask(task.id, {
        reason: "Requested from Telegram /stop."
      });
      return `Stop requested for ${cancelled.id}: ${cancelled.title}.`;
    }
  };
}

export function createHttpTelegramDaemonClient(options: HttpTelegramDaemonClientOptions): TelegramDaemonClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetch ?? fetch;

  async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (options.authToken) {
      headers.set("authorization", `Bearer ${options.authToken}`);
    }
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers
    });
    if (!response.ok) {
      throw new Error(`daemon_request_failed:${response.status}:${path}`);
    }
    return (await response.json()) as T;
  }

  return {
    getStatus: async () => requestJson<TelegramDaemonStatus>("/status"),
    getLatestBriefing: async () => {
      try {
        return await requestJson<TelegramLatestBriefing>("/briefings/latest");
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("daemon_request_failed:404:")) {
          return null;
        }
        throw error;
      }
    },
    getUsageSummary: async () => {
      const response = await requestJson<{ summary: TelegramUsageSummary }>("/usage/summary");
      return response.summary;
    },
    listTasks: async () => {
      const response = await requestJson<{ tasks: TelegramRuntimeTask[] }>("/tasks");
      return response.tasks;
    },
    cancelTask: async (taskId, input) => {
      const response = await requestJson<{ task: TelegramRuntimeTask }>(`/tasks/${encodeURIComponent(taskId)}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          reason: input.reason
        })
      });
      return response.task;
    }
  };
}

export async function pushDailyBriefingSummary(
  input: TelegramDeliveryInput & { briefing: TelegramBriefingSnapshot }
): Promise<TelegramDeliveryResult> {
  return notifyTelegramUsers({
    ...input,
    notification: {
      type: "daily_briefing",
      briefing: input.briefing
    }
  });
}

export async function notifyTelegramUsers(
  input: TelegramDeliveryInput & { notification: TelegramNotification }
): Promise<TelegramDeliveryResult> {
  if (input.allowedUserIds.length === 0) {
    return { attempted: 0, delivered: 0, failed: 0 };
  }

  const text = redactTelegramSecrets(formatTelegramNotification(input.notification));
  let delivered = 0;
  let failed = 0;
  for (const userId of input.allowedUserIds) {
    try {
      await input.outbound.sendMessage(userId, text);
      delivered += 1;
    } catch (error) {
      failed += 1;
      if (input.memoryRoot) {
        await appendTelegramFailureEvent(input.memoryRoot, {
          userId,
          notificationType: input.notification.type,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
  return {
    attempted: input.allowedUserIds.length,
    delivered,
    failed
  };
}

export function formatTelegramNotification(notification: TelegramNotification): string {
  switch (notification.type) {
    case "daily_briefing":
      return briefingSummary(notification.briefing);
    case "task_completed":
      return `Task completed: ${notification.task.title} (${notification.task.id}).`;
    case "task_failed": {
      const suffix = notification.error ? ` ${notification.error}` : "";
      return `Task failed: ${notification.task.title} (${notification.task.id}).${suffix}`;
    }
    case "approval_requested":
      return `Approval requested: ${notification.approval.title} [${notification.approval.risk_level}]. ${notification.approval.summary_for_user}`;
  }
}

export function redactTelegramSecrets(text: string): string {
  return text
    .replace(/TELEGRAM_BOT_TOKEN=([^\s]+)/g, "TELEGRAM_BOT_TOKEN=[REDACTED_TELEGRAM_TOKEN]")
    .replace(/\b\d{5,}:[A-Za-z0-9_-]+\b/g, "[REDACTED_TELEGRAM_TOKEN]")
    .replace(/\bBearer\s+[^\s]+/g, "[REDACTED_BEARER]")
    .replace(/\bsecret_ref:[^\s,;]+/g, "[REDACTED_SECRET_REF]");
}

export async function handleTelegramCommand(
  command: TelegramCommand,
  options: TelegramCommandOptions
): Promise<TelegramCommandResponse> {
  if (options.allowedUserIds.length === 0) {
    return { action: "ignored" };
  }

  if (!options.allowedUserIds.includes(command.userId)) {
    return { action: "rejected", text: "Unauthorized Telegram user." };
  }

  const verb = command.text.trim().split(/\s+/)[0];

  switch (verb) {
    case "/status":
      return { action: "reply", text: await options.context.getStatus() };
    case "/briefing":
      return { action: "reply", text: await options.context.getBriefing() };
    case "/usage":
      return { action: "reply", text: await options.context.getUsage() };
    case "/stop":
      return { action: "reply", text: await options.context.requestStop() };
    default:
      return { action: "reply", text: "Unknown command." };
  }
}

async function findCancelableTask(client: TelegramDaemonClient): Promise<TelegramRuntimeTask | null> {
  const tasks = client.listTasks ? await client.listTasks() : (await client.getStatus()).runtime?.tasks ?? [];
  return (
    tasks.find((task) => task.status === "running") ??
    tasks.find((task) => task.status === "queued" || task.status === "waiting_approval") ??
    null
  );
}

function briefingSummary(briefing: TelegramBriefingSnapshot): string {
  return briefing.delivery?.telegram_summary ?? briefing.telegram_summary ?? "Latest briefing has no Telegram summary.";
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function formatUsd(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

async function appendTelegramFailureEvent(
  memoryRoot: string,
  input: {
    userId: number;
    notificationType: TelegramNotification["type"];
    error: string;
  }
): Promise<void> {
  const path = join(memoryRoot, "logs", "events", "telegram.jsonl");
  await mkdir(join(memoryRoot, "logs", "events"), { recursive: true });
  const record = {
    time: new Date().toISOString(),
    event_type: "telegram_delivery_failed",
    notification_type: input.notificationType,
    user_id: input.userId,
    error: redactTelegramSecrets(input.error)
  };
  await writeFile(path, `${JSON.stringify(record)}\n`, { flag: "a" });
}
