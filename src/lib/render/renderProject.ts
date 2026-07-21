import path from "node:path";
import { prepareProjectAssets } from "@/lib/motion/assets";
import type { MotionProject } from "@/lib/motion/types";
import { assertFfmpegAvailable } from "@/lib/render/ffmpegExpressions";
import { composeSceneVideos, renderScene } from "@/lib/render/renderScene";

export type RenderProgress = {
  completedScenes: number;
  totalScenes: number;
  currentScene: string | null;
};

export async function renderMotionProject(args: {
  project: MotionProject;
  voicePath?: string | null;
  onProgress?: (p: RenderProgress) => void;
}): Promise<{ finalPath: string; scenePaths: string[]; outputUrl: string }> {
  await assertFfmpegAvailable();
  const assets = await prepareProjectAssets(args.project);
  const enabled = args.project.scenes.filter((s) => s.enabled !== false);
  const scenePaths: string[] = [];

  for (let i = 0; i < enabled.length; i++) {
    const scene = enabled[i]!;
    args.onProgress?.({
      completedScenes: i,
      totalScenes: enabled.length,
      currentScene: scene.id,
    });
    const p = await renderScene({
      project: args.project,
      scene,
      assets,
      index: i,
    });
    scenePaths.push(p);
  }

  args.onProgress?.({
    completedScenes: enabled.length,
    totalScenes: enabled.length,
    currentScene: null,
  });

  const finalPath = await composeSceneVideos({
    project: args.project,
    scenePaths,
    voicePath: args.voicePath ?? null,
  });

  return {
    finalPath,
    scenePaths,
    outputUrl: `/generated/${args.project.id}/final.mp4`,
  };
}

export function scenePublicUrl(jobId: string, index: number) {
  const pad = String(index + 1).padStart(2, "0");
  return `/generated/${jobId}/scenes/scene_${pad}.mp4`;
}

export function finalPublicUrl(jobId: string) {
  return `/generated/${jobId}/final.mp4`;
}

export function projectJsonPath(jobId: string) {
  return path.join(process.cwd(), "public", "generated", jobId, "project.json");
}
