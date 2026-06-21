import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByText("Dry-run entries: 0")).toBeTruthy();
    expect(screen.getByText("Approvals")).toBeTruthy();
    expect(screen.getByText("Logs")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Engineering")).toBeTruthy();
    expect(screen.getByText("approval_demo_001")).toBeTruthy();
    expect(screen.getByText("daemon_status_loaded")).toBeTruthy();
    expect(screen.getByText("intake_demo_001")).toBeTruthy();
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
});
