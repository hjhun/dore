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
