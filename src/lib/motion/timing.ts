import type { MotionLayer, MotionProject, MotionScene } from "@/lib/motion/types";

export function projectDurationMs(project: MotionProject): number {
  const enabled = project.scenes.filter((s) => s.enabled !== false);
  return enabled.reduce((acc, s) => acc + s.durationSec * 1000, 0);
}

export type SceneWindow = {
  scene: MotionScene;
  index: number;
  startMs: number;
  endMs: number;
};

/** Ordered windows for enabled scenes, with absolute start/end in ms. */
export function sceneWindows(project: MotionProject): SceneWindow[] {
  const windows: SceneWindow[] = [];
  let cursor = 0;
  const enabled = project.scenes.filter((s) => s.enabled !== false);
  enabled.forEach((scene, index) => {
    const startMs = cursor;
    const endMs = startMs + scene.durationSec * 1000;
    windows.push({ scene, index, startMs, endMs });
    cursor = endMs;
  });
  return windows;
}

export type ActiveScene = {
  scene: MotionScene;
  index: number;
  startMs: number;
  endMs: number;
  sceneLocalMs: number;
};

/** Resolve which enabled scene is active at an absolute project time (ms). */
export function activeSceneAt(project: MotionProject, timeMs: number): ActiveScene | null {
  const windows = sceneWindows(project);
  if (windows.length === 0) return null;

  const clamped = Math.max(0, timeMs);
  for (const w of windows) {
    if (clamped >= w.startMs && clamped < w.endMs) {
      return { ...w, sceneLocalMs: clamped - w.startMs };
    }
  }
  const last = windows[windows.length - 1]!;
  return { ...last, sceneLocalMs: last.endMs - last.startMs };
}

/** Whether a layer is visible at a given scene-local time (ms). */
export function isLayerVisible(layer: MotionLayer, sceneLocalMs: number): boolean {
  if (layer.enabled === false) return false;
  const startMs = layer.startSec * 1000;
  const endMs = startMs + layer.durationSec * 1000;
  return sceneLocalMs >= startMs && sceneLocalMs <= endMs;
}

/** Convert scene-local time to layer-local time (ms), clamped to the layer lifetime. */
export function layerLocalTimeMs(layer: MotionLayer, sceneLocalMs: number): number {
  const startMs = layer.startSec * 1000;
  const durMs = layer.durationSec * 1000;
  return Math.max(0, Math.min(durMs, sceneLocalMs - startMs));
}
