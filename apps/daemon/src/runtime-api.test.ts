import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { markMemoryRecordState, writeMemoryRecord } from "../../../packages/memory/src/index.js";
import { createDaemonApp } from "./server.js";

describe("daemon runtime API", () => {
  it("creates, lists, reads, and cancels generic runtime tasks", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-runtime-api-"));
    const app = createDaemonApp({
      memoryRoot,
      startedAt: new Date("2026-06-22T00:00:00.000Z")
    });

    const created = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: {
        id: "task_20260622_runtime",
        title: "Review runtime API",
        type: "user_request",
        priority: "normal",
        requested_by: "user",
        source_channel: "desktop",
        risk_level: "write",
        approval_state: "not_required",
        now: "2026-06-22T02:20:00.000Z"
      }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().task).toMatchObject({
      id: "task_20260622_runtime",
      status: "queued",
      title: "Review runtime API"
    });

    const listed = await app.inject({
      method: "GET",
      url: "/tasks"
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().tasks).toContainEqual(expect.objectContaining({ id: "task_20260622_runtime" }));

    const read = await app.inject({
      method: "GET",
      url: "/tasks/task_20260622_runtime"
    });
    expect(read.statusCode).toBe(200);
    expect(read.json().task.status).toBe("queued");

    const cancelled = await app.inject({
      method: "POST",
      url: "/tasks/task_20260622_runtime/cancel",
      payload: {
        now: "2026-06-22T02:25:00.000Z",
        reason: "User stopped the task."
      }
    });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().task).toMatchObject({
      id: "task_20260622_runtime",
      status: "cancelled"
    });

    const status = await app.inject({
      method: "GET",
      url: "/status"
    });
    expect(status.statusCode).toBe(200);
    expect(status.json().runtime.tasks).toContainEqual(
      expect.objectContaining({
        id: "task_20260622_runtime",
        status: "cancelled"
      })
    );

    const eventLog = await readFile(join(memoryRoot, "logs", "events", "runtime.jsonl"), "utf8");
    expect(eventLog).toContain("task_started");
    expect(eventLog).toContain("task_updated");
  });

  it("creates and decides approval requests with audit events", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-runtime-api-"));
    const app = createDaemonApp({ memoryRoot });

    await app.inject({
      method: "POST",
      url: "/tasks",
      payload: {
        id: "task_20260622_runtime",
        title: "Runtime task awaiting approval",
        risk_level: "write",
        approval_state: "pending",
        now: "2026-06-22T02:19:00.000Z"
      }
    });

    const created = await app.inject({
      method: "POST",
      url: "/approvals",
      payload: {
        id: "approval_20260622_runtime",
        task_id: "task_20260622_runtime",
        title: "Approve runtime write",
        summary_for_user: "Dore wants to write a runtime task record.",
        risk_level: "write",
        requested_action: {
          kind: "file_write",
          target: "memory/data/runtime/tasks.json",
          dry_run_available: true,
          reversible: true
        },
        created_at: "2026-06-22T02:20:00.000Z",
        expires_at: "2026-06-22T03:20:00.000Z"
      }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().approval).toMatchObject({
      id: "approval_20260622_runtime",
      state: "pending"
    });

    const approved = await app.inject({
      method: "POST",
      url: "/approvals/approval_20260622_runtime/approve",
      payload: {
        now: "2026-06-22T02:30:00.000Z",
        reason: "Looks safe."
      }
    });
    expect(approved.statusCode).toBe(200);
    expect(approved.json().approval).toMatchObject({
      id: "approval_20260622_runtime",
      state: "approved",
      decision: {
        decided_by: "user",
        reason: "Looks safe."
      }
    });

    const task = await app.inject({
      method: "GET",
      url: "/tasks/task_20260622_runtime"
    });
    expect(task.statusCode).toBe(200);
    expect(task.json().task).toMatchObject({
      id: "task_20260622_runtime",
      approval_state: "approved"
    });

    const listed = await app.inject({
      method: "GET",
      url: "/approvals"
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().approvals).toContainEqual(
      expect.objectContaining({
        id: "approval_20260622_runtime",
        state: "approved"
      })
    );

    const eventLog = await readFile(join(memoryRoot, "logs", "events", "runtime.jsonl"), "utf8");
    expect(eventLog).toContain("approval_requested");
    expect(eventLog).toContain("approval_decided");
  });

  it("rejects unauthenticated non-local requests", async () => {
    const app = createDaemonApp();

    const response = await app.inject({
      method: "GET",
      url: "/tasks",
      remoteAddress: "203.0.113.10"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "local_or_authenticated_request_required"
    });
  });

  it("allows authenticated non-local requests without exposing the token", async () => {
    const app = createDaemonApp({
      localAuthToken: "secret_ref:test-daemon-token"
    });

    const response = await app.inject({
      method: "GET",
      url: "/tasks",
      remoteAddress: "203.0.113.10",
      headers: {
        authorization: "Bearer secret_ref:test-daemon-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.stringify(response.json())).not.toContain("secret_ref:test-daemon-token");
  });

  it("reads latest briefing, usage summary, and memory index", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-runtime-api-"));
    await mkdir(join(memoryRoot, "logs", "daily"), { recursive: true });
    await writeFile(
      join(memoryRoot, "logs", "daily", "2026-06-22.json"),
      JSON.stringify({
        id: "briefing_2026_06_22",
        date: "2026-06-22",
        status: "generated",
        telegram_summary: "Morning summary"
      })
    );
    await mkdir(join(memoryRoot, "logs", "usage"), { recursive: true });
    await writeFile(
      join(memoryRoot, "logs", "usage", "usage.jsonl"),
      [
        JSON.stringify({
          estimated_cost_usd: 0.25,
          input_tokens: 100,
          output_tokens: 50,
          status: "success"
        }),
        JSON.stringify({
          estimated_cost_usd: 0.75,
          input_tokens: 200,
          output_tokens: 100,
          status: "failed"
        })
      ].join("\n")
    );
    await mkdir(join(memoryRoot, "wiki"), { recursive: true });
    await writeFile(join(memoryRoot, "wiki", "index.md"), "# Dore Memory Index\n\n- [[projects/dore]]\n");
    await mkdir(join(memoryRoot, "wiki", "projects"), { recursive: true });
    await writeFile(join(memoryRoot, "wiki", "projects", "dore.md"), "# Dore\n");
    await mkdir(join(memoryRoot, "wiki", "trading"), { recursive: true });
    await writeFile(
      join(memoryRoot, "wiki", "trading", "policy.md"),
      [
        "---",
        "type: trading",
        "status: active",
        "source_refs:",
        "  - raw/inbox/trading-policy.md",
        "sensitivity: personal",
        "stale: true",
        "---",
        "# Trading policy",
        "",
        "## Conflicts",
        "",
        "- Risk limit differs from latest note."
      ].join("\n")
    );

    const app = createDaemonApp({ memoryRoot });

    const briefing = await app.inject({
      method: "GET",
      url: "/briefings/latest"
    });
    expect(briefing.statusCode).toBe(200);
    expect(briefing.json().briefing.telegram_summary).toBe("Morning summary");

    const usage = await app.inject({
      method: "GET",
      url: "/usage/summary"
    });
    expect(usage.statusCode).toBe(200);
    expect(usage.json().summary).toMatchObject({
      records: 2,
      estimated_cost_usd: 1,
      input_tokens: 300,
      output_tokens: 150,
      failed: 1
    });

    const memory = await app.inject({
      method: "GET",
      url: "/memory/index"
    });
    expect(memory.statusCode).toBe(200);
    expect(memory.json()).toMatchObject({
      index_path: join(memoryRoot, "wiki", "index.md"),
      entries: expect.arrayContaining([
        expect.objectContaining({
          path: "wiki/projects/dore.md",
          title: "Dore"
        }),
        expect.objectContaining({
          path: "wiki/trading/policy.md",
          title: "Trading policy",
          type: "trading",
          status: "active",
          source_refs: ["raw/inbox/trading-policy.md"],
          sensitivity: "personal",
          stale: true,
          conflicts: ["Risk limit differs from latest note."]
        })
      ])
    });
  });

  it("runs a scheduled briefing through the daemon briefing endpoint", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-runtime-api-"));
    const app = createDaemonApp({
      memoryRoot,
      projectRoot: memoryRoot
    });

    const run = await app.inject({
      method: "POST",
      url: "/briefings/run",
      payload: {
        trigger: "scheduled",
        date: "2026-06-22",
        generated_at: "2026-06-22T06:00:00+09:00",
        now: "2026-06-22T06:05:00+09:00"
      }
    });

    expect(run.statusCode).toBe(201);
    expect(run.json()).toMatchObject({
      status: "partial",
      attempts: [
        expect.objectContaining({
          scheduled_time: "06:00",
          status: "generated"
        })
      ],
      delivery: {
        telegram_summary: expect.stringContaining("Dore Morning Briefing - 2026-06-22"),
        dashboard_json_path: join(memoryRoot, "logs", "daily", "2026-06-22.json")
      }
    });

    const latest = await app.inject({
      method: "GET",
      url: "/briefings/latest"
    });
    expect(latest.statusCode).toBe(200);
    expect(latest.json().briefing.delivery.telegram_summary).toBe(run.json().delivery.telegram_summary);
    const status = await app.inject({
      method: "GET",
      url: "/status"
    });
    expect(status.statusCode).toBe(200);
    expect(status.json().scheduler.jobs).toContainEqual(
      expect.objectContaining({
        id: "daily_briefing_0600_kst",
        last_run_status: "generated",
        next_run_at: "2026-06-23T06:00:00+09:00",
        failure_count: 0,
        retry_status: "idle",
        recent_runs: [
          expect.objectContaining({
            job_id: "daily_briefing_0600_kst",
            status: "generated",
            summary: "Daily briefing generated."
          })
        ]
      })
    );
    expect(await readFile(join(memoryRoot, "logs", "events", "briefing.jsonl"), "utf8")).toContain(
      "briefing_generated"
    );
  });

  it("returns recent logs across event, usage, and trading records", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-runtime-api-"));
    await mkdir(join(memoryRoot, "logs", "events"), { recursive: true });
    await writeFile(
      join(memoryRoot, "logs", "events", "runtime.jsonl"),
      [
        JSON.stringify({
          id: "event_approval",
          time: "2026-06-22T06:00:00.000Z",
          event_type: "approval_requested",
          summary: "Approval requested: write memory"
        }),
        JSON.stringify({
          id: "event_error",
          time: "2026-06-22T06:05:00.000Z",
          event_type: "task_failed",
          summary: "Task failed"
        })
      ].join("\n")
    );
    await mkdir(join(memoryRoot, "logs", "usage"), { recursive: true });
    await writeFile(
      join(memoryRoot, "logs", "usage", "2026-06.jsonl"),
      `${JSON.stringify({
        id: "usage_1",
        started_at: "2026-06-22T06:03:00.000Z",
        estimated_cost_usd: 0.12,
        status: "success"
      })}\n`
    );
    await mkdir(join(memoryRoot, "logs", "trading"), { recursive: true });
    await writeFile(
      join(memoryRoot, "logs", "trading", "2026-06.jsonl"),
      `${JSON.stringify({
        id: "journal_1",
        created_at: "2026-06-22T06:04:00.000Z",
        signal_id: "signal_1",
        execution_mode: "dry_run"
      })}\n`
    );
    const app = createDaemonApp({ memoryRoot });

    const response = await app.inject({
      method: "GET",
      url: "/logs/recent"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "event_approval", category: "approval", event_type: "approval_requested" }),
        expect.objectContaining({ id: "event_error", category: "error", event_type: "task_failed" }),
        expect.objectContaining({ id: "usage_1", category: "usage", event_type: "llm_usage" }),
        expect.objectContaining({ id: "journal_1", category: "trading", event_type: "trading_journal" })
      ])
    );
  });

  it("writes normal memory records and creates approval requests for sensitive memory", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-runtime-api-"));
    const app = createDaemonApp({ memoryRoot });

    const normal = await app.inject({
      method: "POST",
      url: "/memory/records",
      payload: {
        type: "project",
        title: "Dore memory flow",
        body: "M12 adds memory write and search.",
        now: "2026-06-22T07:00:00.000Z"
      }
    });

    expect(normal.statusCode).toBe(201);
    expect(normal.json()).toMatchObject({
      status: "written",
      record: {
        title: "Dore memory flow",
        path: expect.stringContaining("wiki/projects/dore-memory-flow.md")
      }
    });

    const index = await app.inject({
      method: "GET",
      url: "/memory/index"
    });
    expect(index.json().entries).toContainEqual(
      expect.objectContaining({
        title: "Dore memory flow"
      })
    );

    const sensitive = await app.inject({
      method: "POST",
      url: "/memory/records",
      payload: {
        type: "profile",
        title: "Sensitive account note",
        body: "Personal account detail.",
        sensitivity: "sensitive",
        now: "2026-06-22T07:10:00.000Z"
      }
    });

    expect(sensitive.statusCode).toBe(202);
    expect(sensitive.json()).toMatchObject({
      status: "approval_required",
      approval: {
        title: "Approve sensitive memory write",
        state: "pending"
      }
    });

    const approvals = await app.inject({
      method: "GET",
      url: "/approvals"
    });
    expect(approvals.json().approvals).toContainEqual(
      expect.objectContaining({
        title: "Approve sensitive memory write",
        task_id: "memory_sensitive_account_note"
      })
    );
  });

  it("returns duplicate, stale, and conflict memory quality review queues", async () => {
    const memoryRoot = await mkdtemp(join(tmpdir(), "dore-runtime-api-"));
    const first = await writeMemoryRecord({
      memoryRoot,
      type: "project",
      title: "Dore roadmap",
      body: "M20 improves memory quality with duplicate detection and stale review.",
      now: "2026-06-20T07:00:00.000Z",
      sourceRefs: ["docs/plan/ROADMAP.md"]
    });
    const duplicate = await writeMemoryRecord({
      memoryRoot,
      type: "project",
      title: "Dore roadmap notes",
      body: "M20 improves memory quality with duplicate detection and stale review.",
      now: "2026-06-21T07:00:00.000Z",
      sourceRefs: ["docs/plan/README.md"]
    });
    const conflicted = await writeMemoryRecord({
      memoryRoot,
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

    const app = createDaemonApp({ memoryRoot });
    const response = await app.inject({
      method: "GET",
      url: "/memory/quality"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().quality.duplicateSuggestions).toContainEqual(
      expect.objectContaining({
        relation: "possible_duplicate",
        suggestedAction: "merge_or_supersede",
        records: expect.arrayContaining([
          expect.objectContaining({ title: "Dore roadmap" }),
          expect.objectContaining({ title: "Dore roadmap notes" })
        ])
      })
    );
    expect(response.json().quality.staleQueue).toContainEqual(
      expect.objectContaining({
        title: "Dore roadmap",
        sourceRefs: ["docs/plan/ROADMAP.md"],
        lastSeenAt: "2026-06-22T07:30:00.000Z"
      })
    );
    expect(response.json().quality.conflictQueue).toContainEqual(
      expect.objectContaining({
        title: "Preferred model",
        conflicts: ["Another memory record says to optimize for lowest cost."]
      })
    );
  });
});
