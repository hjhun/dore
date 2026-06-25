export interface ScheduledJob {
  id: string;
  kind: "daily_briefing";
  time: string;
  timezone: string;
  enabled: boolean;
  run?: () => Promise<ScheduledJobHandlerResult>;
}

export interface ScheduleRegistry {
  register(job: ScheduledJob): ScheduledJob;
  list(): ScheduledJob[];
  get(id: string): ScheduledJob | undefined;
}

export interface ScheduledJobHandlerResult {
  status: "generated" | "partial" | "failed";
  output_ref?: string;
}

export interface ScheduledJobExecutionResult {
  job_id: string;
  status: "completed" | "failed";
  output_ref?: string;
  error_code?: string;
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

  get(id: string): ScheduledJob | undefined {
    return this.jobs.get(id);
  }
}

export function createDailyBriefingJob(
  registry: ScheduleRegistry,
  options: { time: string; timezone: string; run?: () => Promise<ScheduledJobHandlerResult> }
): ScheduledJob {
  if (!/^\d{2}:\d{2}$/.test(options.time)) {
    throw new Error("Daily briefing time must use HH:mm format.");
  }

  const job: ScheduledJob = {
    id: options.time === "06:00" && options.timezone === "Asia/Seoul" ? "daily_briefing_0600_kst" : `daily_briefing_${options.time.replace(":", "")}`,
    kind: "daily_briefing",
    time: options.time,
    timezone: options.timezone,
    enabled: true,
    run: options.run
  };

  return registry.register(job);
}

export async function executeScheduledJob(
  registry: ScheduleRegistry,
  jobId: string
): Promise<ScheduledJobExecutionResult> {
  const job = registry.get(jobId);
  if (!job || !job.enabled || !job.run) {
    return {
      job_id: jobId,
      status: "failed",
      error_code: "scheduled_job_not_runnable"
    };
  }

  try {
    const result = await job.run();
    return {
      job_id: job.id,
      status: result.status === "failed" ? "failed" : "completed",
      output_ref: result.output_ref,
      error_code: result.status === "failed" ? "scheduled_job_failed" : undefined
    };
  } catch {
    return {
      job_id: job.id,
      status: "failed",
      error_code: "scheduled_job_failed"
    };
  }
}
