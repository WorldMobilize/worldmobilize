import { z } from "zod";

const easingSchema = z.enum(["linear", "easeIn", "easeOut", "easeInOut"]);
const aspectSchema = z.enum(["16:9", "9:16", "1:1"]);

const keyframeSchema = z.object({
  time: z.number().min(0),
  value: z.number(),
  easing: easingSchema,
});

const animationTrackSchema = z.object({
  property: z.enum(["x", "y", "scale", "rotation", "opacity", "blur", "progress"]),
  keyframes: z.array(keyframeSchema).min(1),
});

const layerBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startSec: z.number().min(0),
  durationSec: z.number().positive(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  opacity: z.number().min(0).max(1),
  rotation: z.number(),
  scale: z.number().positive(),
  zIndex: z.number().int(),
  animations: z.array(animationTrackSchema).default([]),
  animationPreset: z.string().optional(),
  exitPreset: z.string().optional(),
  blur: z.number().min(0).optional(),
  enabled: z.boolean().optional(),
});

const textLayerSchema = layerBaseSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontSize: z.number().positive(),
  fontWeight: z.number().int().min(100).max(900),
  color: z.string(),
  align: z.enum(["left", "center", "right"]),
  maxWidth: z.number().positive().optional(),
});

const imageLayerSchema = layerBaseSchema.extend({
  type: z.literal("image"),
  assetId: z.string().min(1),
  fit: z.enum(["cover", "contain"]),
  borderRadius: z.number().min(0).optional(),
  shadow: z.boolean().optional(),
  imagePrompt: z.string().optional(),
});

const shapeLayerSchema = layerBaseSchema.extend({
  type: z.literal("shape"),
  shape: z.enum(["rectangle", "circle", "line"]),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().min(0).optional(),
  borderRadius: z.number().min(0).optional(),
});

const componentLayerSchema = layerBaseSchema.extend({
  type: z.literal("component"),
  component: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
});

export const motionLayerSchema = z.discriminatedUnion("type", [
  textLayerSchema,
  imageLayerSchema,
  shapeLayerSchema,
  componentLayerSchema,
]);

const backgroundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color: z.string() }),
  z.object({
    type: z.literal("gradient"),
    from: z.string(),
    to: z.string(),
    angle: z.number(),
  }),
  z.object({
    type: z.literal("image"),
    assetId: z.string(),
    fit: z.enum(["cover", "contain"]),
  }),
]);

const transitionSchema = z.object({
  type: z.enum(["cut", "fade", "slideLeft", "slideUp", "zoom", "whipLeft", "whipRight"]),
  durationSec: z.number().min(0).max(2),
});

const sceneCameraSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  scale: z.number().positive().default(1),
  rotation: z.number().default(0),
  animations: z.array(animationTrackSchema).default([]),
});

export const motionSceneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  purpose: z.string(),
  startSec: z.number().min(0),
  durationSec: z.number().positive(),
  enabled: z.boolean().optional(),
  background: backgroundSchema,
  camera: sceneCameraSchema.optional(),
  layers: z.array(motionLayerSchema).max(16),
  transitionIn: transitionSchema.optional(),
  transitionOut: transitionSchema.optional(),
  narration: z.string().optional(),
  layout: z.enum(["intro-logo", "stat-cards", "centered"]).optional(),
});

export const brandSystemSchema = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string(),
  backgroundColor: z.string(),
  foregroundColor: z.string(),
  accentColor: z.string(),
  fontFamily: z.string(),
  style: z.enum(["premium-saas", "editorial", "bold", "minimal", "futuristic"]),
  cornerRadius: z.number().min(0),
});

export const projectAudioSchema = z.object({
  voiceover: z
    .object({
      enabled: z.boolean(),
      script: z.string(),
      provider: z.literal("elevenlabs"),
    })
    .optional(),
  music: z
    .object({
      enabled: z.boolean(),
      assetId: z.string().optional(),
      volume: z.number().min(0).max(1),
    })
    .optional(),
});

export const motionProjectSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  format: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().positive(),
    aspectRatio: aspectSchema,
  }),
  durationSec: z.number().positive(),
  brand: brandSystemSchema,
  scenes: z.array(motionSceneSchema).min(1).max(6),
  audio: projectAudioSchema,
});

export type MotionProjectInput = z.input<typeof motionProjectSchema>;
