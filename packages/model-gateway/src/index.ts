import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  LlmUsageRecordSchema,
  ModelSelectionRequestSchema,
  type LlmUsageRecord,
  type ModelSelectionRequest
} from "../../contracts/src/index.js";

export interface ModelSelection {
  selected_provider: "openai" | "claude" | "gemini";
  selected_model: string;
  selection_reason: string;
  cost_tier: "economy" | "standard" | "premium";
  available: boolean;
}

type Provider = ModelSelection["selected_provider"];
type AuthMode = "api_key" | "oauth";
type UsageStatus = "success" | "failed" | "cancelled";

const DEFAULT_PROVIDER: Provider = "openai";

const MODELS: Record<Provider, Record<ModelSelection["cost_tier"], string>> = {
  openai: {
    economy: "gpt-5.4-mini",
    standard: "gpt-5.4",
    premium: "gpt-5.5"
  },
  claude: {
    economy: "Claude Haiku 4.5",
    standard: "Claude Sonnet 4.6",
    premium: "Claude Opus 4.8"
  },
  gemini: {
    economy: "gemini-2.5-flash-lite",
    standard: "gemini-3.5-flash",
    premium: "gemini-2.5-pro"
  }
};

export function selectModel(input: Omit<ModelSelectionRequest, "id" | "task_id">): ModelSelection {
  const request = ModelSelectionRequestSchema.omit({ id: true, task_id: true }).parse(input);
  const provider = request.preferred_provider === "auto" ? DEFAULT_PROVIDER : request.preferred_provider;
  const costTier = chooseTier(request);

  return {
    selected_provider: provider,
    selected_model: MODELS[provider][costTier],
    selection_reason: `${request.category}:${request.complexity}:${request.cost_preference}:${request.latency_preference}`,
    cost_tier: costTier,
    available: provider !== "claude"
  };
}

export interface ProviderGenerateInput {
  prompt: string;
  model: string;
  authMode: AuthMode;
  apiKey?: string;
}

export interface ProviderGenerateOutput {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens?: number;
  estimatedCostUsd: number;
}

export interface ProviderClient {
  generate(input: ProviderGenerateInput): Promise<ProviderGenerateOutput>;
}

export interface ProviderStatus {
  provider: Provider;
  available: boolean;
  auth_mode: AuthMode;
  configured_model: string;
  reason?: "missing_credentials" | "client_not_configured";
}

export interface ProviderRegistry {
  status(): ProviderStatus[];
  get(provider: Provider): {
    provider: Provider;
    authMode: AuthMode;
    apiKey?: string;
    client?: ProviderClient;
  };
}

export interface ModelGatewayGenerateInput extends Omit<ModelSelectionRequest, "id"> {
  prompt: string;
  estimatedCostUsd?: number;
}

export interface ModelGatewayGenerateResult {
  status: "success" | "unavailable" | "blocked" | "failed";
  provider: Provider;
  model: string;
  auth_mode: AuthMode;
  text?: string;
  usage?: LlmUsageRecord;
  error_code?: string;
  cost_guard?: {
    warning?: "soft_limit_exceeded";
  };
}

export interface BudgetGuard {
  check(input: { estimatedCostUsd: number }): { allowed: true; warning?: "soft_limit_exceeded" } | { allowed: false; errorCode: string };
}

export function createProviderRegistry(input: {
  env?: Partial<NodeJS.ProcessEnv>;
  clients?: Partial<Record<Provider, ProviderClient>>;
} = {}): ProviderRegistry {
  const env = input.env ?? process.env;
  const clients = input.clients ?? {};
  return {
    status(): ProviderStatus[] {
      return (["openai", "claude", "gemini"] as Provider[]).map((provider) => {
        const key = credentialForProvider(provider, env);
        return {
          provider,
          available: Boolean(key),
          auth_mode: "api_key",
          configured_model: MODELS[provider].standard,
          reason: key ? undefined : "missing_credentials"
        };
      });
    },
    get(provider: Provider) {
      return {
        provider,
        authMode: "api_key",
        apiKey: credentialForProvider(provider, env),
        client: clients[provider]
      };
    }
  };
}

export function createBudgetGuard(input: {
  monthlySoftLimitUsd: number;
  hardApprovalThresholdUsd: number;
  currentMonthSpendUsd: number;
}): BudgetGuard {
  return {
    check({ estimatedCostUsd }) {
      const projected = input.currentMonthSpendUsd + estimatedCostUsd;
      if (projected >= input.hardApprovalThresholdUsd) {
        return {
          allowed: false,
          errorCode: "hard_budget_threshold_requires_approval"
        };
      }
      if (projected >= input.monthlySoftLimitUsd) {
        return {
          allowed: true,
          warning: "soft_limit_exceeded"
        };
      }
      return {
        allowed: true
      };
    }
  };
}

export function createModelGateway(input: {
  memoryRoot: string;
  env?: Partial<NodeJS.ProcessEnv>;
  clients?: Partial<Record<Provider, ProviderClient>>;
  registry?: ProviderRegistry;
  budgetGuard?: BudgetGuard;
  now?: () => string;
}) {
  const registry = input.registry ?? createProviderRegistry({ env: input.env, clients: input.clients });
  const now = input.now ?? (() => new Date().toISOString());
  return {
    async generate(request: ModelGatewayGenerateInput): Promise<ModelGatewayGenerateResult> {
      const startedAt = now();
      const startedTime = Date.parse(startedAt);
      const selection = selectModel(request);
      const provider = registry.get(selection.selected_provider);
      const authMode = provider.authMode;
      const estimatedCostUsd = request.estimatedCostUsd ?? estimatedCostForTier(selection.cost_tier);
      const budget = input.budgetGuard?.check({ estimatedCostUsd });
      const costGuardWarning = budget?.allowed ? budget.warning : undefined;
      if (budget && !budget.allowed) {
        const usage = await appendUsageRecord(input.memoryRoot, {
          id: createUsageId(startedAt, selection.selected_provider),
          task_id: request.task_id,
          provider: selection.selected_provider,
          model: selection.selected_model,
          auth_mode: authMode,
          category: request.category,
          started_at: startedAt,
          ended_at: now(),
          input_tokens: 0,
          output_tokens: 0,
          cache_tokens: 0,
          estimated_cost_usd: 0,
          latency_ms: elapsedMs(startedTime, Date.parse(now())),
          status: "failed",
          error_code: budget.errorCode
        });
        return {
          status: "blocked",
          provider: selection.selected_provider,
          model: selection.selected_model,
          auth_mode: authMode,
          usage,
          error_code: budget.errorCode,
          cost_guard: {}
        };
      }
      if (!provider.apiKey) {
        const usage = await appendUsageRecord(input.memoryRoot, {
          id: createUsageId(startedAt, selection.selected_provider),
          task_id: request.task_id,
          provider: selection.selected_provider,
          model: selection.selected_model,
          auth_mode: authMode,
          category: request.category,
          started_at: startedAt,
          ended_at: now(),
          input_tokens: 0,
          output_tokens: 0,
          cache_tokens: 0,
          estimated_cost_usd: 0,
          latency_ms: elapsedMs(startedTime, Date.parse(now())),
          status: "failed",
          error_code: "missing_credentials"
        });
        return {
          status: "unavailable",
          provider: selection.selected_provider,
          model: selection.selected_model,
          auth_mode: authMode,
          usage,
          error_code: "missing_credentials"
        };
      }
      if (!provider.client) {
        const usage = await appendUsageRecord(input.memoryRoot, {
          id: createUsageId(startedAt, selection.selected_provider),
          task_id: request.task_id,
          provider: selection.selected_provider,
          model: selection.selected_model,
          auth_mode: authMode,
          category: request.category,
          started_at: startedAt,
          ended_at: now(),
          input_tokens: 0,
          output_tokens: 0,
          cache_tokens: 0,
          estimated_cost_usd: 0,
          latency_ms: elapsedMs(startedTime, Date.parse(now())),
          status: "failed",
          error_code: "client_not_configured"
        });
        return {
          status: "unavailable",
          provider: selection.selected_provider,
          model: selection.selected_model,
          auth_mode: authMode,
          usage,
          error_code: "client_not_configured"
        };
      }

      try {
        const output = await provider.client.generate({
          prompt: request.prompt,
          model: selection.selected_model,
          authMode,
          apiKey: provider.apiKey
        });
        const endedAt = now();
        const usage = await appendUsageRecord(input.memoryRoot, {
          id: createUsageId(startedAt, selection.selected_provider),
          task_id: request.task_id,
          provider: selection.selected_provider,
          model: selection.selected_model,
          auth_mode: authMode,
          category: request.category,
          started_at: startedAt,
          ended_at: endedAt,
          input_tokens: output.inputTokens,
          output_tokens: output.outputTokens,
          cache_tokens: output.cacheTokens ?? 0,
          estimated_cost_usd: output.estimatedCostUsd,
          latency_ms: elapsedMs(startedTime, Date.parse(endedAt)),
          status: "success"
        });
        return {
          status: "success",
          provider: selection.selected_provider,
          model: selection.selected_model,
          auth_mode: authMode,
          text: output.text,
          usage,
          cost_guard: costGuardWarning
            ? {
                warning: costGuardWarning
              }
            : undefined
        };
      } catch {
        const usage = await appendUsageRecord(input.memoryRoot, {
          id: createUsageId(startedAt, selection.selected_provider),
          task_id: request.task_id,
          provider: selection.selected_provider,
          model: selection.selected_model,
          auth_mode: authMode,
          category: request.category,
          started_at: startedAt,
          ended_at: now(),
          input_tokens: 0,
          output_tokens: 0,
          cache_tokens: 0,
          estimated_cost_usd: 0,
          latency_ms: elapsedMs(startedTime, Date.parse(now())),
          status: "failed",
          error_code: "provider_error"
        });
        return {
          status: "failed",
          provider: selection.selected_provider,
          model: selection.selected_model,
          auth_mode: authMode,
          usage,
          error_code: "provider_error"
        };
      }
    }
  };
}

export async function readUsageRecords(memoryRoot: string): Promise<LlmUsageRecord[]> {
  const usageDir = join(memoryRoot, "logs", "usage");
  let files: string[];
  try {
    files = await readdir(usageDir);
  } catch {
    return [];
  }
  const records: LlmUsageRecord[] = [];
  for (const file of files.filter((entry) => entry.endsWith(".jsonl")).sort()) {
    const lines = (await readFile(join(usageDir, file), "utf8")).split("\n").filter(Boolean);
    for (const line of lines) {
      records.push(JSON.parse(line) as LlmUsageRecord);
    }
  }
  return records;
}

function chooseTier(request: Omit<ModelSelectionRequest, "id" | "task_id">): ModelSelection["cost_tier"] {
  if (request.complexity === "critical" || request.complexity === "high") {
    return "premium";
  }
  if (request.cost_preference === "cheapest" || request.latency_preference === "low_latency") {
    return "economy";
  }
  return "standard";
}

async function appendUsageRecord(memoryRoot: string, record: LlmUsageRecord): Promise<LlmUsageRecord> {
  const parsed = LlmUsageRecordSchema.parse(record);
  const month = parsed.started_at.slice(0, 7);
  const path = join(memoryRoot, "logs", "usage", `${month}.jsonl`);
  await mkdir(join(memoryRoot, "logs", "usage"), { recursive: true });
  await writeFile(path, `${JSON.stringify(parsed)}\n`, { flag: "a" });
  return parsed;
}

function credentialForProvider(provider: Provider, env: Partial<NodeJS.ProcessEnv>): string | undefined {
  const envName: Record<Provider, string> = {
    openai: "OPENAI_API_KEY",
    claude: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY"
  };
  const value = env[envName[provider]];
  return value && value.trim().length > 0 ? value : undefined;
}

function createUsageId(now: string, provider: Provider): string {
  const timestamp = now.replace(/\D/g, "").slice(0, 14) || "manual";
  return `usage_${timestamp}_${provider}`;
}

function estimatedCostForTier(tier: ModelSelection["cost_tier"]): number {
  if (tier === "premium") {
    return 0.1;
  }
  if (tier === "standard") {
    return 0.03;
  }
  return 0.005;
}

function elapsedMs(start: number, end: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }
  return Math.max(0, end - start);
}
