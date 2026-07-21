import {
  formatForAspect,
  normalizeMotionProject,
  repairDirectorJson,
  validateMotionProject,
} from "@/lib/motion/validate";
import type { AspectRatio, MotionProject, ReferenceImage } from "@/lib/motion/types";
import { createDtcpillFixture } from "@/lib/fixtures/dtcpill";
import { runBrain } from "@/lib/director/brain";
import { runBrainSolo } from "@/lib/director/brainSolo";
import { runArmsParallel } from "@/lib/director/arms";
import { mergeArmOutputs } from "@/lib/director/merge";
import {
  armModel,
  armsEnabled,
  brainModel,
  callOpenAIJson,
  persistJson,
} from "@/lib/director/openai";

export type DirectorOptions = {
  jobId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  durationTargetSec: number;
  voiceoverEnabled: boolean;
  /** Skip OpenAI entirely */
  localDemo?: boolean;
  /** Images the user attached as visual reference. */
  referenceImages?: ReferenceImage[];
  onLog?: (message: string) => void;
};

function titleFromPrompt(prompt: string): string {
  const clean = prompt.trim().replace(/\s+/g, " ");
  if (clean.length <= 48) return clean || "Motion project";
  return `${clean.slice(0, 45).trimEnd()}…`;
}

function log(opts: DirectorOptions, message: string): void {
  console.warn(`[director] ${message}`);
  opts.onLog?.(message);
}

const REPAIR_SYSTEM = `You are the Kinetta repair arm.
Fix the given MotionProject JSON so it validates. Return ONLY a complete valid MotionProject JSON.
Rules: background.type solid|gradient|image only; every layer width/height > 0; 1–6 scenes; version 1; honor project.id and durationSec.`;

async function repairWithModel(
  opts: DirectorOptions,
  model: string,
  draft: unknown,
  errors: string[],
): Promise<unknown> {
  return callOpenAIJson({
    model,
    system: REPAIR_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          `Fix this MotionProject. project.id MUST be "${opts.jobId}". durationSec should be ~${opts.durationTargetSec}.`,
          `Validation errors:`,
          ...errors.map((e) => `- ${e}`),
          ``,
          `Current JSON:`,
          JSON.stringify(draft),
        ].join("\n"),
      },
    ],
    label: "repair",
  });
}

async function validateAndRepair(
  opts: DirectorOptions,
  draftIn: unknown,
  title: string,
  repairModel: string,
): Promise<{ project: MotionProject; attempts: number }> {
  let draft: unknown = draftIn;
  const meta = {
    aspectRatio: opts.aspectRatio,
    jobId: opts.jobId,
    title,
    durationSec: opts.durationTargetSec,
  };

  let repaired = repairDirectorJson(draft, meta);
  let check = validateMotionProject(repaired, meta);
  let attempts = 1;

  const maxRepair = Math.max(
    0,
    Math.min(3, Number(process.env.DIRECTOR_MAX_ATTEMPTS) || 2),
  );
  while (!check.ok && attempts <= maxRepair) {
    log(opts, `Repair attempt ${attempts}: ${check.errors.slice(0, 3).join("; ")}`);
    draft = await repairWithModel(opts, repairModel, draft, check.errors.slice(0, 8));
    await persistJson(opts.jobId, `director-repair-${attempts}.json`, draft);
    repaired = repairDirectorJson(draft, meta);
    check = validateMotionProject(repaired, meta);
    attempts += 1;
  }

  if (!check.ok) {
    const detail = check.errors.slice(0, 6).join("; ");
    log(opts, `Director validation failed: ${detail}`);
    throw new Error(`Director validation failed: ${detail}`);
  }

  return {
    project: normalizeMotionProject(check.project, {
      jobId: opts.jobId,
      aspectRatio: opts.aspectRatio,
      durationTargetSec: opts.durationTargetSec,
    }),
    attempts,
  };
}

/**
 * Director:
 * - Default: brain plans → arms parallel → merge
 * - DIRECTOR_ARMS_ENABLED=0: brain alone returns full MotionProject (arms code kept, unused)
 */
export async function createMotionProject(opts: DirectorOptions): Promise<{
  project: MotionProject;
  source: "openai" | "fixture";
  attempts?: number;
  mode?: "multi-agent" | "brain-solo" | "fixture";
}> {
  if (opts.localDemo || process.env.KINETTA_USE_FIXTURE === "1") {
    return {
      project: createDtcpillFixture({
        jobId: opts.jobId,
        aspectRatio: opts.aspectRatio,
        voiceoverEnabled: opts.voiceoverEnabled,
      }),
      source: "fixture",
      attempts: 0,
      mode: "fixture",
    };
  }

  const brain = brainModel();
  const useArms = armsEnabled();

  if (!useArms) {
    log(opts, `Brain-solo ${brain} (arms disabled)…`);
    const draft = await runBrainSolo({
      jobId: opts.jobId,
      referenceImages: opts.referenceImages,
      prompt: opts.prompt,
      aspectRatio: opts.aspectRatio,
      durationTargetSec: opts.durationTargetSec,
      voiceoverEnabled: opts.voiceoverEnabled,
    });
    log(opts, "Brain-solo OK — validating…");
    const { project, attempts } = await validateAndRepair(
      opts,
      draft,
      titleFromPrompt(opts.prompt),
      brain,
    );
    const snappedSolo = snapReferenceAssetIds(project, opts.referenceImages);
    if (snappedSolo > 0) {
      log(opts, `Riferimenti: ${snappedSolo} layer ricondotti all'immagine caricata`);
    }
    log(
      opts,
      `Brain-solo validated (${attempts} pass(es)) — "${project.title}" · ${project.scenes.length} scenes · ${project.durationSec}s`,
    );
    return {
      project,
      source: "openai",
      attempts,
      mode: "brain-solo",
    };
  }

  const arms = armModel();
  log(opts, `Brain ${brain} → arms ${arms} (parallel)`);

  log(opts, "Brain: analyzing intent + assigning briefs…");
  const plan = await runBrain({
    referenceImages: opts.referenceImages,
    jobId: opts.jobId,
    prompt: opts.prompt,
    aspectRatio: opts.aspectRatio,
    durationTargetSec: opts.durationTargetSec,
    voiceoverEnabled: opts.voiceoverEnabled,
  });
  log(
    opts,
    `Brain OK — "${plan.title}" · ${plan.scenes.length} scenes · ${plan.durationSec}s`,
  );

  log(opts, "Arms: structure + layout + copy + motion (parallel)…");
  const armBundle = await runArmsParallel({
    jobId: opts.jobId,
    referenceImages: opts.referenceImages,
    plan,
    aspectRatio: opts.aspectRatio,
    voiceoverEnabled: opts.voiceoverEnabled,
  });
  log(opts, "Arms OK — merging…");

  const draft: unknown = mergeArmOutputs({
    jobId: opts.jobId,
    aspectRatio: opts.aspectRatio,
    plan,
    arms: armBundle,
    voiceoverEnabled: opts.voiceoverEnabled,
  });
  await persistJson(opts.jobId, "director-merged.json", draft);

  const { project, attempts } = await validateAndRepair(
    opts,
    draft,
    plan.title || titleFromPrompt(opts.prompt),
    arms,
  );
  const snapped = snapReferenceAssetIds(project, opts.referenceImages);
  if (snapped > 0) {
    log(opts, `Riferimenti: ${snapped} layer ricondotti all'immagine caricata`);
  }
  log(opts, `Multi-agent OK — validated (${attempts} pass(es))`);
  return {
    project,
    source: "openai",
    attempts,
    mode: "multi-agent",
  };
}



/**
 * Snap any assetId that merely *contains* an uploaded reference id back to the
 * bare id.
 *
 * The images arm is told, hard and repeatedly, that ids look like
 * "gen:<stable_id>". Told about references as well, it split the difference and
 * emitted "gen:ref_abc123" — pointing at a Flux plate that will never exist
 * while the user's own file sat unused. Prompt wording is the wrong tool for a
 * rule that must hold every time, so it is enforced here instead.
 */
function snapReferenceAssetIds(
  project: MotionProject,
  refs: ReferenceImage[] | undefined,
): number {
  if (!refs || refs.length === 0) return 0;
  let fixed = 0;
  for (const scene of project.scenes) {
    if (scene.background.type === "image") {
      const hit = refs.find((r) => scene.background.type === "image" && scene.background.assetId.includes(r.id));
      if (hit && scene.background.assetId !== hit.id) {
        scene.background = { ...scene.background, assetId: hit.id };
        fixed++;
      }
    }
    for (const layer of scene.layers) {
      if (layer.type !== "image") continue;
      const hit = refs.find((r) => layer.assetId.includes(r.id));
      if (!hit || layer.assetId === hit.id) continue;
      layer.assetId = hit.id;
      // A user-supplied image must never also carry a generation prompt.
      delete layer.imagePrompt;
      fixed++;
    }
  }
  return fixed;
}

function fixtureVoiceScript(title: string, prompt?: string): string {
  const product = title.replace(/…$/, "").trim() || "this product";
  const brief = (prompt ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  if (brief.length > 40) {
    return `${brief}. Clean motion. Clear message. Built to convert.`;
  }
  return `${product}. Launch with clarity. Show the product. End with the call to action.`;
}

/** Fixture project for smoke tests / local demo (no OpenAI). */
export function createFixtureMotionProject(opts: {
  jobId: string;
  aspectRatio?: AspectRatio;
  title?: string;
  prompt?: string;
  voiceoverEnabled?: boolean;
}): MotionProject {
  const aspect = opts.aspectRatio ?? "16:9";
  const size = formatForAspect(aspect);
  const title = opts.title ?? "GamePing AI Launch";
  const voiceOn = opts.voiceoverEnabled === true;
  const brand = {
    primaryColor: "#1e3a5f",
    secondaryColor: "#0f172a",
    backgroundColor: "#0b1220",
    foregroundColor: "#f8fafc",
    accentColor: "#3b82f6",
    fontFamily: "Inter",
    style: "premium-saas" as const,
    cornerRadius: 16,
  };

  const raw = {
    version: 1 as const,
    id: opts.jobId,
    title,
    description: "Premium SaaS launch motion",
    format: { ...size, fps: 30, aspectRatio: aspect },
    durationSec: 12,
    brand,
    audio: {
      voiceover: {
        enabled: voiceOn,
        script: voiceOn ? fixtureVoiceScript(title, opts.prompt) : "",
        provider: "elevenlabs" as const,
      },
    },
    scenes: [
      {
        id: "scene_01",
        name: "Hook",
        purpose: "Brand open",
        startSec: 0,
        durationSec: 3,
        background: { type: "gradient" as const, from: "#0b1220", to: "#1e3a5f", angle: 160 },
        layers: [
          {
            id: "t1",
            name: "Title",
            type: "text" as const,
            text: title,
            fontSize: 72,
            fontWeight: 700,
            color: "#f8fafc",
            align: "center" as const,
            startSec: 0.1,
            durationSec: 2.8,
            x: size.width * 0.15,
            y: size.height * 0.35,
            width: size.width * 0.7,
            height: 100,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 2,
            animations: [],
            animationPreset: "slideUp",
          },
          {
            id: "s1",
            name: "Accent bar",
            type: "shape" as const,
            shape: "rectangle" as const,
            fill: "#3b82f6",
            startSec: 0.2,
            durationSec: 2.6,
            x: size.width * 0.4,
            y: size.height * 0.52,
            width: size.width * 0.2,
            height: 6,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 1,
            animations: [],
            animationPreset: "scaleIn",
            borderRadius: 4,
          },
        ],
        transitionOut: { type: "fade" as const, durationSec: 0.35 },
      },
      {
        id: "scene_02",
        name: "Product",
        purpose: "Dashboard reveal",
        startSec: 3,
        durationSec: 4,
        background: { type: "solid" as const, color: "#0b1220" },
        layers: [
          {
            id: "img1",
            name: "Dashboard",
            type: "image" as const,
            assetId: "builtin:dashboard",
            fit: "contain" as const,
            startSec: 0.1,
            durationSec: 3.8,
            x: size.width * 0.18,
            y: size.height * 0.18,
            width: size.width * 0.64,
            height: size.height * 0.55,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 1,
            animations: [],
            animationPreset: "scaleIn",
            borderRadius: 16,
            shadow: true,
          },
          {
            id: "t2",
            name: "Caption",
            type: "text" as const,
            text: "Realtime match insights",
            fontSize: 36,
            fontWeight: 600,
            color: "#93c5fd",
            align: "center" as const,
            startSec: 0.4,
            durationSec: 3.4,
            x: size.width * 0.2,
            y: size.height * 0.78,
            width: size.width * 0.6,
            height: 50,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 2,
            animations: [],
            animationPreset: "fadeIn",
          },
        ],
        transitionOut: { type: "fade" as const, durationSec: 0.35 },
      },
      {
        id: "scene_03",
        name: "Features",
        purpose: "Three cards",
        startSec: 7,
        durationSec: 3,
        background: { type: "solid" as const, color: "#0f172a" },
        layers: [
          {
            id: "c1",
            name: "Card A",
            type: "image" as const,
            assetId: "builtin:card",
            fit: "contain" as const,
            startSec: 0.1,
            durationSec: 2.8,
            x: size.width * 0.08,
            y: size.height * 0.28,
            width: size.width * 0.26,
            height: size.height * 0.4,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 1,
            animations: [],
            animationPreset: "staggeredCardReveal",
          },
          {
            id: "c2",
            name: "Card B",
            type: "image" as const,
            assetId: "builtin:card",
            fit: "contain" as const,
            startSec: 0.25,
            durationSec: 2.65,
            x: size.width * 0.37,
            y: size.height * 0.28,
            width: size.width * 0.26,
            height: size.height * 0.4,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 1,
            animations: [],
            animationPreset: "staggeredCardReveal",
          },
          {
            id: "c3",
            name: "Card C",
            type: "image" as const,
            assetId: "builtin:card",
            fit: "contain" as const,
            startSec: 0.4,
            durationSec: 2.5,
            x: size.width * 0.66,
            y: size.height * 0.28,
            width: size.width * 0.26,
            height: size.height * 0.4,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 1,
            animations: [],
            animationPreset: "staggeredCardReveal",
          },
        ],
        transitionOut: { type: "fade" as const, durationSec: 0.35 },
      },
      {
        id: "scene_04",
        name: "Logo",
        purpose: "Close",
        startSec: 10,
        durationSec: 2,
        background: { type: "gradient" as const, from: "#0b1220", to: "#172554", angle: 140 },
        layers: [
          {
            id: "logo",
            name: "Logo",
            type: "image" as const,
            assetId: "builtin:logo",
            fit: "contain" as const,
            startSec: 0.1,
            durationSec: 1.8,
            x: size.width * 0.35,
            y: size.height * 0.32,
            width: size.width * 0.3,
            height: size.height * 0.25,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 1,
            animations: [],
            animationPreset: "scaleIn",
          },
          {
            id: "cta",
            name: "CTA",
            type: "text" as const,
            text: "Start free today",
            fontSize: 32,
            fontWeight: 600,
            color: "#e2e8f0",
            align: "center" as const,
            startSec: 0.3,
            durationSec: 1.6,
            x: size.width * 0.25,
            y: size.height * 0.62,
            width: size.width * 0.5,
            height: 48,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 2,
            animations: [],
            animationPreset: "fadeIn",
          },
        ],
        transitionOut: { type: "cut" as const, durationSec: 0 },
      },
    ],
  };

  return normalizeMotionProject(raw, { jobId: opts.jobId, aspectRatio: aspect });
}
