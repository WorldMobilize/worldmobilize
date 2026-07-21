"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { MotionComponentProps } from "@/components/motion/components/registry";
import { asBool, asNumber, asString, clamp01 } from "@/components/motion/components/rng";

const PillCanvas = dynamic(
  () => import("@/components/motion/components/PillMesh").then((m) => m.PillCanvas),
  { ssr: false },
);

/**
 * PillHero — real WebGL two-tone capsule the Director can color + animate.
 * props:
 *   topColor?     (default #FFFFFF)
 *   bottomColor?  (default brand primary / color)
 *   color?        alias for bottomColor
 *   glow?         unused visually (kept for plan compat)
 *   spin?         degrees of Y rotation over layer lifetime (default 360)
 *   float?        float amplitude (default 0 — spin only)
 *   tilt?         base X tilt degrees (default 0 — upright)
 */
export function PillHero({ props, progress, brand }: MotionComponentProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const topColor = asString(props.topColor, "#FFFFFF");
  const bottomColor = asString(
    props.bottomColor,
    asString(props.color, brand?.primaryColor ?? "#2244c6"),
  );
  const spin = asNumber(props.spin, 360);
  const float = asNumber(props.float, 0);
  const tilt = asNumber(props.tilt, 0);
  const p = clamp01(progress);

  // Legacy flag — if someone forces CSS, skip WebGL (rare)
  const forceCss = asBool(props.cssOnly, false);

  if (!ready) {
    return <div style={{ width: "100%", height: "100%" }} />;
  }

  if (forceCss) {
    return <CssFallback topColor={topColor} bottomColor={bottomColor} progress={p} />;
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <PillCanvas
        progress={p}
        topColor={topColor}
        bottomColor={bottomColor}
        spin={spin}
        float={float}
        tilt={tilt}
      />
    </div>
  );
}

function CssFallback({
  topColor,
  bottomColor,
  progress,
}: {
  topColor: string;
  bottomColor: string;
  progress: number;
}) {
  const bob = Math.sin(progress * Math.PI * 2) * 8;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "28%",
          height: "62%",
          borderRadius: 999,
          transform: `translateY(${bob}px)`,
          background: `linear-gradient(180deg, ${topColor} 0%, ${topColor} 48%, ${bottomColor} 52%, ${bottomColor} 100%)`,
          boxShadow: "inset 8px 0 16px rgba(255,255,255,0.45), inset -10px 0 18px rgba(0,0,0,0.28)",
        }}
      />
    </div>
  );
}
