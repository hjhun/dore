import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { z } from "zod";

const BrokerConfigSchema = z.object({
  enabled: z.boolean().default(false),
  priority: z.number().int().positive().default(99),
  mode: z.enum(["candidate", "read_only_manual_reference", "paper", "real"]).default("candidate")
});

const SecretRefSchema = z.string().refine((value) => value.startsWith("secret_ref:"), {
  message: "Broker credential values must be secret_ref references."
});

const BrokerCredentialRefSchema = z.object({
  app_key_secret_ref: SecretRefSchema.optional(),
  app_secret_secret_ref: SecretRefSchema.optional(),
  account_secret_ref: SecretRefSchema.optional()
});

const RiskLimitGateSchema = z
  .object({
    max_order_krw_equivalent: z.number().positive().optional(),
    max_daily_new_buy_krw_equivalent: z.number().positive().optional(),
    max_daily_loss_krw_equivalent: z.number().positive().optional(),
    max_position_pct: z.number().positive().optional()
  })
  .default({});

const RealTradingGateSchema = z
  .object({
    explicit_enable: z.boolean().default(false),
    official_api_verified: z.boolean().default(false),
    terms_verified: z.boolean().default(false),
    broker_credentials: z
      .object({
        toss: BrokerCredentialRefSchema.optional(),
        shinhan: BrokerCredentialRefSchema.optional(),
        samsung: BrokerCredentialRefSchema.optional()
      })
      .default({}),
    dry_run_min_days: z.number().int().nonnegative().default(30),
    dry_run_observed_days: z.number().int().nonnegative().default(0),
    kill_switch_enabled: z.boolean().default(true),
    approval_required: z.boolean().default(true),
    approval_granted: z.boolean().default(false),
    risk_limits: RiskLimitGateSchema
  })
  .default({});

export const DoreConfigSchema = z.object({
  app: z
    .object({
      name: z.string().default("Dore"),
      timezone: z.string().default("Asia/Seoul"),
      locale: z.string().default("ko-KR")
    })
    .default({}),
  llm: z
    .object({
      default_provider: z.enum(["openai", "claude", "gemini"]).default("openai"),
      default_model: z.string().default("gpt-5.4")
    })
    .default({}),
  telegram: z
    .object({
      enabled: z.boolean().default(true),
      mode: z.enum(["long_polling"]).default("long_polling"),
      bot_token_env: z.string().default("TELEGRAM_BOT_TOKEN"),
      allowed_user_ids: z.array(z.number()).default([])
    })
    .default({}),
  memory: z
    .object({
      root: z.string().default("memory")
    })
    .default({}),
  trading: z
    .object({
      enabled: z.boolean().default(true),
      real_trading_enabled: z.boolean().default(false),
      brokers: z
        .object({
          toss: BrokerConfigSchema.default({ enabled: true, priority: 1, mode: "candidate" }),
          shinhan: BrokerConfigSchema.default({ enabled: true, priority: 2, mode: "candidate" }),
          samsung: BrokerConfigSchema.default({
            enabled: true,
            priority: 3,
            mode: "read_only_manual_reference"
          })
        })
        .default({}),
      real_trading_gates: RealTradingGateSchema
    })
    .default({})
});

export type DoreConfig = z.infer<typeof DoreConfigSchema>;

export function parseConfig(input: unknown): DoreConfig {
  return DoreConfigSchema.parse(input ?? {});
}

export async function loadConfig(path: string): Promise<DoreConfig> {
  const raw = await readFile(path, "utf8");
  return parseConfig(YAML.parse(raw));
}
