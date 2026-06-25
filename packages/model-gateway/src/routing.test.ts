import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createBudgetGuard,
  createModelGateway,
  createProviderRegistry,
  readUsageRecords,
  selectModel,
  type ProviderClient
} from "./index.js";

describe("model routing", () => {
  it("selects a lightweight OpenAI model for low complexity work", () => {
    const selection = selectModel({
      category: "background",
      complexity: "low",
      latency_preference: "low_latency",
      cost_preference: "cheapest",
      context_size: "small",
      requires_tools: false,
      requires_json: true,
      preferred_provider: "openai"
    });

    expect(selection.selected_provider).toBe("openai");
    expect(selection.selected_model).toBe("gpt-5.4-mini");
  });

  it("selects a high capability OpenAI model for high complexity work", () => {
    const selection = selectModel({
      category: "review",
      complexity: "high",
      latency_preference: "quality_first",
      cost_preference: "quality_first",
      context_size: "large",
      requires_tools: true,
      requires_json: true,
      preferred_provider: "openai"
    });

    expect(selection.selected_provider).toBe("openai");
    expect(selection.selected_model).toBe("gpt-5.5");
  });

  it("separates low and high Gemini routing", () => {
    const low = selectModel({
      category: "background",
      complexity: "low",
      latency_preference: "low_latency",
      cost_preference: "cheapest",
      context_size: "small",
      requires_tools: false,
      requires_json: true,
      preferred_provider: "gemini"
    });
    const high = selectModel({
      category: "engineering",
      complexity: "high",
      latency_preference: "quality_first",
      cost_preference: "quality_first",
      context_size: "large",
      requires_tools: true,
      requires_json: true,
      preferred_provider: "gemini"
    });

    expect(low.selected_model).toBe("gemini-2.5-flash-lite");
    expect(high.selected_model).toBe("gemini-2.5-pro");
  });

  it("runs a configured provider through an adapter and writes usage records", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-model-gateway-"));
    const client: ProviderClient = {
      async generate() {
        return {
          text: "hello from provider",
          inputTokens: 12,
          outputTokens: 8,
          cacheTokens: 2,
          estimatedCostUsd: 0.03
        };
      }
    };
    try {
      const gateway = createModelGateway({
        memoryRoot,
        env: {
          OPENAI_API_KEY: "sk-test-secret"
        },
        clients: {
          openai: client
        },
        now: () => "2026-06-22T05:20:00.000Z"
      });

      const result = await gateway.generate({
        task_id: "task_m8_001",
        category: "assistant",
        complexity: "medium",
        latency_preference: "balanced",
        cost_preference: "balanced",
        context_size: "small",
        requires_tools: false,
        requires_json: false,
        preferred_provider: "openai",
        prompt: "Say hello."
      });

      expect(result).toMatchObject({
        status: "success",
        text: "hello from provider",
        provider: "openai",
        auth_mode: "api_key"
      });
      const records = await readUsageRecords(memoryRoot);
      expect(records).toContainEqual(
        expect.objectContaining({
          provider: "openai",
          model: "gpt-5.4",
          auth_mode: "api_key",
          input_tokens: 12,
          output_tokens: 8,
          cache_tokens: 2,
          estimated_cost_usd: 0.03,
          status: "success"
        })
      );
      expect(await readFile(join(memoryRoot, "logs", "usage", "2026-06.jsonl"), "utf8")).not.toContain("sk-test-secret");
    } finally {
      await rm(memoryRoot, { recursive: true, force: true });
    }
  });

  it("returns unavailable and records failure when provider credentials are missing", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-model-gateway-"));
    try {
      const gateway = createModelGateway({
        memoryRoot,
        env: {},
        now: () => "2026-06-22T05:21:00.000Z"
      });

      const result = await gateway.generate({
        category: "assistant",
        complexity: "low",
        latency_preference: "low_latency",
        cost_preference: "cheapest",
        context_size: "small",
        requires_tools: false,
        requires_json: false,
        preferred_provider: "gemini",
        prompt: "Summarize status."
      });

      expect(result).toMatchObject({
        status: "unavailable",
        provider: "gemini",
        error_code: "missing_credentials"
      });
      expect(await readUsageRecords(memoryRoot)).toContainEqual(
        expect.objectContaining({
          provider: "gemini",
          auth_mode: "api_key",
          status: "failed",
          error_code: "missing_credentials"
        })
      );
    } finally {
      await rm(memoryRoot, { recursive: true, force: true });
    }
  });

  it("blocks new high-cost work when hard approval threshold would be exceeded", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-model-gateway-"));
    try {
      const gateway = createModelGateway({
        memoryRoot,
        env: {
          OPENAI_API_KEY: "sk-test-secret"
        },
        budgetGuard: createBudgetGuard({
          monthlySoftLimitUsd: 50,
          hardApprovalThresholdUsd: 100,
          currentMonthSpendUsd: 99.95
        }),
        now: () => "2026-06-22T05:22:00.000Z"
      });

      const result = await gateway.generate({
        category: "review",
        complexity: "high",
        latency_preference: "quality_first",
        cost_preference: "quality_first",
        context_size: "large",
        requires_tools: true,
        requires_json: true,
        preferred_provider: "openai",
        prompt: "Review a large diff.",
        estimatedCostUsd: 0.1
      });

      expect(result).toMatchObject({
        status: "blocked",
        error_code: "hard_budget_threshold_requires_approval"
      });
      expect(await readUsageRecords(memoryRoot)).toContainEqual(
        expect.objectContaining({
          provider: "openai",
          status: "failed",
          error_code: "hard_budget_threshold_requires_approval"
        })
      );
    } finally {
      await rm(memoryRoot, { recursive: true, force: true });
    }
  });

  it("allows work but returns a warning when the monthly soft limit is exceeded", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-model-gateway-"));
    const client: ProviderClient = {
      async generate() {
        return {
          text: "compact response",
          inputTokens: 5,
          outputTokens: 5,
          estimatedCostUsd: 0.02
        };
      }
    };
    try {
      const gateway = createModelGateway({
        memoryRoot,
        env: {
          OPENAI_API_KEY: "sk-test-secret"
        },
        clients: {
          openai: client
        },
        budgetGuard: createBudgetGuard({
          monthlySoftLimitUsd: 50,
          hardApprovalThresholdUsd: 100,
          currentMonthSpendUsd: 49.99
        }),
        now: () => "2026-06-22T05:23:00.000Z"
      });

      const result = await gateway.generate({
        category: "background",
        complexity: "low",
        latency_preference: "low_latency",
        cost_preference: "cheapest",
        context_size: "small",
        requires_tools: false,
        requires_json: true,
        preferred_provider: "openai",
        prompt: "Summarize in compact mode.",
        estimatedCostUsd: 0.02
      });

      expect(result).toMatchObject({
        status: "success",
        cost_guard: {
          warning: "soft_limit_exceeded"
        }
      });
    } finally {
      await rm(memoryRoot, { recursive: true, force: true });
    }
  });

  it("exposes provider availability without secret values", () => {
    const registry = createProviderRegistry({
      env: {
        OPENAI_API_KEY: "sk-test-secret",
        ANTHROPIC_API_KEY: "",
        GEMINI_API_KEY: "gemini-secret"
      }
    });

    const status = registry.status();

    expect(status).toContainEqual(
      expect.objectContaining({
        provider: "openai",
        available: true,
        auth_mode: "api_key"
      })
    );
    expect(status).toContainEqual(
      expect.objectContaining({
        provider: "claude",
        available: false,
        reason: "missing_credentials"
      })
    );
    expect(JSON.stringify(status)).not.toContain("sk-test-secret");
    expect(JSON.stringify(status)).not.toContain("gemini-secret");
  });
});
