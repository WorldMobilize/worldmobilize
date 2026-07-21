import { NextResponse } from "next/server";
import { clearDirtyScenes, getJob } from "@/lib/jobs/store";
import { exportSceneVideo, playwrightAvailable } from "@/lib/export/exportProject";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string; sceneId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id, sceneId } = await context.params;
  const job = getJob(id);
  if (!job?.project) {
    return NextResponse.json({ error: "Job/project not found" }, { status: 404 });
  }

  const scene = job.project.scenes.find((s) => s.id === sceneId);
  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  if (!(await playwrightAvailable())) {
    return NextResponse.json(
      { error: "Playwright is not installed; cannot render a scene preview." },
      { status: 501 },
    );
  }

  try {
    const result = await exportSceneVideo({ project: job.project, sceneId });
    clearDirtyScenes(id, [sceneId]);
    return NextResponse.json({
      ok: true,
      sceneId,
      outputUrl: result.outputUrl,
      frameCount: result.frameCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
