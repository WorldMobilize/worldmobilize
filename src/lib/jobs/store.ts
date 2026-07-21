import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { JobProgress, JobStatus, MotionJob, MotionProject } from "@/lib/motion/types";

// Keeps the pre-rename filename on purpose: renaming it would orphan existing
// job history, and the file is local-only so it carries none of the naming risk.
// Rename with the dev server stopped and the WAL checkpointed, or not at all.
const DB_PATH = path.join(process.cwd(), "data", "motionvid.db");

type JobRow = {
  id: string;
  status: string;
  prompt: string;
  project_json: string | null;
  progress_json: string;
  error: string | null;
  logs_json: string;
  output_path: string | null;
  aspect_ratio: string;
  duration_target: number;
  voiceover_enabled: number;
  local_demo?: number;
  dirty_scenes_json?: string | null;
  created_at: number;
  updated_at: number;
};

let dbSingleton: Database.Database | null = null;

function defaultProgress(status: JobStatus = "queued"): JobProgress {
  return { stage: status, completedScenes: 0, totalScenes: 0, currentScene: null };
}

function rowToJob(row: JobRow): MotionJob {
  return {
    id: row.id,
    prompt: row.prompt,
    status: row.status as JobStatus,
    project: row.project_json ? (JSON.parse(row.project_json) as MotionProject) : null,
    progress: JSON.parse(row.progress_json) as JobProgress,
    logs: JSON.parse(row.logs_json) as string[],
    outputUrl: row.output_path,
    error: row.error,
    aspectRatio: row.aspect_ratio as MotionJob["aspectRatio"],
    durationTargetSec: row.duration_target,
    voiceoverEnabled: !!row.voiceover_enabled,
    localDemo: !!row.local_demo,
    dirtySceneIds: row.dirty_scenes_json ? (JSON.parse(row.dirty_scenes_json) as string[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getDb(): Database.Database {
  if (dbSingleton) return dbSingleton;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      prompt TEXT NOT NULL,
      project_json TEXT,
      progress_json TEXT NOT NULL,
      error TEXT,
      logs_json TEXT NOT NULL,
      output_path TEXT,
      aspect_ratio TEXT NOT NULL,
      duration_target REAL NOT NULL,
      voiceover_enabled INTEGER NOT NULL,
      local_demo INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN local_demo INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // already exists
  }
  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN dirty_scenes_json TEXT`);
  } catch {
    // already exists
  }
  dbSingleton = db;
  return db;
}

export function createJobId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function insertJob(input: {
  id: string;
  prompt: string;
  aspectRatio: MotionJob["aspectRatio"];
  durationTargetSec: number;
  voiceoverEnabled: boolean;
  localDemo?: boolean;
}): MotionJob {
  const db = getDb();
  const now = Date.now();
  const job: MotionJob = {
    id: input.id,
    prompt: input.prompt,
    status: "queued",
    project: null,
    progress: defaultProgress("queued"),
    logs: ["Job created"],
    outputUrl: null,
    error: null,
    aspectRatio: input.aspectRatio,
    durationTargetSec: input.durationTargetSec,
    voiceoverEnabled: input.voiceoverEnabled,
    localDemo: !!input.localDemo,
    dirtySceneIds: [],
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO jobs (id, status, prompt, project_json, progress_json, error, logs_json, output_path, aspect_ratio, duration_target, voiceover_enabled, local_demo, created_at, updated_at)
     VALUES (@id, @status, @prompt, @project_json, @progress_json, @error, @logs_json, @output_path, @aspect_ratio, @duration_target, @voiceover_enabled, @local_demo, @created_at, @updated_at)`,
  ).run({
    id: job.id,
    status: job.status,
    prompt: job.prompt,
    project_json: null,
    progress_json: JSON.stringify(job.progress),
    error: null,
    logs_json: JSON.stringify(job.logs),
    output_path: null,
    aspect_ratio: job.aspectRatio,
    duration_target: job.durationTargetSec,
    voiceover_enabled: job.voiceoverEnabled ? 1 : 0,
    local_demo: job.localDemo ? 1 : 0,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  });
  return job;
}

export function getJob(id: string): MotionJob | null {
  const row = getDb().prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as JobRow | undefined;
  return row ? rowToJob(row) : null;
}

export function appendJobLog(id: string, message: string): void {
  const job = getJob(id);
  if (!job) return;
  const logs = [...job.logs, message];
  getDb()
    .prepare(`UPDATE jobs SET logs_json = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(logs), Date.now(), id);
}

export function updateJob(
  id: string,
  patch: Partial<{
    status: JobStatus;
    project: MotionProject | null;
    progress: JobProgress;
    error: string | null;
    outputUrl: string | null;
  }>,
): MotionJob | null {
  const job = getJob(id);
  if (!job) return null;
  const next: MotionJob = {
    ...job,
    ...patch,
    progress: patch.progress
      ? patch.progress
      : patch.status
        ? { ...job.progress, stage: patch.status }
        : job.progress,
    updatedAt: Date.now(),
  };
  getDb()
    .prepare(
      `UPDATE jobs SET status=?, project_json=?, progress_json=?, error=?, output_path=?, updated_at=? WHERE id=?`,
    )
    .run(
      next.status,
      next.project ? JSON.stringify(next.project) : null,
      JSON.stringify(next.progress),
      next.error,
      next.outputUrl,
      next.updatedAt,
      id,
    );
  return next;
}

export function claimNextQueuedJob(): MotionJob | null {
  const db = getDb();
  const tx = db.transaction(() => {
    const row = db
      .prepare(`SELECT * FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1`)
      .get() as JobRow | undefined;
    if (!row) return null;
    db.prepare(`UPDATE jobs SET status = 'directing', updated_at = ? WHERE id = ?`).run(
      Date.now(),
      row.id,
    );
    return getJob(row.id);
  });
  return tx();
}

/** Best-effort removal of an orphaned frame dir for a crashed job. */
function removeJobFrames(jobId: string): void {
  const framesPath = path.join(process.cwd(), "public", "generated", jobId, "frames");
  try {
    fs.rmSync(framesPath, { recursive: true, force: true });
  } catch {
    // Non-fatal: recovery must not throw over a leftover temp dir.
  }
}

export function recoverStuckJobs(): number {
  const db = getDb();
  const running = ["directing", "preparing_assets", "rendering_scenes", "composing"];
  const now = Date.now();
  const staleMs = 2 * 60 * 1000;
  const rows = db
    .prepare(
      `SELECT id, status, updated_at FROM jobs WHERE status IN (${running.map(() => "?").join(",")})`,
    )
    .all(...running) as { id: string; status: string; updated_at: number }[];
  let n = 0;
  for (const r of rows) {
    const age = now - r.updated_at;
    if (age < staleMs) continue;
    if (age > 30 * 60 * 1000) {
      // A crash mid-export (process killed, not a thrown error) skips the
      // exporter's finally block, so its frame dir is orphaned. This is the only
      // path that reclaims those, since the job never resumes.
      removeJobFrames(r.id);
      updateJob(r.id, { status: "failed", error: "Job stuck after restart; marked failed." });
      appendJobLog(r.id, "Recovered as failed (stuck > 30m)");
    } else {
      db.prepare(`UPDATE jobs SET status='queued', updated_at=? WHERE id=?`).run(now, r.id);
      appendJobLog(r.id, "Recovered to queued (stale running stage)");
    }
    n++;
  }
  return n;
}

export function markScenesDirty(id: string, sceneIds: string[]): void {
  const job = getJob(id);
  if (!job) return;
  const next = Array.from(new Set([...job.dirtySceneIds, ...sceneIds]));
  getDb()
    .prepare(`UPDATE jobs SET dirty_scenes_json = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(next), Date.now(), id);
}

export function clearDirtyScenes(id: string, sceneIds?: string[]): void {
  const job = getJob(id);
  if (!job) return;
  const next = sceneIds ? job.dirtySceneIds.filter((s) => !sceneIds.includes(s)) : [];
  getDb()
    .prepare(`UPDATE jobs SET dirty_scenes_json = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(next), Date.now(), id);
}
