import Fastify from "fastify";
import { resolve } from "node:path";
import type { ExecFileResult, PackageJsonLike } from "../../../packages/engineering/src/index.js";
import { runEngineeringIntake } from "../../../packages/engineering/src/index.js";
import { createDailyBriefingJob, InMemoryScheduleRegistry } from "../../../packages/scheduler/src/index.js";
import { createTelegramAdapterStatus } from "../../../packages/telegram/src/index.js";

export interface DaemonAppOptions {
  startedAt?: Date;
  configLoaded?: boolean;
  memoryReady?: boolean;
  memoryRoot?: string;
  projectRoot?: string;
  packageJson?: PackageJsonLike;
  engineeringExecFile?: (command: string, args: string[]) => Promise<ExecFileResult>;
}

export function createDaemonApp(options: DaemonAppOptions = {}) {
  const startedAt = options.startedAt ?? new Date();
  const app = Fastify({ logger: false });

  app.get("/status", async () => {
    const uptime_ms = Date.now() - startedAt.getTime();
    const scheduler = new InMemoryScheduleRegistry();
    createDailyBriefingJob(scheduler, {
      time: "06:00",
      timezone: "Asia/Seoul"
    });

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
        allowlist_required: true,
        adapter: createTelegramAdapterStatus({
          enabled: true,
          botToken: process.env.TELEGRAM_BOT_TOKEN,
          allowedUserIds: []
        })
      },
      scheduler: {
        jobs: scheduler.list()
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

  app.post("/engineering/intake", async (request, reply) => {
    const payload = request.body as { idea?: unknown; requested_by?: unknown; now?: unknown } | null;
    const idea = typeof payload?.idea === "string" ? payload.idea.trim() : "";
    if (!idea) {
      return reply.code(400).send({
        error: "idea_required"
      });
    }

    const result = await runEngineeringIntake({
      idea,
      requestedBy: typeof payload?.requested_by === "string" && payload.requested_by.trim() ? payload.requested_by.trim() : "hjhun",
      now: typeof payload?.now === "string" && payload.now.trim() ? payload.now.trim() : new Date().toISOString(),
      memoryRoot: resolve(options.memoryRoot ?? process.env.DORE_MEMORY_ROOT ?? "memory"),
      projectRoot: resolve(options.projectRoot ?? process.env.DORE_PROJECT_ROOT ?? "."),
      packageJson: options.packageJson,
      execFile: options.engineeringExecFile
    });

    return reply.code(201).send({
      task_id: result.intake.id,
      status: result.intake.executionRecord.status,
      drafts: {
        requirements: result.drafts.requirementPath,
        technical_design: result.drafts.technicalDesignPath,
        change_plan: result.drafts.changePlanPath,
        intake_json: result.drafts.intakeJsonPath
      },
      event_log: result.eventLogPath
    });
  });

  return app;
}
