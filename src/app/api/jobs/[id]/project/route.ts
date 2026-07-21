import { NextResponse } from "next/server";
import { applyMotionPreset } from "@/lib/motion/presets";
import { getJob, markScenesDirty, updateJob } from "@/lib/jobs/store";
import type { MotionLayer, MotionProject, TransitionType } from "@/lib/motion/types";
import { normalizeMotionProject } from "@/lib/motion/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = {
  title?: string;
  sceneId?: string;
  sceneName?: string;
  sceneEnabled?: boolean;
  sceneDurationSec?: number;
  transitionType?: TransitionType;
  transitionDurationSec?: number;
  backgroundFrom?: string;
  backgroundTo?: string;
  sceneNarration?: string;
  visualPrompt?: string;
  imagePrompt?: string;
  boxFill?: string;
  textColor?: string;
  layerId?: string;
  text?: string;
  headline?: string;
  subtitle?: string;
  animationPreset?: string;
  opacity?: number;
  startSec?: number;
  durationSec?: number;
  /** Generic, type-aware layer field patch used by the LayerInspector. */
  layerPatch?: Record<string, unknown>;
  /** Remove a layer from the scene (sceneId + layerId required). */
  deleteLayer?: boolean;
};

const NUMERIC_LAYER_KEYS = new Set([
  "x",
  "y",
  "width",
  "height",
  "opacity",
  "rotation",
  "scale",
  "zIndex",
  "fontSize",
  "fontWeight",
  "borderRadius",
  "strokeWidth",
  "startSec",
  "durationSec",
  "blur",
]);
const STRING_LAYER_KEYS = new Set([
  "name",
  "text",
  "color",
  "align",
  "fill",
  "stroke",
  "assetId",
  "fit",
  "shape",
  "component",
]);

function applyLayerPatch(layer: MotionLayer, patch: Record<string, unknown>) {
  const target = layer as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (key === "props" && value && typeof value === "object") {
      const current = (target.props as Record<string, unknown>) ?? {};
      target.props = { ...current, ...(value as Record<string, unknown>) };
      continue;
    }
    if (NUMERIC_LAYER_KEYS.has(key)) {
      const n = Number(value);
      if (Number.isFinite(n)) target[key] = n;
      continue;
    }
    if (STRING_LAYER_KEYS.has(key) && typeof value === "string") {
      target[key] = value;
      continue;
    }
    if ((key === "shadow" || key === "enabled") && typeof value === "boolean") {
      target[key] = value;
    }
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const job = getJob(id);
  if (!job?.project) {
    return NextResponse.json({ error: "Job/project not found" }, { status: 404 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let project: MotionProject = structuredClone(job.project);
  if (typeof body.title === "string" && body.title.trim()) {
    project.title = body.title.trim();
  }

  if (body.sceneId) {
    const scene = project.scenes.find((s) => s.id === body.sceneId);
    if (!scene) return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    if (typeof body.sceneName === "string") scene.name = body.sceneName;
    if (typeof body.sceneEnabled === "boolean") scene.enabled = body.sceneEnabled;
    if (typeof body.sceneDurationSec === "number") {
      scene.durationSec = Math.min(8, Math.max(1, body.sceneDurationSec));
    }
    if (typeof body.sceneNarration === "string") {
      scene.narration = body.sceneNarration;
      if (project.audio.voiceover) {
        project.audio.voiceover.script = project.scenes
          .map((s) => (s.id === scene.id ? body.sceneNarration : s.narration) ?? "")
          .filter(Boolean)
          .join(" ");
        project.audio.voiceover.enabled = true;
      }
    }
    if (typeof body.backgroundFrom === "string" && typeof body.backgroundTo === "string") {
      const bg = scene.background;
      if (bg.type === "gradient") {
        bg.from = body.backgroundFrom;
        bg.to = body.backgroundTo;
      } else {
        scene.background = {
          type: "gradient",
          from: body.backgroundFrom,
          to: body.backgroundTo,
          angle: 150,
        };
      }
    }
    if (typeof body.visualPrompt === "string" || typeof body.imagePrompt === "string") {
      scene.purpose = (body.imagePrompt ?? body.visualPrompt) as string;
    }
    if (body.transitionType) {
      scene.transitionOut = {
        type: body.transitionType,
        durationSec:
          typeof body.transitionDurationSec === "number"
            ? body.transitionDurationSec
            : scene.transitionOut?.durationSec ?? 0.35,
      };
    }
    if (body.layerId) {
      if (body.deleteLayer === true) {
        scene.layers = scene.layers.filter((l) => l.id !== body.layerId);
      } else {
      const layer = scene.layers.find((l) => l.id === body.layerId) as MotionLayer | undefined;
      if (!layer) return NextResponse.json({ error: "Layer not found" }, { status: 404 });
      if (layer.type === "shape" && typeof body.boxFill === "string") {
        layer.fill = body.boxFill;
      }
      if (layer.type === "text" && typeof body.textColor === "string") {
        layer.color = body.textColor;
      }
      if (layer.type === "text" && typeof body.text === "string") layer.text = body.text;
      if (layer.type === "text" && (typeof body.headline === "string" || typeof body.subtitle === "string")) {
        const lines = layer.text.split("\n");
        const headline = typeof body.headline === "string" ? body.headline : lines[0] ?? "";
        const subtitle =
          typeof body.subtitle === "string" ? body.subtitle : lines.slice(1).join("\n");
        layer.text = subtitle ? `${headline}\n${subtitle}` : headline;
      }
      if (typeof body.opacity === "number") layer.opacity = Math.min(1, Math.max(0, body.opacity));
      if (typeof body.startSec === "number") layer.startSec = Math.max(0, body.startSec);
      if (typeof body.durationSec === "number") {
        layer.durationSec = Math.max(0.1, body.durationSec);
      }
      if (body.layerPatch && typeof body.layerPatch === "object") {
        applyLayerPatch(layer, body.layerPatch);
        // Re-derive preset keyframes when the resting transform changed.
        const touchesTransform = ["x", "y", "opacity", "scale", "durationSec"].some(
          (k) => k in body.layerPatch!,
        );
        if (layer.animationPreset && touchesTransform) {
          layer.animations = applyMotionPreset(layer.animationPreset, {
            x: layer.x,
            y: layer.y,
            opacity: layer.opacity,
            scale: layer.scale,
            durationSec: layer.durationSec,
          });
        }
      }
      if (typeof body.animationPreset === "string") {
        layer.animationPreset = body.animationPreset;
        layer.animations = applyMotionPreset(body.animationPreset, {
          x: layer.x,
          y: layer.y,
          opacity: layer.opacity,
          scale: layer.scale,
          durationSec: layer.durationSec,
        });
      }
      }
    }
  }

  project = normalizeMotionProject(project, {
    jobId: id,
    aspectRatio: project.format.aspectRatio,
  });
  updateJob(id, { project });
  if (body.sceneId) markScenesDirty(id, [body.sceneId]);
  return NextResponse.json({ ok: true, project });
}
