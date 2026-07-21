import { describe, expect, it } from "vitest";
import { mergeArmOutputs } from "@/lib/director/merge";
import type { DirectorPlan } from "@/lib/director/brain";
import type { ArmBundle } from "@/lib/director/arms";

const brand: DirectorPlan["brand"] = {
  primaryColor: "#D97757",
  secondaryColor: "#1a1a1a",
  backgroundColor: "#0b0b0b",
  foregroundColor: "#f5f5f4",
  accentColor: "#D97757",
  fontFamily: "Inter",
  style: "minimal",
  cornerRadius: 16,
};

describe("merge images arm", () => {
  it("merges mute gen image under text without overwriting copy", () => {
    const plan: DirectorPlan = {
      intent: "Claude phone chat",
      title: "Claude",
      durationSec: 8,
      facts: { numbers: [], claims: [] },
      brand,
      scenes: [
        {
          id: "scene_01",
          name: "Chat",
          purpose: "demo",
          startSec: 0,
          durationSec: 8,
          layers: [
            { id: "phone_frame", role: "image", kind: "image", note: "empty iphone" },
            { id: "user_msg", role: "headline", kind: "text", note: "user bubble" },
          ],
        },
      ],
      briefs: {
        structure: "",
        layout: "",
        copy: "",
        motion: "",
        images: "",
      },
    };

    const arms: ArmBundle = {
      structure: {
        scenes: [{ id: "scene_01", background: { type: "solid", color: "#0b0b0b" } }],
      },
      layout: {
        layers: [
          {
            sceneId: "scene_01",
            id: "phone_frame",
            type: "image",
            x: 50,
            y: 40,
            width: 980,
            height: 1840,
            zIndex: 0,
            assetId: "gen:phone_frame",
            fit: "contain",
          },
          {
            sceneId: "scene_01",
            id: "user_msg",
            type: "text",
            x: 180,
            y: 700,
            width: 700,
            height: 120,
            zIndex: 5,
          },
        ],
      },
      copy: {
        texts: [
          {
            sceneId: "scene_01",
            layerId: "user_msg",
            text: "How did Liquid Death win?",
            fontSize: 28,
            color: "#fff",
            align: "left",
          },
        ],
      },
      motion: { layers: [] },
      images: {
        layers: [
          {
            sceneId: "scene_01",
            id: "phone_frame",
            type: "image",
            x: 50,
            y: 40,
            width: 980,
            height: 1840,
            zIndex: 0,
            assetId: "gen:phone_frame",
            imagePrompt:
              "Photoreal empty iPhone front view, Dynamic Island, blank dark screen, no text, no icons",
            fit: "contain",
          },
        ],
      },
    };

    const project = mergeArmOutputs({
      jobId: "job_test_images",
      aspectRatio: "9:16",
      plan,
      arms,
      voiceoverEnabled: false,
    });

    const layers = project.scenes[0]!.layers;
    const phone = layers.find((l) => l.id === "phone_frame");
    const text = layers.find((l) => l.id === "user_msg");
    expect(phone?.type).toBe("image");
    if (phone?.type === "image") {
      expect(phone.assetId).toBe("gen:phone_frame");
      expect(phone.imagePrompt).toMatch(/no text/i);
    }
    expect(text?.type).toBe("text");
    if (text?.type === "text") {
      expect(text.text).toContain("Liquid Death");
    }
  });
});
