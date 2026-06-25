import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendEvent, atomicAppendJsonLine, atomicWriteJsonFile, createRuntimeTask, loadRuntimeTasks, saveRuntimeTasks } from "./index.js";

describe("event log", () => {
  it("appends JSONL event records", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-events-"));
    try {
      const path = join(root, "events.jsonl");
      await appendEvent(path, {
        id: "event_20260621_000001",
        time: "2026-06-21T06:00:00+09:00",
        actor: "dore",
        event_type: "task_started",
        entity_type: "task",
        entity_id: "task_20260621_000001",
        summary: "Started task.",
        risk_level: "write",
        refs: []
      });

      const lines = (await readFile(path, "utf8")).trim().split("\n");
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0]).event_type).toBe("task_started");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects direct secret-like fields", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-events-"));
    try {
      await expect(
        appendEvent(join(root, "events.jsonl"), {
          id: "event_20260621_000002",
          time: "2026-06-21T06:00:00+09:00",
          actor: "dore",
          event_type: "usage_recorded",
          entity_type: "usage",
          entity_id: "usage_20260621_000001",
          summary: "Should fail.",
          risk_level: "read",
          refs: [],
          secret: "do-not-store"
        })
      ).rejects.toThrow(/secret/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes runtime JSON through an atomic replace boundary", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-runtime-atomic-"));
    try {
      const task = createRuntimeTask({
        id: "task_atomic",
        title: "Atomic runtime write",
        type: "user_request",
        priority: "normal",
        requestedBy: "user",
        sourceChannel: "cli",
        riskLevel: "write",
        approvalState: "not_required",
        now: "2026-06-22T10:00:00.000Z"
      });

      const path = await saveRuntimeTasks(root, [task]);

      expect(await loadRuntimeTasks(root)).toContainEqual(expect.objectContaining({ id: "task_atomic" }));
      expect(JSON.parse(await readFile(path, "utf8"))).toHaveLength(1);
      expect((await readdir(join(root, "data", "runtime"))).filter((file) => file.includes(".tmp"))).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("exposes reusable atomic JSON and JSONL helpers", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-core-persistence-"));
    try {
      const jsonPath = join(root, "nested", "state.json");
      const logPath = join(root, "logs", "events.jsonl");

      await atomicWriteJsonFile(jsonPath, { status: "ok" });
      await atomicAppendJsonLine(logPath, { id: "one", status: "ok" });
      await atomicAppendJsonLine(logPath, { id: "two", status: "ok" });

      expect(JSON.parse(await readFile(jsonPath, "utf8"))).toEqual({ status: "ok" });
      const lines = (await readFile(logPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
      expect(lines).toEqual([
        { id: "one", status: "ok" },
        { id: "two", status: "ok" }
      ]);
      expect((await readdir(join(root, "nested"))).filter((file) => file.includes(".tmp"))).toEqual([]);
      expect((await readdir(join(root, "logs"))).filter((file) => file.includes(".tmp"))).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
