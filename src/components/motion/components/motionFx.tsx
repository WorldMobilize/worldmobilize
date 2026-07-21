"use client";

import type { MotionComponentProps } from "@/components/motion/components/registry";
import {
  asString,
  brandAccent,
  cardChrome,
  fitFont,
  progressReveal,
  readChromeProps,
} from "@/components/motion/components/chrome";
import { asStringArray, clamp01 } from "@/components/motion/components/rng";

export function SequentialReveal({ layer, props, progress, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 6);
  const list = items.length ? items : ["One", "Two", "Three", "Four"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 14 }), display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
      {list.map((it, i) => (
        <div
          key={i}
          style={{
            fontSize: fitFont(layer.width, layer.height, 0.07, 20),
            fontWeight: 700,
            opacity: progressReveal(p, i, list.length),
            transform: `translateY(${(1 - progressReveal(p, i, list.length)) * 12}px)`,
          }}
        >
          {it}
        </div>
      ))}
    </div>
  );
}

export function StaggerGrid({ layer, props, progress, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 9);
  const list = items.length ? items : ["A", "B", "C", "D", "E", "F"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 10 }), display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      {list.map((it, i) => (
        <div
          key={i}
          style={{
            borderRadius: 10,
            background: `${accent}22`,
            border: `1px solid ${accent}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 13,
            minHeight: 44,
            opacity: progressReveal(p, i, list.length),
            transform: `scale(${0.85 + 0.15 * progressReveal(p, i, list.length)})`,
          }}
        >
          {it}
        </div>
      ))}
    </div>
  );
}

export function CardStack({ layer, props, progress, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 4);
  const list = items.length ? items : ["Card 1", "Card 2", "Card 3"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {list.map((it, i) => (
        <div
          key={i}
          style={{
            ...cardChrome(brand, { glass: true, shadow: true, accent, pad: 16, radius: 16 }),
            position: "absolute",
            left: i * 12,
            top: i * 16,
            right: (list.length - 1 - i) * 10,
            bottom: (list.length - 1 - i) * 8,
            display: "flex",
            alignItems: "center",
            fontWeight: 800,
            fontSize: fitFont(layer.width, layer.height, 0.08, 22),
            opacity: progressReveal(p, i, list.length),
          }}
        >
          {it}
        </div>
      ))}
    </div>
  );
}

function MarqueeBase({
  layer,
  props,
  progress,
  brand,
  vertical = false,
}: MotionComponentProps & { vertical?: boolean }) {
  const items = asStringArray(props.items).slice(0, 10);
  const list = items.length ? items : ["Launch", "Grow", "Retain", "Scale", "Win"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const offset = p * 120;
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          gap: 18,
          transform: vertical ? `translateY(${-offset}px)` : `translateX(${-offset}px)`,
          whiteSpace: "nowrap",
          alignItems: "center",
          height: vertical ? "auto" : "100%",
          padding: 12,
        }}
      >
        {[...list, ...list].map((it, i) => (
          <div
            key={i}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: `1px solid ${accent}55`,
              background: `${accent}18`,
              fontWeight: 700,
              fontSize: fitFont(layer.width, layer.height, 0.06, 16),
              flexShrink: 0,
            }}
          >
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InfiniteHorizontalCarousel(p: MotionComponentProps) {
  return <MarqueeBase {...p} />;
}
export function InfiniteVerticalCarousel(p: MotionComponentProps) {
  return <MarqueeBase {...p} vertical />;
}
export function Marquee(p: MotionComponentProps) {
  return <MarqueeBase {...p} />;
}

export function FloatingLayerGroup({ layer, props, progress, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 5);
  const list = items.length ? items : ["Insight", "Action", "Result"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {list.map((it, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${10 + i * 14}%`,
            top: `${20 + (i % 3) * 18}%`,
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(15,23,42,0.85)",
            border: `1px solid ${accent}55`,
            fontWeight: 700,
            fontSize: 13,
            transform: `translateY(${Math.sin(p * Math.PI * 2 + i) * 8}px)`,
            opacity: progressReveal(p, i, list.length),
            boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
          }}
        >
          {it}
        </div>
      ))}
    </div>
  );
}

export function ExplodedLayout({ layer, props, progress, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 5);
  const list = items.length ? items : ["Core", "API", "UI", "Data", "AI"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const spread = 20 + 40 * Math.min(1, p);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {list.map((it, i) => {
        const angle = (i / list.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${Math.cos(angle) * spread}%)`,
              top: `calc(50% + ${Math.sin(angle) * spread}%)`,
              transform: "translate(-50%, -50%)",
              padding: "10px 12px",
              borderRadius: 10,
              background: `${accent}22`,
              border: `1px solid ${accent}55`,
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            {it}
          </div>
        );
      })}
      <div style={{ width: 56, height: 56, borderRadius: 16, background: accent, opacity: 0.9 }} />
    </div>
  );
}

export function IsometricStack({ layer, props, progress, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 4);
  const list = items.length ? items : ["Layer A", "Layer B", "Layer C"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", perspective: 800 }}>
      <div style={{ position: "relative", width: "60%", height: "60%", transformStyle: "preserve-3d", transform: "rotateX(55deg) rotateZ(-35deg)" }}>
        {list.map((it, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${accent}66, rgba(15,23,42,0.95))`,
              border: `1px solid ${accent}55`,
              transform: `translateZ(${i * (18 + 10 * p)}px)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 13,
              opacity: progressReveal(p, i, list.length),
            }}
          >
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}
