import { findTrack, resolveAnimatedValue } from "@/lib/motion/interpolate";
import type { SceneCamera } from "@/lib/motion/types";

export type ResolvedCamera = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

/** Resolve the animated camera transform at a scene-local time (ms). */
export function resolveCamera(camera: SceneCamera | undefined, sceneLocalMs: number): ResolvedCamera {
  if (!camera) return { x: 0, y: 0, scale: 1, rotation: 0 };
  const a = camera.animations;
  return {
    x: resolveAnimatedValue({ baseValue: camera.x ?? 0, track: findTrack(a, "x"), localTimeMs: sceneLocalMs }),
    y: resolveAnimatedValue({ baseValue: camera.y ?? 0, track: findTrack(a, "y"), localTimeMs: sceneLocalMs }),
    scale: resolveAnimatedValue({
      baseValue: camera.scale ?? 1,
      track: findTrack(a, "scale"),
      localTimeMs: sceneLocalMs,
    }),
    rotation: resolveAnimatedValue({
      baseValue: camera.rotation ?? 0,
      track: findTrack(a, "rotation"),
      localTimeMs: sceneLocalMs,
    }),
  };
}

/** CSS transform string for a resolved camera. Negative offset = camera pans. */
export function cameraTransform(cam: ResolvedCamera): string {
  return `translate(${-cam.x}px, ${-cam.y}px) scale(${cam.scale}) rotate(${cam.rotation}deg)`;
}
