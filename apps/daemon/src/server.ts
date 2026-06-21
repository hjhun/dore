import Fastify from "fastify";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import type { ExecFileResult, FileEditRecord, PackageJsonLike, ProjectIntake } from "../../../packages/engineering/src/index.js";
import {
  appendFileEditEvent,
  appendTestExecutionEvent,
  applyControlledFileEdit,
  createTestExecutionRecord,
  executeAllowedCommand,
  runEngineeringIntake
} from "../../../packages/engineering/src/index.js";
import { createDailyBriefingJob, InMemoryScheduleRegistry } from "../../../packages/scheduler/src/index.js";
import { createTelegramAdapterStatus } from "../../../packages/telegram/src/index.js";
import { createTradingStatus, loadWatchlistStore, summarizeDryRunJournal } from "../../../packages/trading/src/index.js";

export interface DaemonAppOptions {
  startedAt?: Date;
  configLoaded?: boolean;
  memoryReady?: boolean;
  memoryRoot?: string;
  projectRoot?: string;
  packageJson?: PackageJsonLike;
  engineeringExecFile?: (command: string, args: string[]) => Promise<ExecFileResult>;
  engineeringCommandExecFile?: (command: string, args: string[], options?: { cwd?: string }) => Promise<ExecFileResult>;
}

export function createDaemonApp(options: DaemonAppOptions = {}) {
  const startedAt = options.startedAt ?? new Date();
  const app = Fastify({ logger: false });
  const memoryRoot = resolve(options.memoryRoot ?? process.env.DORE_MEMORY_ROOT ?? "memory");
  const projectRoot = resolve(options.projectRoot ?? process.env.DORE_PROJECT_ROOT ?? ".");
  let engineeringHistoryLoaded = false;
  const engineeringTasks = new Map<
    string,
    {
      intake: ProjectIntake;
      status: "planned" | "completed" | "failed";
      eventLogPath: string;
      lastCommand?: string;
    }
  >();

  async function ensureEngineeringHistoryLoaded(): Promise<void> {
    if (engineeringHistoryLoaded) {
      return;
    }
    engineeringHistoryLoaded = true;
    await restoreEngineeringTasks(memoryRoot, engineeringTasks);
  }

  app.addHook("onReady", async () => {
    await ensureEngineeringHistoryLoaded();
  });

  app.get("/status", async () => {
    await ensureEngineeringHistoryLoaded();
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
      trading: await createLocalTradingStatus(memoryRoot, startedAt),
      engineering: {
        tasks: Array.from(engineeringTasks.values()).map((task) => ({
          id: task.intake.id,
          title: task.intake.projectName,
          status: task.status,
          last_command: task.lastCommand
        }))
      }
    };
  });

  app.get("/trading/status", async () => createLocalTradingStatus(memoryRoot, startedAt));

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
      memoryRoot,
      projectRoot,
      packageJson: options.packageJson,
      execFile: options.engineeringExecFile
    });
    engineeringTasks.set(result.intake.id, {
      intake: result.intake,
      status: "planned",
      eventLogPath: result.eventLogPath
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

  app.post("/engineering/tasks/:id/executions", async (request, reply) => {
    const params = request.params as { id?: string };
    const task = params.id ? engineeringTasks.get(params.id) : undefined;
    if (!task) {
      return reply.code(404).send({
        error: "task_not_found"
      });
    }

    const payload = request.body as {
      command?: unknown;
      exit_code?: unknown;
      started_at?: unknown;
      completed_at?: unknown;
      output?: unknown;
    } | null;
    const command = typeof payload?.command === "string" && payload.command.trim() ? payload.command.trim() : "";
    if (!command) {
      return reply.code(400).send({
        error: "command_required"
      });
    }

    const execution = createTestExecutionRecord({
      command,
      exitCode: typeof payload?.exit_code === "number" ? payload.exit_code : 1,
      startedAt: typeof payload?.started_at === "string" ? payload.started_at : new Date().toISOString(),
      completedAt: typeof payload?.completed_at === "string" ? payload.completed_at : new Date().toISOString(),
      output: typeof payload?.output === "string" ? payload.output : ""
    });
    await appendTestExecutionEvent(task.eventLogPath, task.intake, execution);
    task.status = execution.status === "passed" ? "completed" : "failed";
    task.lastCommand = execution.command;

    return reply.code(201).send({
      task_id: task.intake.id,
      task_status: task.status,
      execution,
      event_log: task.eventLogPath
    });
  });

  app.post("/engineering/tasks/:id/run-command", async (request, reply) => {
    const payload = request.body as { command?: unknown; now?: unknown } | null;
    const command = typeof payload?.command === "string" && payload.command.trim() ? payload.command.trim() : "";
    if (!isAllowedEngineeringCommand(command)) {
      return reply.code(400).send({
        error: "command_not_allowed"
      });
    }

    const params = request.params as { id?: string };
    const task = params.id ? engineeringTasks.get(params.id) : undefined;
    if (!task) {
      return reply.code(404).send({
        error: "task_not_found"
      });
    }

    const execution = await executeAllowedCommand({
      command,
      projectRoot,
      now: typeof payload?.now === "string" && payload.now.trim() ? payload.now.trim() : new Date().toISOString(),
      execFile: options.engineeringCommandExecFile
    });
    await appendTestExecutionEvent(task.eventLogPath, task.intake, execution);
    task.status = execution.status === "passed" ? "completed" : "failed";
    task.lastCommand = execution.command;

    return reply.code(201).send({
      task_id: task.intake.id,
      task_status: task.status,
      execution,
      event_log: task.eventLogPath
    });
  });

  app.post("/engineering/tasks/:id/apply-edit", async (request, reply) => {
    const payload = request.body as { path?: unknown; find?: unknown; replace?: unknown } | null;
    const relativePath = typeof payload?.path === "string" ? payload.path.trim() : "";
    const find = typeof payload?.find === "string" ? payload.find : "";
    const replace = typeof payload?.replace === "string" ? payload.replace : "";
    if (!isAllowedFileEdit(projectRoot, relativePath, find, replace)) {
      return reply.code(400).send({
        error: "file_edit_not_allowed"
      });
    }

    const params = request.params as { id?: string };
    const task = params.id ? engineeringTasks.get(params.id) : undefined;
    if (!task) {
      return reply.code(404).send({
        error: "task_not_found"
      });
    }

    let edit: FileEditRecord;
    try {
      edit = await applyControlledFileEdit({
        projectRoot,
        relativePath,
        find,
        replace
      });
    } catch {
      return reply.code(400).send({
        error: "file_edit_not_allowed"
      });
    }
    await appendFileEditEvent(task.eventLogPath, task.intake, edit);

    return reply.code(201).send({
      task_id: task.intake.id,
      task_status: task.status,
      edit,
      event_log: task.eventLogPath
    });
  });

  return app;
}

async function createLocalTradingStatus(memoryRoot: string, now: Date) {
  const month = now.toISOString().slice(0, 7);
  const watchlist = await loadWatchlistStore(memoryRoot);
  return createTradingStatus({
    realTradingEnabled: false,
    watchlist: watchlist.items,
    dryRunJournal: await summarizeDryRunJournal(memoryRoot, month)
  });
}

function isAllowedEngineeringCommand(command: string): boolean {
  return ["pnpm test", "pnpm build", "pnpm build:desktop", "pnpm lint", "pnpm doctor"].includes(
    command.trim().replace(/\s+/g, " ")
  );
}

function isAllowedFileEdit(projectRoot: string, requestedPath: string, find: string, replace: string): boolean {
  if (!requestedPath || !find || containsSecretLikeValue(replace)) {
    return false;
  }
  const root = resolve(projectRoot);
  const target = resolve(root, requestedPath);
  const relativePath = relative(root, target);
  return relativePath !== "" && !relativePath.startsWith("..") && resolve(root, relativePath) === target;
}

function containsSecretLikeValue(value: string): boolean {
  return /\b(OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|TELEGRAM_BOT_TOKEN)=\S+/.test(value)
    || /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY))=\S+/.test(value)
    || /\bsk-[A-Za-z0-9_-]+/.test(value);
}

async function restoreEngineeringTasks(
  memoryRoot: string,
  engineeringTasks: Map<
    string,
    {
      intake: ProjectIntake;
      status: "planned" | "completed" | "failed";
      eventLogPath: string;
      lastCommand?: string;
    }
  >
): Promise<void> {
  const engineeringRoot = join(memoryRoot, "operations", "engineering");
  const eventLogPath = join(memoryRoot, "logs", "events", "engineering.jsonl");

  let entries: string[];
  try {
    entries = await readdir(engineeringRoot);
  } catch {
    return;
  }

  const events = await readEngineeringEvents(eventLogPath);
  for (const entry of entries) {
    try {
      const intake = JSON.parse(await readFile(join(engineeringRoot, entry, "intake.json"), "utf8")) as ProjectIntake;
      const relatedEvents = events.filter((event) => event.entity_id === intake.id);
      const executionEvent = findLastEvent(relatedEvents, (event) => typeof event.command === "string");
      const failedExecution = findLastEvent(relatedEvents, (event) => event.status === "failed");
      const completedEvent = findLastEvent(relatedEvents, (event) => event.event_type === "task_completed");
      engineeringTasks.set(intake.id, {
        intake,
        status: failedExecution ? "failed" : completedEvent ? "completed" : "planned",
        eventLogPath,
        lastCommand: typeof executionEvent?.command === "string" ? executionEvent.command : undefined
      });
    } catch {
      continue;
    }
  }
}

function findLastEvent(
  events: Array<Record<string, unknown>>,
  predicate: (event: Record<string, unknown>) => boolean
): Record<string, unknown> | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event && predicate(event)) {
      return event;
    }
  }
  return undefined;
}

async function readEngineeringEvents(eventLogPath: string): Promise<Array<Record<string, unknown>>> {
  try {
    return (await readFile(eventLogPath, "utf8"))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  } catch {
    return [];
  }
}
