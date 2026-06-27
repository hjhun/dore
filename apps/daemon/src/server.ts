import Fastify, { type FastifyReply } from "fastify";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { runBriefingJob } from "../../../packages/briefing/src/index.js";
import type { DoreConfig } from "../../../packages/config/src/index.js";
import {
  appendEvent,
  cancelRuntimeTask,
  createApprovalRequest,
  createRuntimeTask,
  decideApprovalRequest,
  loadRuntimeApprovals,
  loadRuntimeTasks,
  runtimeApprovalsPath,
  runtimeEventLogPath,
  runtimeTasksPath,
  saveRuntimeApprovals,
  saveRuntimeTasks
} from "../../../packages/core/src/index.js";
import type { ApprovalRequest, Task } from "../../../packages/contracts/src/index.js";
import type {
  CodeReviewFindingInput,
  CodeReviewReport,
  EngineeringActionRiskInput,
  EngineeringRiskReview,
  EngineeringAgentLoopStatus,
  ExecFileResult,
  FailedVerificationSummary,
  FileEditRecord,
  PackageJsonLike,
  ProjectIntake
} from "../../../packages/engineering/src/index.js";
import {
  appendCodeReviewReportEvent,
  appendCodexAgentRunEvent,
  appendEngineeringRiskReviewEvent,
  appendFileEditEvent,
  appendTestExecutionEvent,
  applyControlledFileEdit,
  createCodexRunnerStatus,
  createCodeReviewReport,
  createEngineeringRiskReview,
  createFailedVerificationSummary,
  createFileMutationProof,
  createTestExecutionRecord,
  executeAllowedCommand,
  runEngineeringIntake,
  runCodexAgentTask,
  summarizeDevelopmentAgentLoopStatus,
  summarizeDevelopmentTaskStages
} from "../../../packages/engineering/src/index.js";
import { createDailyBriefingJob, InMemoryScheduleRegistry } from "../../../packages/scheduler/src/index.js";
import { createProviderRegistry } from "../../../packages/model-gateway/src/index.js";
import { reviewMemoryQuality, writeMemoryRecord } from "../../../packages/memory/src/index.js";
import { createTelegramAdapterStatus } from "../../../packages/telegram/src/index.js";
import {
  appendDryRunJournalEntry,
  createDryRunJournalEntry,
  createRealTradingGateStatus,
  createTradingSignal,
  createTradingStatus,
  evaluateMarketDataSources,
  ensureRealTradingBlocked,
  loadRealTradingGateControls,
  loadWatchlistStore,
  runRiskCheck,
  saveRealTradingGateControls,
  summarizeDryRunJournal,
  summarizeTradingJournal,
  type ExecutionMode,
  type Market,
  type RealTradingGateControls,
  type SimulatedOrder
} from "../../../packages/trading/src/index.js";
import { evaluateDaemonHealth } from "./health.js";

export interface DaemonAppOptions {
  startedAt?: Date;
  configLoaded?: boolean;
  memoryReady?: boolean;
  memoryRoot?: string;
  projectRoot?: string;
  tradingConfig?: DoreConfig["trading"];
  packageJson?: PackageJsonLike;
  engineeringExecFile?: (command: string, args: string[]) => Promise<ExecFileResult>;
  engineeringCommandExecFile?: (command: string, args: string[], options?: { cwd?: string }) => Promise<ExecFileResult>;
  engineeringCodexExecFile?: (command: string, args: string[], options?: { cwd?: string }) => Promise<ExecFileResult>;
  codexAuthFilePath?: string;
  localAuthToken?: string;
  telegramConfig?: DoreConfig["telegram"];
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}

export function createDaemonApp(options: DaemonAppOptions = {}) {
  const startedAt = options.startedAt ?? new Date();
  const app = Fastify({ logger: false });
  const memoryRoot = resolve(options.memoryRoot ?? process.env.DORE_MEMORY_ROOT ?? "memory");
  const projectRoot = resolve(options.projectRoot ?? process.env.DORE_PROJECT_ROOT ?? ".");
  const localAuthToken = options.localAuthToken ?? process.env.DORE_DAEMON_TOKEN;
  const daemonEnv = options.env ?? process.env;
  let engineeringHistoryLoaded = false;
  const engineeringTasks = new Map<
    string,
    {
      intake: ProjectIntake;
      status: "planned" | "completed" | "failed";
      eventLogPath: string;
      lastCommand?: string;
      failedVerification?: FailedVerificationSummary;
      reviewReport?: CodeReviewReport;
      riskReview?: EngineeringRiskReview;
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

  app.addHook("preHandler", async (request, reply) => {
    if (!isProtectedRuntimePath(request.url) || isLocalRequest(request.ip) || hasValidAuthToken(request.headers.authorization, localAuthToken)) {
      return;
    }
    return reply.code(401).send({
      error: "local_or_authenticated_request_required"
    });
  });

  app.get("/status", async () => {
    await ensureEngineeringHistoryLoaded();
    const uptime_ms = Date.now() - startedAt.getTime();
    const health = evaluateDaemonHealth({
      projectRoot,
      env: daemonEnv
    });
    const scheduler = new InMemoryScheduleRegistry();
    createDailyBriefingJob(scheduler, {
      time: "06:00",
      timezone: "Asia/Seoul"
    });
    const [runtimeTasks, runtimeApprovals, schedulerRuns] = await Promise.all([
      loadRuntimeTasks(memoryRoot),
      loadRuntimeApprovals(memoryRoot),
      readSchedulerRecentRuns(memoryRoot)
    ]);
    const schedulerJobs = scheduler.list().map((job) => {
      const recentRuns = schedulerRuns.filter((run) => run.job_id === job.id);
      const latestRun = recentRuns[0];
      const recovery = createSchedulerRecoveryState({
        time: job.time,
        timezone: job.timezone,
        recentRuns
      });
      return {
        ...job,
        last_run_at: latestRun?.time,
        last_run_status: latestRun?.status,
        next_run_at: recovery.next_run_at,
        failure_count: recovery.failure_count,
        retry_status: recovery.retry_status,
        recent_runs: recentRuns
      };
    });

    const providerStatus = Object.fromEntries(
      createProviderRegistry({ env: daemonEnv }).status().map((provider) => [
        provider.provider,
        {
          configured: provider.available,
          auth_mode: provider.auth_mode,
          model: provider.configured_model,
          reason: provider.reason
        }
      ])
    );
    const telegramTokenEnv = options.telegramConfig?.bot_token_env ?? "TELEGRAM_BOT_TOKEN";
    const telegramAllowedUserIds =
      options.telegramConfig?.allowed_user_ids && options.telegramConfig.allowed_user_ids.length > 0
        ? options.telegramConfig.allowed_user_ids
        : parseAllowedUserIds(daemonEnv.TELEGRAM_ALLOWED_USER_IDS);

    return {
      app: {
        name: "Dore",
        mode: "local",
        uptime_ms: Math.max(0, uptime_ms)
      },
      health: {
        status: health.status,
        summary: health.summary
      },
      config: {
        loaded: options.configLoaded ?? false
      },
      memory: {
        ready: options.memoryReady ?? false
      },
      providers: providerStatus,
      telegram: {
        configured: Boolean(daemonEnv[telegramTokenEnv]),
        allowlist_required: true,
        allowlist_count: telegramAllowedUserIds.length,
        adapter: createTelegramAdapterStatus({
          enabled: options.telegramConfig?.enabled ?? true,
          botToken: daemonEnv[telegramTokenEnv],
          allowedUserIds: telegramAllowedUserIds
        })
      },
      scheduler: {
        jobs: schedulerJobs
      },
      runtime: {
        tasks: runtimeTasks,
        approvals: runtimeApprovals
      },
      trading: await createLocalTradingStatus(memoryRoot, startedAt, options.tradingConfig),
      engineering: {
        codex_runner: await createCodexRunnerStatus({
          authFilePath: options.codexAuthFilePath,
          execFile: options.engineeringCodexExecFile
        }),
        tasks: Array.from(engineeringTasks.values()).map((task) => ({
          id: task.intake.id,
          title: task.intake.projectName,
          status: task.status,
          last_command: task.lastCommand,
          failed_verification: task.failedVerification ? toDaemonFailedVerification(task.failedVerification) : undefined,
          review_report: task.reviewReport ? toDaemonCodeReviewReport(task.reviewReport) : undefined,
          risk_review: task.riskReview ? toDaemonRiskReview(task.riskReview) : undefined,
          loop_status: toDaemonAgentLoopStatus(
            summarizeDevelopmentAgentLoopStatus({
              intake: task.intake,
              taskStatus: task.status,
              failedVerification: task.failedVerification,
              reviewRetryAttempted: Boolean(task.reviewReport)
            })
          ),
          stages: summarizeDevelopmentTaskStages({
            intake: task.intake,
            taskStatus: task.status
          })
        }))
      }
    };
  });

  app.get("/health", async () =>
    evaluateDaemonHealth({
      projectRoot,
      env: daemonEnv
    })
  );

  app.get("/trading/status", async () => createLocalTradingStatus(memoryRoot, startedAt, options.tradingConfig));

  app.get("/tasks", async () => ({
    tasks: await loadRuntimeTasks(memoryRoot),
    path: runtimeTasksPath(memoryRoot)
  }));

  app.get("/tasks/:id", async (request, reply) => {
    const params = request.params as { id?: string };
    const task = (await loadRuntimeTasks(memoryRoot)).find((candidate) => candidate.id === params.id);
    if (!task) {
      return reply.code(404).send({
        error: "task_not_found"
      });
    }
    return { task };
  });

  app.post("/tasks", async (request, reply) => {
    const payload = request.body as Record<string, unknown> | null;
    const now = stringField(payload, "now", new Date().toISOString());
    const id = stringField(payload, "id", createRuntimeId("task", now));
    const title = stringField(payload, "title");
    if (!title) {
      return reply.code(400).send({
        error: "task_title_required"
      });
    }

    let task: Task;
    try {
      task = createRuntimeTask({
        id,
        title,
        type: enumField(payload, "type", ["user_request", "scheduled_job", "internal_maintenance", "approval_followup"], "user_request"),
        priority: enumField(payload, "priority", ["low", "normal", "high", "urgent"], "normal"),
        requestedBy: enumField(payload, "requested_by", ["user", "scheduler", "dore"], "user"),
        sourceChannel: enumField(payload, "source_channel", ["desktop", "telegram", "cli", "scheduler"], "desktop"),
        riskLevel: enumField(payload, "risk_level", ["read", "write", "execute", "trade", "critical"], "read"),
        approvalState: enumField(
          payload,
          "approval_state",
          ["not_required", "pending", "approved", "rejected", "expired", "cancelled"],
          "not_required"
        ),
        now,
        inputsRef: stringField(payload, "inputs_ref") || undefined,
        outputsRef: stringField(payload, "outputs_ref") || undefined
      });
    } catch {
      return reply.code(400).send({
        error: "task_input_invalid"
      });
    }

    const tasks = await loadRuntimeTasks(memoryRoot);
    if (tasks.some((candidate) => candidate.id === task.id)) {
      return reply.code(409).send({
        error: "task_already_exists"
      });
    }
    const path = await saveRuntimeTasks(memoryRoot, [...tasks, task]);
    const eventLog = await appendRuntimeEvent(memoryRoot, {
      id: createRuntimeId("event", now),
      time: now,
      actor: task.requested_by,
      event_type: "task_started",
      entity_type: "task",
      entity_id: task.id,
      summary: `Task created: ${task.title}`,
      risk_level: task.risk_level,
      refs: [path]
    });

    return reply.code(201).send({
      task,
      path,
      event_log: eventLog
    });
  });

  app.post("/tasks/:id/cancel", async (request, reply) => {
    const params = request.params as { id?: string };
    const payload = request.body as Record<string, unknown> | null;
    const now = stringField(payload, "now", new Date().toISOString());
    const tasks = await loadRuntimeTasks(memoryRoot);
    const index = tasks.findIndex((candidate) => candidate.id === params.id);
    if (index < 0) {
      return reply.code(404).send({
        error: "task_not_found"
      });
    }
    const current = tasks[index];
    if (!current) {
      return reply.code(404).send({
        error: "task_not_found"
      });
    }
    const task = cancelRuntimeTask(current, {
      now,
      reason: stringField(payload, "reason") || undefined
    });
    const updatedTasks = [...tasks];
    updatedTasks[index] = task;
    const path = await saveRuntimeTasks(memoryRoot, updatedTasks);
    const eventLog = await appendRuntimeEvent(memoryRoot, {
      id: createRuntimeId("event", now),
      time: now,
      actor: "user",
      event_type: "task_updated",
      entity_type: "task",
      entity_id: task.id,
      summary: `Task cancelled: ${task.title}`,
      risk_level: task.risk_level,
      refs: [path]
    });

    return {
      task,
      path,
      event_log: eventLog
    };
  });

  app.get("/approvals", async () => ({
    approvals: await loadRuntimeApprovals(memoryRoot),
    path: runtimeApprovalsPath(memoryRoot)
  }));

  app.post("/approvals", async (request, reply) => {
    const payload = request.body as Record<string, unknown> | null;
    const requestedAction = requestedActionFromPayload(payload?.requested_action);
    if (!requestedAction) {
      return reply.code(400).send({
        error: "requested_action_required"
      });
    }
    const createdAt = stringField(payload, "created_at", new Date().toISOString());
    let approval: ApprovalRequest;
    try {
      approval = createApprovalRequest({
        id: stringField(payload, "id", createRuntimeId("approval", createdAt)),
        taskId: stringField(payload, "task_id", "task_unassigned"),
        title: stringField(payload, "title", "Approval required"),
        summaryForUser: stringField(payload, "summary_for_user", "Dore requests approval."),
        riskLevel: enumField(payload, "risk_level", ["write", "execute", "trade", "critical"], "write"),
        requestedAction,
        createdAt,
        expiresAt: stringField(payload, "expires_at", createdAt),
        auditRefs: stringArrayField(payload, "audit_refs", [])
      });
    } catch {
      return reply.code(400).send({
        error: "approval_input_invalid"
      });
    }

    const approvals = await loadRuntimeApprovals(memoryRoot);
    if (approvals.some((candidate) => candidate.id === approval.id)) {
      return reply.code(409).send({
        error: "approval_already_exists"
      });
    }
    const path = await saveRuntimeApprovals(memoryRoot, [...approvals, approval]);
    const eventLog = await appendRuntimeEvent(memoryRoot, {
      id: createRuntimeId("event", approval.created_at),
      time: approval.created_at,
      actor: "dore",
      event_type: "approval_requested",
      entity_type: "approval",
      entity_id: approval.id,
      summary: `Approval requested: ${approval.title}`,
      risk_level: approval.risk_level,
      refs: [path, ...approval.audit_refs]
    });

    return reply.code(201).send({
      approval,
      path,
      event_log: eventLog
    });
  });

  app.post("/approvals/:id/approve", async (request, reply) =>
    decideRuntimeApproval(memoryRoot, request.params as { id?: string }, request.body as Record<string, unknown> | null, "approved", reply)
  );

  app.post("/approvals/:id/reject", async (request, reply) =>
    decideRuntimeApproval(memoryRoot, request.params as { id?: string }, request.body as Record<string, unknown> | null, "rejected", reply)
  );

  app.get("/briefings/latest", async (_request, reply) => {
    const briefing = await readLatestBriefing(memoryRoot);
    if (!briefing) {
      return reply.code(404).send({
        error: "briefing_not_found"
      });
    }
    return briefing;
  });

  app.post("/briefings/run", async (request, reply) => {
    const payload = request.body as Record<string, unknown> | null;
    const trigger = stringField(payload, "trigger") === "scheduled" ? "scheduled" : "manual";
    const result = await runBriefingJob({
      memoryRoot,
      projectRoot,
      date: stringField(payload, "date") || undefined,
      generatedAt: stringField(payload, "generated_at") || undefined,
      trigger,
      env: daemonEnv
    });
    const eventTime = stringField(payload, "now", new Date().toISOString());
    const eventLog = await appendRuntimeEvent(memoryRoot, {
      id: createRuntimeId("event", eventTime),
      time: eventTime,
      actor: trigger === "scheduled" ? "scheduler" : "dore",
      event_type: "briefing_generated",
      entity_type: "briefing",
      entity_id: "daily_briefing_0600_kst",
      summary: "Daily briefing generated.",
      risk_level: "read",
      refs: [result.markdownPath, result.jsonPath, result.usagePath]
    });
    return reply.code(201).send({
      ...result,
      event_log: eventLog
    });
  });

  app.get("/usage/summary", async () => ({
    summary: await readUsageSummary(memoryRoot)
  }));

  app.get("/memory/index", async () => readMemoryIndex(memoryRoot));

  app.get("/memory/quality", async () => ({
    quality: await reviewMemoryQuality(memoryRoot)
  }));

  app.post("/memory/records", async (request, reply) => {
    const payload = request.body as Record<string, unknown> | null;
    const title = stringField(payload, "title");
    const body = stringField(payload, "body");
    if (!title || !body) {
      return reply.code(400).send({
        error: "memory_title_and_body_required"
      });
    }
    const result = await writeMemoryRecord({
      memoryRoot,
      type: enumField(
        payload,
        "type",
        ["profile", "project", "topic", "decision", "routine", "trading", "engineering", "log"],
        "topic"
      ),
      title,
      body,
      now: stringField(payload, "now", new Date().toISOString()),
      sensitivity: enumField(payload, "sensitivity", ["public", "personal", "sensitive", "secret_ref"], "personal"),
      tags: stringArrayField(payload, "tags", []),
      sourceRefs: stringArrayField(payload, "source_refs", []),
      rawSource: stringField(payload, "raw_source") || undefined
    });

    if (result.status === "approval_required") {
      const approvals = await loadRuntimeApprovals(memoryRoot);
      const path = await saveRuntimeApprovals(memoryRoot, [...approvals, result.approvalRequest]);
      const eventLog = await appendRuntimeEvent(memoryRoot, {
        id: createRuntimeId("event", result.approvalRequest.created_at),
        time: result.approvalRequest.created_at,
        actor: "dore",
        event_type: "approval_requested",
        entity_type: "approval",
        entity_id: result.approvalRequest.id,
        summary: `Approval requested: ${result.approvalRequest.title}`,
        risk_level: result.approvalRequest.risk_level,
        refs: [path]
      });
      return reply.code(202).send({
        status: "approval_required",
        approval: result.approvalRequest,
        path,
        event_log: eventLog
      });
    }

    const eventLog = await appendRuntimeEvent(memoryRoot, {
      id: createRuntimeId("event", new Date().toISOString()),
      time: new Date().toISOString(),
      actor: "dore",
      event_type: "task_updated",
      entity_type: "memory",
      entity_id: result.record.path,
      summary: `Memory record written: ${result.record.title}`,
      risk_level: "read",
      refs: [result.path, ...(result.rawPath ? [result.rawPath] : [])]
    });
    return reply.code(201).send({
      status: "written",
      record: result.record,
      path: result.path,
      raw_path: result.rawPath,
      event_log: eventLog
    });
  });

  app.get("/logs/recent", async () => ({
    logs: await readRecentLogs(memoryRoot)
  }));

  app.post("/trading/gates/approval", async (request, reply) => {
    const payload = request.body as Record<string, unknown> | null;
    const approved = payload?.approved;
    if (typeof approved !== "boolean") {
      return reply.code(400).send({
        error: "approval_required"
      });
    }

    const now = stringField(payload, "now", new Date().toISOString());
    const controls = await mergeAndSaveTradingGateControls(memoryRoot, {
      approval_granted: approved,
      updated_at: now,
      updated_by: "user"
    });
    const eventLogPath = await appendTradingGateEvent(memoryRoot, {
      id: createEventId(now, "approval"),
      time: now,
      eventType: "approval_decided",
      entityType: "approval",
      entityId: "trading_real_gate_approval",
      summary: approved ? "trading_real_gate_approval_granted" : "trading_real_gate_approval_revoked",
      refs: [controls.path],
      detail: {
        approval_granted: approved,
        reason: stringField(payload, "reason", "No reason provided.")
      }
    });

    return reply.code(201).send({
      controls: controls.controls,
      controls_path: controls.path,
      event_log: eventLogPath
    });
  });

  app.post("/trading/gates/kill-switch", async (request, reply) => {
    const payload = request.body as Record<string, unknown> | null;
    const enabled = payload?.enabled;
    if (typeof enabled !== "boolean") {
      return reply.code(400).send({
        error: "kill_switch_state_required"
      });
    }

    const now = stringField(payload, "now", new Date().toISOString());
    const controls = await mergeAndSaveTradingGateControls(memoryRoot, {
      kill_switch_enabled: enabled,
      updated_at: now,
      updated_by: "user"
    });
    const eventLogPath = await appendTradingGateEvent(memoryRoot, {
      id: createEventId(now, "kill_switch"),
      time: now,
      eventType: "task_updated",
      entityType: "task",
      entityId: "trading_kill_switch",
      summary: "trading_kill_switch_updated",
      refs: [controls.path],
      detail: {
        kill_switch_enabled: enabled,
        reason: stringField(payload, "reason", "No reason provided.")
      }
    });

    return reply.code(201).send({
      controls: controls.controls,
      controls_path: controls.path,
      event_log: eventLogPath
    });
  });

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
    task.failedVerification = createFailedVerificationSummary(execution);

    return reply.code(201).send({
      task_id: task.intake.id,
      task_status: task.status,
      execution,
      failed_verification: task.failedVerification ? toDaemonFailedVerification(task.failedVerification) : undefined,
      loop_status: toDaemonAgentLoopStatus(
        summarizeDevelopmentAgentLoopStatus({
          intake: task.intake,
          taskStatus: task.status,
          failedVerification: task.failedVerification,
          reviewRetryAttempted: Boolean(task.reviewReport)
        })
      ),
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
    task.failedVerification = createFailedVerificationSummary(execution);

    return reply.code(201).send({
      task_id: task.intake.id,
      task_status: task.status,
      execution,
      failed_verification: task.failedVerification ? toDaemonFailedVerification(task.failedVerification) : undefined,
      loop_status: toDaemonAgentLoopStatus(
        summarizeDevelopmentAgentLoopStatus({
          intake: task.intake,
          taskStatus: task.status,
          failedVerification: task.failedVerification,
          reviewRetryAttempted: Boolean(task.reviewReport)
        })
      ),
      event_log: task.eventLogPath
    });
  });

  app.post("/engineering/tasks/:id/codex-run", async (request, reply) => {
    const params = request.params as { id?: string };
    const task = params.id ? engineeringTasks.get(params.id) : undefined;
    if (!task) {
      return reply.code(404).send({
        error: "task_not_found"
      });
    }

    const payload = request.body as { prompt?: unknown; now?: unknown } | null;
    const prompt = typeof payload?.prompt === "string" && payload.prompt.trim() ? payload.prompt.trim() : "";
    if (!prompt) {
      return reply.code(400).send({
        error: "prompt_required"
      });
    }

    const run = await runCodexAgentTask({
      prompt,
      projectRoot,
      now: typeof payload?.now === "string" && payload.now.trim() ? payload.now.trim() : new Date().toISOString(),
      execFile: options.engineeringCodexExecFile
    });
    await appendCodexAgentRunEvent(task.eventLogPath, task.intake, run);
    task.status = run.status === "passed" ? "completed" : "failed";
    task.lastCommand = run.command;
    task.failedVerification = createFailedVerificationSummary(run);

    return reply.code(201).send({
      task_id: task.intake.id,
      task_status: task.status,
      codex_run: run,
      failed_verification: task.failedVerification ? toDaemonFailedVerification(task.failedVerification) : undefined,
      loop_status: toDaemonAgentLoopStatus(
        summarizeDevelopmentAgentLoopStatus({
          intake: task.intake,
          taskStatus: task.status,
          failedVerification: task.failedVerification,
          reviewRetryAttempted: Boolean(task.reviewReport)
        })
      ),
      event_log: task.eventLogPath
    });
  });

  app.post("/engineering/tasks/:id/review-report", async (request, reply) => {
    const params = request.params as { id?: string };
    const task = params.id ? engineeringTasks.get(params.id) : undefined;
    if (!task) {
      return reply.code(404).send({
        error: "task_not_found"
      });
    }

    const findings = parseCodeReviewFindingInputs((request.body as { findings?: unknown } | null)?.findings);
    if (!findings) {
      return reply.code(400).send({
        error: "review_findings_required"
      });
    }

    const report = createCodeReviewReport({ findings });
    await appendCodeReviewReportEvent(task.eventLogPath, task.intake, report);
    task.reviewReport = report;

    return reply.code(201).send({
      task_id: task.intake.id,
      task_status: task.status,
      review_report: toDaemonCodeReviewReport(report),
      event_log: task.eventLogPath
    });
  });

  app.post("/engineering/tasks/:id/risk-review", async (request, reply) => {
    const params = request.params as { id?: string };
    const task = params.id ? engineeringTasks.get(params.id) : undefined;
    if (!task) {
      return reply.code(404).send({
        error: "task_not_found"
      });
    }

    const riskInput = parseEngineeringRiskInput(request.body);
    if (!riskInput) {
      return reply.code(400).send({
        error: "risk_review_input_required"
      });
    }

    const riskReview = createEngineeringRiskReview(riskInput);
    await appendEngineeringRiskReviewEvent(task.eventLogPath, task.intake, riskReview);
    task.riskReview = riskReview;

    return reply.code(201).send({
      task_id: task.intake.id,
      task_status: task.status,
      risk_review: toDaemonRiskReview(riskReview),
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
      mutation_proof: createFileMutationProof(edit),
      event_log: task.eventLogPath
    });
  });

  return app;
}

async function createLocalTradingStatus(memoryRoot: string, now: Date, tradingConfig?: DoreConfig["trading"]) {
  const month = now.toISOString().slice(0, 7);
  const watchlist = await loadWatchlistStore(memoryRoot);
  const controls = await loadRealTradingGateControls(memoryRoot);
  const gateConfig = tradingConfig?.real_trading_gates;
  const realTradingGate = createRealTradingGateStatus({
    realTradingRequested: tradingConfig?.real_trading_enabled ?? false,
    explicitEnable: gateConfig?.explicit_enable ?? false,
    officialApiVerified: gateConfig?.official_api_verified ?? false,
    termsVerified: gateConfig?.terms_verified ?? false,
    brokerCredentialRefs: gateConfig?.broker_credentials,
    dryRunObservedDays: gateConfig?.dry_run_observed_days ?? 0,
    dryRunMinDays: gateConfig?.dry_run_min_days ?? 30,
    killSwitchEnabled: controls.kill_switch_enabled ?? gateConfig?.kill_switch_enabled ?? true,
    approvalRequired: gateConfig?.approval_required ?? true,
    approvalGranted: controls.approval_granted ?? gateConfig?.approval_granted ?? false,
    riskLimits: gateConfig?.risk_limits
  });
  return createTradingStatus({
    realTradingEnabled: realTradingGate.status === "ready",
    brokers: tradingConfig?.brokers,
    watchlist: watchlist.items,
    dryRunJournal: await summarizeDryRunJournal(memoryRoot, month),
    paperJournal: await summarizeTradingJournal(memoryRoot, month),
    marketDataSources: evaluateMarketDataSources({
      now: now.toISOString(),
      maxAgeMs: 15 * 60 * 1000,
      watchlist,
      quotes: []
    }),
    realTradingGate
  });
}

async function decideRuntimeApproval(
  memoryRoot: string,
  params: { id?: string },
  payload: Record<string, unknown> | null,
  decision: "approved" | "rejected",
  reply: FastifyReply
) {
  const approvals = await loadRuntimeApprovals(memoryRoot);
  const index = approvals.findIndex((approval) => approval.id === params.id);
  if (index < 0) {
    return reply.code(404).send({
      error: "approval_not_found"
    });
  }
  const current = approvals[index];
  if (!current) {
    return reply.code(404).send({
      error: "approval_not_found"
    });
  }
  const now = stringField(payload, "now", new Date().toISOString());
  const approval = decideApprovalRequest(current, {
    decision,
    now,
    reason: stringField(payload, "reason") || undefined
  });
  const updatedApprovals = [...approvals];
  updatedApprovals[index] = approval;
  const path = await saveRuntimeApprovals(memoryRoot, updatedApprovals);
  const refs = [path, ...approval.audit_refs];
  const tasks = await loadRuntimeTasks(memoryRoot);
  const taskIndex = tasks.findIndex((task) => task.id === approval.task_id);
  if (taskIndex >= 0) {
    const task = tasks[taskIndex];
    if (task) {
      const updatedTask: Task = {
        ...task,
        approval_state: decision,
        updated_at: now
      };
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = updatedTask;
      refs.push(await saveRuntimeTasks(memoryRoot, updatedTasks));
    }
  }
  const eventLog = await appendRuntimeEvent(memoryRoot, {
    id: createRuntimeId("event", now),
    time: now,
    actor: "user",
    event_type: "approval_decided",
    entity_type: "approval",
    entity_id: approval.id,
    summary: `Approval ${decision}: ${approval.title}`,
    risk_level: approval.risk_level,
    refs
  });

  return {
    approval,
    path,
    event_log: eventLog
  };
}

async function appendRuntimeEvent(memoryRoot: string, record: Parameters<typeof appendEvent>[1]): Promise<string> {
  const eventLogPath = runtimeEventLogPath(memoryRoot);
  await appendEvent(eventLogPath, record);
  return eventLogPath;
}

async function readLatestBriefing(memoryRoot: string): Promise<{ briefing: unknown; path: string } | null> {
  const dailyDir = join(memoryRoot, "logs", "daily");
  let files: string[];
  try {
    files = await readdir(dailyDir);
  } catch {
    return null;
  }
  const jsonFiles = files.filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file)).sort();
  const latest = jsonFiles.at(-1);
  if (!latest) {
    return null;
  }
  const path = join(dailyDir, latest);
  return {
    briefing: JSON.parse(await readFile(path, "utf8")),
    path
  };
}

async function readUsageSummary(memoryRoot: string) {
  const usageDir = join(memoryRoot, "logs", "usage");
  let files: string[];
  try {
    files = await readdir(usageDir);
  } catch {
    return {
      records: 0,
      estimated_cost_usd: 0,
      input_tokens: 0,
      output_tokens: 0,
      failed: 0
    };
  }

  let records = 0;
  let estimatedCostUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let failed = 0;
  for (const file of files.filter((entry) => entry.endsWith(".jsonl"))) {
    const path = join(usageDir, file);
    const lines = (await readFile(path, "utf8")).split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const record = JSON.parse(line) as Record<string, unknown>;
        records += 1;
        estimatedCostUsd += numberRecordField(record, "estimated_cost_usd");
        inputTokens += numberRecordField(record, "input_tokens");
        outputTokens += numberRecordField(record, "output_tokens");
        if (record.status === "failed") {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }
  }

  return {
    records,
    estimated_cost_usd: Number(estimatedCostUsd.toFixed(6)),
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    failed
  };
}

async function readMemoryIndex(memoryRoot: string) {
  const wikiRoot = join(memoryRoot, "wiki");
  const indexPath = join(wikiRoot, "index.md");
  let indexMarkdown = "";
  try {
    indexMarkdown = await readFile(indexPath, "utf8");
  } catch {
    indexMarkdown = "";
  }
  const entries = await readWikiEntries(memoryRoot, wikiRoot);
  return {
    index_path: indexPath,
    index_markdown: indexMarkdown,
    entries
  };
}

async function readRecentLogs(memoryRoot: string) {
  const [eventLogs, usageLogs, tradingLogs] = await Promise.all([
    readJsonlLogDir(join(memoryRoot, "logs", "events"), "event"),
    readJsonlLogDir(join(memoryRoot, "logs", "usage"), "usage"),
    readJsonlLogDir(join(memoryRoot, "logs", "trading"), "trading")
  ]);
  return [...eventLogs, ...usageLogs, ...tradingLogs]
    .sort((left, right) => right.time.localeCompare(left.time))
    .slice(0, 50);
}

async function readJsonlLogDir(dir: string, source: "event" | "usage" | "trading") {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const logs: Array<{
    id: string;
    time: string;
    category: "action" | "approval" | "trading" | "usage" | "error";
    event_type: string;
    summary: string;
  }> = [];
  for (const file of files.filter((entry) => entry.endsWith(".jsonl")).sort()) {
    const path = join(dir, file);
    const lines = (await readFile(path, "utf8")).split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const record = JSON.parse(line) as Record<string, unknown>;
        logs.push(normalizeLogRecord(record, source));
      } catch {
        logs.push({
          id: `invalid_${logs.length + 1}`,
          time: new Date(0).toISOString(),
          category: "error",
          event_type: "log_parse_failed",
          summary: `Could not parse ${file}.`
        });
      }
    }
  }
  return logs;
}

function normalizeLogRecord(record: Record<string, unknown>, source: "event" | "usage" | "trading") {
  const eventType =
    source === "usage" ? "llm_usage" : source === "trading" ? "trading_journal" : stringRecordField(record, "event_type") || "event";
  const time =
    stringRecordField(record, "time") ||
    stringRecordField(record, "started_at") ||
    stringRecordField(record, "created_at") ||
    new Date(0).toISOString();
  return {
    id: stringRecordField(record, "id") || stringRecordField(record, "signal_id") || `${eventType}_${time}`,
    time,
    category: logCategory(source, eventType, record),
    event_type: eventType,
    summary:
      stringRecordField(record, "summary") ||
      stringRecordField(record, "signal_id") ||
      (source === "usage" ? `LLM usage ${numberRecordField(record, "estimated_cost_usd")} USD` : eventType)
  };
}

function logCategory(source: "event" | "usage" | "trading", eventType: string, record: Record<string, unknown>) {
  if (source === "usage") {
    return "usage" as const;
  }
  if (source === "trading" || eventType.includes("trading")) {
    return "trading" as const;
  }
  if (eventType.includes("approval")) {
    return "approval" as const;
  }
  if (eventType.includes("failed") || eventType.includes("error") || record.status === "failed") {
    return "error" as const;
  }
  return "action" as const;
}

async function readSchedulerRecentRuns(memoryRoot: string): Promise<
  Array<{
    id: string;
    job_id: string;
    time: string;
    status: "generated" | "failed";
    summary: string;
  }>
> {
  const dir = join(memoryRoot, "logs", "events");
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const runs: Array<{
    id: string;
    job_id: string;
    time: string;
    status: "generated" | "failed";
    summary: string;
  }> = [];
  for (const file of files.filter((entry) => entry.endsWith(".jsonl")).sort()) {
    const path = join(dir, file);
    const lines = (await readFile(path, "utf8")).split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const record = JSON.parse(line) as Record<string, unknown>;
        const eventType = stringRecordField(record, "event_type");
        if (!["briefing_generated", "briefing_failed_attempt", "briefing_failed_final"].includes(eventType)) {
          continue;
        }
        const time = stringRecordField(record, "time") || new Date(0).toISOString();
        const status = eventType === "briefing_generated" ? "generated" : "failed";
        runs.push({
          id: stringRecordField(record, "id") || `${eventType}_${time}`,
          job_id: stringRecordField(record, "entity_id") || "daily_briefing_0600_kst",
          time,
          status,
          summary:
            stringRecordField(record, "summary") ||
            (status === "generated" ? "Daily briefing generated." : "Daily briefing failed.")
        });
      } catch {
        continue;
      }
    }
  }
  return runs.sort((left, right) => right.time.localeCompare(left.time)).slice(0, 10);
}

function createSchedulerRecoveryState(input: {
  time: string;
  timezone: string;
  recentRuns: Array<{ time: string; status: string }>;
}): {
  next_run_at: string;
  failure_count: number;
  retry_status: "idle" | "retry_pending";
} {
  const failureCount = countConsecutiveSchedulerFailures(input.recentRuns);
  return {
    next_run_at: nextDailyRunAt(input.recentRuns[0]?.time, input.time, input.timezone),
    failure_count: failureCount,
    retry_status: failureCount > 0 ? "retry_pending" : "idle"
  };
}

function countConsecutiveSchedulerFailures(recentRuns: Array<{ status: string }>): number {
  let failures = 0;
  for (const run of recentRuns) {
    if (run.status !== "failed") {
      break;
    }
    failures += 1;
  }
  return failures;
}

function nextDailyRunAt(anchorTime: string | undefined, scheduledTime: string, timezone: string): string {
  if (timezone !== "Asia/Seoul") {
    return "";
  }
  const [hour, minute] = scheduledTime.split(":").map(Number);
  const anchor = anchorTime ? new Date(anchorTime) : new Date();
  const kst = new Date(anchor.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth();
  const day = kst.getUTCDate();
  const todayRunUtc = Date.UTC(year, month, day, hour - 9, minute, 0, 0);
  const nextRunUtc = anchor.getTime() < todayRunUtc ? todayRunUtc : todayRunUtc + 24 * 60 * 60 * 1000;
  const nextKst = new Date(nextRunUtc + 9 * 60 * 60 * 1000);
  return `${nextKst.getUTCFullYear()}-${pad2(nextKst.getUTCMonth() + 1)}-${pad2(nextKst.getUTCDate())}T${pad2(hour)}:${pad2(minute)}:00+09:00`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

async function readWikiEntries(memoryRoot: string, dir: string): Promise<
  Array<{
    path: string;
    title: string;
    type?: string;
    status?: string;
    source_refs?: string[];
    sensitivity?: string;
    stale?: boolean;
    conflicts?: string[];
  }>
> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const result: Array<{
    path: string;
    title: string;
    type?: string;
    status?: string;
    source_refs?: string[];
    sensitivity?: string;
    stale?: boolean;
    conflicts?: string[];
  }> = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await readWikiEntries(memoryRoot, path)));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "index.md") {
      continue;
    }
    const text = await readFile(path, "utf8");
    const frontmatter = parseSimpleFrontmatter(text);
    const sourceRefs = frontmatterList(frontmatter, "source_refs");
    const conflicts = markdownListUnderHeading(text, "Conflicts");
    result.push({
      path: relative(memoryRoot, path),
      title: firstMarkdownHeading(text) ?? entry.name.replace(/\.md$/, ""),
      type: frontmatterString(frontmatter, "type"),
      status: frontmatterString(frontmatter, "status"),
      source_refs: sourceRefs.length > 0 ? sourceRefs : undefined,
      sensitivity: frontmatterString(frontmatter, "sensitivity"),
      stale: frontmatterString(frontmatter, "stale") === "true" ? true : undefined,
      conflicts: conflicts.length > 0 ? conflicts : undefined
    });
  }
  return result.sort((left, right) => left.path.localeCompare(right.path));
}

function firstMarkdownHeading(text: string): string | null {
  const line = text.split("\n").find((candidate) => candidate.startsWith("# "));
  return line ? line.replace(/^#\s+/, "").trim() : null;
}

function parseSimpleFrontmatter(text: string): Map<string, string | string[]> {
  const result = new Map<string, string | string[]>();
  if (!text.startsWith("---\n")) {
    return result;
  }
  const endIndex = text.indexOf("\n---", 4);
  if (endIndex === -1) {
    return result;
  }
  const lines = text.slice(4, endIndex).split("\n");
  let currentListKey: string | null = null;
  for (const line of lines) {
    if (line.startsWith("  - ") && currentListKey) {
      const current = result.get(currentListKey);
      const values = Array.isArray(current) ? current : [];
      values.push(line.replace(/^  -\s+/, "").trim());
      result.set(currentListKey, values);
      continue;
    }
    currentListKey = null;
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!key) {
      continue;
    }
    if (!value) {
      result.set(key, []);
      currentListKey = key;
      continue;
    }
    result.set(key, value.replace(/^"(.*)"$/, "$1"));
  }
  return result;
}

function frontmatterString(frontmatter: Map<string, string | string[]>, key: string): string | undefined {
  const value = frontmatter.get(key);
  return typeof value === "string" && value ? value : undefined;
}

function frontmatterList(frontmatter: Map<string, string | string[]>, key: string): string[] {
  const value = frontmatter.get(key);
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return typeof value === "string" && value ? [value] : [];
}

function markdownListUnderHeading(text: string, heading: string): string[] {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) {
    return [];
  }
  const values: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) {
      break;
    }
    if (line.trim().startsWith("- ")) {
      values.push(line.trim().replace(/^-\s+/, ""));
    }
  }
  return values;
}

function requestedActionFromPayload(value: unknown): ApprovalRequest["requested_action"] | null {
  if (!isRecord(value)) {
    return null;
  }
  const kind = stringRecordField(value, "kind");
  if (!["file_write", "command_execute", "external_send", "broker_order", "config_change"].includes(kind)) {
    return null;
  }
  const target = stringRecordField(value, "target");
  if (!target) {
    return null;
  }
  return {
    kind: kind as ApprovalRequest["requested_action"]["kind"],
    target,
    dry_run_available: booleanRecordField(value, "dry_run_available", false),
    reversible: booleanRecordField(value, "reversible", false)
  };
}

function isProtectedRuntimePath(url: string): boolean {
  return ["/tasks", "/approvals", "/briefings", "/usage", "/memory", "/logs"].some(
    (prefix) => url === prefix || url.startsWith(`${prefix}/`)
  );
}

function isLocalRequest(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip === "localhost";
}

function hasValidAuthToken(authorization: string | undefined, expectedToken: string | undefined): boolean {
  if (!expectedToken) {
    return false;
  }
  return authorization === `Bearer ${expectedToken}`;
}

function parseAllowedUserIds(value: string | undefined): number[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isSafeInteger(entry));
}

async function mergeAndSaveTradingGateControls(memoryRoot: string, update: RealTradingGateControls) {
  const current = await loadRealTradingGateControls(memoryRoot);
  return saveRealTradingGateControls(memoryRoot, {
    ...current,
    ...update
  });
}

async function appendTradingGateEvent(
  memoryRoot: string,
  input: {
    id: string;
    time: string;
    eventType: "approval_decided" | "task_updated";
    entityType: "approval" | "task";
    entityId: string;
    summary: string;
    refs: string[];
    detail: Record<string, unknown>;
  }
): Promise<string> {
  const eventLogPath = join(memoryRoot, "logs", "events", "trading.jsonl");
  await appendEvent(eventLogPath, {
    id: input.id,
    time: input.time,
    actor: "user",
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    summary: input.summary,
    risk_level: "trade",
    refs: input.refs,
    ...input.detail
  });
  return eventLogPath;
}

function stringField(payload: Record<string, unknown> | null, key: string, fallback = ""): string {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function enumField<const T extends readonly string[]>(
  payload: Record<string, unknown> | null,
  key: string,
  allowed: T,
  fallback: T[number]
): T[number] {
  const value = payload?.[key];
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function stringRecordField(payload: Record<string, unknown>, key: string, fallback = ""): string {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberRecordField(payload: Record<string, unknown>, key: string): number {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function booleanRecordField(payload: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = payload[key];
  return typeof value === "boolean" ? value : fallback;
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

function createEventId(now: string, suffix: string): string {
  const timestamp = now.replace(/\D/g, "").slice(0, 14) || "manual";
  return `event_${timestamp}_trading_${suffix}`;
}

function createRuntimeId(prefix: "task" | "approval" | "event", now: string): string {
  const timestamp = now.replace(/\D/g, "").slice(0, 14) || "manual";
  return `${prefix}_${timestamp}_runtime`;
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
      failedVerification?: FailedVerificationSummary;
      reviewReport?: CodeReviewReport;
      riskReview?: EngineeringRiskReview;
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
      const reviewReportEvent = findLastEvent(relatedEvents, (event) => Boolean(event.review_report));
      const riskReviewEvent = findLastEvent(relatedEvents, (event) => Boolean(event.risk_review));
      const completedEvent = findLastEvent(relatedEvents, (event) => event.event_type === "task_completed");
      engineeringTasks.set(intake.id, {
        intake,
        status: failedExecution ? "failed" : completedEvent ? "completed" : "planned",
        eventLogPath,
        lastCommand: typeof executionEvent?.command === "string" ? executionEvent.command : undefined,
        failedVerification: parseFailedVerificationEvent(failedExecution?.failed_verification),
        reviewReport: parseCodeReviewReportEvent(reviewReportEvent?.review_report),
        riskReview: parseEngineeringRiskReviewEvent(riskReviewEvent?.risk_review)
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

function toDaemonFailedVerification(summary: FailedVerificationSummary): Record<string, string> {
  return {
    command: summary.command,
    summary: summary.summary,
    likely_next_action: summary.likelyNextAction,
    output_summary: summary.outputSummary
  };
}

function toDaemonAgentLoopStatus(status: EngineeringAgentLoopStatus): Record<string, unknown> {
  return {
    iteration_budget: {
      max: status.iterationBudget.max,
      used: status.iterationBudget.used,
      remaining: status.iterationBudget.remaining,
      exhausted: status.iterationBudget.exhausted
    },
    retry_state: {
      failed_verification_retry_attempted: status.retryState.failedVerificationRetryAttempted,
      file_mutation_retry_attempted: status.retryState.fileMutationRetryAttempted,
      review_retry_attempted: status.retryState.reviewRetryAttempted
    },
    exit_reason: status.exitReason,
    next_action: status.nextAction
  };
}

function toDaemonCodeReviewReport(report: CodeReviewReport): CodeReviewReport {
  return report;
}

function toDaemonRiskReview(review: EngineeringRiskReview): Record<string, string | boolean> {
  return {
    kind: review.kind,
    target: review.target,
    approval_required: review.approvalRequired,
    risk_level: review.riskLevel,
    reason: review.reason
  };
}

function parseEngineeringRiskInput(value: unknown): EngineeringActionRiskInput | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const kind = enumString(record.kind, ["single_file_edit", "broad_file_edit", "destructive_command", "external_mutation"]);
  const target = typeof record.target === "string" && record.target.trim() ? record.target.trim() : undefined;
  if (!kind || !target) {
    return undefined;
  }
  return {
    kind,
    target
  };
}

function parseEngineeringRiskReviewEvent(value: unknown): EngineeringRiskReview | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const kind = enumString(record.kind, ["single_file_edit", "broad_file_edit", "destructive_command", "external_mutation"]);
  const riskLevel = enumString(record.risk_level, ["write", "execute", "critical"]);
  if (
    !kind ||
    typeof record.target !== "string" ||
    typeof record.approval_required !== "boolean" ||
    !riskLevel ||
    typeof record.reason !== "string"
  ) {
    return undefined;
  }
  return {
    kind,
    target: record.target,
    approvalRequired: record.approval_required,
    riskLevel,
    reason: record.reason
  };
}

function parseCodeReviewFindingInputs(value: unknown): CodeReviewFindingInput[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  const findings: CodeReviewFindingInput[] = [];
  for (const item of value) {
    const finding = parseCodeReviewFindingInput(item);
    if (!finding) {
      return undefined;
    }
    findings.push(finding);
  }
  return findings;
}

function parseCodeReviewFindingInput(value: unknown): CodeReviewFindingInput | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const category = enumString(record.category, ["bug", "regression", "missing_test", "risk", "style"]);
  const severity = enumString(record.severity, ["critical", "high", "medium", "low"]);
  const file = typeof record.file === "string" && record.file.trim() ? record.file.trim() : undefined;
  const line = typeof record.line === "number" && Number.isInteger(record.line) && record.line > 0 ? record.line : undefined;
  const message = typeof record.message === "string" && record.message.trim() ? record.message.trim() : undefined;
  if (!category || !severity || !file || !line || !message) {
    return undefined;
  }
  return {
    category,
    severity,
    file,
    line,
    message
  };
}

function enumString<const T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : undefined;
}

function parseCodeReviewReportEvent(value: unknown): CodeReviewReport | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.findings)) {
    return undefined;
  }
  const findings = record.findings.filter(isCodeReviewFinding);
  if (findings.length !== record.findings.length) {
    return undefined;
  }
  return {
    findings
  };
}

function isCodeReviewFinding(value: unknown): value is CodeReviewReport["findings"][number] {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.category === "string" &&
    typeof record.severity === "string" &&
    typeof record.file === "string" &&
    typeof record.line === "number" &&
    typeof record.message === "string" &&
    typeof record.reference === "string"
  );
}

function parseFailedVerificationEvent(value: unknown): FailedVerificationSummary | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.command !== "string" ||
    typeof record.summary !== "string" ||
    typeof record.likely_next_action !== "string" ||
    typeof record.output_summary !== "string"
  ) {
    return undefined;
  }
  return {
    command: record.command,
    summary: record.summary,
    likelyNextAction: record.likely_next_action,
    outputSummary: record.output_summary
  };
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
