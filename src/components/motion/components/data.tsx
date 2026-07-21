"use client";

import type { MotionComponentProps } from "@/components/motion/components/registry";
import {
  asNumber,
  asString,
  brandAccent,
  cardChrome,
  fitFont,
  progressReveal,
  readChromeProps,
} from "@/components/motion/components/chrome";
import { asStringArray, clamp01, seededRng } from "@/components/motion/components/rng";
import { countUpText } from "@/components/motion/layers/TextLayerView";

function valuesFromProps(props: Record<string, unknown>, n: number, seed: string): number[] {
  if (Array.isArray(props.values)) {
    return (props.values as unknown[]).map((v) => asNumber(v, 0)).slice(0, n);
  }
  const rng = seededRng(seed);
  return Array.from({ length: n }, () => 0.25 + rng() * 0.75);
}

export function LineChart({ layer, props, progress, brand }: MotionComponentProps) {
  const accent = brandAccent(brand);
  const vals = valuesFromProps(props, 8, layer.id);
  const p = clamp01(progress);
  const pts = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * 100;
      const y = 100 - v * 80 * Math.min(1, p / 0.7);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 12 }), position: "relative" }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{asString(props.title, "Growth")}</div>
      <svg width="100%" height="78%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline fill="none" stroke={accent} strokeWidth="2.5" points={pts} />
      </svg>
    </div>
  );
}

export function BarChart({ layer, props, progress, brand }: MotionComponentProps) {
  const accent = brandAccent(brand);
  const vals = valuesFromProps(props, 6, layer.id + "-bar");
  const labels = asStringArray(props.labels);
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 12 }), display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{asString(props.title, "Performance")}</div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 6 }}>
        {vals.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ width: "100%", height: `${v * 100 * Math.min(1, p / 0.6) * progressReveal(p, i, vals.length)}%`, background: accent, borderRadius: "6px 6px 2px 2px", minHeight: 4 }} />
            <span style={{ fontSize: 9, opacity: 0.6 }}>{labels[i] ?? String.fromCharCode(65 + i)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PieChart({ layer, props, progress, brand }: MotionComponentProps) {
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const deg = 360 * Math.min(1, p);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 16 }), display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div
        style={{
          width: Math.min(layer.width, layer.height) * 0.45,
          height: Math.min(layer.width, layer.height) * 0.45,
          borderRadius: "50%",
          background: `conic-gradient(${accent} 0deg, ${accent} ${deg * 0.55}deg, #60a5fa ${deg * 0.55}deg, #60a5fa ${deg * 0.8}deg, #94a3b8 ${deg * 0.8}deg, #94a3b8 ${deg}deg, rgba(148,163,184,0.2) ${deg}deg)`,
        }}
      />
      <div style={{ fontSize: fitFont(layer.width, layer.height, 0.07, 16), fontWeight: 700 }}>{asString(props.title, "Share")}</div>
    </div>
  );
}

export function GrowthCurve({ layer, props, progress, brand }: MotionComponentProps) {
  return <LineChart layer={layer} props={{ ...props, title: asString(props.title, "Growth curve") }} progress={progress} brand={brand} />;
}

export function Timeline({ layer, props, progress, brand }: MotionComponentProps) {
  const steps = asStringArray(props.steps).concat(asStringArray(props.items)).slice(0, 5);
  const list = steps.length ? steps : ["Discover", "Decide", "Launch", "Scale"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 16 }), display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      {list.map((s, i) => (
        <div key={i} style={{ flex: 1, textAlign: "center", opacity: progressReveal(p, i, list.length) }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: accent, margin: "0 auto 8px" }} />
          <div style={{ fontSize: fitFont(layer.width, layer.height, 0.04, 13), fontWeight: 700 }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

export function Funnel({ layer, props, progress, brand }: MotionComponentProps) {
  const stages = asStringArray(props.stages).slice(0, 4);
  const list = stages.length ? stages : ["Visits", "Leads", "Trials", "Paid"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 12 }), display: "flex", flexDirection: "column", gap: 8, alignItems: "center", justifyContent: "center" }}>
      {list.map((s, i) => {
        const w = 100 - i * 16;
        return (
          <div key={i} style={{ width: `${w}%`, padding: "8px 0", textAlign: "center", borderRadius: 8, background: `rgba(59,130,246,${0.55 - i * 0.1})`, border: `1px solid ${accent}55`, fontSize: 12, fontWeight: 700, opacity: progressReveal(p, i, list.length), color: brand?.foregroundColor }}>
            {s}
          </div>
        );
      })}
    </div>
  );
}

export function ProgressRing({ layer, props, progress, brand }: MotionComponentProps) {
  const value = asNumber(props.value, 72);
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const shown = Math.round(value * Math.min(1, p / 0.7));
  const size = Math.min(layer.width, layer.height) * 0.7;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `conic-gradient(${accent} ${shown * 3.6}deg, rgba(148,163,184,0.2) 0)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "72%", height: "72%", borderRadius: "50%", background: brand?.backgroundColor ?? "#0b1220", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: fitFont(layer.width, layer.height, 0.12, 28), color: accent }}>
          {shown}%
        </div>
      </div>
    </div>
  );
}

export function Counter({ layer, props, progress, brand }: MotionComponentProps) {
  const value = asString(props.value, "1000");
  const label = asString(props.label, "");
  const accent = brandAccent(brand);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: accent }}>
      <div style={{ fontSize: fitFont(layer.width, layer.height, 0.28, 64), fontWeight: 900 }}>{countUpText(value, progress)}</div>
      {label ? <div style={{ fontSize: fitFont(layer.width, layer.height, 0.08, 18), opacity: 0.8, color: brand?.foregroundColor }}>{label}</div> : null}
    </div>
  );
}

export function AnimatedGraph(p: MotionComponentProps) {
  return <LineChart {...p} />;
}
