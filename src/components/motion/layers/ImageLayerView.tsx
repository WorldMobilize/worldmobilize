"use client";

import type { CSSProperties } from "react";
import { resolveAssetUrl } from "@/components/motion/assetUrl";
import type { ImageLayer, ProjectAsset } from "@/lib/motion/types";

export function ImageLayerView({
  layer,
  jobId,
  assets,
}: {
  layer: ImageLayer;
  jobId?: string;
  assets?: ProjectAsset[];
}) {
  const url = resolveAssetUrl(layer.assetId, { jobId, assets });

  const common: CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: layer.borderRadius ?? 0,
    boxShadow: layer.shadow ? "0 20px 60px rgba(0,0,0,0.45)" : undefined,
    overflow: "hidden",
  };

  if (!url) {
    return (
      <div
        style={{
          ...common,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(148,163,184,0.15)",
          border: "1px dashed rgba(148,163,184,0.4)",
          color: "rgba(226,232,240,0.7)",
          fontSize: 14,
          textAlign: "center",
          padding: 8,
        }}
      >
        {layer.assetId.replace("builtin:", "").replace("icon-", "")}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={layer.name}
      draggable={false}
      style={{ ...common, objectFit: layer.fit === "contain" ? "contain" : "cover" }}
    />
  );
}
