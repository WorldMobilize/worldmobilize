"use client";

import type { CSSProperties } from "react";
import { resolveAssetUrl } from "@/components/motion/assetUrl";
import { MotionLayerRenderer } from "@/components/motion/MotionLayerRenderer";
import { cameraTransform, resolveCamera } from "@/lib/motion/camera";
import type { BrandSystem, MotionScene, ProjectAsset, SceneBackground } from "@/lib/motion/types";

export function backgroundStyle(
  bg: SceneBackground,
  opts: { jobId?: string; assets?: ProjectAsset[] } = {},
): CSSProperties {
  if (bg.type === "solid") return { background: bg.color };
  if (bg.type === "gradient") {
    return { background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` };
  }
  const url = resolveAssetUrl(bg.assetId, opts);
  return {
    backgroundImage: url ? `url(${url})` : undefined,
    backgroundColor: "#0b1220",
    backgroundSize: bg.fit === "contain" ? "contain" : "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
}

export function MotionSceneRenderer({
  scene,
  sceneLocalMs,
  jobId,
  assets,
  brand,
  selectable = false,
  selectedLayerId = null,
  onSelectLayer,
}: {
  scene: MotionScene;
  sceneLocalMs: number;
  jobId?: string;
  assets?: ProjectAsset[];
  brand?: BrandSystem;
  selectable?: boolean;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
}) {
  const layers = [...scene.layers].sort((a, b) => a.zIndex - b.zIndex);
  const cam = resolveCamera(scene.camera, sceneLocalMs);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: cameraTransform(cam),
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        <div style={{ position: "absolute", inset: 0, ...backgroundStyle(scene.background, { jobId, assets }) }} />
        {layers.map((layer) => (
          <MotionLayerRenderer
            key={layer.id}
            layer={layer}
            sceneLocalMs={sceneLocalMs}
            jobId={jobId}
            assets={assets}
            brand={brand}
            selectable={selectable}
            selected={selectedLayerId === layer.id}
            onSelect={onSelectLayer}
          />
        ))}
      </div>
    </div>
  );
}
