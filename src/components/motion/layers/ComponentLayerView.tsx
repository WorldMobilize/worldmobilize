"use client";

import { createElement } from "react";
import { getMotionComponent } from "@/components/motion/components/registry";
import "@/components/motion/components"; // side-effect: registers built-in components
import type { BrandSystem, ComponentLayer, ProjectAsset } from "@/lib/motion/types";

export function ComponentLayerView({
  layer,
  progress,
  brand,
  jobId,
  assets,
}: {
  layer: ComponentLayer;
  progress: number;
  brand?: BrandSystem;
  jobId?: string;
  assets?: ProjectAsset[];
}) {
  const comp = getMotionComponent(layer.component);

  if (!comp) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          background: "rgba(148,163,184,0.12)",
          border: "1px dashed rgba(148,163,184,0.4)",
          color: "rgba(226,232,240,0.7)",
          fontSize: 14,
        }}
      >
        {layer.component}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {createElement(comp, { layer, props: layer.props, progress, brand, jobId, assets })}
    </div>
  );
}
