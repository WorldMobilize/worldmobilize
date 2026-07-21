import fs from "node:fs";
import path from "node:path";
import { getJob } from "@/lib/jobs/store";
import type { ProjectAsset } from "@/lib/motion/types";
import { RenderStage } from "./RenderStage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ t?: string }>;
};

function loadAssets(jobId: string): ProjectAsset[] {
  try {
    const p = path.join(process.cwd(), "public", "generated", jobId, "assets.json");
    return JSON.parse(fs.readFileSync(p, "utf8")) as ProjectAsset[];
  } catch {
    return [];
  }
}

export default async function RenderPage({ params, searchParams }: PageProps) {
  const { jobId } = await params;
  const { t } = await searchParams;
  const job = getJob(jobId);

  if (!job?.project) {
    return <div style={{ color: "#fff", padding: 24 }}>No project for {jobId}</div>;
  }

  const initialMs = Number(t) || 0;
  const assets = loadAssets(jobId);

  return <RenderStage project={job.project} assets={assets} initialMs={initialMs} />;
}
