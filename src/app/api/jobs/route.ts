import { NextResponse } from "next/server";
import { createJobId, insertJob } from "@/lib/jobs/store";
import { startJob } from "@/lib/jobs/worker";
import { resolveDurationTargetSec } from "@/lib/motion/duration";
import type { AspectRatio, ReferenceImage } from "@/lib/motion/types";

export const runtime = "nodejs";

/**
 * Single unified job creation endpoint.
 * Every prompt goes through the Director → MotionProject pipeline.
 * `localDemo` is an explicit, development-only flag (default false):
 * a client that does not set it will NOT silently skip OpenAI.
 */
export async function POST(request: Request) {
  let body: {
    prompt?: string;
    aspectRatio?: AspectRatio;
    durationTargetSec?: number;
    voiceoverEnabled?: boolean;
    localDemo?: boolean;
    referenceImages?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const aspectRatio: AspectRatio =
    body.aspectRatio === "9:16" || body.aspectRatio === "1:1" ? body.aspectRatio : "16:9";

  const localDemo = body.localDemo === true;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt && !localDemo) {
    return NextResponse.json(
      { error: "prompt is required (or set localDemo: true for the dev fixture)" },
      { status: 400 },
    );
  }

  // Prompt wording wins (e.g. "5-second") — never silently force 18s.
  const durationTargetSec = resolveDurationTargetSec({
    prompt,
    bodyDuration: body.durationTargetSec,
    fallbackSec: 12,
  });
  const voiceoverEnabled = body.voiceoverEnabled === true;

  // Trust nothing from the body: rebuild each descriptor from known-good
  // fields, and only accept ids that point inside our own uploads folder.
  const referenceImages: ReferenceImage[] = Array.isArray(body.referenceImages)
    ? body.referenceImages
        .map((raw) => (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null))
        .filter((r): r is Record<string, unknown> => r != null)
        .filter((r) => typeof r.id === "string" && /^ref_[a-z0-9_]+$/i.test(r.id))
        .map((r) => ({
          id: String(r.id),
          url: `/uploads/${String(r.id)}.png`,
          width: Number(r.width) || 0,
          height: Number(r.height) || 0,
          name: typeof r.name === "string" ? r.name.slice(0, 120) : undefined,
        }))
        .slice(0, 6)
    : [];

  const id = createJobId();
  insertJob({
    id,
    prompt: prompt || "DTCPill dev fixture",
    aspectRatio,
    durationTargetSec,
    voiceoverEnabled,
    localDemo,
    referenceImages,
  });

  startJob(id);

  return NextResponse.json({ id, durationTargetSec }, { status: 201 });
}
