import { execFile as nodeExecFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { appendEvent } from "../../core/src/index.js";
import { writeMemoryRecord } from "../../memory/src/index.js";

const execFileAsync = promisify(nodeExecFile);

export interface PackageJsonLike {
  scripts?: Record<string, string>;
}

export interface RepoSnapshot {
  branch: string;
  dirty: boolean;
  changedFiles: string[];
}

export interface ProjectIntakeInput {
  idea: string;
  requestedBy: string;
  now: string;
  projectName?: string;
  constraints?: string[];
  acceptanceCriteria?: string[];
  repo?: RepoSnapshot;
  packageJson?: PackageJsonLike;
}

export interface DraftSection {
  heading: string;
  body: string[];
}

export interface DraftDocument {
  title: string;
  generatedAt: string;
  sections: DraftSection[];
}

export interface ChangePlan {
  summary: string;
  steps: string[];
}

export interface VerificationCommand {
  kind: "test" | "build" | "desktop_build" | "lint" | "doctor";
  command: string;
}

export interface VerificationPlan {
  commands: VerificationCommand[];
}

export interface TestExecutionRecordInput {
  command: string;
  exitCode: number;
  startedAt: string;
  completedAt: string;
  output: string;
}

export interface TestExecutionRecord {
  command: string;
  status: "passed" | "failed";
  exitCode: number;
  durationMs: number;
  outputSummary: string;
}

export interface FailedVerificationSummary {
  command: string;
  summary: string;
  likelyNextAction: string;
  outputSummary: string;
}

export interface FileEditRecord {
  relativePath: string;
  status: "applied" | "blocked";
  replacements: number;
  summary: string;
}

export interface FileMutationProof {
  target: string;
  landed: boolean;
  status: "applied" | "blocked";
  evidence: string;
}

export interface ProjectIntake {
  id: string;
  requestedBy: string;
  projectName: string;
  requirementDraft: DraftDocument;
  technicalDesignDraft: DraftDocument;
  changePlan: ChangePlan;
  verificationPlan: VerificationPlan;
  executionRecord: {
    status: "planned";
    detectedCommands: VerificationCommand[];
    generatedAt: string;
  };
}

export interface ReviewSummaryInput {
  intake: ProjectIntake;
  repo: RepoSnapshot;
  executions: TestExecutionRecord[];
}

export interface ReviewSummary {
  status: "ready_for_review" | "needs_work";
  findings: string[];
  residualRisks: string[];
  verification: {
    passed: string[];
    failed: string[];
  };
}

export interface ExecFileResult {
  stdout: string;
  stderr?: string;
}

export interface RepoInspectionOptions {
  execFile?: (command: string, args: string[]) => Promise<ExecFileResult>;
}

export interface PersistProjectIntakeDraftsResult {
  baseDir: string;
  requirementPath: string;
  technicalDesignPath: string;
  changePlanPath: string;
  intakeJsonPath: string;
}

export interface RunEngineeringIntakeInput {
  idea: string;
  requestedBy: string;
  now: string;
  memoryRoot: string;
  projectRoot: string;
  packageJson?: PackageJsonLike;
  constraints?: string[];
  acceptanceCriteria?: string[];
  execFile?: (command: string, args: string[]) => Promise<ExecFileResult>;
}

export interface RunEngineeringIntakeResult {
  intake: ProjectIntake;
  drafts: PersistProjectIntakeDraftsResult;
  eventLogPath: string;
}

export interface ExecuteAllowedCommandInput {
  command: string;
  projectRoot: string;
  now: string;
  execFile?: (command: string, args: string[], options?: { cwd?: string }) => Promise<ExecFileResult>;
}

export interface CodexRunnerStatus {
  available: boolean;
  cli_available: boolean;
  auth_file_present: boolean;
  auth_mode?: string;
  has_access_token: boolean;
  has_refresh_token: boolean;
  last_refresh?: string;
  reason?: "missing_cli" | "missing_auth" | "missing_tokens" | "invalid_auth";
}

export interface CreateCodexRunnerStatusInput {
  authFilePath?: string;
  authJson?: string;
  execFile?: (command: string, args: string[], options?: { cwd?: string }) => Promise<ExecFileResult>;
}

export interface RunCodexAgentTaskInput {
  prompt: string;
  projectRoot: string;
  now: string;
  execFile?: (command: string, args: string[], options?: { cwd?: string }) => Promise<ExecFileResult>;
}

export interface ApplyControlledFileEditInput {
  projectRoot: string;
  relativePath: string;
  find: string;
  replace: string;
}

export interface EngineeringTool {
  id: string;
  category: "file" | "command" | "repo" | "documentation";
  description: string;
  allowedTargets: string[];
  approvalRequiredFor: string[];
}

export interface EngineeringToolRegistry {
  tools: EngineeringTool[];
}

export type DevelopmentWorkflowStepKind = "intake" | "plan" | "patch" | "verify" | "review" | "summarize" | "memory_reflection";

export interface DevelopmentWorkflow {
  runtimeTaskId: string;
  createdAt: string;
  steps: Array<{
    kind: DevelopmentWorkflowStepKind;
    title: string;
    taskLogEvent: "task_started" | "task_updated" | "task_completed";
  }>;
}

export type DevelopmentTaskStageStatus = "pending" | "in_progress" | "completed" | "blocked";

export interface DevelopmentTaskStage {
  kind: DevelopmentWorkflowStepKind;
  title: string;
  status: DevelopmentTaskStageStatus;
}

export interface EngineeringAgentLoopStatus {
  iterationBudget: {
    max: number;
    used: number;
    remaining: number;
    exhausted: boolean;
  };
  retryState: {
    failedVerificationRetryAttempted: boolean;
    fileMutationRetryAttempted: boolean;
    reviewRetryAttempted: boolean;
  };
  exitReason:
    | "workflow_in_progress"
    | "completed"
    | "failed_verification"
    | "stopped_with_error"
    | "iteration_budget_exhausted";
  nextAction: string;
}

export type EngineeringLoopObservationKind = "verification" | "file_mutation" | "review";
export type EngineeringLoopObservationStatus = "passed" | "failed" | "landed" | "blocked";

export interface EngineeringLoopObservation {
  kind: EngineeringLoopObservationKind;
  signature: string;
  status: EngineeringLoopObservationStatus;
  summary: string;
}

export interface EngineeringLoopGuardrailSummary {
  action: "allow" | "warn";
  code: "ok" | "repeated_failure" | "no_progress";
  count: number;
  signature: string;
  message: string;
  nextAction: string;
}

export interface EngineeringLoopFinalizerSummary {
  completed: boolean;
  abnormal: boolean;
  exitReason: EngineeringAgentLoopStatus["exitReason"] | EngineeringLoopGuardrailSummary["code"];
  message: string;
  nextAction: string;
}

export interface EngineeringBackgroundReviewTrigger {
  shouldTrigger: boolean;
  reason: "engineering_loop_activity_threshold" | "below_threshold";
  activityCount: number;
  threshold: number;
  refs: string[];
  nextAction: string;
}

export interface CodeReviewFindingInput {
  category: "bug" | "regression" | "missing_test" | "risk" | "style";
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line: number;
  message: string;
}

export interface CodeReviewFinding extends CodeReviewFindingInput {
  reference: string;
}

export interface CodeReviewReport {
  findings: CodeReviewFinding[];
}

export interface ReflectEngineeringMemoryInput {
  memoryRoot: string;
  intake: ProjectIntake;
  review: ReviewSummary;
  now: string;
}

export interface ReflectEngineeringMemoryResult {
  projectPath: string;
  decisionPath: string;
  followUpPath: string;
}

export interface EngineeringActionRiskInput {
  kind: "single_file_edit" | "broad_file_edit" | "destructive_command" | "external_mutation";
  target: string;
}

export interface EngineeringActionRisk {
  approvalRequired: boolean;
  riskLevel: "write" | "execute" | "critical";
  reason: string;
}

export interface EngineeringRiskReview extends EngineeringActionRiskInput, EngineeringActionRisk {}

const COMMAND_ORDER: VerificationCommand["kind"][] = ["test", "build", "desktop_build", "lint", "doctor"];
const SCRIPT_BY_KIND: Record<VerificationCommand["kind"], string> = {
  test: "test",
  build: "build",
  desktop_build: "build:desktop",
  lint: "lint",
  doctor: "doctor"
};

export function createDefaultToolRegistry(): EngineeringToolRegistry {
  return {
    tools: [
      {
        id: "file.read",
        category: "file",
        description: "Read project files for planning and review.",
        allowedTargets: ["project_root"],
        approvalRequiredFor: []
      },
      {
        id: "file.edit.controlled",
        category: "file",
        description: "Apply narrow exact replacements inside the project root.",
        allowedTargets: ["project_root"],
        approvalRequiredFor: ["broad_file_edit", "secret_write"]
      },
      {
        id: "command.verify",
        category: "command",
        description: "Run allowlisted verification commands.",
        allowedTargets: ["pnpm test", "pnpm build", "pnpm build:desktop", "pnpm lint", "pnpm doctor"],
        approvalRequiredFor: ["destructive_command"]
      },
      {
        id: "repo.inspect",
        category: "repo",
        description: "Inspect branch and changed files.",
        allowedTargets: ["git status", "git branch"],
        approvalRequiredFor: []
      },
      {
        id: "documentation.write",
        category: "documentation",
        description: "Write requirements, design, changelog, and memory reflection records.",
        allowedTargets: ["memory/operations", "memory/wiki", "docs"],
        approvalRequiredFor: ["external_mutation"]
      }
    ]
  };
}

export function createDevelopmentWorkflow(input: {
  intake: ProjectIntake;
  runtimeTaskId: string;
  now: string;
}): DevelopmentWorkflow {
  return {
    runtimeTaskId: input.runtimeTaskId,
    createdAt: input.now,
    steps: [
      { kind: "intake", title: `Intake: ${input.intake.projectName}`, taskLogEvent: "task_started" },
      { kind: "plan", title: "Prepare requirements, design, and change plan", taskLogEvent: "task_updated" },
      { kind: "patch", title: "Apply focused implementation patch", taskLogEvent: "task_updated" },
      { kind: "verify", title: "Run detected verification commands", taskLogEvent: "task_updated" },
      { kind: "review", title: "Review findings by severity", taskLogEvent: "task_updated" },
      { kind: "summarize", title: "Summarize outcome and residual risks", taskLogEvent: "task_completed" },
      { kind: "memory_reflection", title: "Reflect durable engineering knowledge into memory", taskLogEvent: "task_completed" }
    ]
  };
}

export function summarizeDevelopmentTaskStages(input: {
  intake: ProjectIntake;
  taskStatus: "planned" | "completed" | "failed";
}): DevelopmentTaskStage[] {
  const workflow = createDevelopmentWorkflow({
    intake: input.intake,
    runtimeTaskId: input.intake.id,
    now: input.intake.executionRecord.generatedAt
  });
  return workflow.steps.map((step) => ({
    kind: step.kind,
    title: step.title,
    status: stageStatusForTask(step.kind, input.taskStatus)
  }));
}

function stageStatusForTask(kind: DevelopmentWorkflowStepKind, taskStatus: "planned" | "completed" | "failed"): DevelopmentTaskStageStatus {
  if (taskStatus === "completed") {
    return "completed";
  }
  if (taskStatus === "failed") {
    if (kind === "intake" || kind === "plan" || kind === "patch") {
      return "completed";
    }
    return kind === "verify" ? "blocked" : "pending";
  }
  if (kind === "intake") {
    return "completed";
  }
  return kind === "plan" ? "in_progress" : "pending";
}

export function summarizeDevelopmentAgentLoopStatus(input: {
  intake: ProjectIntake;
  taskStatus: "planned" | "completed" | "failed";
  failedVerification?: FailedVerificationSummary;
  fileMutationRetryAttempted?: boolean;
  reviewRetryAttempted?: boolean;
  maxIterations?: number;
  usedIterations?: number;
}): EngineeringAgentLoopStatus {
  const stages = summarizeDevelopmentTaskStages({
    intake: input.intake,
    taskStatus: input.taskStatus
  });
  const max = input.maxIterations ?? stages.length;
  const used = Math.min(
    max,
    input.usedIterations ??
      stages.filter(
        (stage) => stage.status === "completed" || stage.status === "in_progress" || stage.status === "blocked"
      ).length
  );
  const remaining = Math.max(0, max - used);
  const exhausted = remaining === 0 && input.taskStatus !== "completed";
  const retryState = {
    failedVerificationRetryAttempted: Boolean(input.failedVerification),
    fileMutationRetryAttempted: Boolean(input.fileMutationRetryAttempted),
    reviewRetryAttempted: Boolean(input.reviewRetryAttempted)
  };

  if (exhausted) {
    return {
      iterationBudget: { max, used, remaining, exhausted },
      retryState,
      exitReason: "iteration_budget_exhausted",
      nextAction: "Stop the loop and summarize progress before continuing."
    };
  }
  if (input.taskStatus === "completed") {
    return {
      iterationBudget: { max, used, remaining, exhausted },
      retryState,
      exitReason: "completed",
      nextAction: "No loop action is required."
    };
  }
  if (input.taskStatus === "failed") {
    return {
      iterationBudget: { max, used, remaining, exhausted },
      retryState,
      exitReason: input.failedVerification ? "failed_verification" : "stopped_with_error",
      nextAction: input.failedVerification?.likelyNextAction ?? "Inspect the failed task event before continuing."
    };
  }
  return {
    iterationBudget: { max, used, remaining, exhausted },
    retryState,
    exitReason: "workflow_in_progress",
    nextAction: "Continue the development workflow at the current in-progress stage."
  };
}

export function createCodeReviewReport(input: { findings: CodeReviewFindingInput[] }): CodeReviewReport {
  const categoryRank: Record<CodeReviewFindingInput["category"], number> = {
    bug: 0,
    regression: 1,
    missing_test: 2,
    risk: 3,
    style: 4
  };
  const severityRank: Record<CodeReviewFindingInput["severity"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };
  return {
    findings: input.findings
      .map((finding) => ({
        ...finding,
        reference: `${finding.file}:${finding.line}`
      }))
      .sort(
        (left, right) =>
          categoryRank[left.category] - categoryRank[right.category] ||
          severityRank[left.severity] - severityRank[right.severity] ||
          left.reference.localeCompare(right.reference)
      )
  };
}

export async function reflectEngineeringMemory(
  input: ReflectEngineeringMemoryInput
): Promise<ReflectEngineeringMemoryResult> {
  const decisions = input.review.findings.length > 0 ? input.review.findings.join("; ") : `Review status: ${input.review.status}`;
  const regressions = input.review.verification.failed.join(", ") || "none";
  const followUpTasks = input.review.residualRisks.join("; ") || "none";
  const project = await writeMemoryRecord({
    memoryRoot: input.memoryRoot,
    type: "project",
    title: input.intake.projectName,
    body: [
      `Engineering task: ${input.intake.id}`,
      `Review status: ${input.review.status}`,
      `Verification passed: ${input.review.verification.passed.join(", ") || "none"}`,
      `Verification failed: ${input.review.verification.failed.join(", ") || "none"}`,
      `Follow-up tasks: ${followUpTasks}`
    ].join("\n\n"),
    now: input.now,
    tags: ["engineering", "project"],
    sourceRefs: [input.intake.id],
    approved: true
  });
  const decision = await writeMemoryRecord({
    memoryRoot: input.memoryRoot,
    type: "decision",
    title: `Engineering review summary: ${input.review.status}`,
    body: [
      `Project: ${input.intake.projectName}`,
      `Decisions: ${decisions}`,
      `Regressions: ${regressions}`,
      `Follow-up tasks: ${followUpTasks}`
    ].join("\n\n"),
    now: input.now,
    tags: ["engineering", "review"],
    sourceRefs: [input.intake.id],
    approved: true
  });
  const followUp = await writeMemoryRecord({
    memoryRoot: input.memoryRoot,
    type: "engineering",
    title: `Engineering follow-ups: ${input.intake.projectName}`,
    body: [
      `Project: ${input.intake.projectName}`,
      `Task: ${input.intake.id}`,
      `Decisions: ${decisions}`,
      `Regressions: ${regressions}`,
      `Follow-up tasks: ${followUpTasks}`
    ].join("\n\n"),
    now: input.now,
    tags: ["engineering", "follow_up"],
    sourceRefs: [input.intake.id],
    approved: true
  });
  if (project.status !== "written" || decision.status !== "written" || followUp.status !== "written") {
    throw new Error("engineering_memory_reflection_requires_approval");
  }
  return {
    projectPath: project.path,
    decisionPath: decision.path,
    followUpPath: followUp.path
  };
}

export function assessEngineeringActionRisk(input: EngineeringActionRiskInput): EngineeringActionRisk {
  if (input.kind === "broad_file_edit") {
    return {
      approvalRequired: true,
      riskLevel: "critical",
      reason: `Broad file edit requires approval: ${input.target}`
    };
  }
  if (input.kind === "destructive_command") {
    return {
      approvalRequired: true,
      riskLevel: "critical",
      reason: `Destructive command requires approval: ${input.target}`
    };
  }
  if (input.kind === "external_mutation") {
    return {
      approvalRequired: true,
      riskLevel: "execute",
      reason: `External mutation requires approval: ${input.target}`
    };
  }
  return {
    approvalRequired: false,
    riskLevel: "write",
    reason: `Single controlled file edit allowed: ${input.target}`
  };
}

export function createEngineeringRiskReview(input: EngineeringActionRiskInput): EngineeringRiskReview {
  return {
    ...input,
    ...assessEngineeringActionRisk(input)
  };
}

export function createProjectIntake(input: ProjectIntakeInput): ProjectIntake {
  const idea = input.idea.trim();
  if (!idea) {
    throw new Error("Project intake idea is required.");
  }

  const projectName = input.projectName?.trim() || idea;
  const constraints = input.constraints && input.constraints.length > 0 ? input.constraints : ["Keep secrets out of logs, UI, and commits."];
  const acceptanceCriteria =
    input.acceptanceCriteria && input.acceptanceCriteria.length > 0
      ? input.acceptanceCriteria
      : ["A small vertical slice is implemented with tests.", "Verification commands and outcomes are recorded."];
  const verificationCommands = detectVerificationCommands(input.packageJson ?? {});

  return {
    id: createIntakeId(input.now, projectName),
    requestedBy: input.requestedBy,
    projectName,
    requirementDraft: createRequirementDraft(projectName, input.now, constraints, acceptanceCriteria),
    technicalDesignDraft: createTechnicalDesignDraft(projectName, input.now, verificationCommands),
    changePlan: createChangePlan(projectName, input.repo),
    verificationPlan: {
      commands: verificationCommands
    },
    executionRecord: {
      status: "planned",
      detectedCommands: verificationCommands,
      generatedAt: input.now
    }
  };
}

export function detectVerificationCommands(packageJson: PackageJsonLike): VerificationCommand[] {
  const scripts = packageJson.scripts ?? {};
  return COMMAND_ORDER.flatMap((kind) => {
    const scriptName = SCRIPT_BY_KIND[kind];
    if (!scripts[scriptName]) {
      return [];
    }
    return [
      {
        kind,
        command: `pnpm ${scriptName}`
      }
    ];
  });
}

export function createTestExecutionRecord(input: TestExecutionRecordInput): TestExecutionRecord {
  const startedAt = Date.parse(input.startedAt);
  const completedAt = Date.parse(input.completedAt);
  const durationMs = Number.isFinite(startedAt) && Number.isFinite(completedAt) ? Math.max(0, completedAt - startedAt) : 0;

  return {
    command: input.command,
    status: input.exitCode === 0 ? "passed" : "failed",
    exitCode: input.exitCode,
    durationMs,
    outputSummary: sanitizeExecutionOutput(input.output)
  };
}

export function createFailedVerificationSummary(execution: TestExecutionRecord): FailedVerificationSummary | undefined {
  if (execution.status !== "failed") {
    return undefined;
  }
  return {
    command: execution.command,
    summary: `${execution.command} failed with exit code ${execution.exitCode}.`,
    likelyNextAction: likelyNextActionForFailedVerification(execution),
    outputSummary: execution.outputSummary
  };
}

function likelyNextActionForFailedVerification(execution: TestExecutionRecord): string {
  const command = execution.command;
  const output = execution.outputSummary.toLowerCase();
  if (command.includes("build") || output.includes("error ts")) {
    return `Fix the TypeScript/build error, then rerun ${command}.`;
  }
  if (command.includes("test") || output.includes("expected") || output.includes("failed")) {
    return `Inspect the failing test output, fix the behavior or test fixture, then rerun ${command}.`;
  }
  if (command.includes("doctor")) {
    return `Fix the reported local diagnostic issue, then rerun ${command}.`;
  }
  return `Inspect the failure output, fix the root cause, then rerun ${command}.`;
}

export async function executeAllowedCommand(input: ExecuteAllowedCommandInput): Promise<TestExecutionRecord> {
  const parsed = parseAllowedCommand(input.command);
  if (!parsed) {
    throw new Error(`Command is not allowed for engineering executor: ${input.command}`);
  }

  const execFile = input.execFile ?? defaultExecFile;
  const startedAt = input.now;
  try {
    const result = await execFile(parsed.command, parsed.args, { cwd: input.projectRoot });
    return createTestExecutionRecord({
      command: input.command,
      exitCode: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      output: [result.stdout, result.stderr ?? ""].filter(Boolean).join("\n")
    });
  } catch (error) {
    const failure = normalizeExecFailure(error);
    return createTestExecutionRecord({
      command: input.command,
      exitCode: failure.exitCode,
      startedAt,
      completedAt: new Date().toISOString(),
      output: failure.output
    });
  }
}

export async function createCodexRunnerStatus(input: CreateCodexRunnerStatusInput = {}): Promise<CodexRunnerStatus> {
  const execFile = input.execFile ?? defaultExecFile;
  let cliAvailable = false;
  try {
    await execFile("codex", ["--version"]);
    cliAvailable = true;
  } catch {
    return {
      available: false,
      cli_available: false,
      auth_file_present: false,
      has_access_token: false,
      has_refresh_token: false,
      reason: "missing_cli"
    };
  }

  let authJson: string;
  try {
    authJson = input.authJson ?? (await readFile(input.authFilePath ?? defaultCodexAuthFilePath(), "utf8"));
  } catch {
    return {
      available: false,
      cli_available: cliAvailable,
      auth_file_present: false,
      has_access_token: false,
      has_refresh_token: false,
      reason: "missing_auth"
    };
  }

  try {
    const parsed = JSON.parse(authJson) as Record<string, unknown>;
    const tokens = typeof parsed.tokens === "object" && parsed.tokens ? (parsed.tokens as Record<string, unknown>) : {};
    const hasAccessToken = typeof tokens.access_token === "string" && tokens.access_token.length > 0;
    const hasRefreshToken = typeof tokens.refresh_token === "string" && tokens.refresh_token.length > 0;
    const hasTokens = hasAccessToken || hasRefreshToken;
    return {
      available: cliAvailable && hasTokens,
      cli_available: cliAvailable,
      auth_file_present: true,
      auth_mode: typeof parsed.auth_mode === "string" ? parsed.auth_mode : undefined,
      has_access_token: hasAccessToken,
      has_refresh_token: hasRefreshToken,
      last_refresh: typeof parsed.last_refresh === "string" ? parsed.last_refresh : undefined,
      reason: hasTokens ? undefined : "missing_tokens"
    };
  } catch {
    return {
      available: false,
      cli_available: cliAvailable,
      auth_file_present: true,
      has_access_token: false,
      has_refresh_token: false,
      reason: "invalid_auth"
    };
  }
}

export async function runCodexAgentTask(input: RunCodexAgentTaskInput): Promise<TestExecutionRecord> {
  const execFile = input.execFile ?? defaultExecFile;
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("Codex agent task requires a non-empty prompt.");
  }
  try {
    const result = await execFile("codex", ["exec", "--cd", input.projectRoot, "--json", prompt], {
      cwd: input.projectRoot
    });
    return createTestExecutionRecord({
      command: "codex exec",
      exitCode: 0,
      startedAt: input.now,
      completedAt: new Date().toISOString(),
      output: [result.stdout, result.stderr ?? ""].filter(Boolean).join("\n")
    });
  } catch (error) {
    const failure = normalizeExecFailure(error);
    return createTestExecutionRecord({
      command: "codex exec",
      exitCode: failure.exitCode,
      startedAt: input.now,
      completedAt: new Date().toISOString(),
      output: failure.output
    });
  }
}

export async function applyControlledFileEdit(input: ApplyControlledFileEditInput): Promise<FileEditRecord> {
  const relativePath = normalizeRelativeEditPath(input.projectRoot, input.relativePath);
  if (!input.find) {
    throw new Error("Controlled file edit requires non-empty find text.");
  }
  if (sanitizeExecutionOutput(input.replace) !== input.replace) {
    throw new Error("Controlled file edit replacement must not contain secret-like values.");
  }

  const targetPath = resolve(input.projectRoot, relativePath);
  const current = await readFile(targetPath, "utf8");
  const replacements = countOccurrences(current, input.find);
  if (replacements !== 1) {
    throw new Error(`Controlled file edit requires exactly one match; found ${replacements}.`);
  }

  await writeFile(targetPath, current.replace(input.find, input.replace), "utf8");
  return {
    relativePath,
    status: "applied",
    replacements,
    summary: `Applied exact replacement in ${relativePath}`
  };
}

export function createReviewSummary(input: ReviewSummaryInput): ReviewSummary {
  const failed = input.executions.filter((execution) => execution.status === "failed").map((execution) => execution.command);
  const passed = input.executions.filter((execution) => execution.status === "passed").map((execution) => execution.command);
  const findings = failed.map((command) => `Verification failed: ${command}`);
  const residualRisks = input.repo.dirty ? [`Working tree still has ${input.repo.changedFiles.length} changed file${input.repo.changedFiles.length === 1 ? "" : "s"}.`] : [];

  if (input.executions.length === 0) {
    residualRisks.push("No verification executions were recorded.");
  }

  return {
    status: failed.length === 0 && residualRisks.length === 0 ? "ready_for_review" : "needs_work",
    findings,
    residualRisks,
    verification: {
      passed,
      failed
    }
  };
}

export async function inspectRepository(projectRoot: string, options: RepoInspectionOptions = {}): Promise<RepoSnapshot> {
  const execFile = options.execFile ?? defaultExecFile;

  try {
    const [{ stdout: branchStdout }, { stdout: statusStdout }] = await Promise.all([
      execFile("git", ["-C", projectRoot, "branch", "--show-current"]),
      execFile("git", ["-C", projectRoot, "status", "--short"])
    ]);
    const changedFiles = parseGitStatusFiles(statusStdout);
    return {
      branch: branchStdout.trim() || "detached",
      dirty: changedFiles.length > 0,
      changedFiles
    };
  } catch {
    return {
      branch: "unknown",
      dirty: false,
      changedFiles: []
    };
  }
}

export async function appendProjectIntakeEvent(eventLogPath: string, intake: ProjectIntake): Promise<void> {
  await appendEvent(eventLogPath, {
    id: `event_${intake.id}`,
    time: intake.executionRecord.generatedAt,
    actor: "dore",
    event_type: "task_started",
    entity_type: "task",
    entity_id: intake.id,
    summary: `Engineering intake planned: ${intake.projectName}`,
    risk_level: "write",
    refs: ["engineering_intake"],
    project_name: intake.projectName,
    verification_commands: intake.verificationPlan.commands.map((command) => command.command)
  });
}

export async function appendReviewSummaryEvent(
  eventLogPath: string,
  intake: ProjectIntake,
  review: ReviewSummary
): Promise<void> {
  await appendEvent(eventLogPath, {
    id: `event_${intake.id}_review`,
    time: intake.executionRecord.generatedAt,
    actor: "dore",
    event_type: "task_completed",
    entity_type: "task",
    entity_id: intake.id,
    summary: `Engineering review summary: ${review.status}`,
    risk_level: "write",
    refs: ["engineering_review_summary"],
    review_status: review.status,
    findings: review.findings,
    residual_risks: review.residualRisks,
    verification_passed: review.verification.passed,
    verification_failed: review.verification.failed
  });
}

export async function appendCodeReviewReportEvent(
  eventLogPath: string,
  intake: ProjectIntake,
  report: CodeReviewReport
): Promise<void> {
  await appendEvent(eventLogPath, {
    id: `event_${intake.id}_code_review_report`,
    time: new Date().toISOString(),
    actor: "dore",
    event_type: "task_updated",
    entity_type: "task",
    entity_id: intake.id,
    summary: `Engineering code review report recorded: ${report.findings.length} findings`,
    risk_level: "write",
    refs: ["engineering_code_review_report"],
    review_report: report
  });
}

export async function appendEngineeringRiskReviewEvent(
  eventLogPath: string,
  intake: ProjectIntake,
  review: EngineeringRiskReview
): Promise<void> {
  await appendEvent(eventLogPath, {
    id: `event_${intake.id}_risk_review`,
    time: new Date().toISOString(),
    actor: "dore",
    event_type: "task_updated",
    entity_type: "task",
    entity_id: intake.id,
    summary: `Engineering risk review recorded: ${review.riskLevel} ${review.kind}`,
    risk_level: review.riskLevel,
    refs: ["engineering_risk_review"],
    risk_review: toEngineeringRiskReviewEvent(review)
  });
}

export async function appendEngineeringBackgroundReviewTriggerEvent(
  eventLogPath: string,
  intake: ProjectIntake,
  trigger: EngineeringBackgroundReviewTrigger
): Promise<void> {
  await appendEvent(eventLogPath, {
    id: `event_${intake.id}_background_review_trigger`,
    time: new Date().toISOString(),
    actor: "dore",
    event_type: "task_updated",
    entity_type: "task",
    entity_id: intake.id,
    summary: `Engineering background review triggered: ${trigger.reason}`,
    risk_level: "write",
    refs: ["engineering_background_review", ...trigger.refs],
    background_review_trigger: toEngineeringBackgroundReviewTriggerEvent(trigger)
  });
}

function toEngineeringBackgroundReviewTriggerEvent(
  trigger: EngineeringBackgroundReviewTrigger
): Record<string, string | number | boolean | string[]> {
  return {
    should_trigger: trigger.shouldTrigger,
    reason: trigger.reason,
    activity_count: trigger.activityCount,
    threshold: trigger.threshold,
    refs: trigger.refs,
    next_action: trigger.nextAction
  };
}

function toEngineeringRiskReviewEvent(review: EngineeringRiskReview): Record<string, string | boolean> {
  return {
    kind: review.kind,
    target: review.target,
    approval_required: review.approvalRequired,
    risk_level: review.riskLevel,
    reason: review.reason
  };
}

export async function appendTestExecutionEvent(
  eventLogPath: string,
  intake: ProjectIntake,
  execution: TestExecutionRecord
): Promise<void> {
  const passed = execution.status === "passed";
  const failedVerification = createFailedVerificationSummary(execution);
  await appendEvent(eventLogPath, {
    id: `event_${intake.id}_${slugify(execution.command)}`,
    time: new Date().toISOString(),
    actor: "dore",
    event_type: "task_completed",
    entity_type: "task",
    entity_id: intake.id,
    summary: `Engineering verification ${passed ? "passed" : "failed"}: ${execution.command}`,
    risk_level: "write",
    refs: ["engineering_execution"],
    command: execution.command,
    status: execution.status,
    exit_code: execution.exitCode,
    duration_ms: execution.durationMs,
    output_summary: execution.outputSummary,
    failed_verification: failedVerification ? toFailedVerificationEvent(failedVerification) : undefined
  });
}

export async function appendCodexAgentRunEvent(
  eventLogPath: string,
  intake: ProjectIntake,
  run: TestExecutionRecord
): Promise<void> {
  const passed = run.status === "passed";
  await appendEvent(eventLogPath, {
    id: `event_${intake.id}_codex_${run.status}`,
    time: new Date().toISOString(),
    actor: "dore",
    event_type: passed ? "task_completed" : "task_updated",
    entity_type: "task",
    entity_id: intake.id,
    summary: `Codex agent run ${run.status}: ${run.command}`,
    risk_level: "execute",
    refs: ["codex_agent_run"],
    command: run.command,
    status: run.status,
    exit_code: run.exitCode,
    duration_ms: run.durationMs,
    output_summary: run.outputSummary
  });
}

function toFailedVerificationEvent(summary: FailedVerificationSummary): Record<string, string> {
  return {
    command: summary.command,
    summary: summary.summary,
    likely_next_action: summary.likelyNextAction,
    output_summary: summary.outputSummary
  };
}

export async function appendFileEditEvent(eventLogPath: string, intake: ProjectIntake, edit: FileEditRecord): Promise<void> {
  const mutationProof = createFileMutationProof(edit);
  await appendEvent(eventLogPath, {
    id: `event_${intake.id}_edit_${slugify(edit.relativePath)}`,
    time: new Date().toISOString(),
    actor: "dore",
    event_type: "task_updated",
    entity_type: "task",
    entity_id: intake.id,
    summary: `Engineering file edit applied: ${edit.relativePath}`,
    risk_level: "write",
    refs: ["engineering_file_edit"],
    relative_path: edit.relativePath,
    status: edit.status,
    replacements: edit.replacements,
    edit_summary: sanitizeExecutionOutput(edit.summary),
    mutation_proof: mutationProof
  });
}

export function createFileMutationProof(edit: FileEditRecord): FileMutationProof {
  const landed = edit.status === "applied" && edit.replacements > 0;
  return {
    target: edit.relativePath,
    landed,
    status: edit.status,
    evidence: landed ? `applied ${edit.replacements} exact ${pluralize("replacement", edit.replacements)}` : "mutation not applied"
  };
}

export function createEngineeringLoopGuardrailSummary(input: {
  observations: EngineeringLoopObservation[];
  warnAfter?: number;
}): EngineeringLoopGuardrailSummary {
  const warnAfter = input.warnAfter ?? 2;
  const noProgress = repeatedObservation(input.observations, warnAfter, (observation) => observation.status === "blocked");
  if (noProgress) {
    return {
      action: "warn",
      code: "no_progress",
      count: noProgress.count,
      signature: noProgress.signature,
      message: `No-progress file mutation loop detected for ${noProgress.signature}.`,
      nextAction: "Reread the target and update the edit plan before retrying."
    };
  }
  const repeatedFailure = repeatedObservation(
    input.observations,
    warnAfter,
    (observation) => observation.status === "failed"
  );
  if (repeatedFailure) {
    return {
      action: "warn",
      code: "repeated_failure",
      count: repeatedFailure.count,
      signature: repeatedFailure.signature,
      message: `Repeated ${repeatedFailure.kind} failure detected for ${repeatedFailure.signature}.`,
      nextAction: "Stop retrying the same failure; inspect the latest output and change the patch before retrying."
    };
  }
  return {
    action: "allow",
    code: "ok",
    count: 0,
    signature: "",
    message: "No repeated failure or no-progress loop detected.",
    nextAction: "Continue the current workflow."
  };
}

export function createEngineeringLoopFinalizerSummary(input: {
  loopStatus: EngineeringAgentLoopStatus;
  guardrailSummary?: EngineeringLoopGuardrailSummary;
}): EngineeringLoopFinalizerSummary {
  if (input.guardrailSummary && input.guardrailSummary.action === "warn") {
    return {
      completed: false,
      abnormal: true,
      exitReason: input.guardrailSummary.code,
      message: input.guardrailSummary.message,
      nextAction: input.guardrailSummary.nextAction
    };
  }
  if (input.loopStatus.exitReason === "completed") {
    return {
      completed: true,
      abnormal: false,
      exitReason: "completed",
      message: "Engineering loop completed normally.",
      nextAction: input.loopStatus.nextAction
    };
  }
  if (input.loopStatus.exitReason === "iteration_budget_exhausted") {
    return {
      completed: false,
      abnormal: true,
      exitReason: "iteration_budget_exhausted",
      message: "Engineering loop stopped because the iteration budget was exhausted.",
      nextAction: input.loopStatus.nextAction
    };
  }
  return {
    completed: false,
    abnormal: input.loopStatus.exitReason !== "workflow_in_progress",
    exitReason: input.loopStatus.exitReason,
    message:
      input.loopStatus.exitReason === "workflow_in_progress"
        ? "Engineering loop is still in progress."
        : "Engineering loop stopped before normal completion.",
    nextAction: input.loopStatus.nextAction
  };
}

export function createEngineeringBackgroundReviewTrigger(input: {
  taskId: string;
  observations: EngineeringLoopObservation[];
  threshold?: number;
}): EngineeringBackgroundReviewTrigger {
  const threshold = input.threshold ?? 6;
  const activityCount = input.observations.length;
  const shouldTrigger = activityCount >= threshold;
  return {
    shouldTrigger,
    reason: shouldTrigger ? "engineering_loop_activity_threshold" : "below_threshold",
    activityCount,
    threshold,
    refs: [input.taskId],
    nextAction: shouldTrigger
      ? "Queue a background review of loop progress, guardrails, and memory reflection candidates."
      : "Continue collecting loop activity before background review."
  };
}

export async function persistProjectIntakeDrafts(
  memoryRoot: string,
  intake: ProjectIntake
): Promise<PersistProjectIntakeDraftsResult> {
  const baseDir = join(memoryRoot, "operations", "engineering", intake.id);
  await mkdir(baseDir, { recursive: true });

  const requirementPath = join(baseDir, "requirements.md");
  const technicalDesignPath = join(baseDir, "technical-design.md");
  const changePlanPath = join(baseDir, "change-plan.md");
  const intakeJsonPath = join(baseDir, "intake.json");

  await writeFile(requirementPath, renderDraftMarkdown("Requirements", intake.requirementDraft), "utf8");
  await writeFile(technicalDesignPath, renderDraftMarkdown("Technical Design", intake.technicalDesignDraft), "utf8");
  await writeFile(changePlanPath, renderChangePlanMarkdown(intake), "utf8");
  await writeFile(intakeJsonPath, `${sanitizePersistedJson(intake)}\n`, "utf8");

  return {
    baseDir,
    requirementPath,
    technicalDesignPath,
    changePlanPath,
    intakeJsonPath
  };
}

export async function runEngineeringIntake(input: RunEngineeringIntakeInput): Promise<RunEngineeringIntakeResult> {
  const repo = await inspectRepository(input.projectRoot, { execFile: input.execFile });
  const intake = createProjectIntake({
    idea: input.idea,
    requestedBy: input.requestedBy,
    now: input.now,
    constraints: input.constraints,
    acceptanceCriteria: input.acceptanceCriteria,
    repo,
    packageJson: input.packageJson
  });
  const drafts = await persistProjectIntakeDrafts(input.memoryRoot, intake);
  const eventLogPath = join(input.memoryRoot, "logs", "events", "engineering.jsonl");
  await appendProjectIntakeEvent(eventLogPath, intake);

  return {
    intake,
    drafts,
    eventLogPath
  };
}

function createRequirementDraft(
  title: string,
  generatedAt: string,
  constraints: string[],
  acceptanceCriteria: string[]
): DraftDocument {
  return {
    title,
    generatedAt,
    sections: [
      {
        heading: "Problem",
        body: [`User idea: ${title}`]
      },
      {
        heading: "Users",
        body: ["Primary user: hjhun operating Dore as a local personal AI agent."]
      },
      {
        heading: "Scope",
        body: constraints
      },
      {
        heading: "Acceptance Criteria",
        body: acceptanceCriteria
      }
    ]
  };
}

function createTechnicalDesignDraft(
  title: string,
  generatedAt: string,
  verificationCommands: VerificationCommand[]
): DraftDocument {
  return {
    title,
    generatedAt,
    sections: [
      {
        heading: "Architecture",
        body: ["Prefer existing Dore packages and daemon contracts before adding new boundaries."]
      },
      {
        heading: "Data Model",
        body: ["Represent user-visible work as typed records that can be logged without raw secrets."]
      },
      {
        heading: "Testing",
        body:
          verificationCommands.length > 0
            ? verificationCommands.map((command) => command.command)
            : ["Add the narrowest deterministic unit test first, then broaden verification as risk grows."]
      }
    ]
  };
}

function createChangePlan(title: string, repo: RepoSnapshot | undefined): ChangePlan {
  const repoState = repo
    ? `Repo branch ${repo.branch}; dirty=${repo.dirty}; changed_files=${repo.changedFiles.length}.`
    : "Repo state was not supplied.";

  return {
    summary: `Plan a small verified change for: ${title}`,
    steps: [
      `Inspect current repo state. ${repoState}`,
      "Write or update failing tests for the target behavior.",
      "Implement the smallest coherent slice that satisfies the tests.",
      "Run detected verification commands and record the result."
    ]
  };
}

function createIntakeId(now: string, title: string): string {
  const datePrefix = now.slice(0, 10).replaceAll("-", "_");
  return `intake_${datePrefix}_${slugify(title)}`;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "untitled";
}

function sanitizeExecutionOutput(output: string): string {
  return output
    .replace(/\b(OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|TELEGRAM_BOT_TOKEN)=\S+/g, "$1=<redacted>")
    .replace(/\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY))=\S+/g, "$1=<redacted>")
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "<redacted>");
}

function defaultCodexAuthFilePath(): string {
  const codexHome = process.env.CODEX_HOME || (process.env.HOME ? join(process.env.HOME, ".codex") : ".codex");
  return join(codexHome, "auth.json");
}

function renderDraftMarkdown(label: string, draft: DraftDocument): string {
  const lines = [`# ${label} - ${sanitizeExecutionOutput(draft.title)}`, "", `Generated: ${draft.generatedAt}`, ""];
  for (const section of draft.sections) {
    lines.push(`## ${section.heading}`, "");
    for (const item of section.body) {
      lines.push(`- ${sanitizeExecutionOutput(item)}`);
    }
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderChangePlanMarkdown(intake: ProjectIntake): string {
  return [
    `# Change Plan - ${sanitizeExecutionOutput(intake.projectName)}`,
    "",
    `Generated: ${intake.executionRecord.generatedAt}`,
    "",
    `Summary: ${sanitizeExecutionOutput(intake.changePlan.summary)}`,
    "",
    "## Steps",
    "",
    ...intake.changePlan.steps.map((step, index) => `${index + 1}. ${sanitizeExecutionOutput(step)}`),
    "",
    "## Verification",
    "",
    ...intake.verificationPlan.commands.map((command) => `- ${command.command}`)
  ].join("\n");
}

function sanitizePersistedJson(value: unknown): string {
  return sanitizeExecutionOutput(JSON.stringify(value, null, 2));
}

function normalizeExecFailure(error: unknown): { exitCode: number; output: string } {
  const fallbackMessage = error instanceof Error ? error.message : String(error);
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const exitCode = typeof record.code === "number" ? record.code : 1;
  const output = [record.stdout, record.stderr, fallbackMessage]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");

  return {
    exitCode,
    output
  };
}

function normalizeRelativeEditPath(projectRoot: string, requestedPath: string): string {
  const root = resolve(projectRoot);
  const target = resolve(root, requestedPath);
  const relativePath = relative(root, target);
  if (!requestedPath.trim() || relativePath === "" || relativePath.startsWith("..") || resolve(root, relativePath) !== target) {
    throw new Error("Controlled file edit path must stay inside the project root.");
  }
  return relativePath;
}

function countOccurrences(value: string, needle: string): number {
  let count = 0;
  let offset = 0;
  while (offset < value.length) {
    const index = value.indexOf(needle, offset);
    if (index === -1) {
      return count;
    }
    count += 1;
    offset = index + needle.length;
  }
  return count;
}

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

function repeatedObservation(
  observations: EngineeringLoopObservation[],
  warnAfter: number,
  predicate: (observation: EngineeringLoopObservation) => boolean
): { kind: EngineeringLoopObservationKind; signature: string; count: number } | null {
  const counts = new Map<string, { kind: EngineeringLoopObservationKind; signature: string; count: number }>();
  for (const observation of observations) {
    if (!predicate(observation)) {
      continue;
    }
    const key = `${observation.kind}:${observation.signature}`;
    const current = counts.get(key) ?? {
      kind: observation.kind,
      signature: observation.signature,
      count: 0
    };
    current.count += 1;
    if (current.count >= warnAfter) {
      return current;
    }
    counts.set(key, current);
  }
  return null;
}

async function defaultExecFile(command: string, args: string[], options?: { cwd?: string }): Promise<ExecFileResult> {
  const { stdout, stderr } = await execFileAsync(command, args, options);
  return {
    stdout: stdout.toString(),
    stderr: stderr.toString()
  };
}

function parseAllowedCommand(command: string): { command: string; args: string[] } | null {
  const normalized = command.trim().replace(/\s+/g, " ");
  const allowed: Record<string, string[]> = {
    "pnpm test": ["test"],
    "pnpm build": ["build"],
    "pnpm build:desktop": ["build:desktop"],
    "pnpm lint": ["lint"],
    "pnpm doctor": ["doctor"]
  };
  const args = allowed[normalized];
  return args ? { command: "pnpm", args } : null;
}

function parseGitStatusFiles(status: string): string[] {
  return status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .map((file) => {
      const renameSeparator = " -> ";
      return file.includes(renameSeparator) ? file.split(renameSeparator).at(-1) ?? file : file;
    });
}
