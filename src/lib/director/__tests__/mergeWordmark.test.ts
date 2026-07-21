import { describe, expect, it } from "vitest";
import { mergeArmOutputs } from "@/lib/director/merge";
import type { DirectorPlan } from "@/lib/director/brain";
import type { ArmBundle } from "@/lib/director/arms";

const brand: DirectorPlan["brand"] = {
  primaryColor: "#B8FF5C",
  secondaryColor: "#7C3DFF",
  backgroundColor: "#06070A",
  foregroundColor: "#F6F7EF",
  accentColor: "#00F5D4",
  fontFamily: "Inter",
  style: "premium-saas",
  cornerRadius: 24,
};

const TITLE = "dtcpill Knowledge Capsule";

/**
 * Merge one scene whose only layer is the brand lockup under test.
 * Component props reach the merge through the copy arm — the structure and
 * layout arms do not carry them — so `props` is routed there.
 */
function lockupProps(component: string, props?: Record<string, unknown>) {
  const plan: DirectorPlan = {
    intent: "dtcpill launch",
    title: TITLE,
    durationSec: 4,
    facts: { numbers: [], claims: [] },
    brand,
    scenes: [
      {
        id: "scene_01",
        name: "Lockup",
        purpose: "close on the brand",
        startSec: 0,
        durationSec: 4,
        layers: [{ id: "lockup", role: "brand", kind: "component", component }],
      },
    ],
    briefs: { structure: "", layout: "", copy: "", motion: "", images: "" },
  };

  const arms: ArmBundle = {
    structure: { scenes: [{ id: "scene_01", background: { type: "solid", color: "#06070A" } }] },
    layout: {
      layers: [
        {
          sceneId: "scene_01",
          id: "lockup",
          type: "component",
          x: 660,
          y: 460,
          width: 600,
          height: 160,
          zIndex: 5,
        },
      ],
    },
    copy: { texts: props ? [{ sceneId: "scene_01", layerId: "lockup", props }] : [] },
    motion: { layers: [] },
    images: { layers: [] },
  } as unknown as ArmBundle;

  const project = mergeArmOutputs({
    jobId: "job_test_wordmark",
    aspectRatio: "16:9",
    plan,
    arms,
    voiceoverEnabled: false,
  });

  const layer = project.scenes.flatMap((s) => s.layers).find((l) => l.id === "lockup");
  return layer?.type === "component" ? layer.props : undefined;
}

describe("brand lockup copy gaps", () => {
  // The regression: the Director emits `Wordmark`, merge only patched
  // `LogoLockup`, and the component's own placeholder put the literal word
  // "Brand" on the closing shot of finished videos.
  it("fills an empty Wordmark from the project title", () => {
    expect(lockupProps("Wordmark")?.text).toBe("dtcpill");
  });

  it("still fills an empty LogoLockup", () => {
    expect(lockupProps("LogoLockup")?.wordmark).toBe("dtcpill");
  });

  it("does not overwrite a name the copy arm supplied", () => {
    expect(lockupProps("Wordmark", { text: "ACME" })?.text).toBe("ACME");
    expect(lockupProps("LogoLockup", { wordmark: "ACME" })?.wordmark).toBe("ACME");
  });

  // The catalog documents Wordmark as taking `text|wordmark`, so an arm that
  // picks the other spelling must not be treated as having said nothing.
  it("accepts either spelling before falling back to the title", () => {
    const props = lockupProps("Wordmark", { wordmark: "ACME" });
    expect(props?.wordmark).toBe("ACME");
    // The title must not be pasted over a name that was already supplied.
    expect(String(props?.text ?? "")).not.toBe("dtcpill");
  });
});
