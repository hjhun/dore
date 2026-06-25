import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dashboard, createMockDashboardStatus } from "./Dashboard.js";

describe("Dashboard", () => {
  it("renders daemon, scheduler, Telegram, and trading status sections", () => {
    render(<Dashboard status={createMockDashboardStatus()} />);

    expect(screen.getByRole("heading", { name: "Dore" })).toBeTruthy();
    expect(screen.getByText("Daemon")).toBeTruthy();
    expect(screen.getByText("Scheduler")).toBeTruthy();
    expect(screen.getByText("Telegram")).toBeTruthy();
    expect(screen.getByText("Trading")).toBeTruthy();
    expect(screen.getByText("daily_briefing_0600_kst")).toBeTruthy();
    expect(screen.getByText("Real trading disabled")).toBeTruthy();
    expect(screen.getByText("Real gate: blocked")).toBeTruthy();
    expect(screen.getByText("Gate blocked: Trading kill switch is enabled.")).toBeTruthy();
    expect(screen.getByText("Dry-run entries: 0")).toBeTruthy();
    expect(screen.getByText("Paper entries: 0 Journal dry-run: 0")).toBeTruthy();
    expect(screen.getByText("Market data us: ok")).toBeTruthy();
    expect(screen.getByText("Approvals")).toBeTruthy();
    expect(screen.getByText("Logs")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Engineering")).toBeTruthy();
    expect(screen.getByText("Critical Strip")).toBeTruthy();
    expect(screen.getByText("Today Top 3")).toBeTruthy();
    expect(screen.getByText("Active Work")).toBeTruthy();
    expect(screen.getByText("Daily Briefing")).toBeTruthy();
    expect(screen.getByText("Usage")).toBeTruthy();
    expect(screen.getByText("Memory Updates")).toBeTruthy();
    expect(screen.getByText("Chat")).toBeTruthy();
    expect(screen.getByText("Tasks & Schedules")).toBeTruthy();
    expect(screen.getByText("approval_demo_001")).toBeTruthy();
    expect(screen.getByText("daemon_status_loaded")).toBeTruthy();
    expect(screen.getByText("intake_demo_001")).toBeTruthy();
    expect(screen.getByText("Stage plan: in_progress")).toBeTruthy();
    expect(screen.getByText("Stage patch: pending")).toBeTruthy();
    expect(screen.getByText("Stage verify: pending")).toBeTruthy();
    expect(screen.getByText("Stage review: pending")).toBeTruthy();
    expect(screen.getByText("Stage memory_reflection: pending")).toBeTruthy();
    expect(screen.getByText("OpenAI: missing")).toBeTruthy();
    expect(screen.getByText("Memory: ready")).toBeTruthy();
  });

  it("does not render secret values", () => {
    render(
      <Dashboard
        status={{
          ...createMockDashboardStatus(),
          telegram: {
            configured: true,
            adapterState: "ready",
            detail: "token-present"
          }
        }}
      />
    );

    expect(screen.queryByText("token-present")).toBeNull();
    expect(screen.getByText("Configured")).toBeTruthy();
  });

  it("renders daemon offline state", () => {
    render(
      <Dashboard
        status={{
          ...createMockDashboardStatus(),
          daemon: {
            mode: "offline",
            uptimeLabel: "n/a"
          },
          scheduler: {
            jobs: []
          }
        }}
      />
    );

    expect(screen.getByText("Mode: offline")).toBeTruthy();
    expect(screen.getByText("No scheduled jobs")).toBeTruthy();
  });

  it("renders empty approval and log states", () => {
    render(
      <Dashboard
        status={{
          ...createMockDashboardStatus(),
          approvals: [],
          logs: []
        }}
      />
    );

    expect(screen.getByText("No pending approvals")).toBeTruthy();
    expect(screen.getByText("No recent logs")).toBeTruthy();
  });

  it("approves a pending approval and records a decision log", () => {
    render(<Dashboard status={createMockDashboardStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Approve approval_demo_001" }));

    expect(screen.getByText("No pending approvals")).toBeTruthy();
    expect(screen.getByText("approval_decision_recorded")).toBeTruthy();
    expect(screen.getByText("approval_demo_001 approved")).toBeTruthy();
  });

  it("rejects a pending approval and records a decision log", () => {
    render(<Dashboard status={createMockDashboardStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Reject approval_demo_001" }));

    expect(screen.getByText("No pending approvals")).toBeTruthy();
    expect(screen.getByText("approval_decision_recorded")).toBeTruthy();
    expect(screen.getByText("approval_demo_001 rejected")).toBeTruthy();
  });

  it("persists approval decisions through the daemon approval client", async () => {
    const decisions: Array<{ id: string; decision: "approved" | "rejected" }> = [];
    render(
      <Dashboard
        status={createMockDashboardStatus()}
        approvalClient={{
          decideApproval: async (id, decision) => {
            decisions.push({ id, decision });
          }
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Approve approval_demo_001" }));

    await waitFor(() => {
      expect(decisions).toEqual([{ id: "approval_demo_001", decision: "approved" }]);
    });
    expect(screen.getByText("approval_demo_001 approved")).toBeTruthy();
  });

  it("cancels a runtime task through the daemon task client", async () => {
    const cancellations: string[] = [];
    render(
      <Dashboard
        status={createMockDashboardStatus()}
        taskClient={{
          cancelTask: async (id) => {
            cancellations.push(id);
          }
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel task_demo_001" }));

    await waitFor(() => {
      expect(cancellations).toEqual(["task_demo_001"]);
    });
    expect(screen.getAllByText("Status: cancelled").length).toBeGreaterThan(0);
    expect(screen.getByText("task_cancelled")).toBeTruthy();
    expect(screen.getByText("task_demo_001 cancelled")).toBeTruthy();
  });

  it("renders engineering failed verification summary and next action", () => {
    render(
      <Dashboard
        status={{
          ...createMockDashboardStatus(),
          engineering: {
            tasks: [
              {
                id: "intake_failed_verification",
                title: "Fix failed build",
                status: "failed",
                lastCommand: "pnpm build",
                failedVerification: {
                  command: "pnpm build",
                  summary: "pnpm build failed with exit code 2.",
                  likelyNextAction: "Fix the TypeScript/build error, then rerun pnpm build.",
                  outputSummary: "src/app.ts(12,5): error TS2304: Cannot find name 'missingValue'."
                }
              }
            ]
          }
        }}
      />
    );

    expect(screen.getByText("Failure: pnpm build failed with exit code 2.")).toBeTruthy();
    expect(screen.getByText("Next action: Fix the TypeScript/build error, then rerun pnpm build.")).toBeTruthy();
    expect(screen.getByText("Failure output: src/app.ts(12,5): error TS2304: Cannot find name 'missingValue'.")).toBeTruthy();
  });

  it("renders engineering code review report findings", () => {
    render(
      <Dashboard
        status={{
          ...createMockDashboardStatus(),
          engineering: {
            tasks: [
              {
                id: "intake_review_report",
                title: "Review report",
                status: "completed",
                reviewReport: {
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
                }
              }
            ]
          }
        }}
      />
    );

    expect(screen.getByText("Review finding: high bug src/runner.ts:12 Cancellation result is ignored.")).toBeTruthy();
    expect(screen.getByText("Review finding: low style src/view.ts:40 Name can be clearer.")).toBeTruthy();
  });

  it("renders engineering workflow risk review context", () => {
    render(
      <Dashboard
        status={{
          ...createMockDashboardStatus(),
          engineering: {
            tasks: [
              {
                id: "intake_risk_review",
                title: "Risk review",
                status: "planned",
                riskReview: {
                  kind: "destructive_command",
                  target: "rm -rf memory",
                  approvalRequired: true,
                  riskLevel: "critical",
                  reason: "Destructive command requires approval: rm -rf memory"
                }
              }
            ]
          }
        }}
      />
    );

    expect(screen.getByText("Risk review: critical destructive_command rm -rf memory")).toBeTruthy();
    expect(screen.getByText("Approval required: yes")).toBeTruthy();
    expect(screen.getByText("Risk reason: Destructive command requires approval: rm -rf memory")).toBeTruthy();
  });

  it("filters logs by category", () => {
    render(
      <Dashboard
        status={{
          ...createMockDashboardStatus(),
          logs: [
            {
              id: "event_error",
              category: "error",
              eventType: "task_failed",
              summary: "Task failed"
            },
            {
              id: "event_usage",
              category: "usage",
              eventType: "llm_usage",
              summary: "Usage recorded"
            }
          ]
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Show error logs" }));

    expect(screen.getByText("Task failed")).toBeTruthy();
    expect(screen.queryByText("Usage recorded")).toBeNull();
  });

  it("handles basic local chat slash commands", () => {
    render(<Dashboard status={createMockDashboardStatus()} />);

    fireEvent.change(screen.getByLabelText("Chat command"), {
      target: {
        value: "/usage"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send chat command" }));

    expect(screen.getByText("Usage: $0, 0 calls, 0 failed.")).toBeTruthy();
  });

  it("renders M18 operations surfaces for settings validation, memory details, task details, and approval risk context", () => {
    render(
      <Dashboard
        status={{
          ...createMockDashboardStatus(),
          memory: {
            entries: 2,
            indexPath: "memory/wiki/index.md",
            recentTitles: ["Dore", "Trading policy"],
            records: [
              {
                title: "Trading policy",
                path: "wiki/trading/policy.md",
                type: "trading",
                status: "active",
                sourceRefs: ["raw/inbox/trading-policy.md"],
                stale: true,
                conflicts: ["Risk limit differs from latest note."],
                sensitivity: "personal"
              }
            ],
            quality: {
              duplicateSuggestions: 1,
              staleRecords: 1,
              conflictRecords: 1,
              duplicateTitles: ["Trading policy", "Trading policy notes"],
              staleTitles: ["Trading policy"],
              conflictTitles: ["Trading policy"]
            }
          },
          approvals: [
            {
              id: "approval_trade",
              title: "Approve paper order review",
              riskLevel: "trade",
              state: "pending",
              summary: "Review simulated order before journaling.",
              requestedAction: {
                kind: "external_api_call",
                target: "paper-trading",
                dryRunAvailable: true,
                reversible: false
              }
            }
          ],
          logs: [
            {
              id: "event_trade",
              category: "trading",
              eventType: "paper_journal_written",
              summary: "AAPL paper journal written"
            },
            {
              id: "event_usage",
              category: "usage",
              eventType: "llm_usage",
              summary: "Usage recorded"
            }
          ],
          scheduler: {
            jobs: [
              {
                id: "daily_briefing_0600_kst",
                time: "06:00",
                timezone: "Asia/Seoul",
                enabled: true,
                lastRunAt: "2026-06-22T06:00:00+09:00",
                lastRunStatus: "generated",
                recentRuns: [
                  {
                    id: "event_daily_briefing",
                    jobId: "daily_briefing_0600_kst",
                    time: "2026-06-22T06:00:00+09:00",
                    status: "generated",
                    summary: "Daily briefing generated."
                  }
                ]
              }
            ]
          }
        }}
      />
    );

    expect(screen.getByText("Config Validation")).toBeTruthy();
    expect(screen.getByText("Provider OpenAI: missing")).toBeTruthy();
    expect(screen.getByText("Memory Explorer")).toBeTruthy();
    expect(screen.getByText("Duplicate suggestions: 1")).toBeTruthy();
    expect(screen.getByText("Stale records: 1")).toBeTruthy();
    expect(screen.getByText("Conflict records: 1")).toBeTruthy();
    expect(screen.getByText("Duplicate candidates: Trading policy, Trading policy notes")).toBeTruthy();
    expect(screen.getByText("Stale candidates: Trading policy")).toBeTruthy();
    expect(screen.getByText("Conflict candidates: Trading policy")).toBeTruthy();
    expect(screen.getByText("Path: wiki/trading/policy.md")).toBeTruthy();
    expect(screen.getByText("Source: raw/inbox/trading-policy.md")).toBeTruthy();
    expect(screen.getByText("Stale: yes")).toBeTruthy();
    expect(screen.getByText("Conflict: Risk limit differs from latest note.")).toBeTruthy();
    expect(screen.getByText("Risk context: trade")).toBeTruthy();
    expect(screen.getByText("Action: external_api_call -> paper-trading")).toBeTruthy();
    expect(screen.getByText("Dry-run available: yes")).toBeTruthy();
    expect(screen.getByText("Reversible: no")).toBeTruthy();
    expect(screen.getByText("Priority: high")).toBeTruthy();
    expect(screen.getByText("Schedule: daily_briefing_0600_kst at 06:00 Asia/Seoul")).toBeTruthy();
    expect(screen.getByText("Enabled: yes")).toBeTruthy();
    expect(screen.getByText("Last run: generated at 2026-06-22T06:00:00+09:00")).toBeTruthy();
    expect(screen.getByText("Recent run: generated Daily briefing generated.")).toBeTruthy();
  });

  it("searches logs by text as well as category", () => {
    render(
      <Dashboard
        status={{
          ...createMockDashboardStatus(),
          logs: [
            {
              id: "event_trade",
              category: "trading",
              eventType: "paper_journal_written",
              summary: "AAPL paper journal written"
            },
            {
              id: "event_usage",
              category: "usage",
              eventType: "llm_usage",
              summary: "Usage recorded"
            }
          ]
        }}
      />
    );

    fireEvent.change(screen.getByLabelText("Search logs"), {
      target: {
        value: "paper"
      }
    });

    expect(screen.getByText("AAPL paper journal written")).toBeTruthy();
    expect(screen.queryByText("Usage recorded")).toBeNull();
  });

  it("filters logs by ISO date", () => {
    render(
      <Dashboard
        status={{
          ...createMockDashboardStatus(),
          logs: [
            {
              id: "event_today",
              category: "action",
              eventType: "briefing_generated",
              summary: "Today briefing generated",
              time: "2026-06-22T06:00:00+09:00"
            },
            {
              id: "event_yesterday",
              category: "action",
              eventType: "briefing_generated",
              summary: "Yesterday briefing generated",
              time: "2026-06-21T06:00:00+09:00"
            }
          ]
        }}
      />
    );

    fireEvent.change(screen.getByLabelText("Log date"), {
      target: {
        value: "2026-06-22"
      }
    });

    expect(screen.getByText("Today briefing generated")).toBeTruthy();
    expect(screen.queryByText("Yesterday briefing generated")).toBeNull();
  });
});
