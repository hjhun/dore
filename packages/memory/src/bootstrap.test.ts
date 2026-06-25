import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  bootstrapMemory,
  markMemoryRecordState,
  reviewMemoryQuality,
  searchMemoryIndex,
  updateMemoryRecord,
  writeMemoryRecord,
  writeOperationalMemory
} from "./index.js";

describe("memory bootstrap", () => {
  it("creates required memory directories and wiki index", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-memory-"));
    try {
      const result = await bootstrapMemory(root);

      expect(result.createdPaths).toEqual(
        expect.arrayContaining([
          join(root, "raw"),
          join(root, "wiki"),
          join(root, "operations"),
          join(root, "logs"),
          join(root, "wiki", "index.md")
        ])
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes and supersedes user preference memory records", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-memory-"));
    const first = await writeMemoryRecord({
      memoryRoot: root,
      type: "profile",
      title: "Editor preference",
      body: "Prefers concise implementation notes.",
      now: "2026-06-22T07:00:00.000Z",
      tags: ["preference"]
    });
    expect(first.status).toBe("written");
    if (first.status !== "written") {
      throw new Error("expected_written_memory_record");
    }

    const second = await updateMemoryRecord({
      memoryRoot: root,
      previousPath: first.path,
      title: "Editor preference",
      body: "Prefers concise implementation notes with verification commands.",
      now: "2026-06-22T07:10:00.000Z",
      tags: ["preference"]
    });

    expect(await readFile(first.path, "utf8")).toContain("status: superseded");
    expect(await readFile(second.path, "utf8")).toContain("supersedes:");
    const results = await searchMemoryIndex(root, "verification commands");
    expect(results).toContainEqual(expect.objectContaining({ title: "Editor preference", status: "active" }));
  });

  it("requires approval before persisting sensitive memory", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-memory-"));
    const result = await writeMemoryRecord({
      memoryRoot: root,
      type: "profile",
      title: "Sensitive account note",
      body: "Personal account detail.",
      sensitivity: "sensitive",
      now: "2026-06-22T07:00:00.000Z"
    });

    expect(result.status).toBe("approval_required");
    if (result.status !== "approval_required") {
      throw new Error("expected_memory_approval");
    }
    expect(result.approvalRequest).toMatchObject({
      title: "Approve sensitive memory write",
      risk_level: "write",
      requested_action: {
        kind: "file_write"
      }
    });
    await expect(access(join(root, "wiki", "profile", "sensitive-account-note.md"))).rejects.toThrow();
  });

  it("keeps raw source and wiki summary linked but separate", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-memory-"));
    const result = await writeMemoryRecord({
      memoryRoot: root,
      type: "topic",
      title: "Broker API note",
      body: "Summary of broker API constraints.",
      rawSource: "Original broker API notes.",
      now: "2026-06-22T07:00:00.000Z"
    });
    expect(result.status).toBe("written");
    if (result.status !== "written") {
      throw new Error("expected_written_memory_record");
    }

    expect(result.rawPath).toBeDefined();
    expect(await readFile(result.rawPath ?? "", "utf8")).toContain("Original broker API notes.");
    const wiki = await readFile(result.path, "utf8");
    expect(wiki).toContain("source_refs:");
    expect(wiki).toContain("raw/inbox/broker-api-note.md");
  });

  it("marks memory records stale and conflicted", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-memory-"));
    const result = await writeMemoryRecord({
      memoryRoot: root,
      type: "project",
      title: "Dore roadmap",
      body: "Current milestone is M12.",
      now: "2026-06-22T07:00:00.000Z"
    });
    expect(result.status).toBe("written");
    if (result.status !== "written") {
      throw new Error("expected_written_memory_record");
    }

    await markMemoryRecordState({
      path: result.path,
      now: "2026-06-22T07:30:00.000Z",
      stale: true,
      conflict: "Roadmap milestone changed in dashboard."
    });

    const text = await readFile(result.path, "utf8");
    expect(text).toContain("stale: true");
    expect(text).toContain("## Conflicts");
    expect(text).toContain("Roadmap milestone changed in dashboard.");
  });

  it("persists active context and operational memory files", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-memory-"));
    await writeOperationalMemory({
      memoryRoot: root,
      activeContext: "Working on M12 memory flow.",
      tasks: ["Implement memory writer"],
      reminders: ["Review stale records weekly"],
      openQuestions: ["Which broker API will be used?"],
      approvals: ["approval_memory_sensitive"],
      now: "2026-06-22T07:00:00.000Z"
    });

    expect(await readFile(join(root, "operations", "active_context.md"), "utf8")).toContain("Working on M12");
    expect(await readFile(join(root, "operations", "tasks.md"), "utf8")).toContain("Implement memory writer");
    expect(await readFile(join(root, "operations", "approvals.md"), "utf8")).toContain("approval_memory_sensitive");
  });

  it("builds duplicate, stale, and conflict review queues", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-memory-"));
    const first = await writeMemoryRecord({
      memoryRoot: root,
      type: "project",
      title: "Dore roadmap",
      body: "M20 improves memory quality with duplicate detection and stale review.",
      now: "2026-06-20T07:00:00.000Z",
      sourceRefs: ["docs/plan/ROADMAP.md"]
    });
    const duplicate = await writeMemoryRecord({
      memoryRoot: root,
      type: "project",
      title: "Dore roadmap notes",
      body: "M20 improves memory quality with duplicate detection and stale review.",
      now: "2026-06-21T07:00:00.000Z",
      sourceRefs: ["docs/plan/README.md"]
    });
    const conflicted = await writeMemoryRecord({
      memoryRoot: root,
      type: "topic",
      title: "Preferred model",
      body: "Use low latency model by default.",
      now: "2026-06-19T07:00:00.000Z",
      sourceRefs: ["memory/raw/preferences.md"]
    });
    if (first.status !== "written" || duplicate.status !== "written" || conflicted.status !== "written") {
      throw new Error("expected_written_memory_records");
    }

    await markMemoryRecordState({
      path: first.path,
      now: "2026-06-22T07:30:00.000Z",
      stale: true
    });
    await markMemoryRecordState({
      path: conflicted.path,
      now: "2026-06-22T07:45:00.000Z",
      conflict: "Another memory record says to optimize for lowest cost."
    });

    const review = await reviewMemoryQuality(root);

    expect(review.duplicateSuggestions).toContainEqual(
      expect.objectContaining({
        relation: "possible_duplicate",
        suggestedAction: "merge_or_supersede",
        records: expect.arrayContaining([
          expect.objectContaining({ title: "Dore roadmap" }),
          expect.objectContaining({ title: "Dore roadmap notes" })
        ])
      })
    );
    expect(review.staleQueue).toContainEqual(
      expect.objectContaining({
        title: "Dore roadmap",
        sourceRefs: ["docs/plan/ROADMAP.md"],
        lastSeenAt: "2026-06-22T07:30:00.000Z"
      })
    );
    expect(review.conflictQueue).toContainEqual(
      expect.objectContaining({
        title: "Preferred model",
        conflicts: ["Another memory record says to optimize for lowest cost."]
      })
    );
  });

  it("ranks memory search by active status, source quality, recency, and stale state", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-memory-"));
    const active = await writeMemoryRecord({
      memoryRoot: root,
      type: "project",
      title: "Dore architecture",
      body: "Architecture decision for daemon reliability.",
      now: "2026-06-22T08:00:00.000Z",
      sourceRefs: ["docs/plan/ROADMAP.md"]
    });
    const stale = await writeMemoryRecord({
      memoryRoot: root,
      type: "topic",
      title: "Old architecture note",
      body: "Architecture note from an older daemon design.",
      now: "2026-06-20T08:00:00.000Z"
    });
    if (active.status !== "written" || stale.status !== "written") {
      throw new Error("expected_written_memory_records");
    }
    await markMemoryRecordState({
      path: stale.path,
      now: "2026-06-22T08:30:00.000Z",
      stale: true
    });

    const results = await searchMemoryIndex(root, "architecture", { ranked: true });

    expect(results[0]).toMatchObject({
      title: "Dore architecture",
      status: "active",
      score: expect.any(Number)
    });
    expect(results[1]).toMatchObject({
      title: "Old architecture note",
      stale: true
    });
    expect((results[0].score ?? 0) > (results[1].score ?? 0)).toBe(true);
  });
});
