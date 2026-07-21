import { appendJobLog, claimNextQueuedJob, recoverStuckJobs, updateJob } from "@/lib/jobs/store";
import { rerenderJob, runJob } from "@/lib/pipeline/runJob";

type GlobalWorker = {
  booted: boolean;
  running: boolean;
  timer: ReturnType<typeof setInterval> | null;
  rerenderIds: Set<string>;
};

function state(): GlobalWorker {
  const g = globalThis as typeof globalThis & { __kinettaWorker?: GlobalWorker };
  if (!g.__kinettaWorker) {
    g.__kinettaWorker = {
      booted: false,
      running: false,
      timer: null,
      rerenderIds: new Set(),
    };
  }
  return g.__kinettaWorker;
}

async function tick(): Promise<void> {
  const s = state();
  if (s.running) return;
  s.running = true;
  try {
    const job = claimNextQueuedJob();
    if (!job) return;
    const isRerender = s.rerenderIds.has(job.id);
    if (isRerender) s.rerenderIds.delete(job.id);
    if (isRerender) await rerenderJob(job.id);
    else await runJob(job.id);
  } catch (err) {
    console.error("[kinetta worker]", err);
  } finally {
    s.running = false;
  }
}

export function ensureWorker(): void {
  const s = state();
  if (!s.booted) {
    s.booted = true;
    recoverStuckJobs();
  }
  if (!s.timer) {
    s.timer = setInterval(() => {
      void tick();
    }, 1500);
  }
}

/** Run this job now (fire-and-forget). */
export function startJob(jobId: string): void {
  ensureWorker();
  void (async () => {
    const s = state();
    if (s.running) {
      // Interval will pick it up when free
      return;
    }
    s.running = true;
    try {
      const isRerender = s.rerenderIds.has(jobId);
      if (isRerender) {
        s.rerenderIds.delete(jobId);
        await rerenderJob(jobId);
      } else {
        await runJob(jobId);
      }
    } catch (err) {
      console.error("[kinetta startJob]", err);
      updateJob(jobId, {
        status: "failed",
        error: err instanceof Error ? err.message : "Worker failed",
      });
    } finally {
      s.running = false;
      setTimeout(() => {
        void tick();
      }, 0);
    }
  })();
}

export function enqueueRerender(jobId: string): void {
  state().rerenderIds.add(jobId);
  appendJobLog(jobId, "Rerender requested");
  updateJob(jobId, { status: "queued", error: null });
  startJob(jobId);
}
