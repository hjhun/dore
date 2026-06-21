import { render, screen } from "@testing-library/react";
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
});

