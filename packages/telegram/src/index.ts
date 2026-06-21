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
