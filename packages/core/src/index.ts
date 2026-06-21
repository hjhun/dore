import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { EventLogRecordSchema, type EventLogRecord } from "../../contracts/src/index.js";

const FORBIDDEN_KEYS = new Set(["secret", "password", "token", "api_key", "access_token", "refresh_token"]);

function assertNoDirectSecrets(value: unknown): void {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(`Event log payload contains forbidden secret-like field: ${key}`);
    }
    assertNoDirectSecrets(child);
  }
}

export async function appendEvent(path: string, record: EventLogRecord): Promise<void> {
  assertNoDirectSecrets(record);
  const parsed = EventLogRecordSchema.parse(record);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(parsed)}\n`, { flag: "a" });
}

