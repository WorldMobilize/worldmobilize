import { describe, expect, it } from "vitest";
import { repairDirectorJson } from "@/lib/motion/validate";
import type { MotionProject } from "@/lib/motion/types";

const BRAND = {
  primaryColor: "#FF641C",
  secondaryColor: "#FFFFFF",
  backgroundColor: "#050506",
  foregroundColor: "#FFFFFF",
  accentColor: "#FF641C",
  fontFamily: "Inter",
  style: "minimal",
  cornerRadius: 24,
};

/** WCAG relative luminance — the same measure the repair uses to decide. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => {
    const s = parseInt(h.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

function repairBg(background: unknown) {
  const out = repairDirectorJson(
    {
      id: "job_bg_test",
      title: "bg",
      durationSec: 4,
      brand: BRAND,
      scenes: [{ id: "scene_01", name: "s", durationSec: 4, background, layers: [] }],
      audio: {},
    },
    { aspectRatio: "16:9", jobId: "job_bg_test" },
  ) as MotionProject;
  return out.scenes[0]!.background;
}

describe("scene backgrounds stay backgrounds", () => {
  // The regression: a brief asking for "deep near-black with a very subtle
  // orange glow" came back as a gradient running to full #FF641C — half a
  // screen of solid orange, because a linear ramp to a saturated accent is
  // 50% accent however the brief was phrased.
  it("pulls a saturated gradient stop back toward the brand background", () => {
    const bg = repairBg({ type: "gradient", from: "#050506", to: "#FF641C", angle: 180 });
    expect(bg.type).toBe("gradient");
    if (bg.type !== "gradient") return;
    expect(bg.to).not.toBe("#FF641C");
    expect(luminance(bg.to)).toBeLessThan(luminance("#FF641C"));
    // Still recognisably the brand hue, not greyed out.
    const h = bg.to.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g!);
    expect(g).toBeGreaterThan(b!);
  });

  it("calms a saturated solid background too", () => {
    const bg = repairBg({ type: "solid", color: "#FF641C" });
    expect(bg.type).toBe("solid");
    if (bg.type !== "solid") return;
    expect(luminance(bg.color)).toBeLessThan(luminance("#FF641C"));
  });

  it("leaves an already dark background untouched", () => {
    const bg = repairBg({ type: "gradient", from: "#050506", to: "#101018", angle: 160 });
    expect(bg.type).toBe("gradient");
    if (bg.type !== "gradient") return;
    expect(bg.from).toBe("#050506");
    expect(bg.to).toBe("#101018");
  });

  // The brand background is the authority, so a brief that genuinely wants a
  // bright stage keeps it — the rule is relative, not a blanket "go dark".
  it("allows bright scenery when the brand background is itself bright", () => {
    const out = repairDirectorJson(
      {
        id: "job_bg_light",
        title: "bg",
        durationSec: 4,
        brand: { ...BRAND, backgroundColor: "#FAFAF7" },
        scenes: [
          {
            id: "scene_01",
            name: "s",
            durationSec: 4,
            background: { type: "solid", color: "#FAFAF7" },
            layers: [],
          },
        ],
        audio: {},
      },
      { aspectRatio: "16:9", jobId: "job_bg_light" },
    ) as MotionProject;
    const bg = out.scenes[0]!.background;
    expect(bg.type).toBe("solid");
    if (bg.type !== "solid") return;
    expect(bg.color).toBe("#FAFAF7");
  });
});
