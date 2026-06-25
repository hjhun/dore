import { readFileSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { ApprovalRequest } from "../../contracts/src/index.js";

export interface MemoryBootstrapResult {
  root: string;
  createdPaths: string[];
}

export async function bootstrapMemory(root = "memory"): Promise<MemoryBootstrapResult> {
  const dirs = [
    "raw",
    "raw/inbox",
    "raw/market",
    "raw/broker",
    "raw/news",
    "raw/projects",
    "wiki",
    "wiki/profile",
    "wiki/topics",
    "wiki/decisions",
    "wiki/routines",
    "wiki/projects",
    "wiki/trading",
    "wiki/engineering",
    "operations",
    "logs",
    "logs/daily",
    "logs/trading",
    "logs/usage"
  ];
  const createdPaths: string[] = [];

  for (const dir of dirs) {
    const path = join(root, dir);
    await mkdir(path, { recursive: true });
    createdPaths.push(path);
  }

  const indexPath = join(root, "wiki", "index.md");
  await writeFile(indexPath, "# Dore Memory Index\n\n", { flag: "a" });
  createdPaths.push(indexPath);

  return { root, createdPaths };
}

export type MemoryRecordType = "profile" | "project" | "topic" | "decision" | "routine" | "trading" | "engineering" | "log";
export type MemorySensitivity = "public" | "personal" | "sensitive" | "secret_ref";

export interface MemoryRecordInput {
  memoryRoot: string;
  type: MemoryRecordType;
  title: string;
  body: string;
  now: string;
  id?: string;
  tags?: string[];
  sourceRefs?: string[];
  sensitivity?: MemorySensitivity;
  owner?: "user" | "dore";
  rawSource?: string;
  approved?: boolean;
}

export type MemoryRecordWriteResult =
  | {
      status: "written";
      path: string;
      rawPath?: string;
      record: {
        title: string;
        path: string;
        type: MemoryRecordType;
        status: "active";
      };
    }
  | {
      status: "approval_required";
      approvalRequest: ApprovalRequest;
      targetPath: string;
    };

export interface MemorySearchResult {
  title: string;
  path: string;
  type: string;
  status: string;
  updatedAt?: string;
  sourceRefs?: string[];
  stale?: boolean;
  score?: number;
}

export interface MemoryQualityRecord {
  title: string;
  path: string;
  type: string;
  status: string;
  updatedAt?: string;
  sourceRefs: string[];
  stale: boolean;
}

export interface DuplicateMemorySuggestion {
  id: string;
  relation: "possible_duplicate";
  suggestedAction: "merge_or_supersede";
  records: MemoryQualityRecord[];
}

export interface StaleMemoryReviewItem extends MemoryQualityRecord {
  lastSeenAt?: string;
}

export interface ConflictMemoryReviewItem extends MemoryQualityRecord {
  conflicts: string[];
}

export interface MemoryQualityReview {
  duplicateSuggestions: DuplicateMemorySuggestion[];
  staleQueue: StaleMemoryReviewItem[];
  conflictQueue: ConflictMemoryReviewItem[];
}

export async function writeMemoryRecord(input: MemoryRecordInput): Promise<MemoryRecordWriteResult> {
  await bootstrapMemory(input.memoryRoot);
  const id = input.id ?? slugify(input.title);
  const targetPath = recordPath(input.memoryRoot, input.type, id, input.now);
  const sensitivity = input.sensitivity ?? "personal";
  if ((sensitivity === "sensitive" || sensitivity === "secret_ref") && !input.approved) {
    return {
      status: "approval_required",
      targetPath,
      approvalRequest: createMemoryApproval(input, targetPath)
    };
  }

  let rawPath: string | undefined;
  const sourceRefs = [...(input.sourceRefs ?? [])];
  if (input.rawSource) {
    rawPath = join(input.memoryRoot, "raw", "inbox", `${id}.md`);
    await mkdir(dirname(rawPath), { recursive: true });
    await writeFile(rawPath, `${input.rawSource.trim()}\n`, "utf8");
    sourceRefs.push(relative(input.memoryRoot, rawPath));
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(
    targetPath,
    renderMemoryMarkdown({
      type: input.type,
      title: input.title,
      body: input.body,
      createdAt: input.now,
      updatedAt: input.now,
      status: "active",
      tags: input.tags ?? [],
      sourceRefs,
      sensitivity,
      owner: input.owner ?? "dore"
    }),
    "utf8"
  );
  await updateMemoryIndex(input.memoryRoot);
  return {
    status: "written",
    path: targetPath,
    rawPath,
    record: {
      title: input.title,
      path: targetPath,
      type: input.type,
      status: "active"
    }
  };
}

export async function updateMemoryRecord(
  input: Omit<MemoryRecordInput, "type"> & { previousPath: string }
): Promise<Extract<MemoryRecordWriteResult, { status: "written" }>> {
  const previousText = await readFile(input.previousPath, "utf8");
  const type = frontmatterValue(previousText, "type") as MemoryRecordType | null;
  if (!type) {
    throw new Error("memory_record_type_missing");
  }
  await markMemoryRecordState({
    path: input.previousPath,
    now: input.now,
    status: "superseded"
  });
  const written = await writeMemoryRecord({
    ...input,
    type,
    id: input.id ?? `${slugify(input.title)}-${compactTimestamp(input.now)}`,
    approved: input.approved ?? true
  });
  if (written.status !== "written") {
    throw new Error("memory_update_requires_approval");
  }
  await appendSupersedes(written.path, relative(input.memoryRoot, input.previousPath));
  await updateMemoryIndex(input.memoryRoot);
  return written;
}

export async function markMemoryRecordState(input: {
  path: string;
  now: string;
  status?: "active" | "archived" | "superseded" | "draft";
  stale?: boolean;
  conflict?: string;
}): Promise<void> {
  let text = await readFile(input.path, "utf8");
  if (input.status) {
    text = replaceFrontmatterValue(text, "status", input.status);
  }
  text = replaceFrontmatterValue(text, "updated_at", input.now);
  if (input.stale) {
    text = upsertFrontmatterValue(text, "stale", "true");
    text = upsertFrontmatterValue(text, "stale_at", input.now);
  }
  if (input.conflict && !text.includes("## Conflicts")) {
    text = `${text.trim()}\n\n## Conflicts\n\n- ${input.conflict}\n`;
  } else if (input.conflict) {
    text = `${text.trim()}\n- ${input.conflict}\n`;
  }
  await writeFile(input.path, text, "utf8");
}

export async function searchMemoryIndex(
  memoryRoot: string,
  query: string,
  options: { ranked?: boolean } = {}
): Promise<MemorySearchResult[]> {
  if (options.ranked) {
    return rankedMemorySearch(memoryRoot, query);
  }

  const indexPath = join(memoryRoot, "wiki", "index.md");
  let text = "";
  try {
    text = await readFile(indexPath, "utf8");
  } catch {
    return [];
  }
  const needle = query.toLowerCase();
  return text
    .split("\n")
    .filter((line) => line.startsWith("- ["))
    .map(parseIndexLine)
    .filter((entry): entry is MemorySearchResult => Boolean(entry))
    .filter((entry) => `${entry.title} ${entry.path}`.toLowerCase().includes(needle) || readCachedBody(memoryRoot, entry.path).includes(needle));
}

export async function reviewMemoryQuality(memoryRoot: string): Promise<MemoryQualityReview> {
  const records = await collectMemoryQualityRecords(memoryRoot);
  return {
    duplicateSuggestions: createDuplicateSuggestions(records),
    staleQueue: records
      .filter((record) => record.stale)
      .map((record) => ({
        ...stripInternalMemoryFields(record),
        lastSeenAt: record.updatedAt
      })),
    conflictQueue: records
      .map((record) => ({
        ...stripInternalMemoryFields(record),
        conflicts: extractConflictNotes(record.body)
      }))
      .filter((record) => record.conflicts.length > 0)
  };
}

export async function writeOperationalMemory(input: {
  memoryRoot: string;
  activeContext: string;
  tasks: string[];
  reminders: string[];
  openQuestions: string[];
  approvals: string[];
  now: string;
}): Promise<void> {
  await bootstrapMemory(input.memoryRoot);
  await writeOperationFile(input.memoryRoot, "active_context.md", [`# Active Context`, "", input.activeContext, "", `Updated: ${input.now}`]);
  await writeOperationFile(input.memoryRoot, "tasks.md", ["# Tasks", "", ...input.tasks.map((item) => `- ${item}`)]);
  await writeOperationFile(input.memoryRoot, "reminders.md", ["# Reminders", "", ...input.reminders.map((item) => `- ${item}`)]);
  await writeOperationFile(input.memoryRoot, "open_questions.md", ["# Open Questions", "", ...input.openQuestions.map((item) => `- ${item}`)]);
  await writeOperationFile(input.memoryRoot, "approvals.md", ["# Approvals", "", ...input.approvals.map((item) => `- ${item}`)]);
}

async function writeOperationFile(memoryRoot: string, file: string, lines: string[]): Promise<void> {
  const path = join(memoryRoot, "operations", file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${lines.join("\n").trim()}\n`, "utf8");
}

async function updateMemoryIndex(memoryRoot: string): Promise<void> {
  const wikiRoot = join(memoryRoot, "wiki");
  const entries = await collectWikiEntries(memoryRoot, wikiRoot);
  const lines = [
    "# Dore Memory Index",
    "",
    ...entries.map((entry) => `- [${entry.title}](${entry.path}) type=${entry.type} status=${entry.status}`)
  ];
  await writeFile(join(wikiRoot, "index.md"), `${lines.join("\n")}\n`, "utf8");
}

async function collectWikiEntries(memoryRoot: string, dir: string): Promise<MemorySearchResult[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const result: MemorySearchResult[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await collectWikiEntries(memoryRoot, path)));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "index.md") {
      continue;
    }
    const text = await readFile(path, "utf8");
    result.push({
      title: frontmatterValue(text, "title") ?? entry.name.replace(/\.md$/, ""),
      path: relative(memoryRoot, path),
      type: frontmatterValue(text, "type") ?? "unknown",
      status: frontmatterValue(text, "status") ?? "unknown"
    });
  }
  return result.sort((left, right) => left.path.localeCompare(right.path));
}

interface MemoryQualityRecordInternal extends MemoryQualityRecord {
  body: string;
  duplicateKey: string;
}

async function rankedMemorySearch(memoryRoot: string, query: string): Promise<MemorySearchResult[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  const records = await collectMemoryQualityRecords(memoryRoot);
  return records
    .map((record) => ({
      record,
      score: scoreMemorySearchRecord(record, needle)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return (right.record.updatedAt ?? "").localeCompare(left.record.updatedAt ?? "");
    })
    .map(({ record, score }) => ({
      title: record.title,
      path: record.path,
      type: record.type,
      status: record.status,
      updatedAt: record.updatedAt,
      sourceRefs: record.sourceRefs,
      stale: record.stale,
      score
    }));
}

async function collectMemoryQualityRecords(memoryRoot: string): Promise<MemoryQualityRecordInternal[]> {
  return collectMemoryQualityRecordsInDir(memoryRoot, join(memoryRoot, "wiki"));
}

async function collectMemoryQualityRecordsInDir(memoryRoot: string, dir: string): Promise<MemoryQualityRecordInternal[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const records: MemoryQualityRecordInternal[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      records.push(...(await collectMemoryQualityRecordsInDir(memoryRoot, path)));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "index.md") {
      continue;
    }
    const text = await readFile(path, "utf8");
    const title = frontmatterValue(text, "title") ?? entry.name.replace(/\.md$/, "");
    const body = markdownBody(text);
    records.push({
      title,
      path: relative(memoryRoot, path),
      type: frontmatterValue(text, "type") ?? "unknown",
      status: frontmatterValue(text, "status") ?? "unknown",
      updatedAt: frontmatterValue(text, "stale_at") ?? frontmatterValue(text, "updated_at") ?? undefined,
      sourceRefs: frontmatterList(text, "source_refs"),
      stale: frontmatterValue(text, "stale") === "true",
      body,
      duplicateKey: duplicateKey(title, body)
    });
  }
  return records.sort((left, right) => left.path.localeCompare(right.path));
}

function createDuplicateSuggestions(records: MemoryQualityRecordInternal[]): DuplicateMemorySuggestion[] {
  const groups = new Map<string, MemoryQualityRecordInternal[]>();
  for (const record of records.filter((candidate) => candidate.status === "active")) {
    if (!record.duplicateKey) {
      continue;
    }
    groups.set(record.duplicateKey, [...(groups.get(record.duplicateKey) ?? []), record]);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      id: `duplicate_${slugify(key)}`,
      relation: "possible_duplicate",
      suggestedAction: "merge_or_supersede",
      records: group.map(stripInternalMemoryFields)
    }));
}

function scoreMemorySearchRecord(record: MemoryQualityRecordInternal, needle: string): number {
  let score = 0;
  if (record.title.toLowerCase().includes(needle)) {
    score += 8;
  }
  if (record.path.toLowerCase().includes(needle)) {
    score += 3;
  }
  if (record.body.toLowerCase().includes(needle)) {
    score += 2;
  }
  if (record.status === "active") {
    score += 5;
  }
  if (record.type === "project" || record.type === "decision") {
    score += 2;
  }
  if (record.sourceRefs.length > 0) {
    score += 2;
  }
  if (record.stale || record.status === "superseded" || record.status === "archived") {
    score -= 6;
  }
  return score;
}

function stripInternalMemoryFields(record: MemoryQualityRecordInternal): MemoryQualityRecord {
  return {
    title: record.title,
    path: record.path,
    type: record.type,
    status: record.status,
    updatedAt: record.updatedAt,
    sourceRefs: record.sourceRefs,
    stale: record.stale
  };
}

function recordPath(memoryRoot: string, type: MemoryRecordType, id: string, now: string): string {
  if (type === "log") {
    return join(memoryRoot, "logs", "daily", `${id || now.slice(0, 10)}.md`);
  }
  return join(memoryRoot, "wiki", directoryForType(type), `${id}.md`);
}

function directoryForType(type: MemoryRecordType): string {
  if (type === "profile") {
    return "profile";
  }
  if (type === "project") {
    return "projects";
  }
  return `${type}s`;
}

function renderMemoryMarkdown(input: {
  type: MemoryRecordType;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "archived" | "superseded" | "draft";
  tags: string[];
  sourceRefs: string[];
  sensitivity: MemorySensitivity;
  owner: "user" | "dore";
}): string {
  return [
    "---",
    `type: ${input.type}`,
    `title: ${input.title}`,
    `created_at: ${input.createdAt}`,
    `updated_at: ${input.updatedAt}`,
    `status: ${input.status}`,
    `tags: [${input.tags.join(", ")}]`,
    "source_refs:",
    ...input.sourceRefs.map((ref) => `  - ${ref}`),
    `sensitivity: ${input.sensitivity}`,
    `owner: ${input.owner}`,
    "---",
    "",
    `# ${input.title}`,
    "",
    input.body.trim(),
    ""
  ].join("\n");
}

function createMemoryApproval(input: MemoryRecordInput, targetPath: string): ApprovalRequest {
  const now = input.now;
  const id = `approval_memory_${slugify(input.title)}`;
  return {
    id,
    task_id: `memory_${slugify(input.title).replaceAll("-", "_")}`,
    title: "Approve sensitive memory write",
    summary_for_user: `Dore wants to persist sensitive memory: ${input.title}`,
    risk_level: "write",
    requested_action: {
      kind: "file_write",
      target: targetPath,
      dry_run_available: true,
      reversible: true
    },
    created_at: now,
    expires_at: new Date(new Date(now).getTime() + 60 * 60 * 1000).toISOString(),
    state: "pending",
    audit_refs: []
  };
}

async function appendSupersedes(path: string, previousRef: string): Promise<void> {
  const text = await readFile(path, "utf8");
  await writeFile(path, upsertFrontmatterValue(text, "supersedes", previousRef), "utf8");
}

function parseIndexLine(line: string): MemorySearchResult | null {
  const match = line.match(/^- \[([^\]]+)\]\(([^)]+)\) type=([^\s]+) status=([^\s]+)/);
  if (!match) {
    return null;
  }
  return {
    title: match[1] ?? "",
    path: match[2] ?? "",
    type: match[3] ?? "",
    status: match[4] ?? ""
  };
}

function readCachedBody(memoryRoot: string, path: string): string {
  try {
    return readFileSync(join(memoryRoot, path), "utf8").toLowerCase();
  } catch {
    return "";
  }
}

function markdownBody(text: string): string {
  return text
    .replace(/^---\n[\s\S]*?\n---\n?/, "")
    .trim()
    .replace(/^# .+\n?/, "")
    .trim();
}

function frontmatterList(text: string, key: string): string[] {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start < 0) {
    return [];
  }
  const values: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith("  - ")) {
      break;
    }
    values.push(line.replace(/^  - /, "").trim());
  }
  return values;
}

function extractConflictNotes(text: string): string[] {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === "## Conflicts");
  if (start < 0) {
    return [];
  }
  const notes: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) {
      break;
    }
    if (line.trim().startsWith("- ")) {
      notes.push(line.trim().replace(/^-\s+/, ""));
    }
  }
  return notes;
}

function duplicateKey(title: string, body: string): string {
  const normalizedBody = body
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (normalizedBody.length >= 24) {
    return normalizedBody.slice(0, 160);
  }
  return slugify(title);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function compactTimestamp(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 12);
}

function frontmatterValue(text: string, key: string): string | null {
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? null;
}

function replaceFrontmatterValue(text: string, key: string, value: string): string {
  if (!new RegExp(`^${key}:`, "m").test(text)) {
    return upsertFrontmatterValue(text, key, value);
  }
  return text.replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${value}`);
}

function upsertFrontmatterValue(text: string, key: string, value: string): string {
  if (new RegExp(`^${key}:`, "m").test(text)) {
    return replaceFrontmatterValue(text, key, value);
  }
  return text.replace(/^---\n/, `---\n${key}: ${value}\n`);
}
