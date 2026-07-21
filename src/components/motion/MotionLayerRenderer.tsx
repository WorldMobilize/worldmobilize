"use client";

import type { CSSProperties } from "react";
import { ImageLayerView } from "@/components/motion/layers/ImageLayerView";
import { ShapeLayerView } from "@/components/motion/layers/ShapeLayerView";
import { TextLayerView } from "@/components/motion/layers/TextLayerView";
import { ComponentLayerView } from "@/components/motion/layers/ComponentLayerView";
import { resolveLayerState } from "@/lib/motion/resolveLayerState";
import { isLayerVisible, layerLocalTimeMs } from "@/lib/motion/timing";
import type { BrandSystem, MotionLayer, ProjectAsset } from "@/lib/motion/types";

export function MotionLayerRenderer({
  layer,
  sceneLocalMs,
  jobId,
  assets,
  brand,
  selectable = false,
  selected = false,
  onSelect,
}: {
  layer: MotionLayer;
  sceneLocalMs: number;
  jobId?: string;
  assets?: ProjectAsset[];
  brand?: BrandSystem;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (layerId: string) => void;
}) {
  if (!isLayerVisible(layer, sceneLocalMs)) return null;

  const state = resolveLayerState(layer, sceneLocalMs);
  const durMs = layer.durationSec * 1000;
  const progress = durMs > 0 ? layerLocalTimeMs(layer, sceneLocalMs) / durMs : 1;

  const style: CSSProperties = {
    position: "absolute",
    left: state.x,
    top: state.y,
    width: layer.width,
    height: layer.height,
    opacity: state.opacity,
    transform: `scale(${state.scale}) rotate(${state.rotation}deg)`,
    transformOrigin: "center center",
    filter: state.blur > 0 ? `blur(${state.blur}px)` : undefined,
    zIndex: layer.zIndex,
    // Avoid display:flex — WebGL canvases (PillHero) shrink to a top-left
    // default bitmap inside flex parents and look off-center in the box.
    display: "block",
    overflow: "hidden",
    pointerEvents: selectable ? "auto" : "none",
    cursor: selectable ? "pointer" : "default",
    outline: selected ? "2px solid #3b82f6" : undefined,
    outlineOffset: 2,
  };

  const inner = renderInner(layer, progress, jobId, assets, brand);

  return (
    <div
      data-layer-id={layer.id}
      style={style}
      onClick={
        selectable && onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect(layer.id);
            }
          : undefined
      }
    >
      {inner}
    </div>
  );
}

function renderInner(
  layer: MotionLayer,
  progress: number,
  jobId?: string,
  assets?: ProjectAsset[],
  brand?: BrandSystem,
) {
  switch (layer.type) {
    case "text":
      return <TextLayerView layer={layer} progress={progress} />;
    case "image":
      return <ImageLayerView layer={layer} jobId={jobId} assets={assets} />;
    case "shape":
      return <ShapeLayerView layer={layer} />;
    case "component":
      return (
        <ComponentLayerView layer={layer} progress={progress} brand={brand} jobId={jobId} assets={assets} />
      );
    default:
      return null;
  }
}
