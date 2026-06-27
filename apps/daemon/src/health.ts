import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type HealthStatus = "ok" | "degraded" | "failed";
export type HealthCheckStatus = "ok" | "warning" | "failed";
export type HealthCheckSeverity = "required" | "optional";

export interface HealthCheck {
  id: string;
  label: string;
  status: HealthCheckStatus;
  severity: HealthCheckSeverity;
  detail: string;
}

export interface HealthReport {
  status: HealthStatus;
  summary: {
    ok: number;
    warning: number;
    failed: number;
  };
  checks: HealthCheck[];
}

export interface EvaluateDaemonHealthInput {
  projectRoot: string;
  env: Record<string, string | undefined>;
}

export function evaluateDaemonHealth(input: EvaluateDaemonHealthInput): HealthReport {
  const checks: HealthCheck[] = [
    requiredFileCheck({
      id: "config.example",
      label: "Example config",
      path: "configs/dore.config.example.yaml",
      projectRoot: input.projectRoot
    }),
    openAiCredentialCheck(input.env),
    optionalEnvCheck("claude.credentials", "Claude credentials", "ANTHROPIC_API_KEY", input.env),
    optionalEnvCheck("gemini.credentials", "Gemini credentials", "GEMINI_API_KEY", input.env),
    optionalEnvCheck("telegram.credentials", "Telegram bot token", "TELEGRAM_BOT_TOKEN", input.env),
    {
      id: "trading.safety",
      label: "Trading safety",
      status: "ok",
      severity: "required",
      detail: "real trading disabled by default"
    }
  ];

  const summary = {
    ok: checks.filter((check) => check.status === "ok").length,
    warning: checks.filter((check) => check.status === "warning").length,
    failed: checks.filter((check) => check.status === "failed").length
  };

  return {
    status: summary.failed > 0 ? "failed" : summary.warning > 0 ? "degraded" : "ok",
    summary,
    checks
  };
}

export function formatHealthReport(report: HealthReport): string[] {
  return report.checks.map((check) => `${check.id}: ${check.status} (${check.detail})`);
}

function requiredFileCheck(input: { id: string; label: string; path: string; projectRoot: string }): HealthCheck {
  return {
    id: input.id,
    label: input.label,
    status: existsSync(join(input.projectRoot, input.path)) ? "ok" : "failed",
    severity: "required",
    detail: input.path
  };
}

function optionalEnvCheck(
  id: string,
  label: string,
  envName: string,
  env: Record<string, string | undefined>
): HealthCheck {
  return {
    id,
    label,
    status: env[envName] ? "ok" : "warning",
    severity: "optional",
    detail: `${envName} env`
  };
}

function openAiCredentialCheck(env: Record<string, string | undefined>): HealthCheck {
  if (env.OPENAI_AUTH_MODE === "oauth") {
    const hasEnvToken = Boolean(nonEmpty(env.OPENAI_OAUTH_ACCESS_TOKEN));
    const hasLocalAuth = hasOpenAiOAuthAuthJson(env);
    return {
      id: "openai.credentials",
      label: "OpenAI credentials",
      status: hasEnvToken || hasLocalAuth ? "ok" : "warning",
      severity: "optional",
      detail: hasEnvToken ? "oauth env" : "oauth codex auth json"
    };
  }
  if (env.OPENAI_AUTH_MODE === "workload_identity") {
    const hasWorkloadIdentity =
      Boolean(env.OPENAI_WIF_ACCESS_TOKEN) ||
      (Boolean(env.OPENAI_WIF_SUBJECT_TOKEN) &&
        Boolean(env.OPENAI_WIF_IDENTITY_PROVIDER_ID) &&
        Boolean(env.OPENAI_WIF_SERVICE_ACCOUNT_ID));
    return {
      id: "openai.credentials",
      label: "OpenAI credentials",
      status: hasWorkloadIdentity ? "ok" : "warning",
      severity: "optional",
      detail: "workload identity env"
    };
  }
  return optionalEnvCheck("openai.credentials", "OpenAI credentials", "OPENAI_API_KEY", env);
}

function hasOpenAiOAuthAuthJson(env: Record<string, string | undefined>): boolean {
  const authFile = oauthAuthFilePath(env);
  if (!authFile || !existsSync(authFile)) {
    return false;
  }
  try {
    const payload = JSON.parse(readFileSync(authFile, "utf8")) as {
      access_token?: string;
      tokens?: {
        access_token?: string;
      };
    };
    return Boolean(nonEmpty(payload.tokens?.access_token) ?? nonEmpty(payload.access_token));
  } catch {
    return false;
  }
}

function oauthAuthFilePath(env: Record<string, string | undefined>): string | undefined {
  const explicit = nonEmpty(env.OPENAI_OAUTH_CODEX_AUTH_FILE);
  if (explicit) {
    return explicit;
  }
  const codexHome = nonEmpty(env.CODEX_HOME);
  if (codexHome) {
    return join(codexHome, "auth.json");
  }
  const home = nonEmpty(env.HOME);
  return home ? join(home, ".codex", "auth.json") : undefined;
}

function nonEmpty(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}
