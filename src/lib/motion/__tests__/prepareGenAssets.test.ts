import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { rm, readFile } from "node:fs/promises";
import path from "node:path";
import { prepareProjectAssets, jobDir } from "@/lib/motion/assets";
import type { MotionProject } from "@/lib/motion/types";

describe("prepareProjectAssets gen: fallback", () => {
  const jobId = "job_test_flux_fallback";
  const prevKey = process.env.BFL_API_KEY;

  beforeEach(async () => {
    delete process.env.BFL_API_KEY;
    await rm(jobDir(jobId), { recursive: true, force: true });
  });

  afterEach(async () => {
    if (prevKey === undefined) delete process.env.BFL_API_KEY;
    else process.env.BFL_API_KEY = prevKey;
    await rm(jobDir(jobId), { recursive: true, force: true });
  });

  it("writes fallback PNG for gen:phone_frame when Flux is missing", async () => {
    const project: MotionProject = {
      id: jobId,
      title: "Phone mute",
      format: { width: 1080, height: 1920, fps: 30, aspectRatio: "9:16" },
      durationSec: 5,
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
      scenes: [
        {
          id: "scene_01",
          name: "Chat",
          purpose: "Show the chat exchange inside the phone frame",
          startSec: 0,
          durationSec: 5,
          background: { type: "solid", color: "#0b0b0b" },
          layers: [
            {
              id: "phone_frame",
              name: "phone",
              type: "image",
              assetId: "gen:phone_frame",
              imagePrompt:
                "Photoreal empty iPhone, blank dark screen, no text, no icons",
              fit: "contain",
              x: 50,
              y: 40,
              width: 980,
              height: 1840,
              opacity: 1,
              rotation: 0,
              scale: 1,
              zIndex: 0,
              startSec: 0,
              durationSec: 5,
              animations: [],
              animationPreset: "fadeIn",
              enabled: true,
            },
            {
              id: "user_msg",
              name: "msg",
              type: "text",
              text: "How did Liquid Death win?",
              fontSize: 28,
              fontWeight: 600,
              color: "#ffffff",
              align: "left",
              x: 180,
              y: 700,
              width: 700,
              height: 120,
              opacity: 1,
              rotation: 0,
              scale: 1,
              zIndex: 5,
              startSec: 0,
              durationSec: 5,
              animations: [],
              animationPreset: "fadeIn",
              enabled: true,
            },
          ],
          camera: { x: 0, y: 0, scale: 1, rotation: 0, animations: [] },
          transitionOut: { type: "fade", durationSec: 0.3 },
        },
      ],
      audio: { voiceover: { enabled: false, script: "", provider: "elevenlabs" } },
      version: 1,
    };

    const assets = await prepareProjectAssets(project);
    const gen = assets.find((a) => a.id === "gen:phone_frame");
    expect(gen?.status).toBe("ready");
    expect(gen?.url).toMatch(/phone_frame\.png$/);

    const buf = await readFile(path.join(jobDir(jobId), "assets", "phone_frame.png"));
    expect(buf.byteLength).toBeGreaterThan(100);
  });
});
