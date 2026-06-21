import { existsSync } from "node:fs";

const checks = [
  {
    name: "config",
    ok: existsSync("configs/dore.config.example.yaml"),
    detail: "example config"
  },
  {
    name: "openai",
    ok: Boolean(process.env.OPENAI_API_KEY),
    detail: "OPENAI_API_KEY env"
  },
  {
    name: "claude",
    ok: Boolean(process.env.ANTHROPIC_API_KEY),
    detail: "ANTHROPIC_API_KEY env"
  },
  {
    name: "gemini",
    ok: Boolean(process.env.GEMINI_API_KEY),
    detail: "GEMINI_API_KEY env"
  },
  {
    name: "telegram",
    ok: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    detail: "TELEGRAM_BOT_TOKEN env"
  },
  {
    name: "trading",
    ok: true,
    detail: "real trading disabled by default"
  }
];

for (const check of checks) {
  const status = check.ok ? "ok" : "missing";
  console.log(`${check.name}: ${status} (${check.detail})`);
}

process.exitCode = 0;

