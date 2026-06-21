import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runEngineeringIntake, type PackageJsonLike } from "../../../packages/engineering/src/index.js";

export function resolveEngineeringIntakeIdea(argv: string[], env: NodeJS.ProcessEnv): string | null {
  const fromArgs = argv.slice(2).join(" ").trim();
  if (fromArgs) {
    return fromArgs;
  }

  const fromEnv = env.DORE_ENGINEERING_IDEA?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : null;
}

async function main(): Promise<void> {
  const idea = resolveEngineeringIntakeIdea(process.argv, process.env);
  if (!idea) {
    console.error("engineering intake idea is required. Pass it as arguments or set DORE_ENGINEERING_IDEA.");
    process.exitCode = 1;
    return;
  }

  const memoryRoot = resolve(nonEmptyEnv("DORE_MEMORY_ROOT", "memory"));
  const projectRoot = resolve(nonEmptyEnv("DORE_PROJECT_ROOT", "."));
  const packageJson = await readPackageJson(projectRoot);
  const result = await runEngineeringIntake({
    idea,
    requestedBy: nonEmptyEnv("DORE_REQUESTED_BY", "hjhun"),
    now: process.env.DORE_NOW ?? new Date().toISOString(),
    memoryRoot,
    projectRoot,
    packageJson
  });

  console.log(`engineering intake: ${result.intake.id}`);
  console.log(`requirements: ${result.drafts.requirementPath}`);
  console.log(`technical design: ${result.drafts.technicalDesignPath}`);
  console.log(`change plan: ${result.drafts.changePlanPath}`);
  console.log(`event log: ${result.eventLogPath}`);
}

async function readPackageJson(projectRoot: string): Promise<PackageJsonLike> {
  try {
    return JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8")) as PackageJsonLike;
  } catch {
    return {};
  }
}

function nonEmptyEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}

const isDirectRun = process.argv[1] ? fileURLToPath(import.meta.url) === resolve(process.argv[1]) : false;

if (isDirectRun) {
  await main();
}
