"use client";

import type { CSSProperties } from "react";
import type { TextLayer } from "@/lib/motion/types";

/**
 * Render a text layer. Supports a `countUp` animation preset: any numeric token
 * in the text is interpolated from 0 to its target based on layer progress.
 */
export function TextLayerView({
  layer,
  progress,
}: {
  layer: TextLayer;
  /** 0..1 progress through the layer lifetime (for countUp). */
  progress: number;
}) {
  const text = layer.animationPreset === "countUp" ? countUpText(layer.text, progress) : layer.text;

  const style: CSSProperties = {
    color: layer.color,
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight,
    // Display type needs negative tracking; body copy does not. Without this,
    // large headlines read as loose and default-y.
    letterSpacing: layer.fontSize >= 64 ? "-0.02em" : undefined,
    lineHeight: 1.15,
    textAlign: layer.align,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent:
      layer.align === "center" ? "center" : layer.align === "right" ? "flex-end" : "flex-start",
    whiteSpace: "pre-line",
    overflow: "hidden",
  };

  return <div style={style}>{text}</div>;
}

const COUNT_UP_RE = /(\d[\d,._]*)/;

/** Interpolate the first numeric token from 0 -> target using progress. */
export function countUpText(text: string, progress: number): string {
  const match = text.match(COUNT_UP_RE);
  if (!match) return text;

  const raw = match[1]!;
  const target = Number(raw.replace(/[,._]/g, ""));
  if (!Number.isFinite(target)) return text;

  const p = Math.max(0, Math.min(1, progress));
  const current = Math.round(target * p);
  const formatted = raw.includes(",") ? current.toLocaleString("en-US") : String(current);
  return text.replace(COUNT_UP_RE, formatted);
}
