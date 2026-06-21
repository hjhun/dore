import { describe, expect, it } from "vitest";
import { selectModel } from "./index.js";

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
});

