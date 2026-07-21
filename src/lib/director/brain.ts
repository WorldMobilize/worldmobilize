import type { AspectRatio } from "@/lib/motion/types";
import { formatForAspect } from "@/lib/motion/validate";
import { brainModel, callOpenAIJson, persistJson } from "@/lib/director/openai";
import { catalogPromptBlock } from "@/components/motion/components/catalog";
import { clampDurationSec } from "@/lib/motion/duration";

export type LayerRole =
  | "headline"
  | "body"
  | "chip"
  | "metric"
  | "card"
  | "shape"
  | "image"
  | "component"
  | "cta"
  | "logo"
  | "other";

export type PlannedLayer = {
  id: string;
  role: LayerRole | string;
  /** Hint for which component/layer type the layout arm should use */
  kind: "text" | "shape" | "image" | "component";
  component?: string;
  note?: string;
};

export type PlannedScene = {
  id: string;
  name: string;
  purpose: string;
  startSec: number;
  durationSec: number;
  layout?: "intro-logo" | "stat-cards" | "centered";
  backgroundHint?: string;
  layers: PlannedLayer[];
  narrationBrief?: string;
};

export type DirectorPlan = {
  intent: string;
  title: string;
  durationSec: number;
  facts: {
    productName?: string;
    numbers: Array<{ label: string; value: string }>;
    claims: string[];
  };
  brand: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    foregroundColor: string;
    accentColor: string;
    fontFamily: string;
    style: "premium-saas" | "editorial" | "bold" | "minimal" | "futuristic";
    cornerRadius: number;
  };
  scenes: PlannedScene[];
  /** Exact instructions each arm must follow — arms do not invent the story */
  briefs: {
    structure: string;
    layout: string;
    copy: string;
    motion: string;
    /** 5th arm: mute image generation prompts (Flux) — no baked text */
    images: string;
  };
};

const BRAIN_SYSTEM = `You are the Kinetta Brain (creative coordinator).
You do NOT build the final MotionProject yourself.
You analyze the user brief, decide the creative intent, and COORDINATE specialized arms.

Return ONLY valid JSON with this shape:
{
  "intent": "one-sentence intent",
  "title": "short project title",
  "durationSec": number,
  "facts": {
    "productName": "...",
    "numbers": [{ "label": "ROAS", "value": "4.2x" }, { "label": "spend", "value": "$12k" }],
    "claims": ["short claim from the brief"]
  },
  "brand": { primaryColor, secondaryColor, backgroundColor, foregroundColor, accentColor, fontFamily, style, cornerRadius },
  "scenes": [
    {
      "id": "scene_01",
      "name": "...",
      "purpose": "...",
      "beat": "intro" | "problem" | "proof" | "how" | "demo" | "metrics" | "cta",
      "startSec": 0,
      "durationSec": 4,
      "layout": "intro-logo" | "stat-cards" | "centered",
      "backgroundHint": "...",
      "layers": [
        { "id": "s1_title", "role": "headline", "kind": "text", "note": "main title" },
        { "id": "s1_card1", "role": "metric", "kind": "component", "component": "MetricCard", "note": "use fact: ROAS 4.2x" }
      ],
      "narrationBrief": "optional spoken line brief"
    }
  ],
  "briefs": {
    "structure": "exact instructions for the structure arm",
    "layout": "exact instructions for the layout arm",
    "copy": "exact instructions for the copy arm — include the facts/numbers to use verbatim",
    "motion": "exact instructions for the motion arm",
    "images": "exact instructions for the images arm — mute plates only (device frames, backgrounds). NO text in images."
  }
}

CRITICAL — obey THIS brief only (no memory of other jobs):
- The user brief is LAW. Do not mix in products, copy, metrics, or structure from other briefs.
- If they ask for a pizza ad, make a pizza ad. If they ask for a 5-second hero, make ONE short hero — not an 18s multi-scene SaaS template.
- Honor explicit duration, timing, and copy in the brief exactly (e.g. "after 1s show headline X").
- durationSec MUST equal the requested length (or the provided target duration). Do not inflate it.
- Scene count: use as few scenes as the brief needs (1 is fine for a hero). Do NOT force 3–6 scenes when the brief is a single beat.
- Only invent a multi-beat arc (intro→proof→metrics→CTA) when the brief is open-ended / does not specify structure.

CRITICAL — capsule / hero guidance (when relevant to THIS brief):
- Prefer PillHero/Capsule3D for glossy capsule logos; props: topColor, bottomColor, spin (360 default), float:0, tilt:0. Do NOT open/split the pill unless asked.
- Hero pill MUST be its own centered SQUARE layer (top-left origin). ParticleField is full-bleed atmosphere with showCapsule:false — never nest the logo inside ParticleField.
- Do not sprinkle pills on every scene unless the brief asks for that.
- Coordinates: x,y are TOP-LEFT of the box (not center). Center with x=(canvasW-width)/2.

CRITICAL — images arm (5th arm):
- Plan image layers (kind:"image") when the brief needs photoreal device frames, product plates, or atmospheric stills.
- Those images are MUTE: no text baked in. On-screen copy is always separate text layers (copy arm).
- For Claude/mobile phone: plan a gen image layer for an empty iPhone with blank dark screen; copy/layout place text inside the screen safe area.
- briefs.images must tell the images arm which layer ids to fill with imagePrompt + assetId gen:….

CRITICAL — numbers & copy facts:
- Extract EVERY concrete number, %, $, x, count, and named metric from THIS user brief into facts.numbers.
- If the brief gives numbers/headlines, use those exact strings on screen. Never invent contradicting vanity metrics.
- If the brief has NO numbers, invent only what the story needs — never placeholder junk like "42".

Other rules:
- Total duration typically 3–30s. Scene ids scene_01…. Max 6 scenes.
- Every layer MUST have a stable unique id. Arms merge by these ids.
- COMPOSE WITH THE COMPONENT LIBRARY when it fits the brief. Primitives OK for custom headlines.
- briefs.* assign concrete tasks for THIS brief only.
- Motion graphics only — no people, film footage, or video-generation prompts unless asked.
- brand.style one of: premium-saas | editorial | bold | minimal | futuristic. Hex colors only.

` +
  catalogPromptBlock();

export async function runBrain(opts: {
  jobId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  durationTargetSec: number;
  voiceoverEnabled: boolean;
}): Promise<DirectorPlan> {
  const size = formatForAspect(opts.aspectRatio);
  const model = brainModel();
  const user = [
    `User brief:`,
    opts.prompt.trim(),
    ``,
    `Constraints:`,
    `- aspectRatio: ${opts.aspectRatio} (${size.width}x${size.height} @ 30fps)`,
    `- target duration MUST be ${opts.durationTargetSec}s (do not inflate)`,
    `- voiceover enabled: ${opts.voiceoverEnabled ? "yes" : "no"}`,
    `- project id will be "${opts.jobId}"`,
    `- THIS brief only — do not reuse other products/jobs/templates`,
    `- If the brief is a short hero, use 1 scene (or 2 max). Do not force a multi-scene SaaS arc.`,
    `- Honor explicit on-screen copy and timing from the brief verbatim.`,
    `- Coordinate the arms. Assign stable scene/layer ids and precise briefs.`,
    `- Prefer Component Library V1 when it fits; otherwise primitives are fine.`,
    `- Assign briefs for structure, layout, copy, motion, AND images (mute Flux plates — no text in images).`,
  ].join("\n");

  const raw = await callOpenAIJson({
    model,
    system: BRAIN_SYSTEM,
    messages: [{ role: "user", content: user }],
    label: "brain",
  });
  await persistJson(opts.jobId, "brain-plan.json", raw);

  const plan = normalizePlan(raw, opts);
  return plan;
}

function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePlan(
  raw: unknown,
  opts: {
    prompt: string;
    durationTargetSec: number;
    voiceoverEnabled: boolean;
  },
): DirectorPlan {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const brandRaw = (r.brand && typeof r.brand === "object" ? r.brand : {}) as Record<
    string,
    unknown
  >;
  const scenesRaw = Array.isArray(r.scenes) ? r.scenes : [];
  const briefsRaw = (r.briefs && typeof r.briefs === "object" ? r.briefs : {}) as Record<
    string,
    unknown
  >;

  const scenes: PlannedScene[] = scenesRaw.slice(0, 6).map((s, i) => {
    const sc = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    const layersRaw = Array.isArray(sc.layers) ? sc.layers : [];
    return {
      id: asStr(sc.id, `scene_${String(i + 1).padStart(2, "0")}`),
      name: asStr(sc.name, `Scene ${i + 1}`),
      purpose: asStr(sc.purpose, "beat"),
      startSec: asNum(sc.startSec, 0),
      durationSec: Math.max(1.5, asNum(sc.durationSec, 4)),
      layout:
        sc.layout === "intro-logo" || sc.layout === "stat-cards" || sc.layout === "centered"
          ? sc.layout
          : undefined,
      backgroundHint: asStr(sc.backgroundHint) || undefined,
      layers: layersRaw.slice(0, 16).map((l, j) => {
        const layer = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
        const kind =
          layer.kind === "text" ||
          layer.kind === "shape" ||
          layer.kind === "image" ||
          layer.kind === "component"
            ? layer.kind
            : "text";
        return {
          id: asStr(layer.id, `s${i + 1}_layer_${j + 1}`),
          role: asStr(layer.role, "other"),
          kind,
          component: asStr(layer.component) || undefined,
          note: asStr(layer.note) || undefined,
        };
      }),
      narrationBrief: opts.voiceoverEnabled
        ? asStr(sc.narrationBrief) || undefined
        : undefined,
    };
  });

  // Recompute startSec sequentially if missing/broken
  let t = 0;
  for (const sc of scenes) {
    sc.startSec = t;
    t += sc.durationSec;
  }

  // Prefer explicit target from the job; never inflate short heroes to 10s+.
  const durationSec = clampDurationSec(
    asNum(r.durationSec, opts.durationTargetSec) || t || opts.durationTargetSec,
  );

  const factsRaw = (r.facts && typeof r.facts === "object" ? r.facts : {}) as Record<
    string,
    unknown
  >;
  const numbersRaw = Array.isArray(factsRaw.numbers) ? factsRaw.numbers : [];
  const claimsRaw = Array.isArray(factsRaw.claims) ? factsRaw.claims : [];
  const facts = {
    productName: asStr(factsRaw.productName) || undefined,
    numbers: numbersRaw
      .map((n) => {
        const item = n && typeof n === "object" ? (n as Record<string, unknown>) : {};
        const label = asStr(item.label);
        const value = asStr(item.value);
        if (!label && !value) return null;
        return { label: label || "metric", value: value || "—" };
      })
      .filter(Boolean) as Array<{ label: string; value: string }>,
    claims: claimsRaw.map((c) => asStr(c)).filter(Boolean),
  };

  // Also mine obvious numbers from the user prompt if brain missed them
  if (facts.numbers.length === 0) {
    facts.numbers = extractNumbersFromPrompt(opts.prompt);
  }

  // Keep whatever the brain planned for THIS brief — do not pad short heroes to 3 scenes.
  let finalScenes =
    scenes.length >= 1 ? scenes : padScenes(scenes, durationSec);
  // Still strip repeated pills from middle scenes when there are 3+
  if (finalScenes.length >= 3) {
    finalScenes = enforceBeatDiversity(finalScenes);
  }

  const factsBlock = [
    facts.productName ? `Product: ${facts.productName}` : "",
    facts.numbers.length
      ? `Numbers (use verbatim on MetricCards/stats): ${facts.numbers.map((n) => `${n.label}=${n.value}`).join("; ")}`
      : "",
    facts.claims.length ? `Claims: ${facts.claims.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const layoutBrief = [
    asStr(
      briefsRaw.layout,
      "Place every planned layer with exact x,y,width,height,zIndex.",
    ),
    "HARD: no Capsule3D / ParticleField capsule in middle scenes — only where the plan already includes them (intro/outro).",
    "Each scene has one job; do not mirror intro layout on every slide.",
  ].join("\n");

  const copyBrief = [
    asStr(
      briefsRaw.copy,
      "Fill text and component props for every planned layer id. Keep short and premium.",
    ),
    factsBlock,
    "HARD: MetricCard value/label must match facts.numbers when present. Never invent contradicting vanity numbers.",
  ]
    .filter(Boolean)
    .join("\n");

  const imagesBrief = [
    asStr(
      briefsRaw.images,
      "Create mute image plates for planned image layers (device frames, backgrounds). assetId gen:… + imagePrompt. NEVER bake text into images.",
    ),
    "HARD: no letters/words/UI labels in generated images. Phone frames must have blank screens for copy to overlay.",
  ].join("\n");

  return {
    intent: asStr(r.intent, opts.prompt.slice(0, 120)),
    title: asStr(r.title) || opts.prompt.trim().slice(0, 48) || "Motion project",
    durationSec,
    facts,
    brand: {
      primaryColor: asStr(brandRaw.primaryColor, "#3b82f6"),
      secondaryColor: asStr(brandRaw.secondaryColor, "#1e3a5f"),
      backgroundColor: asStr(brandRaw.backgroundColor, "#0b1220"),
      foregroundColor: asStr(brandRaw.foregroundColor, "#f8fafc"),
      accentColor: asStr(brandRaw.accentColor, "#60a5fa"),
      fontFamily: asStr(brandRaw.fontFamily, "Inter"),
      style: (["premium-saas", "editorial", "bold", "minimal", "futuristic"] as const).includes(
        brandRaw.style as never,
      )
        ? (brandRaw.style as DirectorPlan["brand"]["style"])
        : "premium-saas",
      cornerRadius: asNum(brandRaw.cornerRadius, 16),
    },
    scenes: finalScenes,
    briefs: {
      structure: asStr(
        briefsRaw.structure,
        "Build scene shells: backgrounds, layout, transitionOut — follow scene ids exactly. Distinct mood per beat.",
      ),
      layout: layoutBrief,
      copy: copyBrief,
      motion: asStr(
        briefsRaw.motion,
        "Assign animationPreset/camera/transitions. Tasteful motion only. Don't overuse capsule float on every scene.",
      ),
      images: imagesBrief,
    },
  };
}

/** Strip repeated pills from middle scenes — keep at most first + last. */
function enforceBeatDiversity(scenes: PlannedScene[]): PlannedScene[] {
  if (scenes.length <= 2) return scenes;
  const isPill = (l: PlannedLayer) =>
    l.component === "Capsule3D" ||
    l.component === "PillHero" ||
    l.component === "ParticleField";

  const pillSceneIndexes: number[] = [];
  scenes.forEach((sc, i) => {
    if (sc.layers.some(isPill)) pillSceneIndexes.push(i);
  });

  // Keep first and last pill scenes only; strip the rest
  const keep = new Set<number>();
  if (pillSceneIndexes.length > 0) keep.add(pillSceneIndexes[0]!);
  if (pillSceneIndexes.length > 1) keep.add(pillSceneIndexes[pillSceneIndexes.length - 1]!);

  return scenes.map((sc, i) => {
    if (keep.has(i) || !sc.layers.some(isPill)) return sc;
    return {
      ...sc,
      layers: sc.layers.filter((l) => !isPill(l)),
    };
  });
}

function extractNumbersFromPrompt(prompt: string): Array<{ label: string; value: string }> {
  const found: Array<{ label: string; value: string }> = [];
  const re =
    /(\$?\d[\d,]*(?:\.\d+)?\s?(?:%|x|X|k|K|m|M)?|\d+\s?(?:days?|hrs?|hours?|min))/g;
  const matches = prompt.match(re) ?? [];
  for (const m of matches.slice(0, 6)) {
    found.push({ label: "from brief", value: m.trim() });
  }
  return found;
}

function padScenes(scenes: PlannedScene[], durationSec: number): PlannedScene[] {
  const out = [...scenes];
  const names = ["Hook", "Proof", "Features", "Close"];
  while (out.length < 3) {
    const i = out.length;
    const dur = Math.max(2, durationSec / 3);
    out.push({
      id: `scene_${String(i + 1).padStart(2, "0")}`,
      name: names[i] ?? `Scene ${i + 1}`,
      purpose: "beat",
      startSec: 0,
      durationSec: dur,
      layers: [
        {
          id: `s${i + 1}_title`,
          role: "headline",
          kind: "text",
          note: "main title",
        },
      ],
    });
  }
  let t = 0;
  for (const sc of out) {
    sc.startSec = t;
    t += sc.durationSec;
  }
  return out;
}
