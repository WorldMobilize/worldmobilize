import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs/store";
import { ensureWorker, startJob } from "@/lib/jobs/worker";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Polling also keeps the worker alive and re-kicks jobs left in "queued"
  // (e.g. after a server restart or a hung previous export).
  ensureWorker();
  if (job.status === "queued") startJob(id);

  return NextResponse.json(getJob(id) ?? job);
}
