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
import {
  appendDryRunJournalEntry,
  createDryRunJournalEntry,
  createTradingSignal,
  createTradingStatus,
  ensureRealTradingBlocked,
  loadWatchlistStore,
  runRiskCheck,
  summarizeDryRunJournal,
  type ExecutionMode,
  type Market,
  type SimulatedOrder
} from "../../../packages/trading/src/index.js";

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

  app.post("/trading/signals/dry-run", async (request, reply) => {
    const payload = request.body as Record<string, unknown> | null;
    const executionMode = stringField(payload, "execution_mode", "dry_run") as ExecutionMode;
    if (executionMode === "real") {
      try {
        ensureRealTradingBlocked({
          realTradingEnabled: false,
          requestedExecutionMode: executionMode
        });
      } catch {
        return reply.code(400).send({
          error: "real_trading_disabled"
        });
      }
    }
    if (executionMode !== "dry_run") {
      return reply.code(400).send({
        error: "dry_run_execution_required"
      });
    }

    const simulatedOrder = simulatedOrderFromPayload(payload);
    if (!simulatedOrder) {
      return reply.code(400).send({
        error: "simulated_order_required"
      });
    }

    const now = stringField(payload, "now", new Date().toISOString());
    const market = stringField(payload, "market") as Market;
    const symbol = stringField(payload, "symbol");
    if (!isMarket(market) || !symbol) {
      return reply.code(400).send({
        error: "signal_input_required"
      });
    }
    const riskCheck = runRiskCheck({
      now,
      dataTimestamp: stringField(payload, "data_timestamp", now),
      executionMode,
      realTradingEnabled: false,
      marketOpen: booleanField(payload, "market_open", false),
      orderAmountKrwEquivalent: numberField(payload, "order_amount_krw_equivalent", 0),
      dailyNewBuyKrwEquivalent: numberField(payload, "daily_new_buy_krw_equivalent", 0),
      policy: {
        maxOrderKrwEquivalent: 1_000_000,
        maxDailyNewBuyKrwEquivalent: 3_000_000,
        maxDataAgeMs: 15 * 60 * 1000,
        killSwitchEnabled: false
      }
    });
    let signal: ReturnType<typeof createTradingSignal>;
    try {
      signal = createTradingSignal({
        signalId: stringField(payload, "signal_id", createSignalId(now, market, symbol)),
        createdAt: now,
        market,
        symbol,
        strategyId: stringField(payload, "strategy_id", "manual_watch"),
        direction: stringField(payload, "direction", "watch") as "buy" | "sell" | "hold" | "reduce" | "watch",
        confidence: stringField(payload, "confidence", "low") as "low" | "medium" | "high",
        reason: stringField(payload, "reason", "Manual dry-run candidate."),
        dataTimestamp: stringField(payload, "data_timestamp", now),
        sourceRefs: stringArrayField(payload, "source_refs", ["manual"]),
        riskCheck,
        recommendedAction: stringField(payload, "recommended_action", "Record dry-run candidate only."),
        executionMode,
        expiresAt: stringField(payload, "expires_at", now)
      });
    } catch {
      return reply.code(400).send({
        error: "signal_input_invalid"
      });
    }
    const journal = await appendDryRunJournalEntry(
      memoryRoot,
      createDryRunJournalEntry({
        signal,
        createdAt: now,
        simulatedOrder
      })
    );

    return reply.code(201).send({
      signal,
      journal
    });
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

function stringField(payload: Record<string, unknown> | null, key: string, fallback = ""): string {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArrayField(payload: Record<string, unknown> | null, key: string, fallback: string[]): string[] {
  const value = payload?.[key];
  if (!Array.isArray(value)) {
    return fallback;
  }
  const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return strings.length > 0 ? strings.map((item) => item.trim()) : fallback;
}

function numberField(payload: Record<string, unknown> | null, key: string, fallback: number): number {
  const value = payload?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanField(payload: Record<string, unknown> | null, key: string, fallback: boolean): boolean {
  const value = payload?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function simulatedOrderFromPayload(payload: Record<string, unknown> | null): SimulatedOrder | null {
  const value = payload?.simulated_order;
  if (!isRecord(value)) {
    return null;
  }
  const side = typeof value.side === "string" ? value.side : "";
  const quantity = typeof value.quantity === "number" && Number.isFinite(value.quantity) ? value.quantity : 0;
  const estimatedPrice =
    typeof value.estimated_price === "number" && Number.isFinite(value.estimated_price) ? value.estimated_price : 0;
  const currency = typeof value.currency === "string" ? value.currency : "";
  if ((side !== "buy" && side !== "sell") || quantity <= 0 || estimatedPrice <= 0) {
    return null;
  }
  if (currency !== "KRW" && currency !== "USD") {
    return null;
  }
  return {
    side,
    quantity,
    estimatedPrice,
    currency
  };
}

function isMarket(value: string): value is Market {
  return value === "korea" || value === "us";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createSignalId(now: string, market: Market, symbol: string): string {
  const timestamp = now.replace(/\D/g, "").slice(0, 14) || "manual";
  const safeSymbol = symbol.trim().replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "UNKNOWN";
  return `signal_${timestamp}_${market}_${safeSymbol}_manual`;
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
