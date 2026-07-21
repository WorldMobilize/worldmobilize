import type { AnimationTrack } from "@/lib/motion/types";

export type MotionPresetId =
  | "fadeIn"
  | "fadeOut"
  | "slideUp"
  | "slideLeft"
  | "slideRight"
  | "scaleIn"
  | "scaleOut"
  | "gentleFloat"
  | "slowZoom"
  | "staggeredCardReveal"
  | "countUp";

const DUR = 0.55;

/** Build animation tracks for a layer resting at (x, y) with base opacity/scale. */
export function applyMotionPreset(
  preset: MotionPresetId | string,
  base: { x: number; y: number; opacity: number; scale: number; durationSec: number },
): AnimationTrack[] {
  const end = Math.max(0.2, Math.min(DUR, base.durationSec * 0.35));
  const mid = Math.max(end + 0.4, base.durationSec * 0.5);
  const outStart = Math.max(0, base.durationSec - end);

  switch (preset) {
    case "fadeIn":
      return [
        {
          property: "opacity",
          keyframes: [
            { time: 0, value: 0, easing: "easeOut" },
            { time: end, value: base.opacity, easing: "easeOut" },
          ],
        },
      ];
    case "fadeOut":
      return [
        {
          property: "opacity",
          keyframes: [
            { time: Math.max(0, outStart - 0.01), value: base.opacity, easing: "easeIn" },
            { time: base.durationSec, value: 0, easing: "easeIn" },
          ],
        },
      ];
    case "slideUp":
      return [
        {
          property: "y",
          keyframes: [
            { time: 0, value: base.y + 60, easing: "easeOut" },
            { time: end, value: base.y, easing: "easeOut" },
          ],
        },
        {
          property: "opacity",
          keyframes: [
            { time: 0, value: 0, easing: "easeOut" },
            { time: end, value: base.opacity, easing: "easeOut" },
          ],
        },
      ];
    case "slideLeft":
      return [
        {
          property: "x",
          keyframes: [
            { time: 0, value: base.x + 80, easing: "easeOut" },
            { time: end, value: base.x, easing: "easeOut" },
          ],
        },
        {
          property: "opacity",
          keyframes: [
            { time: 0, value: 0, easing: "easeOut" },
            { time: end, value: base.opacity, easing: "easeOut" },
          ],
        },
      ];
    case "slideRight":
      return [
        {
          property: "x",
          keyframes: [
            { time: 0, value: base.x - 80, easing: "easeOut" },
            { time: end, value: base.x, easing: "easeOut" },
          ],
        },
        {
          property: "opacity",
          keyframes: [
            { time: 0, value: 0, easing: "easeOut" },
            { time: end, value: base.opacity, easing: "easeOut" },
          ],
        },
      ];
    case "scaleIn":
      return [
        {
          property: "scale",
          keyframes: [
            { time: 0, value: 0.92, easing: "easeOut" },
            { time: end, value: base.scale, easing: "easeOut" },
          ],
        },
        {
          property: "opacity",
          keyframes: [
            { time: 0, value: 0, easing: "easeOut" },
            { time: end, value: base.opacity, easing: "easeOut" },
          ],
        },
      ];
    case "scaleOut":
      return [
        {
          property: "scale",
          keyframes: [
            { time: outStart, value: base.scale, easing: "easeIn" },
            { time: base.durationSec, value: 0.92, easing: "easeIn" },
          ],
        },
        {
          property: "opacity",
          keyframes: [
            { time: outStart, value: base.opacity, easing: "easeIn" },
            { time: base.durationSec, value: 0, easing: "easeIn" },
          ],
        },
      ];
    case "gentleFloat":
      return [
        {
          property: "y",
          keyframes: [
            { time: 0, value: base.y, easing: "easeInOut" },
            { time: mid, value: base.y - 8, easing: "easeInOut" },
            { time: base.durationSec, value: base.y, easing: "easeInOut" },
          ],
        },
      ];
    case "slowZoom":
      return [
        {
          property: "scale",
          keyframes: [
            { time: 0, value: base.scale, easing: "linear" },
            { time: base.durationSec, value: base.scale * 1.06, easing: "linear" },
          ],
        },
      ];
    case "staggeredCardReveal":
      return [
        {
          property: "y",
          keyframes: [
            { time: 0, value: base.y + 40, easing: "easeOut" },
            { time: end, value: base.y, easing: "easeOut" },
          ],
        },
        {
          property: "scale",
          keyframes: [
            { time: 0, value: 0.94, easing: "easeOut" },
            { time: end, value: base.scale, easing: "easeOut" },
          ],
        },
        {
          property: "opacity",
          keyframes: [
            { time: 0, value: 0, easing: "easeOut" },
            { time: end, value: base.opacity, easing: "easeOut" },
          ],
        },
      ];
    case "countUp":
      return [
        {
          property: "scale",
          keyframes: [
            { time: 0, value: 0.55, easing: "easeOut" },
            { time: end, value: base.scale, easing: "easeOut" },
          ],
        },
        {
          property: "opacity",
          keyframes: [
            { time: 0, value: 0, easing: "easeOut" },
            { time: end * 0.6, value: base.opacity, easing: "easeOut" },
            { time: base.durationSec, value: base.opacity, easing: "linear" },
          ],
        },
      ];
    default:
      return [
        {
          property: "opacity",
          keyframes: [
            { time: 0, value: 0, easing: "easeOut" },
            { time: end, value: base.opacity, easing: "easeOut" },
          ],
        },
      ];
  }
}

export const MOTION_PRESET_IDS: MotionPresetId[] = [
  "fadeIn",
  "fadeOut",
  "slideUp",
  "slideLeft",
  "slideRight",
  "scaleIn",
  "scaleOut",
  "gentleFloat",
  "slowZoom",
  "staggeredCardReveal",
  "countUp",
];
