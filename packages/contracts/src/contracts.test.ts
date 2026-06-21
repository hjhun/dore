import { describe, expect, it } from "vitest";
import {
  BrokerCapabilitySchema,
  EventLogRecordSchema,
  ModelSelectionRequestSchema,
  TaskSchema,
  TradingSignalSchema
} from "./index.js";

describe("runtime contracts", () => {
  it("validates task records", () => {
    const task = TaskSchema.parse({
      id: "task_20260621_000001",
      type: "user_request",
      title: "Create Dore scaffold",
      status: "queued",
      priority: "normal",
      created_at: "2026-06-21T06:00:00+09:00",
      updated_at: "2026-06-21T06:00:00+09:00",
      requested_by: "user",
      source_channel: "cli",
      risk_level: "write",
      approval_state: "not_required"
    });

    expect(task.status).toBe("queued");
  });

  it("validates model selection requests for same-provider routing", () => {
    const request = ModelSelectionRequestSchema.parse({
      id: "model_request_20260621_000001",
      task_id: "task_20260621_000001",
      category: "engineering",
      complexity: "high",
      latency_preference: "quality_first",
      cost_preference: "quality_first",
      context_size: "large",
      requires_tools: true,
      requires_json: true,
      preferred_provider: "openai"
    });

    expect(request.complexity).toBe("high");
  });

  it("validates broker capability without requiring credentials", () => {
    const capability = BrokerCapabilitySchema.parse({
      broker: "toss",
      status: "candidate",
      markets: {
        korea: true,
        us: true
      },
      capabilities: {
        market_data: "unknown",
        account_read: "unknown",
        order_create: "unknown",
        order_cancel: "unknown",
        paper_trading: "unknown"
      },
      source_refs: [],
      notes: "User will provide securities details later."
    });

    expect(capability.status).toBe("candidate");
  });

  it("validates dry-run trading signals", () => {
    const signal = TradingSignalSchema.parse({
      signal_id: "signal_20260621_000001",
      created_at: "2026-06-21T06:00:00+09:00",
      market: "korea",
      symbol: "005930",
      strategy_id: "watch_momentum",
      direction: "watch",
      confidence: "low",
      reason: "Initial watch only.",
      data_timestamp: "2026-06-21T06:00:00+09:00",
      source_refs: [],
      risk_check: {
        status: "not_applicable",
        reasons: []
      },
      recommended_action: "watch",
      execution_mode: "dry_run",
      expires_at: "2026-06-21T15:30:00+09:00"
    });

    expect(signal.execution_mode).toBe("dry_run");
  });

  it("validates task update event records", () => {
    const event = EventLogRecordSchema.parse({
      id: "event_20260622_task_update",
      time: "2026-06-22T00:00:00+09:00",
      actor: "dore",
      event_type: "task_updated",
      entity_type: "task",
      entity_id: "task_20260622_000001",
      summary: "Updated task artifact.",
      risk_level: "write",
      refs: ["engineering_file_edit"]
    });

    expect(event.event_type).toBe("task_updated");
  });
});
