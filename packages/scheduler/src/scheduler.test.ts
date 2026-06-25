import { describe, expect, it } from "vitest";
import { createDailyBriefingJob, executeScheduledJob, InMemoryScheduleRegistry } from "./index.js";

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

  it("executes a registered daily briefing job handler", async () => {
    const registry = new InMemoryScheduleRegistry();
    let runs = 0;
    const job = createDailyBriefingJob(registry, {
      time: "06:00",
      timezone: "Asia/Seoul",
      run: async () => {
        runs += 1;
        return {
          status: "partial",
          output_ref: "memory/logs/daily/2026-06-22.json"
        };
      }
    });

    const result = await executeScheduledJob(registry, job.id);

    expect(runs).toBe(1);
    expect(result).toMatchObject({
      job_id: "daily_briefing_0600_kst",
      status: "completed",
      output_ref: "memory/logs/daily/2026-06-22.json"
    });
  });

  it("records scheduled job handler failures", async () => {
    const registry = new InMemoryScheduleRegistry();
    const job = createDailyBriefingJob(registry, {
      time: "06:00",
      timezone: "Asia/Seoul",
      run: async () => {
        throw new Error("briefing failed");
      }
    });

    const result = await executeScheduledJob(registry, job.id);

    expect(result).toMatchObject({
      job_id: "daily_briefing_0600_kst",
      status: "failed",
      error_code: "scheduled_job_failed"
    });
  });
});
