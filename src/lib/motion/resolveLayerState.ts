import { findTrack, resolveAnimatedValue } from "@/lib/motion/interpolate";
import { applyMotionPreset } from "@/lib/motion/presets";
import { layerLocalTimeMs } from "@/lib/motion/timing";
import type { AnimationTrack, MotionLayer } from "@/lib/motion/types";

/**
 * Effective animation tracks for a layer. Projects are normally normalized so
 * `animations` is already populated, but if a layer only carries an
 * `animationPreset` (raw fixtures, tests) we expand it deterministically so the
 * player and export stay in sync.
 */
export function effectiveAnimations(layer: MotionLayer): AnimationTrack[] {
  if (layer.animations && layer.animations.length > 0) return layer.animations;
  if (layer.animationPreset) {
    return applyMotionPreset(layer.animationPreset, {
      x: layer.x,
      y: layer.y,
      opacity: layer.opacity ?? 1,
      scale: layer.scale ?? 1,
      durationSec: layer.durationSec,
    });
  }
  return [];
}

export type ResolvedLayerState = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  blur: number;
  /** Normalized 0..1 progress track if present (used by countUp etc.) */
  progress: number | null;
};

/**
 * Resolve the full animated transform of a layer at a scene-local time (ms).
 * Deterministic: identical inputs always produce identical output.
 */
export function resolveLayerState(layer: MotionLayer, sceneLocalMs: number): ResolvedLayerState {
  const localMs = layerLocalTimeMs(layer, sceneLocalMs);
  const anims = effectiveAnimations(layer);

  const x = resolveAnimatedValue({ baseValue: layer.x, track: findTrack(anims, "x"), localTimeMs: localMs });
  const y = resolveAnimatedValue({ baseValue: layer.y, track: findTrack(anims, "y"), localTimeMs: localMs });
  const scale = resolveAnimatedValue({
    baseValue: layer.scale ?? 1,
    track: findTrack(anims, "scale"),
    localTimeMs: localMs,
  });
  const rotation = resolveAnimatedValue({
    baseValue: layer.rotation ?? 0,
    track: findTrack(anims, "rotation"),
    localTimeMs: localMs,
  });
  const opacity = resolveAnimatedValue({
    baseValue: layer.opacity ?? 1,
    track: findTrack(anims, "opacity"),
    localTimeMs: localMs,
  });
  const blur = resolveAnimatedValue({
    baseValue: layer.blur ?? 0,
    track: findTrack(anims, "blur"),
    localTimeMs: localMs,
  });

  const progressTrack = findTrack(anims, "progress");
  const progress = progressTrack
    ? resolveAnimatedValue({ baseValue: 0, track: progressTrack, localTimeMs: localMs })
    : null;

  return { x, y, scale, rotation, opacity, blur, progress };
}

/**
 * Progress 0..1 of a layer through its own lifetime at a scene-local time.
 * Used by components like countUp when no explicit progress track exists.
 */
export function layerLifeProgress(layer: MotionLayer, sceneLocalMs: number): number {
  const durMs = layer.durationSec * 1000;
  if (durMs <= 0) return 1;
  const localMs = layerLocalTimeMs(layer, sceneLocalMs);
  return Math.max(0, Math.min(1, localMs / durMs));
}
