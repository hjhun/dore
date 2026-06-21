import { resolve } from "node:path";
import { runManualBriefing } from "../../../packages/briefing/src/index.js";

const memoryRoot = resolve(nonEmptyEnv("DORE_MEMORY_ROOT", "memory"));
const projectRoot = resolve(nonEmptyEnv("DORE_PROJECT_ROOT", "."));

const result = await runManualBriefing({
  memoryRoot,
  projectRoot,
  env: process.env
});

console.log(`briefing markdown: ${result.markdownPath}`);
console.log(`briefing dashboard: ${result.jsonPath}`);
console.log(`briefing usage: ${result.usagePath}`);

function nonEmptyEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}
