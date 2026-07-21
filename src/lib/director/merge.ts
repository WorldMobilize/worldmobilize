import type {
  AspectRatio,
  MotionLayer,
  MotionProject,
  MotionScene,
  SceneBackground,
  TransitionSpec,
} from "@/lib/motion/types";
import { formatForAspect } from "@/lib/motion/validate";
import type { DirectorPlan, PlannedLayer, PlannedScene } from "@/lib/director/brain";
import type { ArmBundle } from "@/lib/director/arms";

function asNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function defaultBackground(brandBg: string, accent: string): SceneBackground {
  return { type: "gradient", from: brandBg, to: accent, angle: 160 };
}

function repairBackground(raw: unknown, brand: DirectorPlan["brand"]): SceneBackground {
  const b = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!b) return defaultBackground(brand.backgroundColor, brand.secondaryColor);
  if (b.type === "solid" && typeof b.color === "string") {
    return { type: "solid", color: b.color };
  }
  if (b.type === "gradient") {
    return {
      type: "gradient",
      from: asStr(b.from, brand.backgroundColor),
      to: asStr(b.to, brand.secondaryColor),
      angle: asNum(b.angle, 160),
    };
  }
  if (b.type === "image" && typeof b.assetId === "string") {
    return {
      type: "image",
      assetId: b.assetId,
      fit: b.fit === "contain" ? "contain" : "cover",
    };
  }
  return defaultBackground(brand.backgroundColor, brand.secondaryColor);
}

function transitionFrom(raw: unknown): TransitionSpec | undefined {
  const t = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!t || typeof t.type !== "string") return undefined;
  const allowed = new Set([
    "cut",
    "fade",
    "slideLeft",
    "slideUp",
    "zoom",
    "whipLeft",
    "whipRight",
  ]);
  if (!allowed.has(t.type)) return undefined;
  return {
    type: t.type as TransitionSpec["type"],
    durationSec: Math.min(0.6, Math.max(0, asNum(t.durationSec, 0.35))),
  };
}

function defaultLayerGeometry(
  planned: PlannedLayer,
  scene: PlannedScene,
  size: { width: number; height: number },
  index: number,
): {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  startSec: number;
  durationSec: number;
} {
  const w = size.width;
  const h = size.height;
  const startSec = Math.min(0.8, index * 0.12);
  const durationSec = Math.max(1, scene.durationSec - startSec - 0.1);

  if (planned.role === "headline" || planned.kind === "text") {
    return {
      x: w * 0.12,
      y: h * 0.28 + index * 40,
      width: w * 0.76,
      height: 100,
      zIndex: 3,
      startSec,
      durationSec,
    };
  }
  if (planned.component === "MetricCard" || planned.role === "metric") {
    const cardW = w * 0.22;
    const gap = w * 0.04;
    const total = cardW * 3 + gap * 2;
    const left = (w - total) / 2;
    const slot = index % 3;
    return {
      x: left + slot * (cardW + gap),
      y: h * 0.52,
      width: cardW,
      height: h * 0.28,
      zIndex: 2,
      startSec,
      durationSec,
    };
  }
  if (
    planned.component === "Capsule3D" ||
    planned.component === "PillHero"
  ) {
    const size = Math.min(w, h) * 0.28;
    return {
      x: (w - size) / 2,
      y: (h - size) / 2,
      width: size,
      height: size,
      zIndex: 2,
      startSec,
      durationSec,
    };
  }
  if (planned.component === "ParticleField") {
    return {
      x: 0,
      y: 0,
      width: w,
      height: h,
      zIndex: 0,
      startSec,
      durationSec,
    };
  }
  if (planned.component === "LogoLockup" || planned.role === "logo") {
    return {
      x: w * 0.25,
      y: h * 0.32,
      width: w * 0.5,
      height: h * 0.28,
      zIndex: 2,
      startSec,
      durationSec,
    };
  }
  return {
    x: w * 0.1,
    y: h * 0.2 + index * 60,
    width: w * 0.8,
    height: 80,
    zIndex: 2,
    startSec,
    durationSec,
  };
}

function buildBaseLayer(
  planned: PlannedLayer,
  scene: PlannedScene,
  size: { width: number; height: number },
  index: number,
  brand: DirectorPlan["brand"],
): MotionLayer {
  const geo = defaultLayerGeometry(planned, scene, size, index);
  const base = {
    id: planned.id,
    name: planned.note || planned.role || planned.id,
    startSec: geo.startSec,
    durationSec: geo.durationSec,
    x: geo.x,
    y: geo.y,
    width: geo.width,
    height: geo.height,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: geo.zIndex,
    animations: [] as MotionLayer["animations"],
    enabled: true,
  };

  if (planned.kind === "component" || planned.component) {
    const component = planned.component || "BrandChip";
    return {
      ...base,
      type: "component",
      component,
      props: defaultProps(component, brand),
    };
  }
  if (planned.kind === "shape") {
    return {
      ...base,
      type: "shape",
      shape: "rectangle",
      fill: brand.primaryColor,
      borderRadius: brand.cornerRadius,
    };
  }
  if (planned.kind === "image") {
    return {
      ...base,
      type: "image",
      assetId: `gen:${planned.id}`,
      fit: "contain",
      imagePrompt: planned.note || undefined,
    };
  }
  return {
    ...base,
    type: "text",
    // Same reason as defaultProps: the note is a brief, not copy.
    text: "",
    fontSize: planned.role === "headline" ? 64 : 28,
    fontWeight: planned.role === "headline" ? 800 : 500,
    color: brand.foregroundColor,
    align: "center",
  };
}

function defaultProps(
  component: string,
  brand: DirectorPlan["brand"],
): Record<string, unknown> {
  // `planned.note` is an instruction to the arms ("use fact: ROAS 4.2x"), never
  // on-screen copy — rendering it leaks the brief into the video. Leave the
  // visible slots empty for the Copy arm and let fillComponentCopy() settle
  // whatever is still blank afterwards.
  switch (component) {
    case "MetricCard":
      return {
        label: "",
        value: "—",
        accent: brand.accentColor,
      };
    case "BrandChip":
      return { label: "", color: brand.primaryColor };
    case "ChatDemo":
      return {
        question: "How does it work?",
        answer: "Fast, private, and built for daily use.",
        sources: ["Product"],
      };
    case "BookCoverStream":
      return { titles: ["One", "Two", "Three", "Four"] };
    case "ParticleField":
      return {
        count: 120,
        color: brand.accentColor,
        mode: "converge",
        showCapsule: false,
      };
    case "Capsule3D":
    case "PillHero":
      return {
        topColor: "#FFFFFF",
        bottomColor: brand.primaryColor,
        color: brand.primaryColor,
        spin: 360,
        float: 0,
        tilt: 0,
      };
    case "LogoLockup":
      return {
        wordmark: "",
        tagline: "",
        logo: "capsule",
        color: brand.foregroundColor,
      };
    case "Wordmark":
      return { text: "", color: brand.foregroundColor };
    default:
      return {};
  }
}

/** First word of the title, as the stand-in wordmark ("dtcpill Launch" → "dtcpill"). */
function wordmarkFromTitle(title: string): string {
  const word = title.trim().split(/\s+/)[0]?.replace(/[^\p{L}\p{N}._-]/gu, "") ?? "";
  return word.length >= 2 ? word : title.trim().slice(0, 24);
}

/** Components whose whole job is to say the brand name. */
const WORDMARK_COMPONENTS = new Set(["LogoLockup", "Wordmark"]);

/** Where each of them expects that name to arrive. */
function wordmarkPropFor(component: string): "wordmark" | "text" {
  return component === "Wordmark" ? "text" : "wordmark";
}

/**
 * Last line of defence for on-screen text. A layer that reaches here with an
 * empty slot means the Copy arm skipped it — it is NOT an invitation to fall
 * back to the brief. The brand wordmark gets the title, everything else with
 * nothing to say is dropped: an empty chip renders as a grey blob, and a blank
 * headline holds layout space for words that never arrive.
 *
 * This used to cover LogoLockup alone. The Director also emits `Wordmark`, which
 * fell straight through with empty props and rendered its placeholder — shipping
 * videos whose closing shot read "Brand" instead of the client's name.
 */
function fillCopyGaps(scenes: MotionScene[], title: string): MotionScene[] {
  return scenes.map((scene) => {
    const layers = scene.layers.filter((layer) => {
      if (layer.type === "text") return layer.text.trim().length > 0;
      if (layer.type !== "component") return true;
      if (WORDMARK_COMPONENTS.has(layer.component)) return true;
      if (layer.component === "BrandChip" || layer.component === "MetricCard") {
        return String(layer.props.label ?? "").trim().length > 0;
      }
      return true;
    });

    return {
      ...scene,
      layers: (layers.length > 0 ? layers : scene.layers).map((layer) => {
        if (layer.type !== "component" || !WORDMARK_COMPONENTS.has(layer.component)) return layer;
        const slot = wordmarkPropFor(layer.component);
        // Either spelling counts as filled — the catalog documents Wordmark as
        // taking `text|wordmark`, so honour whichever one the arm supplied.
        // Nullish coalescing is wrong here: defaultProps seeds these slots with
        // "", which `??` treats as a real value and would overwrite anyway.
        const given = [layer.props[slot], layer.props.wordmark, layer.props.text]
          .map((v) => String(v ?? "").trim())
          .find((v) => v.length > 0);
        if (given) return layer;
        return { ...layer, props: { ...layer.props, [slot]: wordmarkFromTitle(title) } };
      }),
    };
  });
}

/**
 * Deterministic merge: Brain plan + parallel arm outputs → MotionProject draft.
 */
export function mergeArmOutputs(opts: {
  jobId: string;
  aspectRatio: AspectRatio;
  plan: DirectorPlan;
  arms: ArmBundle;
  voiceoverEnabled: boolean;
}): MotionProject {
  const { plan, arms, jobId, aspectRatio, voiceoverEnabled } = opts;
  const size = formatForAspect(aspectRatio);

  const structureById = new Map(
    (arms.structure.scenes ?? []).map((s) => [s.id, s] as const),
  );
  const layoutByKey = new Map(
    (arms.layout.layers ?? []).map((l) => [`${l.sceneId}:${l.id}`, l] as const),
  );
  const copyByKey = new Map(
    (arms.copy.texts ?? []).map((t) => [`${t.sceneId}:${t.layerId}`, t] as const),
  );
  const motionByKey = new Map(
    (arms.motion.layers ?? []).map((m) => [`${m.sceneId}:${m.layerId}`, m] as const),
  );
  const cameraById = new Map(
    (arms.motion.cameras ?? []).map((c) => [c.sceneId, c.camera] as const),
  );
  const transitionById = new Map(
    (arms.motion.transitions ?? []).map((t) => [t.sceneId, t.transitionOut] as const),
  );
  const narrationById = new Map(
    (arms.copy.narrations ?? []).map((n) => [n.sceneId, n.narration] as const),
  );
  const imagesByKey = new Map(
    (arms.images?.layers ?? []).map((l) => [`${l.sceneId}:${l.id}`, l] as const),
  );

  const scenes: MotionScene[] = plan.scenes.map((plannedScene) => {
    const structure = structureById.get(plannedScene.id);
    const layers: MotionLayer[] = plannedScene.layers.map((plannedLayer, index) => {
      let layer = buildBaseLayer(plannedLayer, plannedScene, size, index, plan.brand);
      const layout = layoutByKey.get(`${plannedScene.id}:${plannedLayer.id}`);
      const copy = copyByKey.get(`${plannedScene.id}:${plannedLayer.id}`);
      const motion = motionByKey.get(`${plannedScene.id}:${plannedLayer.id}`);
      const imageSpec = imagesByKey.get(`${plannedScene.id}:${plannedLayer.id}`);

      if (layout) {
        layer = {
          ...layer,
          x: asNum(layout.x, layer.x),
          y: asNum(layout.y, layer.y),
          width: Math.max(40, asNum(layout.width, layer.width)),
          height: Math.max(24, asNum(layout.height, layer.height)),
          zIndex: asNum(layout.zIndex, layer.zIndex),
          startSec: asNum(layout.startSec, layer.startSec),
          durationSec: Math.max(0.2, asNum(layout.durationSec, layer.durationSec)),
          opacity: asNum(layout.opacity, layer.opacity),
          rotation: asNum(layout.rotation, layer.rotation),
          scale: asNum(layout.scale, layer.scale),
        };

        if (layout.type === "component" || layer.type === "component") {
          const component =
            layout.component ||
            (layer.type === "component" ? layer.component : plannedLayer.component) ||
            "BrandChip";
          layer = {
            ...layer,
            type: "component",
            component,
            props: layer.type === "component" ? layer.props : {},
          };
        } else if (layout.type === "shape") {
          layer = {
            ...layer,
            type: "shape",
            shape: layout.shape ?? "rectangle",
            fill: layout.fill ?? plan.brand.primaryColor,
            borderRadius: layout.borderRadius ?? plan.brand.cornerRadius,
          };
        } else if (layout.type === "image") {
          layer = {
            ...layer,
            type: "image",
            assetId: layout.assetId ?? (layer.type === "image" ? layer.assetId : `gen:${plannedLayer.id}`),
            fit: layout.fit === "cover" ? "cover" : "contain",
          };
        } else if (layout.type === "text") {
          layer = {
            ...layer,
            type: "text",
            text: layer.type === "text" ? layer.text : "",
            fontSize: layer.type === "text" ? layer.fontSize : 32,
            fontWeight: layer.type === "text" ? layer.fontWeight : 600,
            color: layer.type === "text" ? layer.color : plan.brand.foregroundColor,
            align: layer.type === "text" ? layer.align : "center",
          };
        }
      }

      // Images arm fills mute plates only — never convert planned text into images.
      if (
        imageSpec &&
        (plannedLayer.kind === "image" || (layer.type === "image" && plannedLayer.kind !== "text"))
      ) {
        const assetId = asStr(imageSpec.assetId, `gen:${plannedLayer.id}`) || `gen:${plannedLayer.id}`;
        layer = {
          ...layer,
          type: "image",
          assetId: assetId.startsWith("gen:") || assetId.startsWith("builtin:") ? assetId : `gen:${assetId}`,
          fit: imageSpec.fit === "cover" ? "cover" : "contain",
          imagePrompt: asStr(imageSpec.imagePrompt) || undefined,
          x: asNum(imageSpec.x, layer.x),
          y: asNum(imageSpec.y, layer.y),
          width: Math.max(40, asNum(imageSpec.width, layer.width)),
          height: Math.max(24, asNum(imageSpec.height, layer.height)),
          zIndex: asNum(imageSpec.zIndex, Math.min(layer.zIndex, 1)),
          startSec: asNum(imageSpec.startSec, layer.startSec),
          durationSec: Math.max(0.2, asNum(imageSpec.durationSec, layer.durationSec)),
          opacity: asNum(imageSpec.opacity, layer.opacity),
        };
      }

      if (copy) {
        if (layer.type === "text") {
          layer = {
            ...layer,
            text: asStr(copy.text, layer.text),
            fontSize: asNum(copy.fontSize, layer.fontSize),
            fontWeight: asNum(copy.fontWeight, layer.fontWeight),
            color: asStr(copy.color, layer.color),
            align: copy.align ?? layer.align,
          };
        } else if (layer.type === "component") {
          layer = {
            ...layer,
            props: { ...layer.props, ...(copy.props ?? {}) },
          };
          // Convenience: allow copy.text to map into common props
          if (copy.text && !layer.props.label && !layer.props.wordmark) {
            if (layer.component === "LogoLockup") {
              layer.props = { ...layer.props, wordmark: copy.text };
            } else if (layer.component === "BrandChip") {
              layer.props = { ...layer.props, label: copy.text };
            }
          }
        }
      }

      if (motion) {
        layer = {
          ...layer,
          animationPreset: asStr(motion.animationPreset) || layer.animationPreset,
          exitPreset: asStr(motion.exitPreset) || layer.exitPreset,
          animations: Array.isArray(motion.animations)
            ? (motion.animations as MotionLayer["animations"])
            : layer.animations,
        };
      } else if (!layer.animationPreset) {
        layer = { ...layer, animationPreset: "fadeIn" };
      }

      return layer;
    });

    // Include any extra layout layers the arm added that weren't in the plan
    for (const layout of arms.layout.layers ?? []) {
      if (layout.sceneId !== plannedScene.id) continue;
      if (layers.some((l) => l.id === layout.id)) continue;
      const synthetic: PlannedLayer = {
        id: layout.id,
        role: "other",
        kind: layout.type,
        component: layout.component,
      };
      let layer = buildBaseLayer(
        synthetic,
        plannedScene,
        size,
        layers.length,
        plan.brand,
      );
      layer = {
        ...layer,
        x: asNum(layout.x, layer.x),
        y: asNum(layout.y, layer.y),
        width: Math.max(40, asNum(layout.width, layer.width)),
        height: Math.max(24, asNum(layout.height, layer.height)),
        zIndex: asNum(layout.zIndex, layer.zIndex),
      };
      const copy = copyByKey.get(`${plannedScene.id}:${layout.id}`);
      if (copy && layer.type === "text") {
        layer = { ...layer, text: asStr(copy.text, layer.text) };
      }
      layers.push(layer);
    }

    // Extra mute image plates from images arm (not already in plan/layout)
    for (const imageSpec of arms.images?.layers ?? []) {
      if (imageSpec.sceneId !== plannedScene.id) continue;
      if (layers.some((l) => l.id === imageSpec.id)) continue;
      const assetIdRaw = asStr(imageSpec.assetId, `gen:${imageSpec.id}`) || `gen:${imageSpec.id}`;
      const assetId =
        assetIdRaw.startsWith("gen:") || assetIdRaw.startsWith("builtin:")
          ? assetIdRaw
          : `gen:${assetIdRaw}`;
      layers.unshift({
        id: imageSpec.id,
        name: asStr(imageSpec.role, imageSpec.id),
        type: "image",
        assetId,
        fit: imageSpec.fit === "cover" ? "cover" : "contain",
        imagePrompt: asStr(imageSpec.imagePrompt) || undefined,
        x: asNum(imageSpec.x, 0),
        y: asNum(imageSpec.y, 0),
        width: Math.max(40, asNum(imageSpec.width, size.width)),
        height: Math.max(24, asNum(imageSpec.height, size.height)),
        opacity: asNum(imageSpec.opacity, 1),
        rotation: 0,
        scale: 1,
        zIndex: asNum(imageSpec.zIndex, 0),
        startSec: asNum(imageSpec.startSec, 0),
        durationSec: Math.max(0.2, asNum(imageSpec.durationSec, plannedScene.durationSec)),
        animations: [],
        animationPreset: "fadeIn",
        enabled: true,
      });
    }

    const transitionOut =
      transitionFrom(transitionById.get(plannedScene.id)) ||
      transitionFrom(structure?.transitionOut) ||
      ({ type: "fade", durationSec: 0.35 } as TransitionSpec);

    const layout =
      structure?.layout === "intro-logo" ||
      structure?.layout === "stat-cards" ||
      structure?.layout === "centered"
        ? structure.layout
        : plannedScene.layout;

    const cameraRaw = cameraById.get(plannedScene.id);
    const camera =
      cameraRaw && typeof cameraRaw === "object"
        ? (cameraRaw as MotionScene["camera"])
        : undefined;

    return {
      id: plannedScene.id,
      name: plannedScene.name,
      purpose: plannedScene.purpose,
      startSec: plannedScene.startSec,
      durationSec: plannedScene.durationSec,
      enabled: true,
      background: repairBackground(structure?.background, plan.brand),
      camera,
      layers,
      transitionOut,
      layout,
      narration: voiceoverEnabled
        ? asStr(narrationById.get(plannedScene.id), plannedScene.narrationBrief ?? "")
        : undefined,
    };
  });

  const durationSec =
    scenes.reduce((max, s) => Math.max(max, s.startSec + s.durationSec), 0) ||
    plan.durationSec;

  return {
    version: 1,
    id: jobId,
    title: plan.title,
    description: plan.intent,
    format: { ...size, fps: 30, aspectRatio },
    durationSec,
    brand: plan.brand,
    scenes: fillCopyGaps(scenes, plan.title),
    audio: {
      voiceover: {
        enabled: voiceoverEnabled,
        script: voiceoverEnabled
          ? asStr(arms.copy.voiceoverScript) ||
            scenes
              .map((s) => s.narration)
              .filter(Boolean)
              .join(" ")
          : "",
        provider: "elevenlabs",
      },
    },
  };
}
