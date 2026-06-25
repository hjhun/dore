import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateDaemonHealth, formatHealthReport, type HealthReport } from "./health.js";

export interface RunDoctorInput {
  projectRoot?: string;
  env?: Record<string, string | undefined>;
  stdout?: (line: string) => void;
}

export interface RunDoctorResult {
  report: HealthReport;
  exitCode: number;
}

export async function runDoctor(input: RunDoctorInput = {}): Promise<RunDoctorResult> {
  const env = input.env ?? process.env;
  const report = evaluateDaemonHealth({
    projectRoot: resolve(input.projectRoot ?? env.DORE_PROJECT_ROOT ?? "."),
    env
  });
  const write = input.stdout ?? console.log;
  for (const line of formatHealthReport(report)) {
    write(line);
  }
  return {
    report,
    exitCode: report.status === "failed" ? 1 : 0
  };
}

const isDirectRun = process.argv[1] ? fileURLToPath(import.meta.url) === resolve(process.argv[1]) : false;

if (isDirectRun) {
  const result = await runDoctor();
  process.exitCode = result.exitCode;
}
