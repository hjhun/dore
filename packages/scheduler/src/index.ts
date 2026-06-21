export interface ScheduledJob {
  id: string;
  kind: "daily_briefing";
  time: string;
  timezone: string;
  enabled: boolean;
}

export interface ScheduleRegistry {
  register(job: ScheduledJob): ScheduledJob;
  list(): ScheduledJob[];
}

export class InMemoryScheduleRegistry implements ScheduleRegistry {
  private readonly jobs = new Map<string, ScheduledJob>();

  register(job: ScheduledJob): ScheduledJob {
    this.jobs.set(job.id, job);
    return job;
  }

  list(): ScheduledJob[] {
    return [...this.jobs.values()];
  }
}

export function createDailyBriefingJob(
  registry: ScheduleRegistry,
  options: { time: string; timezone: string }
): ScheduledJob {
  if (!/^\d{2}:\d{2}$/.test(options.time)) {
    throw new Error("Daily briefing time must use HH:mm format.");
  }

  const job: ScheduledJob = {
    id: options.time === "06:00" && options.timezone === "Asia/Seoul" ? "daily_briefing_0600_kst" : `daily_briefing_${options.time.replace(":", "")}`,
    kind: "daily_briefing",
    time: options.time,
    timezone: options.timezone,
    enabled: true
  };

  return registry.register(job);
}

