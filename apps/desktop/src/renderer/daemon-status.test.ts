import { describe, expect, it } from "vitest";
import { createDaemonTaskClient, fetchDashboardStatus, mapDaemonStatusToDashboard } from "./daemon-status.js";

describe("daemon status mapping", () => {
  it("maps daemon /status payload into Dashboard state", () => {
    const dashboard = mapDaemonStatusToDashboard({
      app: {
        name: "Dore",
        mode: "local",
        uptime_ms: 65000
      },
      health: {
        status: "degraded",
        summary: {
          ok: 2,
          warning: 4,
          failed: 0
        }
      },
      scheduler: {
        jobs: [
          {
            id: "daily_briefing_0600_kst",
            kind: "daily_briefing",
            time: "06:00",
            timezone: "Asia/Seoul",
            enabled: true,
            last_run_at: "2026-06-22T06:00:00+09:00",
            last_run_status: "generated",
            next_run_at: "2026-06-23T06:00:00+09:00",
            failure_count: 0,
            retry_status: "idle",
            recent_runs: [
              {
                id: "event_daily_briefing",
                job_id: "daily_briefing_0600_kst",
                time: "2026-06-22T06:00:00+09:00",
                status: "generated",
                summary: "Daily briefing generated."
              }
            ]
          }
        ]
      },
      telegram: {
        configured: false,
        allowlist_required: true,
        adapter: {
          state: "disabled",
          reason: "missing_token"
        }
      },
      providers: {
        openai: {
          configured: true
        },
        claude: {
          configured: false
        },
        gemini: {
          configured: false
        }
      },
      memory: {
        ready: true
      },
      trading: {
        enabled: true,
        real_trading_enabled: false,
        dry_run_journal: {
          month: "2026-06",
          entries: 2,
          passed: 1,
          blocked: 1,
          latest_signal_id: "signal_20260622_AAPL_status"
        },
        paper_journal: {
          month: "2026-06",
          dry_run_entries: 2,
          paper_entries: 1,
          latest_signal_id: "signal_20260622_AAPL_paper"
        },
        market_data_sources: [
          {
            market: "us",
            status: "ok",
            checked_symbols: 1,
            blocked_reasons: []
          }
        ],
        real_trading_gate: {
          enabled_requested: true,
          status: "blocked",
          blocked_reasons: ["Trading kill switch is enabled."]
        },
        brokers: {
          toss: "candidate",
          shinhan: "candidate",
          samsung: "read_only_manual_reference"
        }
      },
      engineering: {
        tasks: [
          {
            id: "intake_2026_06_22_add_daemon_task_wrapper",
            title: "Add daemon task wrapper",
            status: "completed",
            last_command: "pnpm test",
            failed_verification: {
              command: "pnpm build",
              summary: "pnpm build failed with exit code 2.",
              likely_next_action: "Fix the TypeScript/build error, then rerun pnpm build.",
              output_summary: "src/app.ts(12,5): error TS2304: Cannot find name 'missingValue'."
            },
            review_report: {
              findings: [
                {
                  category: "bug",
                  severity: "high",
                  file: "src/runner.ts",
                  line: 12,
                  message: "Cancellation result is ignored.",
                  reference: "src/runner.ts:12"
                },
                {
                  category: "style",
                  severity: "low",
                  file: "src/view.ts",
                  line: 40,
                  message: "Name can be clearer.",
                  reference: "src/view.ts:40"
                }
              ]
            },
            risk_review: {
              kind: "destructive_command",
              target: "rm -rf memory",
              approval_required: true,
              risk_level: "critical",
              reason: "Destructive command requires approval: rm -rf memory"
            },
            loop_status: {
              iteration_budget: {
                max: 7,
                used: 7,
                remaining: 0,
                exhausted: true
              },
              retry_state: {
                failed_verification_retry_attempted: true,
                file_mutation_retry_attempted: false,
                review_retry_attempted: true
              },
              exit_reason: "iteration_budget_exhausted",
              next_action: "Stop the loop and summarize progress before continuing."
            },
            stages: [
              {
                kind: "plan",
                title: "Prepare requirements, design, and change plan",
                status: "completed"
              },
              {
                kind: "patch",
                title: "Apply focused implementation patch",
                status: "completed"
              },
              {
                kind: "verify",
                title: "Run detected verification commands",
                status: "completed"
              },
              {
                kind: "review",
                title: "Review findings by severity",
                status: "completed"
              },
              {
                kind: "memory_reflection",
                title: "Reflect durable engineering knowledge into memory",
                status: "completed"
              }
            ]
          }
        ]
      },
      runtime: {
        tasks: [
          {
            id: "task_runtime",
            title: "Runtime task",
            status: "running",
            priority: "high"
          }
        ],
        approvals: [
          {
            id: "approval_runtime",
            title: "Approve runtime write",
            summary_for_user: "Write local memory",
            risk_level: "write",
            state: "pending",
            requested_action: {
              kind: "file_write",
              target: "memory/wiki/projects/dore.md",
              dry_run_available: true,
              reversible: true
            }
          }
        ]
      }
    });

    expect(dashboard.daemon.mode).toBe("local");
    expect(dashboard.daemon.uptimeLabel).toBe("1m");
    expect(dashboard.daemon.health).toEqual({
      status: "degraded",
      ok: 2,
      warning: 4,
      failed: 0
    });
    expect(dashboard.scheduler.jobs[0].id).toBe("daily_briefing_0600_kst");
    expect(dashboard.scheduler.jobs[0]).toMatchObject({
      enabled: true,
      lastRunAt: "2026-06-22T06:00:00+09:00",
      lastRunStatus: "generated",
      nextRunAt: "2026-06-23T06:00:00+09:00",
      failureCount: 0,
      retryStatus: "idle",
      recentRuns: [
        {
          id: "event_daily_briefing",
          jobId: "daily_briefing_0600_kst",
          status: "generated"
        }
      ]
    });
    expect(dashboard.telegram.adapterState).toBe("disabled");
    expect(dashboard.telegram.detail).toBe("missing_token");
    expect(dashboard.trading.realTradingEnabled).toBe(false);
    expect(dashboard.trading.dryRunJournal).toEqual({
      month: "2026-06",
      entries: 2,
      passed: 1,
      blocked: 1,
      latestSignalId: "signal_20260622_AAPL_status"
    });
    expect(dashboard.trading.paperJournal).toEqual({
      month: "2026-06",
      dryRunEntries: 2,
      paperEntries: 1,
      latestSignalId: "signal_20260622_AAPL_paper"
    });
    expect(dashboard.trading.marketDataSources).toContainEqual({
      market: "us",
      status: "ok",
      checkedSymbols: 1,
      blockedReasons: []
    });
    expect(dashboard.trading.realTradingGate).toEqual({
      enabledRequested: true,
      status: "blocked",
      blockedReasons: ["Trading kill switch is enabled."]
    });
    expect(dashboard.settings.providers.OpenAI).toBe("configured");
    expect(dashboard.settings.providers.Claude).toBe("missing");
    expect(dashboard.settings.memory).toBe("ready");
    expect(dashboard.settings.trading).toBe("dry_run");
    expect(dashboard.engineering.tasks[0].status).toBe("completed");
    expect(dashboard.engineering.tasks[0].stages).toContainEqual(
      expect.objectContaining({
        kind: "verify",
        title: "Run detected verification commands",
        status: "completed"
      })
    );
    expect(dashboard.engineering.tasks[0].failedVerification).toEqual({
      command: "pnpm build",
      summary: "pnpm build failed with exit code 2.",
      likelyNextAction: "Fix the TypeScript/build error, then rerun pnpm build.",
      outputSummary: "src/app.ts(12,5): error TS2304: Cannot find name 'missingValue'."
    });
    expect(dashboard.engineering.tasks[0].reviewReport?.findings.map((finding) => finding.reference)).toEqual([
      "src/runner.ts:12",
      "src/view.ts:40"
    ]);
    expect(dashboard.engineering.tasks[0].riskReview).toEqual({
      kind: "destructive_command",
      target: "rm -rf memory",
      approvalRequired: true,
      riskLevel: "critical",
      reason: "Destructive command requires approval: rm -rf memory"
    });
    expect(dashboard.engineering.tasks[0].loopStatus).toEqual({
      iterationBudget: {
        max: 7,
        used: 7,
        remaining: 0,
        exhausted: true
      },
      retryState: {
        failedVerificationRetryAttempted: true,
        fileMutationRetryAttempted: false,
        reviewRetryAttempted: true
      },
      exitReason: "iteration_budget_exhausted",
      nextAction: "Stop the loop and summarize progress before continuing."
    });
    expect(dashboard.approvals[0]).toMatchObject({
      id: "approval_runtime",
      summary: "Write local memory",
      requestedAction: {
        kind: "file_write",
        target: "memory/wiki/projects/dore.md",
        dryRunAvailable: true,
        reversible: true
      }
    });
    expect(dashboard.tasks[0]).toMatchObject({
      id: "task_runtime",
      status: "running"
    });
    expect(dashboard.critical.pendingApprovals).toBe(1);
    expect(dashboard.critical.riskHalt).toBe(true);
  });

  it("aggregates daemon status, briefing, usage, memory, and logs for product screens", async () => {
    const status = await fetchDashboardStatus({
      baseUrl: "http://127.0.0.1:3173",
      fetchImpl: async (url) => {
        const path = String(url).replace("http://127.0.0.1:3173", "");
        if (path === "/status") {
          return jsonResponse({
            app: {
              name: "Dore",
              mode: "local",
              uptime_ms: 1000
            },
            memory: {
              ready: true
            },
            telegram: {
              configured: true,
              allowlist_required: true,
              adapter: {
                state: "ready"
              }
            },
            providers: {},
            scheduler: {
              jobs: []
            },
            runtime: {
              tasks: [
                {
                  id: "task_running",
                  title: "Running task",
                  status: "running",
                  priority: "urgent"
                }
              ],
              approvals: []
            },
            trading: {
              enabled: true,
              real_trading_enabled: false,
              brokers: {},
              market_data_sources: [],
              real_trading_gate: {
                enabled_requested: false,
                status: "blocked",
                blocked_reasons: ["Trading kill switch is enabled."]
              }
            },
            engineering: {
              tasks: []
            }
          });
        }
        if (path === "/briefings/latest") {
          return jsonResponse({
            briefing: {
              status: "generated",
              generated_at: "2026-06-22T06:00:00.000Z",
              delivery: {
                telegram_summary: "Morning briefing summary"
              }
            }
          });
        }
        if (path === "/usage/summary") {
          return jsonResponse({
            summary: {
              records: 2,
              estimated_cost_usd: 0.42,
              input_tokens: 100,
              output_tokens: 50,
              failed: 1
            }
          });
        }
        if (path === "/memory/index") {
          return jsonResponse({
            index_path: "memory/wiki/index.md",
            entries: [
              {
                path: "wiki/projects/dore.md",
                title: "Dore",
                type: "project",
                status: "active",
                source_refs: ["raw/inbox/dore.md"],
                stale: false,
                conflicts: [],
                sensitivity: "personal"
              }
            ]
          });
        }
        if (path === "/memory/quality") {
          return jsonResponse({
            quality: {
              duplicateSuggestions: [
                {
                  id: "duplicate_dore",
                  relation: "possible_duplicate",
                  suggestedAction: "merge_or_supersede",
                  records: [
                    {
                      title: "Dore",
                      path: "wiki/projects/dore.md",
                      type: "project",
                      status: "active",
                      sourceRefs: ["raw/inbox/dore.md"],
                      stale: false
                    },
                    {
                      title: "Dore notes",
                      path: "wiki/projects/dore-notes.md",
                      type: "project",
                      status: "active",
                      sourceRefs: ["docs/plan/README.md"],
                      stale: false
                    }
                  ]
                }
              ],
              staleQueue: [
                {
                  title: "Old Dore note",
                  path: "wiki/projects/old-dore-note.md",
                  type: "project",
                  status: "active",
                  sourceRefs: ["raw/inbox/old-dore.md"],
                  stale: true,
                  lastSeenAt: "2026-06-20T07:30:00.000Z"
                }
              ],
              conflictQueue: [
                {
                  title: "Preferred model",
                  path: "wiki/topics/preferred-model.md",
                  type: "topic",
                  status: "active",
                  sourceRefs: ["memory/raw/preferences.md"],
                  stale: false,
                  conflicts: ["Another memory record says to optimize for lowest cost."]
                }
              ]
            }
          });
        }
        if (path === "/logs/recent") {
          return jsonResponse({
            logs: [
              {
                id: "event_error",
                time: "2026-06-22T06:05:00.000Z",
                category: "error",
                event_type: "task_failed",
                summary: "Task failed"
              }
            ]
          });
        }
        return jsonResponse({}, 404);
      }
    });

    expect(status.dailyBriefing?.summary).toBe("Morning briefing summary");
    expect(status.usage).toMatchObject({ estimatedCostUsd: 0.42, failed: 1 });
    expect(status.memory.entries).toBe(1);
    expect(status.memory.records?.[0]).toMatchObject({
      title: "Dore",
      path: "wiki/projects/dore.md",
      type: "project",
      sourceRefs: ["raw/inbox/dore.md"]
    });
    expect(status.memory.quality).toMatchObject({
      duplicateSuggestions: 1,
      staleRecords: 1,
      conflictRecords: 1,
      duplicateTitles: ["Dore", "Dore notes"],
      staleTitles: ["Old Dore note"],
      conflictTitles: ["Preferred model"]
    });
    expect(status.logs[0].category).toBe("error");
    expect(status.logs[0].time).toBe("2026-06-22T06:05:00.000Z");
    expect(status.todayTop3[0].title).toBe("Running task");
  });

  it("returns an offline dashboard state when daemon fetch fails", async () => {
    const status = await fetchDashboardStatus({
      baseUrl: "http://127.0.0.1:3173",
      fetchImpl: async () => {
        throw new Error("daemon down");
      }
    });

    expect(status.daemon.mode).toBe("offline");
    expect(status.scheduler.jobs).toEqual([]);
    expect(status.telegram.adapterState).toBe("disabled");
    expect(status.trading.realTradingEnabled).toBe(false);
  });

  it("cancels runtime tasks through the daemon task client", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = createDaemonTaskClient({
      baseUrl: "http://127.0.0.1:3173",
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init });
        return jsonResponse({
          task: {
            id: "task_running",
            status: "cancelled"
          }
        });
      }
    });

    await client.cancelTask("task_running");

    expect(calls).toEqual([
      {
        url: "http://127.0.0.1:3173/tasks/task_running/cancel",
        init: {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reason: "Cancelled from desktop."
          })
        }
      }
    ]);
  });
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}
