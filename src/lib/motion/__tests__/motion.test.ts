import { describe, expect, it } from "vitest";
import { applyMotionPreset, MOTION_PRESET_IDS } from "@/lib/motion/presets";
import { motionProjectSchema } from "@/lib/motion/schema";
import {
  clampVoiceoverToDuration,
  estimateSpeechSec,
  normalizeMotionProject,
  repairDirectorJson,
  validateMotionProject,
} from "@/lib/motion/validate";
import { createFixtureMotionProject } from "@/lib/director";

describe("MotionProject schema", () => {
  it("accepts fixture project", () => {
    const p = createFixtureMotionProject({ jobId: "job_test" });
    const parsed = motionProjectSchema.safeParse(p);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid director response", () => {
    const res = validateMotionProject({ version: 1, title: "x" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe("motion presets", () => {
  it("defines required presets", () => {
    expect(MOTION_PRESET_IDS).toContain("fadeIn");
    expect(MOTION_PRESET_IDS).toContain("staggeredCardReveal");
  });

  it("fadeIn animates opacity 0 → base", () => {
    const tracks = applyMotionPreset("fadeIn", {
      x: 10,
      y: 20,
      opacity: 1,
      scale: 1,
      durationSec: 3,
    });
    const opacity = tracks.find((t) => t.property === "opacity");
    expect(opacity?.keyframes[0]?.value).toBe(0);
    expect(opacity?.keyframes.at(-1)?.value).toBe(1);
  });
});

describe("duration / speech", () => {
  it("normalizes total duration into 10–30", () => {
    const p = createFixtureMotionProject({ jobId: "job_dur" });
    const n = normalizeMotionProject(p, { jobId: "job_dur", durationTargetSec: 12 });
    expect(n.durationSec).toBeGreaterThanOrEqual(10);
    expect(n.durationSec).toBeLessThanOrEqual(30);
  });

  it("estimates and clamps voiceover length", () => {
    expect(estimateSpeechSec("abcd")).toBeGreaterThan(0);
    const long = "word ".repeat(400);
    const clamped = clampVoiceoverToDuration(long, 5);
    expect(clamped.length).toBeLessThan(long.length);
  });
});

describe("director JSON repair", () => {
  it("repairs invalid background types and zero sizes", () => {
    const repaired = repairDirectorJson({
      version: 1,
      id: "job_x",
      title: "Test",
      format: { width: 1920, height: 1080, fps: 30, aspectRatio: "16:9" },
      durationSec: 12,
      brand: {
        primaryColor: "#1e3a5f",
        secondaryColor: "#0f172a",
        backgroundColor: "#0b1220",
        foregroundColor: "#fff",
        accentColor: "#3b82f6",
        fontFamily: "Inter",
        style: "premium-saas",
        cornerRadius: 16,
      },
      audio: {},
      scenes: [
        {
          id: "s1",
          name: "A",
          purpose: "x",
          startSec: 0,
          durationSec: 3,
          background: { type: "particles", color: "#111" },
          layers: [
            {
              type: "text",
              text: "Hi",
              fontSize: 40,
              fontWeight: 600,
              color: "#fff",
              align: "center",
              startSec: 0,
              durationSec: 2,
              x: 100,
              y: 100,
              width: 0,
              height: 0,
              opacity: 1,
              rotation: 0,
              scale: 1,
              zIndex: 1,
              animations: [],
            },
          ],
        },
      ],
    });
    const check = validateMotionProject(repaired);
    expect(check.ok).toBe(true);
  });

  it("converts center-anchored coords and unnests ParticleField capsule", () => {
    const repaired = repairDirectorJson({
      version: 1,
      id: "job_layout",
      title: "Layout",
      format: { width: 1920, height: 1080, fps: 30, aspectRatio: "16:9" },
      durationSec: 5,
      brand: {
        primaryColor: "#1e3a5f",
        secondaryColor: "#0f172a",
        backgroundColor: "#0b1220",
        foregroundColor: "#fff",
        accentColor: "#3b82f6",
        fontFamily: "Inter",
        style: "premium-saas",
        cornerRadius: 16,
      },
      audio: {},
      scenes: [
        {
          id: "s1",
          name: "Hero",
          purpose: "hook",
          startSec: 0,
          durationSec: 5,
          background: { type: "solid", color: "#0b1220" },
          layers: [
            {
              id: "mesh",
              type: "component",
              component: "MeshGradient",
              x: 960,
              y: 540,
              width: 1920,
              height: 1080,
              startSec: 0,
              durationSec: 5,
              opacity: 1,
              scale: 1,
              rotation: 0,
              zIndex: 0,
              animations: [],
              props: {},
            },
            {
              id: "particles",
              type: "component",
              component: "ParticleField",
              x: 960,
              y: 540,
              width: 660,
              height: 660,
              startSec: 0,
              durationSec: 5,
              opacity: 1,
              scale: 1,
              rotation: 0,
              zIndex: 1,
              animations: [],
              props: { showCapsule: true, color: "#3b82f6", count: 48 },
            },
            {
              id: "headline",
              type: "text",
              text: "1,400+ marketing secrets.",
              fontSize: 64,
              fontWeight: 700,
              color: "#fff",
              align: "center",
              x: 960,
              y: 155,
              width: 1180,
              height: 82,
              startSec: 0,
              durationSec: 4,
              opacity: 1,
              scale: 1,
              rotation: 0,
              zIndex: 6,
              animations: [],
            },
          ],
        },
      ],
    }) as {
      scenes: Array<{
        layers: Array<{
          id: string;
          type: string;
          component?: string;
          x: number;
          y: number;
          width: number;
          height: number;
          props?: { showCapsule?: boolean };
        }>;
      }>;
    };

    const layers = repaired.scenes[0]!.layers;
    const mesh = layers.find((l) => l.component === "MeshGradient");
    expect(mesh).toMatchObject({ x: 0, y: 0, width: 1920, height: 1080 });

    const particles = layers.find((l) => l.component === "ParticleField");
    expect(particles).toMatchObject({ x: 0, y: 0, width: 1920, height: 1080 });
    expect(particles?.props?.showCapsule).toBe(false);

    const pill = layers.find((l) => l.component === "PillHero");
    expect(pill).toBeTruthy();
    expect(pill!.x + pill!.width / 2).toBeCloseTo(960, 0);
    expect(pill!.y + pill!.height / 2).toBeCloseTo(540, 0);

    const headline = layers.find((l) => l.id === "headline");
    expect(headline!.x + headline!.width / 2).toBeCloseTo(960, 0);
    expect(headline!.x + headline!.width).toBeLessThanOrEqual(1920);
  });

  it("sizes iPhone nearly full-width on 9:16 with Claude UI", () => {
    const repaired = repairDirectorJson({
      version: 1,
      id: "job_phone",
      title: "Claude phone",
      format: { width: 1080, height: 1920, fps: 30, aspectRatio: "9:16" },
      durationSec: 8,
      brand: {
        primaryColor: "#D97757",
        secondaryColor: "#1a1a1a",
        backgroundColor: "#0b0b0b",
        foregroundColor: "#f5f5f4",
        accentColor: "#D97757",
        fontFamily: "Inter",
        style: "minimal",
        cornerRadius: 16,
      },
      audio: {},
      scenes: [
        {
          id: "s1",
          name: "Home",
          purpose: "hook",
          startSec: 0,
          durationSec: 8,
          background: { type: "solid", color: "#111" },
          layers: [
            {
              id: "phone",
              type: "component",
              component: "ClaudeMobileHome",
              x: 100,
              y: 100,
              width: 200,
              height: 400,
              startSec: 0,
              durationSec: 8,
              opacity: 1,
              scale: 1,
              rotation: 0,
              zIndex: 2,
              animations: [],
              props: { greeting: "Evening, Max" },
            },
          ],
        },
      ],
    }) as {
      scenes: Array<{
        layers: Array<{
          id: string;
          component?: string;
          x: number;
          y: number;
          width: number;
          height: number;
          props?: { ui?: string };
        }>;
      }>;
    };
    const phone = repaired.scenes[0]!.layers.find((l) => l.id === "phone")!;
    expect(phone.component).toBe("iPhone");
    expect(phone.props?.ui).toBe("claude");
    expect(phone.height).toBeGreaterThan(1920 * 0.9);
    expect(Math.abs(phone.x + phone.width / 2 - 540)).toBeLessThan(1);
  });

  it("stretches short layers to fill a 5s scene", () => {
    const repaired = repairDirectorJson({
      version: 1,
      id: "job_dur5",
      title: "Dur",
      format: { width: 1920, height: 1080, fps: 30, aspectRatio: "16:9" },
      durationSec: 5,
      brand: {
        primaryColor: "#1e3a5f",
        secondaryColor: "#0f172a",
        backgroundColor: "#0b1220",
        foregroundColor: "#fff",
        accentColor: "#3b82f6",
        fontFamily: "Inter",
        style: "premium-saas",
        cornerRadius: 16,
      },
      audio: {},
      scenes: [
        {
          id: "s1",
          name: "Hero",
          purpose: "hook",
          startSec: 0,
          durationSec: 5,
          background: { type: "solid", color: "#0b1220" },
          layers: [
            {
              id: "pill",
              type: "component",
              component: "PillHero",
              x: 640,
              y: 220,
              width: 640,
              height: 640,
              startSec: 0,
              durationSec: 2,
              opacity: 1,
              scale: 1,
              rotation: 0,
              zIndex: 2,
              animations: [],
              props: {},
            },
          ],
        },
      ],
    });
    const normalized = normalizeMotionProject(repaired, {
      jobId: "job_dur5",
      aspectRatio: "16:9",
      durationTargetSec: 5,
    });
    expect(normalized.durationSec).toBe(5);
    const pill = normalized.scenes[0]!.layers.find((l) => l.id === "pill");
    expect(pill!.durationSec).toBeGreaterThanOrEqual(4.9);
  });
});
