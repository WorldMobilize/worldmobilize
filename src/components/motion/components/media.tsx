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
import { asStringArray, clamp01, seededRng } from "@/components/motion/components/rng";

export function BookCoverCarousel({ layer, props, progress, brand }: MotionComponentProps) {
  const titles = asStringArray(props.titles).slice(0, 8);
  const list = titles.length ? titles : ["Launch", "Scale", "Retain", "Expand", "Win"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const shift = p * (list.length - 1) * 40;
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", gap: 14, height: "100%", transform: `translateX(${-shift}px)`, alignItems: "center", padding: 12 }}>
        {list.map((t, i) => (
          <div
            key={i}
            style={{
              width: Math.max(70, layer.width * 0.18),
              height: "82%",
              flexShrink: 0,
              borderRadius: 10,
              background: `linear-gradient(160deg, ${accent}aa, #0f172a)`,
              border: `1px solid ${accent}55`,
              display: "flex",
              alignItems: "flex-end",
              padding: 10,
              fontWeight: 800,
              fontSize: 12,
              boxShadow: "0 12px 28px rgba(0,0,0,0.4)",
            }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

export const BookCoverStream = BookCoverCarousel;
export const CourseCarousel = BookCoverCarousel;

export function ImageStack({ layer, props, progress, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 4);
  const list = items.length ? items : ["Shot 1", "Shot 2", "Shot 3"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {list.map((it, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: `${8 + i * 10}% ${8 - i * 4}% ${8 - i * 4}% ${8 + i * 6}%`,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${accent}55, rgba(15,23,42,0.9))`,
            border: `1px solid ${accent}44`,
            display: "flex",
            alignItems: "flex-end",
            padding: 12,
            fontWeight: 700,
            fontSize: 13,
            opacity: progressReveal(p, i, list.length),
            transform: `rotate(${(i - 1) * 3}deg)`,
          }}
        >
          {it}
        </div>
      ))}
    </div>
  );
}

export function ScreenshotGallery({ layer, props, progress, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 3);
  const list = items.length ? items : ["Overview", "Reports", "Automations"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 10 }), display: "flex", gap: 8 }}>
      {list.map((it, i) => (
        <div key={i} style={{ flex: 1, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}33`, display: "flex", alignItems: "flex-end", padding: 10, fontSize: 12, fontWeight: 700, opacity: progressReveal(p, i, list.length) }}>
          {it}
        </div>
      ))}
    </div>
  );
}

export function VideoThumbnail({ layer, props, brand }: MotionComponentProps) {
  const title = asString(props.title, "Watch demo");
  const accent = brandAccent(brand);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 0 }), display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: `linear-gradient(145deg, ${accent}33, #0b1220)` }}>
      <div style={{ width: 54, height: 54, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#0b1220", fontSize: 22, fontWeight: 900 }}>▶</div>
      <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, fontWeight: 700, fontSize: fitFont(layer.width, layer.height, 0.05, 16) }}>{title}</div>
    </div>
  );
}

export function FloatingMediaWall({ layer, props, progress, brand }: MotionComponentProps) {
  const rng = seededRng(layer.id);
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const tiles = Array.from({ length: 8 }, (_, i) => ({
    x: 5 + rng() * 70,
    y: 5 + rng() * 70,
    w: 18 + rng() * 16,
    h: 16 + rng() * 18,
    rot: (rng() - 0.5) * 16,
    label: asStringArray(props.items)[i] ?? `Media ${i + 1}`,
  }));
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {tiles.map((t, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${t.x}%`,
            top: `${t.y}%`,
            width: `${t.w}%`,
            height: `${t.h}%`,
            borderRadius: 10,
            background: `${accent}33`,
            border: `1px solid ${accent}44`,
            transform: `rotate(${t.rot}deg) translateY(${(1 - progressReveal(p, i, tiles.length)) * 20}px)`,
            opacity: progressReveal(p, i, tiles.length),
            display: "flex",
            alignItems: "flex-end",
            padding: 6,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}
