import { applyEasing } from "@/lib/motion/easing";
import type { AnimationTrack, MotionKeyframe } from "@/lib/motion/types";

/**
 * Deterministically resolve an animated numeric value at a given local time.
 *
 * Rules:
 * 1. No track / no keyframes  -> baseValue.
 * 2. Before the first keyframe -> first keyframe value.
 * 3. Between keyframes          -> interpolate with the DESTINATION segment easing.
 * 4. After the last keyframe    -> last keyframe value.
 * 5. Single keyframe            -> that keyframe's value.
 * 6. Equal-time keyframes       -> jump to the later value (no divide-by-zero).
 *
 * Keyframe times are expressed in SECONDS (existing project convention);
 * localTimeMs is in milliseconds.
 */
export function resolveAnimatedValue(opts: {
  baseValue: number;
  track: AnimationTrack | undefined;
  localTimeMs: number;
}): number {
  const { baseValue, track, localTimeMs } = opts;
  if (!track || track.keyframes.length === 0) return baseValue;

  const kfs: MotionKeyframe[] = [...track.keyframes].sort((a, b) => a.time - b.time);
  if (kfs.length === 1) return kfs[0]!.value;

  const tSec = localTimeMs / 1000;
  const first = kfs[0]!;
  const last = kfs[kfs.length - 1]!;

  if (tSec <= first.time) return first.value;
  if (tSec >= last.time) return last.value;

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i]!;
    const b = kfs[i + 1]!;
    if (tSec >= a.time && tSec <= b.time) {
      const span = b.time - a.time;
      if (span <= 0) return b.value;
      const localT = (tSec - a.time) / span;
      const eased = applyEasing(b.easing, localT);
      return a.value + (b.value - a.value) * eased;
    }
  }
  return last.value;
}

/** Find a track for a given property on a layer's animation list. */
export function findTrack(
  animations: AnimationTrack[] | undefined,
  property: AnimationTrack["property"],
): AnimationTrack | undefined {
  return animations?.find((t) => t.property === property);
}
