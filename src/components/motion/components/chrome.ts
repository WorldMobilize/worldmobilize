"use client";

import type { BrandSystem } from "@/lib/motion/types";
import type { CSSProperties } from "react";
import { asBool, asNumber, asString } from "@/components/motion/components/rng";

export function brandFg(brand?: BrandSystem): string {
  return brand?.foregroundColor ?? "#f8fafc";
}

export function brandAccent(brand?: BrandSystem, fallback = "#3b82f6"): string {
  return brand?.accentColor ?? fallback;
}

export function brandPrimary(brand?: BrandSystem, fallback = "#3b82f6"): string {
  return brand?.primaryColor ?? fallback;
}

export function brandRadius(brand?: BrandSystem, fallback = 16): number {
  return brand?.cornerRadius ?? fallback;
}

export type ChromeOpts = {
  glass?: boolean;
  shadow?: boolean;
  accent?: string;
  radius?: number;
  pad?: number | string;
  bg?: string;
  border?: string;
};

/** Shared glass/solid card chrome used across the component library. */
export function cardChrome(
  brand: BrandSystem | undefined,
  opts: ChromeOpts = {},
): CSSProperties {
  const glass = opts.glass !== false;
  const shadow = opts.shadow !== false;
  const accent = opts.accent ?? brandAccent(brand);
  const radius = opts.radius ?? brandRadius(brand);
  return {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    color: brandFg(brand),
    borderRadius: radius,
    padding: opts.pad ?? 16,
    background:
      opts.bg ??
      (glass ? "rgba(15,23,42,0.78)" : brand?.backgroundColor ?? "#0b1220"),
    border: opts.border ?? `1px solid ${accent}40`,
    boxShadow: shadow ? "0 18px 48px rgba(0,0,0,0.45)" : "none",
    backdropFilter: glass ? "blur(12px)" : undefined,
  };
}

export function fitFont(w: number, h: number, ratio: number, max: number): number {
  return Math.max(10, Math.min(w * ratio, h * ratio * 1.2, max));
}

export function readChromeProps(props: Record<string, unknown>): {
  glass: boolean;
  shadow: boolean;
  accent?: string;
} {
  return {
    glass: asBool(props.glass, true),
    shadow: asBool(props.shadow, true),
    accent: typeof props.accent === "string" ? props.accent : undefined,
  };
}

export function progressReveal(progress: number, index: number, total: number): number {
  const span = 1 / Math.max(1, total);
  const start = index * span * 0.7;
  const t = (progress - start) / (span * 1.4);
  return Math.max(0, Math.min(1, t));
}

export function hexAlpha(hex: string, a: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return `rgba(59,130,246,${a})`;
  return `rgba(${parseInt(m[1]!, 16)},${parseInt(m[2]!, 16)},${parseInt(m[3]!, 16)},${a})`;
}

export { asBool, asNumber, asString };
