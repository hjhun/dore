import { execFile as nodeExecFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { appendEvent } from "../../core/src/index.js";

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

export interface FileEditRecord {
  relativePath: string;
  status: "applied";
  replacements: number;
  summary: string;
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

export interface ApplyControlledFileEditInput {
  projectRoot: string;
  relativePath: string;
  find: string;
  replace: string;
}

const COMMAND_ORDER: VerificationCommand["kind"][] = ["test", "build", "desktop_build", "lint", "doctor"];
const SCRIPT_BY_KIND: Record<VerificationCommand["kind"], string> = {
  test: "test",
  build: "build",
  desktop_build: "build:desktop",
  lint: "lint",
  doctor: "doctor"
};

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

export async function appendTestExecutionEvent(
  eventLogPath: string,
  intake: ProjectIntake,
  execution: TestExecutionRecord
): Promise<void> {
  const passed = execution.status === "passed";
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
    output_summary: execution.outputSummary
  });
}

export async function appendFileEditEvent(eventLogPath: string, intake: ProjectIntake, edit: FileEditRecord): Promise<void> {
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
    edit_summary: sanitizeExecutionOutput(edit.summary)
  });
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
