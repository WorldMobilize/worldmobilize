"use client";

import type { CSSProperties } from "react";
import type { ShapeLayer } from "@/lib/motion/types";

export function ShapeLayerView({ layer }: { layer: ShapeLayer }) {
  const base: CSSProperties = {
    width: "100%",
    height: "100%",
    background: layer.fill ?? "#3b82f6",
    boxSizing: "border-box",
  };

  if (layer.stroke && (layer.strokeWidth ?? 0) > 0) {
    base.border = `${layer.strokeWidth}px solid ${layer.stroke}`;
  }

  if (layer.shape === "circle") {
    return <div style={{ ...base, borderRadius: "50%" }} />;
  }

  if (layer.shape === "line") {
    return (
      <div
        style={{
          width: "100%",
          height: Math.max(2, layer.strokeWidth ?? 4),
          background: layer.stroke ?? layer.fill ?? "#3b82f6",
          borderRadius: 999,
          alignSelf: "center",
        }}
      />
    );
  }

  return <div style={{ ...base, borderRadius: layer.borderRadius ?? 12 }} />;
}
