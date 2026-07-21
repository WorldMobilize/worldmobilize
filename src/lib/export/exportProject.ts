import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { framesDir as framesDirFor, jobDir, prepareProjectAssets } from "@/lib/motion/assets";
import type { MotionProject } from "@/lib/motion/types";
import { sceneWindows } from "@/lib/motion/timing";
import { assertFfmpegAvailable } from "@/lib/render/ffmpegExpressions";
import { encodeFramesToMp4 } from "@/lib/export/encodeVideo";
import { exportFrames, playwrightAvailable } from "@/lib/export/frameExport";

export type ExportProgress = {
  stage: "frames" | "encoding";
  done: number;
  total: number;
};

export type ExportResult = {
  finalPath: string;
  outputUrl: string;
  frameCount: number;
};

/**
 * Browser-parity export: render the MotionProject frame-by-frame via Playwright
 * (identical to the editor preview), then encode with FFmpeg and mux audio.
 */
export async function exportProjectVideo(args: {
  project: MotionProject;
  voicePath?: string | null;
  baseUrl?: string;
  onProgress?: (p: ExportProgress) => void;
}): Promise<ExportResult> {
  const { project } = args;
  await assertFfmpegAvailable();
  await prepareProjectAssets(project);

  // Cleanup lives in `finally`: frames are hundreds of MB and previously only got
  // removed after a *successful* encode, so a failure anywhere in export/encode
  // orphaned the whole frame dir on disk. The path is deterministic, so we don't
  // need the exportFrames return value to reclaim it.
  const dir = framesDirFor(project.id);
  try {
    const { framesDir, frameCount, fps } = await exportFrames({
      jobId: project.id,
      project,
      baseUrl: args.baseUrl,
      onProgress: (done, total) => args.onProgress?.({ stage: "frames", done, total }),
    });

    const finalPath = path.join(jobDir(project.id), "final.mp4");
    args.onProgress?.({ stage: "encoding", done: 0, total: 1 });
    await encodeFramesToMp4({
      framesDir,
      fps,
      outPath: finalPath,
      audioPath: args.voicePath ?? null,
      jobId: project.id,
    });
    args.onProgress?.({ stage: "encoding", done: 1, total: 1 });

    return { finalPath, outputUrl: `/generated/${project.id}/final.mp4`, frameCount };
  } finally {
    // Frames are large; drop them whether the export succeeded or threw.
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export type SceneExportResult = {
  finalPath: string;
  outputUrl: string;
  frameCount: number;
  sceneId: string;
};

/**
 * Render a single scene's time window to its own MP4. Used by the per-scene
 * re-render endpoint so an edit to one scene doesn't require a full export.
 */
export async function exportSceneVideo(args: {
  project: MotionProject;
  sceneId: string;
  baseUrl?: string;
  onProgress?: (p: ExportProgress) => void;
}): Promise<SceneExportResult> {
  const { project, sceneId } = args;
  await assertFfmpegAvailable();
  await prepareProjectAssets(project);

  const windows = sceneWindows(project);
  const win = windows.find((w) => w.scene.id === sceneId);
  if (!win) throw new Error(`Scene ${sceneId} not found in project`);

  const scenesDir = path.join(jobDir(project.id), "scenes");
  const sceneFramesDir = path.join(scenesDir, `.frames-${sceneId}`);
  try {
    const { framesDir, frameCount, fps, startFrame } = await exportFrames({
      jobId: project.id,
      project,
      baseUrl: args.baseUrl,
      timeRangeMs: { startMs: win.startMs, endMs: win.endMs },
      outDir: sceneFramesDir,
      onProgress: (done, total) => args.onProgress?.({ stage: "frames", done, total }),
    });

    await mkdir(scenesDir, { recursive: true });
    const finalPath = path.join(scenesDir, `${sceneId}.mp4`);
    args.onProgress?.({ stage: "encoding", done: 0, total: 1 });
    await encodeFramesToMp4({
      framesDir,
      fps,
      outPath: finalPath,
      audioPath: null,
      jobId: project.id,
      startNumber: startFrame,
    });
    args.onProgress?.({ stage: "encoding", done: 1, total: 1 });

    return {
      finalPath,
      outputUrl: `/generated/${project.id}/scenes/${sceneId}.mp4`,
      frameCount,
      sceneId,
    };
  } finally {
    await rm(sceneFramesDir, { recursive: true, force: true }).catch(() => {});
  }
}

export { playwrightAvailable };
