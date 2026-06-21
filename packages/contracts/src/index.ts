import { z } from "zod";

export const RiskLevelSchema = z.enum(["read", "write", "execute", "trade", "critical"]);
export const ApprovalStateSchema = z.enum([
  "not_required",
  "pending",
  "approved",
  "rejected",
  "expired",
  "cancelled"
]);

export const TaskSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["user_request", "scheduled_job", "internal_maintenance", "approval_followup"]),
  title: z.string().min(1),
  status: z.enum(["queued", "running", "waiting_approval", "completed", "failed", "cancelled"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  requested_by: z.enum(["user", "scheduler", "dore"]),
  source_channel: z.enum(["desktop", "telegram", "cli", "scheduler"]),
  risk_level: RiskLevelSchema,
  approval_state: ApprovalStateSchema,
  inputs_ref: z.string().optional(),
  outputs_ref: z.string().optional(),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().optional()
    })
    .optional()
});

export const ModelSelectionRequestSchema = z.object({
  id: z.string().min(1).optional(),
  task_id: z.string().min(1).optional(),
  category: z.enum(["assistant", "engineering", "review", "briefing", "trading_report", "background"]),
  complexity: z.enum(["low", "medium", "high", "critical"]),
  latency_preference: z.enum(["low_latency", "balanced", "quality_first"]),
  cost_preference: z.enum(["cheapest", "balanced", "quality_first"]),
  context_size: z.enum(["small", "medium", "large"]),
  requires_tools: z.boolean(),
  requires_json: z.boolean(),
  preferred_provider: z.enum(["openai", "claude", "gemini", "auto"])
});

export const BrokerCapabilitySchema = z.object({
  broker: z.enum(["toss", "shinhan", "samsung"]),
  status: z.enum(["unavailable", "candidate", "read_only", "paper_supported", "real_supported"]),
  markets: z.object({
    korea: z.boolean(),
    us: z.boolean()
  }),
  capabilities: z.object({
    market_data: z.enum(["unknown", "supported", "unsupported"]),
    account_read: z.enum(["unknown", "supported", "unsupported"]),
    order_create: z.enum(["unknown", "supported", "unsupported"]),
    order_cancel: z.enum(["unknown", "supported", "unsupported"]),
    paper_trading: z.enum(["unknown", "supported", "unsupported"])
  }),
  verified_at: z.string().optional(),
  source_refs: z.array(z.string()),
  notes: z.string()
});

export const TradingSignalSchema = z.object({
  signal_id: z.string().min(1),
  created_at: z.string().min(1),
  market: z.enum(["korea", "us"]),
  symbol: z.string().min(1),
  strategy_id: z.string().min(1),
  direction: z.enum(["buy", "sell", "hold", "reduce", "watch"]),
  confidence: z.enum(["low", "medium", "high"]),
  reason: z.string(),
  data_timestamp: z.string().min(1),
  source_refs: z.array(z.string()),
  risk_check: z.object({
    status: z.enum(["pass", "fail", "blocked", "not_applicable"]),
    reasons: z.array(z.string())
  }),
  recommended_action: z.string(),
  execution_mode: z.enum(["watch", "dry_run", "paper", "real"]),
  expires_at: z.string().min(1)
});

export const EventLogRecordSchema = z
  .object({
    id: z.string().min(1),
    time: z.string().min(1),
    actor: z.enum(["user", "dore", "scheduler", "system"]),
    event_type: z.enum([
      "task_started",
      "task_updated",
      "task_completed",
      "approval_requested",
      "approval_decided",
      "briefing_generated",
      "signal_created",
      "risk_blocked",
      "usage_recorded"
    ]),
    entity_type: z.enum(["task", "approval", "briefing", "signal", "usage", "memory"]),
    entity_id: z.string().min(1),
    summary: z.string(),
    risk_level: RiskLevelSchema,
    refs: z.array(z.string())
  })
  .passthrough();

export type Task = z.infer<typeof TaskSchema>;
export type ModelSelectionRequest = z.infer<typeof ModelSelectionRequestSchema>;
export type BrokerCapability = z.infer<typeof BrokerCapabilitySchema>;
export type TradingSignal = z.infer<typeof TradingSignalSchema>;
export type EventLogRecord = z.infer<typeof EventLogRecordSchema>;
