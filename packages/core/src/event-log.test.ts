import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendEvent } from "./index.js";

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
});

