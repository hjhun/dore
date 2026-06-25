import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessBrokerConnectorInputPacket,
  loadBrokerConnectorInputPacketFile,
  type BrokerConnectorReadiness
} from "../../../packages/trading/src/index.js";

export interface RunM16BrokerInputCheckResult {
  exitCode: 0 | 1;
  summary: string;
  readiness: BrokerConnectorReadiness;
}

export function resolveM16InputPacketPath(argv: string[], env: NodeJS.ProcessEnv): string | null {
  const fromArgs = argv[2]?.trim();
  if (fromArgs) {
    return fromArgs;
  }
  const fromEnv = env.DORE_M16_INPUT_PACKET?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : null;
}

export async function runM16BrokerInputCheck(input: { packetPath: string }): Promise<RunM16BrokerInputCheckResult> {
  const packet = await loadBrokerConnectorInputPacketFile(input.packetPath);
  const readiness = assessBrokerConnectorInputPacket(packet);
  const summary = [
    `M16 broker input: ${readiness.status}`,
    ...readiness.blocked_reasons.map((reason) => `blocked: ${reason}`)
  ].join("\n");

  return {
    exitCode: readiness.can_start_m16 ? 0 : 1,
    summary,
    readiness
  };
}

async function main(): Promise<void> {
  const packetPath = resolveM16InputPacketPath(process.argv, process.env);
  if (!packetPath) {
    console.error("M16 broker input packet path is required. Pass a file path or set DORE_M16_INPUT_PACKET.");
    process.exitCode = 1;
    return;
  }

  try {
    const result = await runM16BrokerInputCheck({
      packetPath: resolve(packetPath)
    });
    const writer = result.exitCode === 0 ? console.log : console.error;
    writer(result.summary);
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] ? fileURLToPath(import.meta.url) === resolve(process.argv[1]) : false;

if (isDirectRun) {
  await main();
}
