import { applyMotionPreset } from "@/lib/motion/presets";
import { motionProjectSchema } from "@/lib/motion/schema";
import type { AspectRatio, MotionLayer, MotionProject, MotionScene } from "@/lib/motion/types";
import { clampDurationSec } from "@/lib/motion/duration";

export function formatForAspect(aspect: AspectRatio): { width: number; height: number } {
  if (aspect === "9:16") return { width: 1080, height: 1920 };
  if (aspect === "1:1") return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
}

function asNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asStr(v: unknown, fallback = ""): string {
  if (typeof v !== "string") return fallback;
  const trimmed = v.trim();
  return trimmed || fallback;
}

/**
 * Vocabulary that only ever appears in Director briefing notes, never in real
 * on-screen copy. Observed shipping into finished videos as visible text, e.g.
 * "use fact verbatim: Copywriting 764; animate counter ticking up to 764".
 */
const LEAK_MARKERS = [
  "verbatim",
  "chip text",
  "chips such as",
  "animate counter",
  "ticking up",
  "[object object]",
  "lorem ipsum",
];

/** Directive prefixes worth unwrapping — the payload after them is real copy. */
const LEAK_PREFIX_RE =
  /^\s*(?:use\s+(?:fact|copy|text|label)\s+verbatim|chip\s+text|label\s+text|caption\s+text)\s*:\s*/i;

/** A trailing stage direction glued onto real copy: "Copywriting 764; animate counter…" */
const LEAK_TRAILING_CLAUSE_RE = /\s*[;,]\s*animate\b[^;]*$/i;

/**
 * Strip Director stage directions that leaked into user-visible strings.
 *
 * Conservative by design: unwrap a known prefix and keep the payload where one
 * exists, and only drop the string outright when it still reads as an
 * instruction afterwards. Returns "" when the whole value was a directive, so
 * callers fall back to their own default rather than rendering the note.
 */
function stripDirectorLeak(value: unknown): unknown {
  if (typeof value !== "string") return value;

  let out = value.replace(LEAK_PREFIX_RE, "").replace(LEAK_TRAILING_CLAUSE_RE, "").trim();

  const lowered = out.toLowerCase();
  if (LEAK_MARKERS.some((m) => lowered.includes(m))) {
    console.warn(`[motion] dropped leaked director instruction: ${JSON.stringify(value)}`);
    out = "";
  } else if (out !== value.trim()) {
    console.warn(`[motion] unwrapped director prefix: ${JSON.stringify(value)} -> ${JSON.stringify(out)}`);
  }

  return out;
}

/** Apply {@link stripDirectorLeak} to every string in a component prop tree. */
function stripDirectorLeakDeep(value: unknown): unknown {
  if (typeof value === "string") return stripDirectorLeak(value);
  if (Array.isArray(value)) {
    // Drop entries the sanitizer emptied so lists don't render blank chips.
    return value.map(stripDirectorLeakDeep).filter((v) => v !== "");
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, stripDirectorLeakDeep(v)]),
    );
  }
  return value;
}

/** Must track `lineHeight` in TextLayerView, which clips overflow. */
const TEXT_LINE_HEIGHT = 1.15;

/**
 * Height a text box needs so wrapped lines are not clipped.
 *
 * TextLayerView sets `overflow: hidden`, so a box shorter than the wrapped text
 * silently cuts the bottom line off. The old 80px default happened to fit the
 * old flat 48px type; at display sizes a two-line headline needs ~260px.
 *
 * 0.52em average advance width is an Inter-ish approximation — deliberately
 * slightly narrow, so the estimate errs toward one extra line rather than a clip.
 */
function textBoxHeight(text: string, fontSize: number, width: number): number {
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.52)));
  const explicitLines = text.split("\n");
  const lines = explicitLines.reduce(
    (n, line) => n + Math.max(1, Math.ceil(line.length / charsPerLine)),
    0,
  );
  return Math.ceil(lines * fontSize * TEXT_LINE_HEIGHT * 1.06);
}

/**
 * Type scale anchored to the canvas short edge, so 16:9, 9:16 and 1:1 all get
 * the same optical size (~97px default at every aspect).
 *
 * The Director almost never emits `fontSize` — in sampled jobs 0 of 4 text
 * layers set it — so this default is what actually ships. The previous flat 48
 * was roughly half the size a headline needs at 1080p. When the Director *does*
 * emit a size it tends to undershoot badly (13px, 16px), hence the floor.
 */
function textSizeBounds(canvasW: number, canvasH: number) {
  const shortEdge = Math.min(canvasW, canvasH);
  return {
    fallback: Math.round(shortEdge * 0.09), // ~97px @1080 short edge
    floor: Math.round(shortEdge * 0.026), // ~28px — below this is unreadable in motion
  };
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, (c) => c + c) : m[1]!;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Relative luminance (WCAG), so "how bright" means what the eye means by it. */
function luminance(hex: string): number | null {
  const c = parseHex(hex);
  if (!c) return null;
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/**
 * How far a background may sit above the brand's own background luminance.
 * Small on purpose: a backdrop is meant to be read *through*, and anything
 * brighter than this stops being scenery and starts competing with the content.
 */
const MAX_BACKGROUND_LIFT = 0.06;

/**
 * Keep a background stop behaving like a background.
 *
 * Given a saturated brand colour, the arms reach for it at full strength — and
 * repairBackground below used to default to exactly that too. A brief asking
 * for a "deep near-black background with a very subtle orange glow" came back
 * as a gradient running to #FF641C, which is half a screen of solid orange: a
 * linear ramp to a saturated accent is 50% accent no matter how the brief
 * phrased it.
 *
 * The brain already states how bright backgrounds should be, in
 * brand.backgroundColor. That is treated as the authority here: hue is kept,
 * brightness is pulled back toward it. A stop darker than the brand background
 * is left alone — dark is never the failure mode.
 */
function calmBackgroundStop(stop: string, base: string): string {
  const stopLum = luminance(stop);
  const baseLum = luminance(base);
  const stopRgb = parseHex(stop);
  const baseRgb = parseHex(base);
  if (stopLum == null || baseLum == null || !stopRgb || !baseRgb) return stop;

  const lift = stopLum - baseLum;
  if (lift <= MAX_BACKGROUND_LIFT) return stop;

  // Luminance moves near enough linearly with the mix to solve directly.
  const t = Math.max(0, Math.min(1, MAX_BACKGROUND_LIFT / lift));
  return toHex(
    baseRgb.r + (stopRgb.r - baseRgb.r) * t,
    baseRgb.g + (stopRgb.g - baseRgb.g) * t,
    baseRgb.b + (stopRgb.b - baseRgb.b) * t,
  );
}

function repairBackground(raw: unknown, brandBg: string, brandAccent: string): Record<string, unknown> {
  const b = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const type = asStr(b.type, "solid").toLowerCase();

  if (type === "solid" || type === "color" || type === "fill" || type === "plain") {
    const color = asStr(b.color ?? b.fill ?? b.background, brandBg) || brandBg;
    return { type: "solid", color: calmBackgroundStop(color, brandBg) };
  }
  if (type === "gradient" || type === "linear" || type === "radial") {
    // The Director commonly emits `colors: [from, to]` instead of from/to. That
    // shape matched none of the aliases below, so every scene silently fell back
    // to the brand pair — which is why generated videos reused one background
    // and varied only `angle`, the one key that happened to line up.
    const pair = Array.isArray(b.colors) ? b.colors : [];
    const from = asStr(b.from ?? b.colorFrom ?? b.start ?? b.color ?? pair[0], brandBg) || brandBg;
    const to =
      asStr(b.to ?? b.colorTo ?? b.end ?? b.accent ?? pair[1] ?? brandAccent, brandAccent) ||
      brandAccent;
    return {
      type: "gradient",
      from: calmBackgroundStop(from, brandBg),
      to: calmBackgroundStop(to, brandBg),
      angle: asNum(b.angle, 160),
    };
  }
  if (type === "image" || type === "photo" || type === "asset") {
    return {
      type: "image",
      assetId: asStr(b.assetId ?? b.asset ?? b.src, "builtin:gradient-panel") || "builtin:gradient-panel",
      fit: asStr(b.fit, "cover") === "contain" ? "contain" : "cover",
    };
  }

  // Unknown types (particles, video, blur, etc.) → safe gradient
  return {
    type: "gradient",
    from: brandBg,
    to: calmBackgroundStop(brandAccent, brandBg),
    angle: 160,
  };
}

/** Atmospheric components that must cover the full canvas (top-left origin). */
const FULL_BLEED_COMPONENTS = new Set([
  "ParticleField",
  "GradientBlob",
  "AnimatedGrid",
  "NoiseOverlay",
  "GlowField",
  "MeshGradient",
  "Aurora",
  "BlueprintGrid",
]);

const HERO_PILL_COMPONENTS = new Set(["PillHero", "Capsule3D"]);
/** Cropped phone asset aspect (W/H) — keep in sync with public/assets/iphone-frame.png */
const IPHONE_FRAME_ASPECT = 306 / 586;
const PHONE_HERO_COMPONENTS = new Set(["iPhone", "ClaudeMobileHome"]);

function shiftAnimProperty(
  anims: Array<Record<string, unknown>>,
  property: string,
  delta: number,
): Array<Record<string, unknown>> {
  if (!delta) return anims;
  return anims.map((track) => {
    if (track.property !== property) return track;
    const keyframes = Array.isArray(track.keyframes) ? track.keyframes : [];
    return {
      ...track,
      keyframes: keyframes.map((kf) => {
        if (!kf || typeof kf !== "object") return kf;
        const k = kf as Record<string, unknown>;
        return { ...k, value: asNum(k.value, 0) + delta };
      }),
    };
  });
}

/**
 * LLMs often treat x/y as center anchors. The player uses top-left.
 * Detect that mistake and convert; force full-bleed / centered heroes.
 */
function normalizeLayerGeometry(
  layer: Record<string, unknown>,
  canvasW: number,
  canvasH: number,
): Record<string, unknown> {
  let x = asNum(layer.x, 0);
  let y = asNum(layer.y, 0);
  let width = Math.max(40, asNum(layer.width, 100));
  let height = Math.max(24, asNum(layer.height, 80));
  let anims = Array.isArray(layer.animations)
    ? ([...layer.animations] as Array<Record<string, unknown>>)
    : [];

  const type = asStr(layer.type);
  const component = asStr(layer.component);

  if (type === "component" && FULL_BLEED_COMPONENTS.has(component)) {
    const props =
      layer.props && typeof layer.props === "object"
        ? { ...(layer.props as Record<string, unknown>) }
        : {};
    if (component === "ParticleField" && props.showCapsule !== true) {
      props.showCapsule = false;
    }
    return {
      ...layer,
      x: 0,
      y: 0,
      width: canvasW,
      height: canvasH,
      props,
      animations: anims.filter((t) => t.property !== "x" && t.property !== "y"),
    };
  }

  if (type === "component" && HERO_PILL_COMPONENTS.has(component)) {
    // Tight square stage, dead-centered (was ~42% and felt huge/empty).
    const size = Math.min(
      Math.round(canvasW * 0.28),
      Math.round(canvasH * 0.28),
      Math.max(Math.min(width, height), 220),
    );
    width = size;
    height = size;
    const nx = Math.round((canvasW - width) / 2);
    const ny = Math.round((canvasH - height) / 2);
    anims = shiftAnimProperty(anims, "x", nx - x);
    anims = shiftAnimProperty(anims, "y", ny - y);
    const props =
      layer.props && typeof layer.props === "object"
        ? { ...(layer.props as Record<string, unknown>) }
        : {};
    if (props.float == null) props.float = 0;
    if (props.tilt == null) props.tilt = 0;
    if (props.spin == null) props.spin = 360;
    return { ...layer, x: nx, y: ny, width, height, props, animations: anims };
  }

  // Phone hero on 9:16: fill almost full HEIGHT (phone is taller/narrower than 9:16).
  if (type === "component" && PHONE_HERO_COMPONENTS.has(component)) {
    const portrait = canvasH >= canvasW;
    if (portrait) {
      height = Math.round(canvasH * 0.96);
      width = Math.round(height * IPHONE_FRAME_ASPECT);
      if (width > canvasW * 0.96) {
        width = Math.round(canvasW * 0.96);
        height = Math.round(width / IPHONE_FRAME_ASPECT);
      }
    } else {
      height = Math.round(canvasH * 0.9);
      width = Math.round(height * IPHONE_FRAME_ASPECT);
      if (width > canvasW * 0.36) {
        width = Math.round(canvasW * 0.34);
        height = Math.round(width / IPHONE_FRAME_ASPECT);
      }
    }
    const nx = Math.round((canvasW - width) / 2);
    const ny = Math.round((canvasH - height) / 2);
    anims = shiftAnimProperty(anims, "x", nx - x);
    anims = shiftAnimProperty(anims, "y", ny - y);
    const props =
      layer.props && typeof layer.props === "object"
        ? { ...(layer.props as Record<string, unknown>) }
        : {};
    if (component === "ClaudeMobileHome" || props.ui === "claude" || props.ui === "claude-home") {
      props.ui = "claude";
      props.frame = true;
    } else if (props.ui == null && component === "iPhone") {
      // Prefer Claude home when brand accent looks terracotta / brief already set screenColor dark
      // Leave ui alone unless explicitly ClaudeMobileHome — Director should set ui:"claude"
    }
    return {
      ...layer,
      component: component === "ClaudeMobileHome" ? "iPhone" : component,
      x: nx,
      y: ny,
      width,
      height,
      props: component === "ClaudeMobileHome" ? { ...props, ui: "claude", frame: true } : props,
      animations: anims,
    };
  }

  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const nearX = Math.abs(x - cx) <= Math.max(24, canvasW * 0.025);
  const nearY = Math.abs(y - cy) <= Math.max(24, canvasH * 0.025);
  const overflowR = x + width > canvasW + 12;
  const overflowB = y + height > canvasH + 12;
  const wide = width >= canvasW * 0.22;
  const tall = height >= canvasH * 0.22;
  const alignCenter = type === "text" && asStr(layer.align, "center") === "center";

  let dx = 0;
  let dy = 0;
  if (nearX && (overflowR || wide || alignCenter)) dx = -width / 2;
  if (nearY && (overflowB || tall)) dy = -height / 2;

  if (dx || dy) {
    x = Math.round(x + dx);
    y = Math.round(y + dy);
    anims = shiftAnimProperty(anims, "x", dx);
    anims = shiftAnimProperty(anims, "y", dy);
  }

  const marginX = type === "text" ? Math.round(canvasW * 0.05) : 0;
  const maxW = Math.max(40, canvasW - marginX * 2);
  if (type === "text" && width > maxW) {
    width = maxW;
    if (alignCenter) {
      const idealX = Math.round((canvasW - width) / 2);
      anims = shiftAnimProperty(anims, "x", idealX - x);
      x = idealX;
    }
  }

  if (type === "text" && alignCenter) {
    const idealX = Math.round((canvasW - width) / 2);
    if (Math.abs(x - idealX) > 12) {
      anims = shiftAnimProperty(anims, "x", idealX - x);
      x = idealX;
    }
  }

  x = Math.max(0, Math.min(x, Math.max(0, canvasW - width)));
  y = Math.max(0, Math.min(y, Math.max(0, canvasH - height)));

  return { ...layer, x, y, width, height, animations: anims };
}

/**
 * If ParticleField nests the capsule, promote it to a separate centered PillHero
 * and keep particles as full-canvas atmosphere only.
 */
function repairSceneHeroComposition(
  layers: Array<Record<string, unknown>>,
  canvasW: number,
  canvasH: number,
): Array<Record<string, unknown>> {
  const out = layers.map((l) => ({ ...l }));
  let hasHeroPill = out.some(
    (l) =>
      asStr(l.type) === "component" && HERO_PILL_COMPONENTS.has(asStr(l.component)),
  );

  for (let i = 0; i < out.length; i++) {
    const l = out[i]!;
    if (asStr(l.type) !== "component" || asStr(l.component) !== "ParticleField") continue;

    const props =
      l.props && typeof l.props === "object"
        ? { ...(l.props as Record<string, unknown>) }
        : {};

    if (props.showCapsule === true && !hasHeroPill) {
      props.showCapsule = false;
      out[i] = { ...l, props, x: 0, y: 0, width: canvasW, height: canvasH };
      const size = Math.round(Math.min(canvasW, canvasH) * 0.42);
      const color = asStr(props.color, "#3b82f6") || "#3b82f6";
      out.push(
        normalizeLayerGeometry(
          {
            id: `${asStr(l.id, "particles")}_pill`,
            name: "Hero Pill",
            type: "component",
            component: "PillHero",
            startSec: asNum(l.startSec, 0),
            durationSec: asNum(l.durationSec, 3),
            x: Math.round((canvasW - size) / 2),
            y: Math.round((canvasH - size) / 2),
            width: size,
            height: size,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: Math.max(Math.round(asNum(l.zIndex, 1)) + 1, 5),
            animations: [],
            animationPreset: "scaleIn",
            enabled: true,
            props: {
              topColor: "#FFFFFF",
              bottomColor: color,
              color,
              spin: 120,
              float: 1,
              tilt: 18,
            },
          },
          canvasW,
          canvasH,
        ),
      );
      hasHeroPill = true;
      continue;
    }

    props.showCapsule = false;
    out[i] = { ...l, props };
  }

  return out;
}

function repairLayer(
  raw: unknown,
  index: number,
  canvasW: number,
  canvasH: number,
): Record<string, unknown> | null {
  const l = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!l) return null;

  let type = asStr(l.type, "text").toLowerCase();
  if (type !== "text" && type !== "image" && type !== "shape" && type !== "component") {
    type =
      l.component != null
        ? "component"
        : l.text != null
          ? "text"
          : l.assetId != null
            ? "image"
            : "shape";
  }

  const width = Math.max(40, asNum(l.width, Math.round(canvasW * 0.4)));
  const height = Math.max(24, asNum(l.height, type === "text" ? 80 : Math.round(canvasH * 0.25)));

  const base: Record<string, unknown> = {
    id: asStr(l.id, `layer_${index + 1}`),
    name: asStr(l.name, `Layer ${index + 1}`),
    type,
    startSec: Math.max(0, asNum(l.startSec, 0)),
    durationSec: Math.max(0.2, asNum(l.durationSec, 2)),
    x: asNum(l.x, Math.round(canvasW * 0.1)),
    y: asNum(l.y, Math.round(canvasH * 0.2)),
    width,
    height,
    opacity: Math.min(1, Math.max(0, asNum(l.opacity, 1))),
    rotation: asNum(l.rotation, 0),
    scale: Math.max(0.1, asNum(l.scale, 1)),
    zIndex: Math.round(asNum(l.zIndex, index + 1)),
    animations: repairAnimationTracks(l.animations),
    animationPreset: typeof l.animationPreset === "string" ? l.animationPreset : "fadeIn",
    ...(typeof l.exitPreset === "string" ? { exitPreset: l.exitPreset } : {}),
    ...(l.blur != null ? { blur: Math.max(0, asNum(l.blur, 0)) } : {}),
    enabled: l.enabled !== false,
  };

  let repaired: Record<string, unknown>;

  if (type === "text") {
    const { fallback, floor } = textSizeBounds(canvasW, canvasH);
    const fontSize = Math.max(floor, asNum(l.fontSize, fallback));
    const text = asStr(stripDirectorLeak(l.text), "Title");
    repaired = {
      ...base,
      text,
      fontSize,
      // Grow the box to fit the wrapped text — never shrink below what the
      // Director asked for, and never exceed the canvas.
      height: Math.min(canvasH, Math.max(height, textBoxHeight(text, fontSize, width))),
      fontWeight: Math.round(asNum(l.fontWeight, 600)),
      color: asStr(l.color, "#ffffff") || "#ffffff",
      align: ["left", "center", "right"].includes(asStr(l.align)) ? l.align : "center",
      maxWidth: l.maxWidth != null ? Math.max(40, asNum(l.maxWidth, width)) : undefined,
    };
  } else if (type === "image") {
    repaired = {
      ...base,
      assetId: asStr(l.assetId, "builtin:card") || "builtin:card",
      fit: asStr(l.fit, "contain") === "cover" ? "cover" : "contain",
      borderRadius: l.borderRadius != null ? Math.max(0, asNum(l.borderRadius, 16)) : 16,
      shadow: Boolean(l.shadow ?? true),
      ...(typeof l.imagePrompt === "string" && l.imagePrompt.trim()
        ? { imagePrompt: l.imagePrompt.trim() }
        : {}),
    };
  } else if (type === "component") {
    repaired = {
      ...base,
      component: asStr(l.component, "MetricCard") || "MetricCard",
      props:
        l.props && typeof l.props === "object"
          ? (stripDirectorLeakDeep(l.props) as Record<string, unknown>)
          : {},
    };
  } else {
    const shape = asStr(l.shape, "rectangle");
    repaired = {
      ...base,
      shape: ["rectangle", "circle", "line"].includes(shape) ? shape : "rectangle",
      fill: asStr(l.fill, "#3b82f6") || "#3b82f6",
      stroke: l.stroke != null ? asStr(l.stroke) : undefined,
      strokeWidth: l.strokeWidth != null ? Math.max(0, asNum(l.strokeWidth, 0)) : undefined,
      borderRadius: l.borderRadius != null ? Math.max(0, asNum(l.borderRadius, 12)) : 12,
    };
  }

  return normalizeLayerGeometry(repaired, canvasW, canvasH);
}

const LAYER_ANIM_PROPS = new Set([
  "x",
  "y",
  "scale",
  "rotation",
  "opacity",
  "blur",
  "progress",
]);
const CAMERA_PROPS = new Set(["x", "y", "scale", "rotation"]);
const VALID_EASINGS = new Set(["linear", "easeIn", "easeOut", "easeInOut"]);

/** Map common LLM animation aliases → schema enums. */
function normalizeAnimProperty(raw: unknown): string | null {
  const p = asStr(raw).toLowerCase().replace(/[-_]/g, "");
  if (!p) return null;
  if (LAYER_ANIM_PROPS.has(p)) return p;
  if (p === "translatex" || p === "posx" || p === "left" || p === "positionx") return "x";
  if (p === "translatey" || p === "posy" || p === "top" || p === "positiony") return "y";
  if (p === "position" || p === "pos" || p === "translate") return "y";
  if (p === "rotate" || p === "rot") return "rotation";
  if (p === "alpha" || p === "fade") return "opacity";
  if (p === "zoom" || p === "size") return "scale";
  return null;
}

function normalizeEasing(raw: unknown): "linear" | "easeIn" | "easeOut" | "easeInOut" {
  const original = asStr(raw, "easeOut");
  if (VALID_EASINGS.has(original)) {
    return original as "linear" | "easeIn" | "easeOut" | "easeInOut";
  }
  const e = original.toLowerCase().replace(/[-_]/g, "");
  if (e === "linear" || e === "none") return "linear";
  if (e.includes("inout") || e === "easeinout") return "easeInOut";
  if (e.startsWith("easein") || e === "in") return "easeIn";
  if (
    e.startsWith("easeout") ||
    e === "out" ||
    e.includes("circout") ||
    e.includes("quadout") ||
    e.includes("cubicout") ||
    e.includes("expoout") ||
    e.includes("sineout") ||
    e === "ease"
  ) {
    return "easeOut";
  }
  return "easeOut";
}

function repairAnimationTracks(
  raw: unknown,
  allowed: Set<string> = LAYER_ANIM_PROPS,
): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const track of raw) {
    if (!track || typeof track !== "object") continue;
    const t = track as Record<string, unknown>;
    const property = normalizeAnimProperty(t.property);
    if (!property || !allowed.has(property)) continue;
    const framesIn = Array.isArray(t.keyframes) ? t.keyframes : [];
    const keyframes = framesIn
      .map((kf) => {
        if (!kf || typeof kf !== "object") return null;
        const k = kf as Record<string, unknown>;
        return {
          time: Math.max(0, asNum(k.time, 0)),
          value: asNum(k.value, 0),
          easing: normalizeEasing(k.easing),
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
    if (keyframes.length === 0) continue;
    out.push({ property, keyframes });
  }
  return out;
}

function repairCamera(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  return {
    x: asNum(c.x, 0),
    y: asNum(c.y, 0),
    scale: Math.max(0.1, asNum(c.scale, 1)),
    rotation: asNum(c.rotation, 0),
    animations: repairAnimationTracks(c.animations, CAMERA_PROPS),
  };
}

/**
 * Repair common LLM mistakes before Zod validation.
 */
export function repairDirectorJson(
  raw: unknown,
  opts?: { aspectRatio?: AspectRatio; jobId?: string; title?: string; durationSec?: number },
): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const root = { ...(raw as Record<string, unknown>) };

  if (opts?.jobId) root.id = opts.jobId;
  else if (!root.id) root.id = `job_${Date.now().toString(36)}`;

  if (!root.title || typeof root.title !== "string") {
    root.title = opts?.title || "Motion project";
  }

  if (root.durationSec == null || !Number.isFinite(Number(root.durationSec))) {
    root.durationSec = opts?.durationSec ?? 12;
  }

  const aspect =
    root.format && typeof root.format === "object"
      ? ((root.format as Record<string, unknown>).aspectRatio as AspectRatio) ||
        opts?.aspectRatio ||
        "16:9"
      : opts?.aspectRatio || "16:9";
  const size = formatForAspect(
    aspect === "9:16" || aspect === "1:1" || aspect === "16:9" ? aspect : "16:9",
  );

  const brand =
    root.brand && typeof root.brand === "object"
      ? (root.brand as Record<string, unknown>)
      : {};
  const brandBg = asStr(brand.backgroundColor, "#0b1220") || "#0b1220";
  const brandAccent = asStr(brand.accentColor, "#3b82f6") || "#3b82f6";

  root.version = 1;
  root.format = {
    width: size.width,
    height: size.height,
    fps: 30,
    aspectRatio: aspect === "9:16" || aspect === "1:1" ? aspect : "16:9",
  };

  if (!root.brand || typeof root.brand !== "object") {
    root.brand = {
      primaryColor: "#1e3a5f",
      secondaryColor: "#0f172a",
      backgroundColor: brandBg,
      foregroundColor: "#f8fafc",
      accentColor: brandAccent,
      fontFamily: "Inter",
      style: "premium-saas",
      cornerRadius: 16,
    };
  }

  if (!root.audio || typeof root.audio !== "object") {
    root.audio = { voiceover: { enabled: false, script: "", provider: "elevenlabs" } };
  }

  // Unwrap common LLM wrappers / aliases so a near-valid response still validates.
  if (!Array.isArray(root.scenes)) {
    const nested =
      root.project && typeof root.project === "object"
        ? (root.project as Record<string, unknown>)
        : root.data && typeof root.data === "object"
          ? (root.data as Record<string, unknown>)
          : null;
    if (nested && Array.isArray(nested.scenes)) {
      root.scenes = nested.scenes;
      if (!root.title && typeof nested.title === "string") root.title = nested.title;
      if (!root.brand && nested.brand) root.brand = nested.brand;
      if (!root.audio && nested.audio) root.audio = nested.audio;
    } else if (Array.isArray(root.Scenes)) {
      root.scenes = root.Scenes;
    } else if (Array.isArray(root.sections)) {
      root.scenes = root.sections;
    } else if (Array.isArray(root.timeline)) {
      root.scenes = root.timeline;
    }
  }

  const scenesIn = Array.isArray(root.scenes) ? root.scenes : [];
  root.scenes = scenesIn.slice(0, 6).map((s, i) => {
    const scene = s && typeof s === "object" ? { ...(s as Record<string, unknown>) } : {};
    const layersIn = Array.isArray(scene.layers) ? scene.layers : [];
    const repairedLayers = layersIn
      .slice(0, 16)
      .map((l, li) => repairLayer(l, li, size.width, size.height))
      .filter(Boolean) as Array<Record<string, unknown>>;
    const layers = repairSceneHeroComposition(repairedLayers, size.width, size.height).slice(0, 18);

    const layout =
      scene.layout === "intro-logo" || scene.layout === "stat-cards" || scene.layout === "centered"
        ? scene.layout
        : undefined;

    const camera = repairCamera(scene.camera);

    return {
      id: asStr(scene.id, `scene_${String(i + 1).padStart(2, "0")}`),
      name: asStr(scene.name, `Scene ${i + 1}`),
      purpose: asStr(scene.purpose, "beat"),
      startSec: Math.max(0, asNum(scene.startSec, 0)),
      durationSec: Math.max(2, asNum(scene.durationSec, 3)),
      enabled: scene.enabled !== false,
      background: repairBackground(scene.background, brandBg, brandAccent),
      layers,
      ...(camera ? { camera } : {}),
      ...(layout ? { layout } : {}),
      ...(typeof scene.narration === "string" ? { narration: scene.narration } : {}),
      transitionOut:
        scene.transitionOut && typeof scene.transitionOut === "object"
          ? scene.transitionOut
          : { type: "fade", durationSec: 0.35 },
    };
  });

  if (!Array.isArray(root.scenes) || (root.scenes as unknown[]).length === 0) {
    // Don’t silently inject scenes — validation must fail so the job fails loudly.
    root.scenes = [];
  }

  root.durationSec = Math.max(
    3,
    asNum(
      root.durationSec,
      (root.scenes as { durationSec: number }[]).reduce((a, s) => a + s.durationSec, 0),
    ),
  );

  return root;
}

function clampLayer(layer: MotionLayer, canvasW: number, canvasH: number): MotionLayer {
  const width = Math.min(Math.max(40, layer.width), canvasW);
  const height = Math.min(Math.max(24, layer.height), canvasH);
  const x = Math.max(0, Math.min(layer.x, canvasW - width * 0.2));
  const y = Math.max(0, Math.min(layer.y, canvasH - height * 0.2));
  let animations = layer.animations ?? [];
  if (layer.animationPreset && animations.length === 0) {
    animations = applyMotionPreset(layer.animationPreset, {
      x,
      y,
      opacity: layer.opacity,
      scale: layer.scale,
      durationSec: layer.durationSec,
    });
  }
  return { ...layer, x, y, width, height, animations, enabled: layer.enabled !== false };
}

/**
 * LLMs often set layer durationSec ≈ 2 while the scene is 5s → black tail.
 * Hold every layer until (almost) the end of its scene; entrance keyframes still work.
 */
function stretchLayersToFillScene(
  layers: MotionLayer[],
  sceneDurationSec: number,
): MotionLayer[] {
  const holdUntil = Math.max(0.3, sceneDurationSec - 0.05);
  return layers.map((l) => {
    const need = holdUntil - l.startSec;
    if (need <= 0.2) return l;
    if (l.durationSec >= need - 0.02) return l;
    return { ...l, durationSec: need };
  });
}

export function normalizeMotionProject(
  raw: unknown,
  opts?: { jobId?: string; aspectRatio?: AspectRatio; durationTargetSec?: number },
): MotionProject {
  const repaired = repairDirectorJson(raw, {
    aspectRatio: opts?.aspectRatio,
    jobId: opts?.jobId,
    durationSec: opts?.durationTargetSec,
  });
  const parsed = motionProjectSchema.parse(repaired);
  const aspect = opts?.aspectRatio ?? parsed.format.aspectRatio;
  const size = formatForAspect(aspect);
  const fps = 30;

  const scenes: MotionScene[] = parsed.scenes.slice(0, 6).map((scene, i) => {
    // Allow short heroes and longer single-scene pieces (up to full project length).
    const durationSec = Math.min(30, Math.max(1.5, scene.durationSec));
    const clipped = scene.layers.slice(0, 16).map(
      (l) =>
        ({
          ...l,
          durationSec: Math.min(Math.max(l.durationSec, 0.2), durationSec),
          startSec: Math.max(0, Math.min(l.startSec, durationSec - 0.1)),
        }) as MotionLayer,
    );
    // Stretch before clampLayer so entrance presets span the real hold time.
    const layers = stretchLayersToFillScene(clipped, durationSec).map((l) =>
      clampLayer(l, size.width, size.height),
    );
    return {
      ...scene,
      id: scene.id || `scene_${i + 1}`,
      enabled: scene.enabled !== false,
      durationSec,
      startSec: 0,
      layers,
      transitionOut: scene.transitionOut ?? { type: "fade", durationSec: 0.35 },
    };
  });

  let cursor = 0;
  for (const scene of scenes) {
    scene.startSec = cursor;
    cursor += scene.durationSec;
  }

  let durationSec = scenes.reduce((s, sc) => s + sc.durationSec, 0);
  if (opts?.durationTargetSec) {
    const target = clampDurationSec(opts.durationTargetSec);
    if (scenes.length === 1 && scenes[0]) {
      scenes[0].durationSec = target;
      scenes[0].startSec = 0;
      const clipped = scenes[0].layers.map((l) => ({
        ...l,
        startSec: Math.max(0, Math.min(l.startSec, target - 0.1)),
        durationSec: Math.min(Math.max(l.durationSec, 0.2), target),
      }));
      scenes[0].layers = stretchLayersToFillScene(clipped, target).map((l) =>
        clampLayer(l, size.width, size.height),
      );
      durationSec = target;
    } else if (durationSec > 0.1) {
      const scale = target / durationSec;
      cursor = 0;
      for (const scene of scenes) {
        scene.durationSec = Math.max(1.5, scene.durationSec * scale);
        scene.startSec = cursor;
        cursor += scene.durationSec;
        const clipped = scene.layers.map((l) => ({
          ...l,
          durationSec: Math.min(l.durationSec, scene.durationSec),
          startSec: Math.max(0, Math.min(l.startSec, scene.durationSec - 0.1)),
        }));
        scene.layers = stretchLayersToFillScene(clipped, scene.durationSec).map((l) =>
          clampLayer(l, size.width, size.height),
        );
      }
      durationSec = cursor;
      // Snap total to target by adjusting last scene
      const drift = target - durationSec;
      const last = scenes[scenes.length - 1];
      if (last && Math.abs(drift) > 0.05) {
        last.durationSec = Math.max(1.5, last.durationSec + drift);
        last.layers = stretchLayersToFillScene(last.layers, last.durationSec).map((l) =>
          clampLayer(l, size.width, size.height),
        );
        durationSec = target;
      }
    } else {
      durationSec = target;
    }
  } else {
    durationSec = clampDurationSec(durationSec || 12);
  }
  return {
    ...parsed,
    version: 1,
    id: opts?.jobId ?? parsed.id,
    format: { width: size.width, height: size.height, fps, aspectRatio: aspect },
    durationSec,
    scenes,
    audio: {
      ...parsed.audio,
      voiceover: parsed.audio.voiceover
        ? {
            ...parsed.audio.voiceover,
            provider: "elevenlabs",
          }
        : undefined,
    },
  };
}

export function validateMotionProject(
  raw: unknown,
  opts?: { aspectRatio?: AspectRatio; jobId?: string; title?: string; durationSec?: number },
): {
  ok: true;
  project: MotionProject;
} | {
  ok: false;
  errors: string[];
} {
  const repaired = repairDirectorJson(raw, opts);
  const result = motionProjectSchema.safeParse(repaired);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  try {
    return {
      ok: true,
      project: normalizeMotionProject(result.data, {
        jobId: opts?.jobId,
        aspectRatio: opts?.aspectRatio,
        durationTargetSec: opts?.durationSec,
      }),
    };
  } catch (err) {
    return {
      ok: false,
      errors: [err instanceof Error ? err.message : "normalize failed"],
    };
  }
}

/** ~150 words/min ≈ 2.5 words/sec; ~5 chars/word → ~12.5 chars/sec */
export function estimateSpeechSec(script: string): number {
  const chars = script.trim().length;
  return chars / 12.5;
}

export function clampVoiceoverToDuration(script: string, durationSec: number): string {
  const maxChars = Math.floor(durationSec * 12.5);
  const trimmed = script.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}
