import Fastify from "fastify";

export interface DaemonAppOptions {
  startedAt?: Date;
  configLoaded?: boolean;
  memoryReady?: boolean;
}

export function createDaemonApp(options: DaemonAppOptions = {}) {
  const startedAt = options.startedAt ?? new Date();
  const app = Fastify({ logger: false });

  app.get("/status", async () => {
    const uptime_ms = Date.now() - startedAt.getTime();

    return {
      app: {
        name: "Dore",
        mode: "local",
        uptime_ms: Math.max(0, uptime_ms)
      },
      config: {
        loaded: options.configLoaded ?? false
      },
      memory: {
        ready: options.memoryReady ?? false
      },
      providers: {
        openai: {
          configured: Boolean(process.env.OPENAI_API_KEY)
        },
        claude: {
          configured: Boolean(process.env.ANTHROPIC_API_KEY)
        },
        gemini: {
          configured: Boolean(process.env.GEMINI_API_KEY)
        }
      },
      telegram: {
        configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
        allowlist_required: true
      },
      trading: {
        enabled: true,
        real_trading_enabled: false,
        brokers: {
          toss: "candidate",
          shinhan: "candidate",
          samsung: "read_only_manual_reference"
        }
      }
    };
  });

  return app;
}

