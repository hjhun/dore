import { describe, expect, it } from "vitest";
import { createDailyBriefingJob, InMemoryScheduleRegistry } from "./index.js";

describe("scheduler", () => {
  it("registers the daily briefing job at 06:00 KST", () => {
    const registry = new InMemoryScheduleRegistry();

    const job = createDailyBriefingJob(registry, {
      time: "06:00",
      timezone: "Asia/Seoul"
    });

    expect(job.id).toBe("daily_briefing_0600_kst");
    expect(job.time).toBe("06:00");
    expect(job.timezone).toBe("Asia/Seoul");
    expect(registry.list()).toContainEqual(job);
  });

  it("rejects invalid daily briefing time", () => {
    const registry = new InMemoryScheduleRegistry();

    expect(() =>
      createDailyBriefingJob(registry, {
        time: "6am",
        timezone: "Asia/Seoul"
      })
    ).toThrow(/HH:mm/);
  });
});

