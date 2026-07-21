"use client";

import type { MotionComponentProps } from "@/components/motion/components/registry";
import {
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
import { countUpText } from "@/components/motion/layers/TextLayerView";

export function ProductCard({ layer, props, progress, brand }: MotionComponentProps) {
  const chrome = readChromeProps(props);
  const accent = chrome.accent ?? brandAccent(brand);
  const title = asString(props.title, "Product");
  const price = asString(props.price, "$49");
  const tag = asString(props.tag, "Bestseller");
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...chrome, accent, pad: 14 }), display: "flex", flexDirection: "column", gap: 10, opacity: 0.4 + 0.6 * Math.min(1, p / 0.3) }}>
      <div style={{ flex: 1, borderRadius: 12, background: `linear-gradient(145deg, ${accent}44, rgba(255,255,255,0.06))`, minHeight: 60 }} />
      <div style={{ fontSize: 11, color: accent, fontWeight: 700 }}>{tag}</div>
      <div style={{ fontSize: fitFont(layer.width, layer.height, 0.08, 18), fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: fitFont(layer.width, layer.height, 0.09, 20), fontWeight: 800, color: accent }}>{price}</div>
    </div>
  );
}

export function ProductGrid({ layer, props, progress, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 6);
  const list = items.length ? items : ["Alpha", "Beta", "Gamma", "Delta"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 10 }), display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {list.map((it, i) => (
        <div key={i} style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}33`, opacity: progressReveal(p, i, list.length) }}>
          <div style={{ height: 36, borderRadius: 8, background: `${accent}33`, marginBottom: 8 }} />
          <div style={{ fontSize: 12, fontWeight: 700 }}>{it}</div>
        </div>
      ))}
    </div>
  );
}

export function CheckoutScreen({ layer, props, brand }: MotionComponentProps) {
  const total = asString(props.total, "$128.00");
  const accent = brandAccent(brand);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 16 }), display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>Checkout</div>
      {["Subtotal", "Shipping", "Tax"].map((row) => (
        <div key={row} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, opacity: 0.8 }}>
          <span>{row}</span>
          <span>—</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, marginTop: "auto", color: accent }}>
        <span>Total</span>
        <span>{total}</span>
      </div>
      <div style={{ padding: "10px 12px", borderRadius: 10, background: accent, color: "#0b1220", textAlign: "center", fontWeight: 800 }}>{asString(props.cta, "Pay now")}</div>
    </div>
  );
}

export function ShoppingCart({ layer, props, progress, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 4);
  const list = items.length ? items : ["Item A", "Item B", "Item C"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 14 }), display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 15, fontWeight: 800 }}>Cart ({list.length})</div>
      {list.map((it, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, opacity: progressReveal(p, i, list.length), padding: "6px 0", borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
          <span>{it}</span>
          <span style={{ color: accent }}>$—</span>
        </div>
      ))}
    </div>
  );
}

export function ReviewCard({ layer, props, brand }: MotionComponentProps) {
  const quote = asString(props.quote, "Exactly what we needed.");
  const author = asString(props.author, "Jordan");
  const rating = asNumber(props.rating, 5);
  const accent = brandAccent(brand);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 16 }), display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
      <RatingStars layer={layer} props={{ rating }} progress={1} brand={brand} />
      <div style={{ fontSize: fitFont(layer.width, layer.height, 0.07, 18), lineHeight: 1.35 }}>“{quote}”</div>
      <div style={{ fontSize: 13, opacity: 0.75 }}>— {author}</div>
    </div>
  );
}

export function RatingStars({ props, brand }: MotionComponentProps) {
  const rating = Math.max(0, Math.min(5, asNumber(props.rating, 5)));
  const accent = brandAccent(brand);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < rating ? accent : "rgba(148,163,184,0.35)", fontSize: 22 }}>
          ★
        </span>
      ))}
    </div>
  );
}

export function BeforeAfterComparison({ layer, props, progress, brand }: MotionComponentProps) {
  const before = asString(props.before, "Before");
  const after = asString(props.after, "After");
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const split = 30 + 40 * Math.min(1, p);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 0 }), position: "relative", display: "flex" }}>
      <div style={{ width: `${split}%`, background: "rgba(148,163,184,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{before}</div>
      <div style={{ flex: 1, background: `${accent}28`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: accent, fontSize: 14 }}>{after}</div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${split}%`, width: 3, background: brandFg(brand), boxShadow: `0 0 12px ${accent}` }} />
    </div>
  );
}

export function OfferStack({ layer, props, progress, brand }: MotionComponentProps) {
  const offers = asStringArray(props.offers).slice(0, 4);
  const list = offers.length ? offers : ["20% off", "Free shipping", "Bonus guide"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {list.map((o, i) => (
        <div
          key={i}
          style={{
            ...cardChrome(brand, { glass: true, shadow: true, accent, pad: 14, radius: 14 }),
            position: "absolute",
            left: i * 10,
            top: i * 14,
            right: (list.length - 1 - i) * 8,
            height: `calc(100% - ${(list.length - 1) * 14}px)`,
            opacity: progressReveal(p, i, list.length),
            display: "flex",
            alignItems: "center",
            fontWeight: 800,
            fontSize: fitFont(layer.width, layer.height, 0.08, 20),
          }}
        >
          {o}
        </div>
      ))}
    </div>
  );
}

export function GuaranteeBox({ layer, props, brand }: MotionComponentProps) {
  const title = asString(props.title, "30-day guarantee");
  const body = asString(props.body, "Love it or get a full refund.");
  const accent = brandAccent(brand);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 18 }), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", color: accent, fontWeight: 800 }}>✓</div>
      <div style={{ fontSize: fitFont(layer.width, layer.height, 0.08, 18), fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: fitFont(layer.width, layer.height, 0.055, 14), opacity: 0.8 }}>{body}</div>
    </div>
  );
}
