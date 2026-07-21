"use client";

import { countUpText } from "@/components/motion/layers/TextLayerView";
import type { MotionComponentProps } from "@/components/motion/components/registry";
import {
  asBool,
  asNumber,
  asString,
  brandAccent,
  brandFg,
  cardChrome,
  fitFont,
  progressReveal,
  readChromeProps,
} from "@/components/motion/components/chrome";
import { asStringArray, clamp01 } from "@/components/motion/components/rng";

/** Metric / KPI / Statistic — count-up value + label. */
export function MetricCard({ layer, props, progress, brand }: MotionComponentProps) {
  const chrome = readChromeProps(props);
  const label = asString(props.label, "Metric");
  const value = asString(props.value, "0");
  const accent = chrome.accent ?? brandAccent(brand);
  const countUp = asBool(props.countUp, true);
  const display = countUp ? countUpText(value, progress) : value;
  const w = Math.max(80, layer.width);
  const h = Math.max(80, layer.height);
  return (
    <div style={{ ...cardChrome(brand, { ...chrome, accent, pad: Math.max(10, Math.min(w, h) * 0.08) }), display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
      <div style={{ width: 18, height: 3, borderRadius: 2, background: accent }} />
      <div style={{ fontSize: fitFont(w, h, 0.28, 56), fontWeight: 800, color: accent, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {display}
      </div>
      <div style={{ fontSize: fitFont(w, h, 0.11, 20), fontWeight: 600, opacity: 0.88, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {label}
      </div>
    </div>
  );
}

export const KPITile = MetricCard;
export const StatisticBlock = MetricCard;

/** Pricing tier card. props: { plan, price, period?, features?, featured?, cta? } */
export function PricingCard({ layer, props, progress, brand }: MotionComponentProps) {
  const chrome = readChromeProps(props);
  const accent = chrome.accent ?? brandAccent(brand);
  const plan = asString(props.plan, "Pro");
  const price = asString(props.price, "$29");
  const period = asString(props.period, "/mo");
  const features = asStringArray(props.features).slice(0, 5);
  const featured = asBool(props.featured, false);
  const cta = asString(props.cta, "Get started");
  const w = layer.width;
  const p = clamp01(progress);
  return (
    <div
      style={{
        ...cardChrome(brand, {
          ...chrome,
          accent: featured ? accent : `${accent}66`,
          border: featured ? `2px solid ${accent}` : undefined,
          pad: 18,
        }),
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: 0.35 + 0.65 * Math.min(1, p / 0.3),
      }}
    >
      <div style={{ fontSize: fitFont(w, layer.height, 0.07, 18), fontWeight: 700, opacity: 0.8 }}>{plan}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: fitFont(w, layer.height, 0.18, 42), fontWeight: 800, color: accent }}>{price}</span>
        <span style={{ fontSize: 14, opacity: 0.65 }}>{period}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {features.map((f, i) => (
          <div key={i} style={{ fontSize: fitFont(w, layer.height, 0.055, 15), opacity: progressReveal(p, i, features.length) }}>
            ✓ {f}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: "auto",
          textAlign: "center",
          padding: "10px 12px",
          borderRadius: 10,
          background: featured ? accent : "rgba(255,255,255,0.08)",
          color: featured ? "#0b1220" : brandFg(brand),
          fontWeight: 700,
          fontSize: fitFont(w, layer.height, 0.06, 15),
        }}
      >
        {cta}
      </div>
    </div>
  );
}

/** Feature / Benefit card. props: { title, body, icon?, accent? } */
export function FeatureCard({ layer, props, brand }: MotionComponentProps) {
  const chrome = readChromeProps(props);
  const accent = chrome.accent ?? brandAccent(brand);
  const title = asString(props.title, "Feature");
  const body = asString(props.body, "Short benefit copy.");
  const w = layer.width;
  const h = layer.height;
  return (
    <div style={{ ...cardChrome(brand, { ...chrome, accent, pad: 16 }), display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}33`, border: `1px solid ${accent}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: accent }}>
        {asString(props.icon, "◆").slice(0, 2)}
      </div>
      <div style={{ fontSize: fitFont(w, h, 0.09, 22), fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: fitFont(w, h, 0.065, 16), opacity: 0.8, lineHeight: 1.35 }}>{body}</div>
    </div>
  );
}

export const BenefitCard = FeatureCard;

/** Comparison two-column. props: { leftTitle, rightTitle, leftItems?, rightItems?, leftLabel?, rightLabel? } */
export function ComparisonCard({ layer, props, progress, brand }: MotionComponentProps) {
  const chrome = readChromeProps(props);
  const accent = chrome.accent ?? brandAccent(brand);
  const leftTitle = asString(props.leftTitle, asString(props.leftLabel, "Before"));
  const rightTitle = asString(props.rightTitle, asString(props.rightLabel, "After"));
  const leftItems = asStringArray(props.leftItems).slice(0, 4);
  const rightItems = asStringArray(props.rightItems).slice(0, 4);
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...chrome, accent, pad: 14 }), display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Col title={leftTitle} items={leftItems} muted progress={p} brand={brand} />
      <Col title={rightTitle} items={rightItems} accent={accent} progress={p} brand={brand} highlight />
    </div>
  );
}

function Col({
  title,
  items,
  accent,
  muted,
  highlight,
  progress,
  brand,
}: {
  title: string;
  items: string[];
  accent?: string;
  muted?: boolean;
  highlight?: boolean;
  progress: number;
  brand?: MotionComponentProps["brand"];
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: highlight ? `${accent ?? "#3b82f6"}18` : "rgba(255,255,255,0.04)",
        border: `1px solid ${highlight ? `${accent}55` : "rgba(148,163,184,0.2)"}`,
        opacity: muted ? 0.75 : 1,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8, color: accent ?? brandFg(brand) }}>{title}</div>
      {items.map((it, i) => (
        <div key={i} style={{ fontSize: 13, opacity: 0.35 + 0.65 * progressReveal(progress, i, items.length), marginBottom: 4 }}>
          {highlight ? "→ " : "· "}
          {it}
        </div>
      ))}
    </div>
  );
}

/** Testimonial. props: { quote, author, role?, avatar? } */
export function TestimonialCard({ layer, props, progress, brand }: MotionComponentProps) {
  const chrome = readChromeProps(props);
  const accent = chrome.accent ?? brandAccent(brand);
  const quote = asString(props.quote, "This changed how we ship.");
  const author = asString(props.author, "Alex M.");
  const role = asString(props.role, "Founder");
  const p = clamp01(progress);
  const shown = quote.slice(0, Math.ceil(quote.length * Math.min(1, p / 0.7)));
  const w = layer.width;
  return (
    <div style={{ ...cardChrome(brand, { ...chrome, accent, pad: 20 }), display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: fitFont(w, layer.height, 0.07, 22), lineHeight: 1.4, fontWeight: 500 }}>“{shown}”</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: p > 0.65 ? 1 : 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: accent }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{author}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{role}</div>
        </div>
      </div>
    </div>
  );
}

/** Badge / BrandChip. props: { label, color? } */
export function Badge({ layer, props, brand }: MotionComponentProps) {
  const label = asString(props.label, "New");
  const color = asString(props.color, brandAccent(brand));
  const w = Math.max(60, layer.width);
  const h = Math.max(28, layer.height);
  const fontSize = Math.min(w * 0.12, h * 0.42, 22);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: `0 ${Math.max(8, w * 0.06)}px`,
        borderRadius: 999,
        background: `${color}22`,
        border: `1px solid ${color}66`,
        boxSizing: "border-box",
        color: brandFg(brand),
        overflow: "hidden",
      }}
    >
      <span style={{ width: Math.min(h * 0.28, 10), height: Math.min(h * 0.28, 10), borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </div>
  );
}

export const BrandChip = Badge;

/** CTA Banner. props: { title, subtitle?, cta?, accent? } */
export function CTABanner({ layer, props, progress, brand }: MotionComponentProps) {
  const chrome = readChromeProps(props);
  const accent = chrome.accent ?? brandAccent(brand);
  const title = asString(props.title, "Start free today");
  const subtitle = asString(props.subtitle);
  const cta = asString(props.cta, "Get started");
  const p = clamp01(progress);
  const w = layer.width;
  return (
    <div
      style={{
        ...cardChrome(brand, {
          ...chrome,
          accent,
          bg: `linear-gradient(120deg, ${accent}33, rgba(15,23,42,0.9))`,
          pad: 22,
        }),
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        opacity: 0.4 + 0.6 * Math.min(1, p / 0.25),
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: fitFont(w, layer.height, 0.08, 28), fontWeight: 800 }}>{title}</div>
        {subtitle ? <div style={{ fontSize: fitFont(w, layer.height, 0.045, 16), opacity: 0.8, marginTop: 4 }}>{subtitle}</div> : null}
      </div>
      <div style={{ flexShrink: 0, padding: "12px 18px", borderRadius: 12, background: accent, color: "#0b1220", fontWeight: 800, fontSize: fitFont(w, layer.height, 0.05, 16) }}>
        {cta}
      </div>
    </div>
  );
}
