import { ModelSelectionRequestSchema, type ModelSelectionRequest } from "../../contracts/src/index.js";

export interface ModelSelection {
  selected_provider: "openai" | "claude" | "gemini";
  selected_model: string;
  selection_reason: string;
  cost_tier: "economy" | "standard" | "premium";
  available: boolean;
}

type Provider = ModelSelection["selected_provider"];

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

function chooseTier(request: Omit<ModelSelectionRequest, "id" | "task_id">): ModelSelection["cost_tier"] {
  if (request.complexity === "critical" || request.complexity === "high") {
    return "premium";
  }
  if (request.cost_preference === "cheapest" || request.latency_preference === "low_latency") {
    return "economy";
  }
  return "standard";
}

