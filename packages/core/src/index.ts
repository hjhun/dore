import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { join } from "node:path";
import {
  ApprovalRequestSchema,
  EventLogRecordSchema,
  TaskSchema,
  type ApprovalRequest,
  type EventLogRecord,
  type Task
} from "../../contracts/src/index.js";

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
  await atomicAppendJsonLine(path, parsed);
}

export async function atomicWriteJsonFile(path: string, value: unknown): Promise<string> {
  await atomicWriteTextFile(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

export async function atomicAppendJsonLine(path: string, value: unknown): Promise<string> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`, { flag: "a" });
  return path;
}

export function runtimeTasksPath(memoryRoot: string): string {
  return join(memoryRoot, "data", "runtime", "tasks.json");
}

export function runtimeApprovalsPath(memoryRoot: string): string {
  return join(memoryRoot, "data", "runtime", "approvals.json");
}

export function runtimeEventLogPath(memoryRoot: string): string {
  return join(memoryRoot, "logs", "events", "runtime.jsonl");
}

export async function loadRuntimeTasks(memoryRoot: string): Promise<Task[]> {
  return readRuntimeArray(runtimeTasksPath(memoryRoot), TaskSchema.array());
}

export async function saveRuntimeTasks(memoryRoot: string, tasks: Task[]): Promise<string> {
  const path = runtimeTasksPath(memoryRoot);
  const parsed = TaskSchema.array().parse(tasks);
  return atomicWriteJsonFile(path, parsed);
}

export async function loadRuntimeApprovals(memoryRoot: string): Promise<ApprovalRequest[]> {
  return readRuntimeArray(runtimeApprovalsPath(memoryRoot), ApprovalRequestSchema.array());
}

export async function saveRuntimeApprovals(memoryRoot: string, approvals: ApprovalRequest[]): Promise<string> {
  const path = runtimeApprovalsPath(memoryRoot);
  const parsed = ApprovalRequestSchema.array().parse(approvals);
  return atomicWriteJsonFile(path, parsed);
}

export function createRuntimeTask(input: {
  id: string;
  title: string;
  type: Task["type"];
  priority: Task["priority"];
  requestedBy: Task["requested_by"];
  sourceChannel: Task["source_channel"];
  riskLevel: Task["risk_level"];
  approvalState: Task["approval_state"];
  now: string;
  status?: Task["status"];
  inputsRef?: string;
  outputsRef?: string;
}): Task {
  return TaskSchema.parse({
    id: input.id,
    type: input.type,
    title: input.title,
    status: input.status ?? "queued",
    priority: input.priority,
    created_at: input.now,
    updated_at: input.now,
    requested_by: input.requestedBy,
    source_channel: input.sourceChannel,
    risk_level: input.riskLevel,
    approval_state: input.approvalState,
    inputs_ref: input.inputsRef,
    outputs_ref: input.outputsRef
  });
}

export function cancelRuntimeTask(task: Task, input: { now: string; reason?: string }): Task {
  return TaskSchema.parse({
    ...task,
    status: "cancelled",
    updated_at: input.now,
    error: input.reason
      ? {
          code: "cancelled_by_user",
          message: input.reason
        }
      : task.error
  });
}

export function createApprovalRequest(input: {
  id: string;
  taskId: string;
  title: string;
  summaryForUser: string;
  riskLevel: ApprovalRequest["risk_level"];
  requestedAction: ApprovalRequest["requested_action"];
  createdAt: string;
  expiresAt: string;
  auditRefs?: string[];
}): ApprovalRequest {
  return ApprovalRequestSchema.parse({
    id: input.id,
    task_id: input.taskId,
    title: input.title,
    summary_for_user: input.summaryForUser,
    risk_level: input.riskLevel,
    requested_action: input.requestedAction,
    created_at: input.createdAt,
    expires_at: input.expiresAt,
    state: "pending",
    audit_refs: input.auditRefs ?? []
  });
}

export function decideApprovalRequest(
  approval: ApprovalRequest,
  input: { decision: "approved" | "rejected"; now: string; reason?: string }
): ApprovalRequest {
  return ApprovalRequestSchema.parse({
    ...approval,
    state: input.decision,
    decision: {
      decided_at: input.now,
      decided_by: "user",
      reason: input.reason
    }
  });
}

async function readRuntimeArray<T>(path: string, schema: { parse: (value: unknown) => T[] }): Promise<T[]> {
  try {
    return schema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return [];
  }
}

async function atomicWriteTextFile(path: string, text: string): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  const tmpPath = join(dir, `.${basename(path)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`);
  try {
    await writeFile(tmpPath, text, "utf8");
    await rename(tmpPath, path);
  } catch (error) {
    await unlink(tmpPath).catch(() => undefined);
    throw error;
  }
}
