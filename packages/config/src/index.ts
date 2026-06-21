import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { z } from "zod";

const BrokerConfigSchema = z.object({
  enabled: z.boolean().default(false),
  priority: z.number().int().positive().default(99),
  mode: z.enum(["candidate", "read_only_manual_reference", "paper", "real"]).default("candidate")
});

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
        .default({})
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

