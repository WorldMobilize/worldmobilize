import type { AspectRatio } from "@/lib/motion/types";
import { formatForAspect } from "@/lib/motion/validate";
import type { DirectorPlan } from "@/lib/director/brain";
import { armModel, callOpenAIJson, persistJson } from "@/lib/director/openai";

export type StructureArmResult = {
  scenes: Array<{
    id: string;
    background?: unknown;
    layout?: string;
    transitionOut?: { type: string; durationSec: number };
  }>;
};

export type LayoutArmResult = {
  layers: Array<{
    sceneId: string;
    id: string;
    type: "text" | "shape" | "image" | "component";
    component?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex?: number;
    startSec?: number;
    durationSec?: number;
    opacity?: number;
    rotation?: number;
    scale?: number;
    shape?: "rectangle" | "circle" | "line";
    fill?: string;
    borderRadius?: number;
    assetId?: string;
    fit?: "cover" | "contain";
  }>;
};

export type CopyArmResult = {
  texts: Array<{
    sceneId: string;
    layerId: string;
    text?: string;
    fontSize?: number;
    fontWeight?: number;
    color?: string;
    align?: "left" | "center" | "right";
    props?: Record<string, unknown>;
  }>;
  narrations?: Array<{ sceneId: string; narration: string }>;
  voiceoverScript?: string;
};

export type MotionArmResult = {
  layers: Array<{
    sceneId: string;
    layerId: string;
    animationPreset?: string;
    exitPreset?: string;
    animations?: unknown[];
  }>;
  cameras?: Array<{
    sceneId: string;
    camera: unknown;
  }>;
  transitions?: Array<{
    sceneId: string;
    transitionOut?: { type: string; durationSec: number };
  }>;
};

/** 5th arm — mute imagery only (Flux). Never bake text into pixels. */
export type ImagesArmResult = {
  layers: Array<{
    sceneId: string;
    id: string;
    type: "image";
    role?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex?: number;
    startSec?: number;
    durationSec?: number;
    opacity?: number;
    assetId: string;
    imagePrompt: string;
    fit?: "cover" | "contain";
  }>;
};

export type ArmBundle = {
  structure: StructureArmResult;
  layout: LayoutArmResult;
  copy: CopyArmResult;
  motion: MotionArmResult;
  images: ImagesArmResult;
};

const STRUCTURE_SYSTEM = `You are the Kinetta Structure arm — a thoughtful motion designer, not a dumb executor.
Follow the Brain's scene ids and story. You MAY choose backgrounds, layout templates, and transitions that best support each beat.
Return ONLY JSON:
{ "scenes": [{ "id", "background", "layout?", "transitionOut?" }] }
background.type MUST be solid|gradient|image only.
solid: {type:"solid",color:"#…"} gradient: {type:"gradient",from,to,angle} image: {type:"image",assetId,fit}
Think: contrast with text, mood per beat, readable dark/light. Do NOT invent new scene ids. Do NOT add layers or copy.`;

const LAYOUT_SYSTEM = `You are the Kinetta Layout arm — a senior motion/layout designer.
Follow the Brain's layer ids and roles, but YOU own composition quality. Do not dump boxes randomly.

Return ONLY JSON:
{ "layers": [{ "sceneId", "id", "type", "component?", "x", "y", "width", "height", "zIndex?", "startSec?", "durationSec?", "opacity?", "shape?", "fill?", "borderRadius?", "assetId?", "fit?" }] }

Composition rules (mandatory):
- Coordinates: x,y are the TOP-LEFT of each layer box (NOT the center). To center: x=(canvasW-width)/2, y=(canvasH-height)/2.
- Safe margins ≥5% of canvas on all sides. Nothing clipped at edges.
- Clear visual hierarchy: one primary focal point per scene (hero/title/capsule), then secondary, then accents.
- Align to a grid. Prefer shared left edges, centered columns, or evenly spaced card rows — never uneven random x/y.
- Text layers: width must fit the intended line length (headlines ~60–80% canvas width when centered; body narrower). Height must fit the text (title ~90–140px, body ~48–90px). Leave vertical gap ≥24px between stacked text blocks. Centered text → align center AND x=(canvasW-width)/2.
- Never overlap two primary text layers. Text may sit ON a shape only if the shape is clearly a background plate behind that text.
- Cards/MetricCards: equal widths, equal heights, even gaps (≈3–4% canvas), same baseline y. 2–3 cards max in a row on 16:9.
- Full-bleed backgrounds (ParticleField, MeshGradient, Aurora…): x=0,y=0,width=canvasW,height=canvasH. showCapsule:false on ParticleField.
- Hero Capsule3D/PillHero ONLY if planned — separate centered layer, never nested inside ParticleField. Never add extra pills.
- Middle scenes without a planned capsule: cards/chips/text only — do not invent a Capsule3D.
- zIndex: backgrounds/shapes low, cards mid, titles/CTAs high.
- Prefer COMPONENT LIBRARY (MetricCard, PricingCard, FeatureCard, Dashboard, ChatWindow, iPhone, LineChart, Timeline, CTABanner, BrowserWindow, StaggerGrid, TestimonialCard, …) over primitives.
- Photoreal device frames / mute plates come from the Images arm (gen:*) — leave those layer ids for images, place text boxes above them.
- No final marketing copy (placeholder ok). No animationPreset.
- Use exact layer ids from the plan.`;

const COPY_SYSTEM = `You are the Kinetta Copy arm — a sharp brand/copy designer.
Follow the Brain's layer ids. YOU own readability and text fit — think before writing.

Return ONLY JSON:
{
  "texts": [{ "sceneId", "layerId", "text?", "fontSize?", "fontWeight?", "color?", "align?", "props?" }],
  "narrations": [{ "sceneId", "narration" }],
  "voiceoverScript": "optional full script"
}

Copy/readability rules (mandatory):
- Match layerId exactly. Short premium SaaS copy — punchy, not paragraphs.
- Headlines: 1 line preferred, max 2. fontSize 48–84 on 1080p. Body: 22–34. Never huge body text.
- align must match layout intent (centered heroes → center; left stacks → left).
- MetricCard: label + value MUST come from Brain facts/numbers when provided (exact digits/units). Do not invent "42", "100", "7" vanity placeholders if facts exist.
- BrandChip: short label. LogoLockup: short wordmark + optional one-line tagline.
- ChatDemo: short question + short answer.
- PillHero/Capsule3D props: { topColor?, bottomColor?, color?, spin?, float?, tilt? } — hex colors the IA chooses; spin/float/tilt are numbers. No marketing copy on the pill.
- Assume the layout box is fixed — write text that fits; if a title would wrap badly, shorten it.
- Do not change layout geometry (no x/y/width/height).
- When Images arm provides a mute phone/device plate (gen:*), put chat/UI copy in text layers ABOVE it — never ask for baked-in raster text.`;

const MOTION_SYSTEM = `You are the Kinetta Motion arm — tasteful motion designer.
Follow the Brain brief. YOU choose presets/timing that support hierarchy (primary elements lead, cards stagger, exits clean).
Return ONLY JSON:
{
  "layers": [{ "sceneId", "layerId", "animationPreset?", "exitPreset?", "animations?" }],
  "cameras": [{ "sceneId", "camera" }],
  "transitions": [{ "sceneId", "transitionOut" }]
}
Presets: fadeIn, fadeOut, slideUp, slideLeft, slideRight, scaleIn, scaleOut, gentleFloat, slowZoom, staggeredCardReveal, countUp.
CRITICAL animation schema:
- property MUST be exactly one of: x | y | scale | rotation | opacity | blur | progress
  (NEVER translateX/translateY/position/rotate/alpha)
- every keyframe MUST include easing exactly one of: linear | easeIn | easeOut | easeInOut
  (NEVER circOut/quadOut/ease-out/css names)
Camera: { x,y,scale,rotation, animations:[{property,keyframes:[{time,value,easing}]}] }
Camera property ONLY: x|y|scale|rotation — subtle only (scale 1→1.06 max).
transitionOut types: cut|fade|slideLeft|slideUp|zoom|whipLeft|whipRight (durationSec 0.2–0.6).
Do not rewrite copy or layout geometry.`;

const IMAGES_SYSTEM = `You are the Kinetta Images arm — you create MUTE image plates only.
You never write on-screen copy. Typography is the Copy arm's job.

Return ONLY JSON:
{ "layers": [{ "sceneId", "id", "type":"image", "role?", "x", "y", "width", "height", "zIndex?", "startSec?", "durationSec?", "opacity?", "assetId", "imagePrompt", "fit?" }] }

HARD rules:
- type MUST be "image". No text layers. No components with words.
- assetId MUST be "gen:<stable_id>" (e.g. gen:phone_frame, gen:bg_hero).
- imagePrompt MUST demand: photoreal/graphic still, NO text, NO letters, NO logos with words, NO UI labels. Blank screens / empty regions for overlays.
- Coordinates: x,y are TOP-LEFT (not center).
- Phone / Claude mobile: one nearly full-height device frame with blank dark screen (Dynamic Island ok). On 9:16 prefer ~full canvas height.
- zIndex low (0–2) so copy sits above.
- Prefer 1–3 image layers per scene max. Use exact scene ids from the plan; prefer planned image layer ids when present.
- fit: contain for devices, cover for full-bleed atmospheres.`;

function planContext(plan: DirectorPlan, aspectRatio: AspectRatio): string {
  const size = formatForAspect(aspectRatio);
  const facts = plan.facts;
  return [
    `Intent: ${plan.intent}`,
    `Title: ${plan.title}`,
    `Duration: ${plan.durationSec}s`,
    `Canvas: ${size.width}x${size.height} @ 30fps (${aspectRatio})`,
    `Brand: ${JSON.stringify(plan.brand)}`,
    `Facts (numbers/claims — copy MUST honor): ${JSON.stringify(facts)}`,
    `Planned scenes/layers (MUST follow ids; do not add Capsule3D where not listed):`,
    JSON.stringify(plan.scenes, null, 2),
  ].join("\n");
}

async function callArm<T>(args: {
  jobId: string;
  name: "structure" | "layout" | "copy" | "motion" | "images";
  system: string;
  brief: string;
  plan: DirectorPlan;
  aspectRatio: AspectRatio;
  extra?: string;
}): Promise<T> {
  const model = armModel();
  const user = [
    `Brain brief for you (${args.name}):`,
    args.brief,
    ``,
    planContext(args.plan, args.aspectRatio),
    args.extra ? `\n${args.extra}` : "",
    ``,
    `Return JSON only for your role. Think as a designer within the Brain plan — placement, copy fit, and motion quality matter.`,
  ].join("\n");

  const raw = await callOpenAIJson({
    model,
    system: args.system,
    messages: [{ role: "user", content: user }],
    label: `arm:${args.name}`,
  });
  await persistJson(args.jobId, `arm-${args.name}.json`, raw);
  return raw as T;
}

/** Run structure / layout / copy / motion / images arms in parallel. */
export async function runArmsParallel(opts: {
  jobId: string;
  plan: DirectorPlan;
  aspectRatio: AspectRatio;
  voiceoverEnabled: boolean;
}): Promise<ArmBundle> {
  const common = {
    jobId: opts.jobId,
    plan: opts.plan,
    aspectRatio: opts.aspectRatio,
  };

  const [structure, layout, copy, motion, images] = await Promise.all([
    callArm<StructureArmResult>({
      ...common,
      name: "structure",
      system: STRUCTURE_SYSTEM,
      brief: opts.plan.briefs.structure,
    }),
    callArm<LayoutArmResult>({
      ...common,
      name: "layout",
      system: LAYOUT_SYSTEM,
      brief: opts.plan.briefs.layout,
    }),
    callArm<CopyArmResult>({
      ...common,
      name: "copy",
      system: COPY_SYSTEM,
      brief: opts.plan.briefs.copy,
      extra: opts.voiceoverEnabled
        ? "Voiceover ON — include short narrations per scene."
        : "Voiceover OFF — leave narrations empty.",
    }),
    callArm<MotionArmResult>({
      ...common,
      name: "motion",
      system: MOTION_SYSTEM,
      brief: opts.plan.briefs.motion,
    }),
    callArm<ImagesArmResult>({
      ...common,
      name: "images",
      system: IMAGES_SYSTEM,
      brief: opts.plan.briefs.images,
      extra:
        "Mute plates only. If the brief needs a phone, emit gen:phone_frame with blank screen. Never bake chat text into the image.",
    }),
  ]);

  return {
    structure: structure ?? { scenes: [] },
    layout: layout ?? { layers: [] },
    copy: copy ?? { texts: [] },
    motion: motion ?? { layers: [] },
    images: images ?? { layers: [] },
  };
}
