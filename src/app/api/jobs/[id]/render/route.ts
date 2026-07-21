import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs/store";
import { enqueueRerender } from "@/lib/jobs/worker";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const job = getJob(id);
  if (!job?.project) {
    return NextResponse.json({ error: "Job/project not found" }, { status: 404 });
  }
  // Serialized through the worker so a rerender never collides with an
  // in-flight job (single-flight guard + atomic claim).
  enqueueRerender(id);
  return NextResponse.json({ ok: true, id });
}
