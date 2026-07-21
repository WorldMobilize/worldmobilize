"use client";

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

/** Browser chrome with optional title + content area. props: { title?, url?, body? } */
export function BrowserWindow({ layer, props, brand }: MotionComponentProps) {
  const chrome = readChromeProps(props);
  const accent = chrome.accent ?? brandAccent(brand);
  const title = asString(props.title, "App");
  const url = asString(props.url, "https://app.example.com");
  const body = asString(props.body, title);
  return (
    <div style={{ ...cardChrome(brand, { ...chrome, accent, pad: 0, radius: 14 }), display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(0,0,0,0.35)", borderBottom: "1px solid rgba(148,163,184,0.2)" }}>
        <Dot c="#ff5f57" />
        <Dot c="#febc2e" />
        <Dot c="#28c840" />
        <div style={{ flex: 1, marginLeft: 8, fontSize: 12, opacity: 0.75, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          {url}
        </div>
      </div>
      <div style={{ flex: 1, padding: 16, fontSize: fitFont(layer.width, layer.height, 0.05, 20), fontWeight: 600 }}>{body}</div>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, flexShrink: 0 }} />;
}

/** Dashboard panel. props: { title?, metrics?, screenshot? } */
export function Dashboard({ layer, props, progress, brand }: MotionComponentProps) {
  const chrome = readChromeProps(props);
  const accent = chrome.accent ?? brandAccent(brand);
  const title = asString(props.title, "Dashboard");
  const metrics = asStringArray(props.metrics).slice(0, 4);
  const fallback = metrics.length ? metrics : ["Revenue", "Users", "Conversion", "Retention"];
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...chrome, accent, pad: 14 }), display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: fitFont(layer.width, layer.height, 0.06, 20), fontWeight: 800 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flex: 1 }}>
        {fallback.map((m, i) => (
          <div
            key={i}
            style={{
              padding: 10,
              borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${accent}33`,
              opacity: progressReveal(p, i, fallback.length),
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.7 }}>{m}</div>
            <div style={{ fontSize: fitFont(layer.width, layer.height, 0.07, 22), fontWeight: 800, color: accent, marginTop: 4 }}>
              {["+24%", "12.4k", "3.8%", "91%"][i % 4]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sidebar({ layer, props, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 7);
  const list = items.length ? items : ["Home", "Analytics", "Campaigns", "Audience", "Settings"];
  const active = asNumber(props.active, 0);
  const accent = brandAccent(brand);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 12, radius: 12 }), display: "flex", flexDirection: "column", gap: 6 }}>
      {list.map((it, i) => (
        <div
          key={i}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            background: i === active ? `${accent}33` : "transparent",
            border: i === active ? `1px solid ${accent}55` : "1px solid transparent",
            fontSize: fitFont(layer.width, layer.height, 0.08, 14),
            fontWeight: i === active ? 700 : 500,
          }}
        >
          {it}
        </div>
      ))}
    </div>
  );
}

export function TopNavigation({ layer, props, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 5);
  const list = items.length ? items : ["Product", "Pricing", "Docs", "Blog"];
  const brandName = asString(props.brandName, "Brand");
  const accent = brandAccent(brand);
  return (
    <div
      style={{
        ...cardChrome(brand, { ...readChromeProps(props), accent, pad: "0 18px", radius: 12 }),
        display: "flex",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 16, color: accent }}>{brandName}</div>
      <div style={{ display: "flex", gap: 14, marginLeft: "auto" }}>
        {list.map((it, i) => (
          <span key={i} style={{ fontSize: 13, opacity: 0.85 }}>
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SearchBar({ layer, props, progress, brand }: MotionComponentProps) {
  const query = asString(props.query, asString(props.placeholder, "Search…"));
  const p = clamp01(progress);
  const typed = query.slice(0, Math.ceil(query.length * Math.min(1, p / 0.8)));
  const accent = brandAccent(brand);
  return (
    <div
      style={{
        ...cardChrome(brand, { ...readChromeProps(props), accent, pad: "0 16px", radius: 999 }),
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ opacity: 0.6 }}>⌕</span>
      <span style={{ fontSize: fitFont(layer.width, layer.height, 0.12, 18), opacity: 0.9 }}>
        {typed}
        {p < 0.8 ? <span style={{ opacity: 0.5 }}>|</span> : null}
      </span>
    </div>
  );
}

/** Chat window (typed answer). props: { question, answer, citations?/sources? } */
export function ChatWindow({ props, progress, brand }: MotionComponentProps) {
  const question = asString(props.question, "Ask anything…");
  const answer = asString(props.answer, "Here's the exact framework you need.");
  const sources = asStringArray(props.citations).concat(asStringArray(props.sources));
  const accent = brandAccent(brand);
  const typingSpeed = asNumber(props.typingSpeed, 0.85);
  const p = clamp01(progress);
  const typed = answer.slice(0, Math.ceil(answer.length * clamp01(p / typingSpeed)));
  const showSources = p > typingSpeed && sources.length > 0;
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 18, bg: "rgba(2,6,23,0.92)" }), display: "flex", flexDirection: "column", gap: 12 }}>
      <Bubble align="right" bg={`${accent}22`} border={`${accent}55`}>
        {question}
      </Bubble>
      <Bubble align="left" bg="rgba(30,41,59,0.9)" border="rgba(148,163,184,0.2)">
        {typed}
        {p < typingSpeed ? <span style={{ opacity: 0.5 }}>|</span> : null}
      </Bubble>
      {showSources ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {sources.map((s, i) => (
            <span key={i} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "rgba(148,163,184,0.12)", border: "1px solid rgba(148,163,184,0.25)" }}>
              {s}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const AIResponse = ChatWindow;
export const ChatDemo = ChatWindow;

function Bubble({ children, align, bg, border }: { children: React.ReactNode; align: "left" | "right"; bg: string; border: string }) {
  return (
    <div style={{ display: "flex", justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
      <div style={{ maxWidth: "85%", fontSize: 18, lineHeight: 1.35, padding: "10px 14px", borderRadius: 14, background: bg, border: `1px solid ${border}` }}>{children}</div>
    </div>
  );
}

export function Notification({ layer, props, progress, brand }: MotionComponentProps) {
  const title = asString(props.title, "Update");
  const body = asString(props.body, "Something happened.");
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div
      style={{
        ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 14, radius: 14 }),
        display: "flex",
        gap: 12,
        alignItems: "center",
        transform: `translateY(${(1 - Math.min(1, p / 0.25)) * 20}px)`,
        opacity: Math.min(1, p / 0.25),
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: fitFont(layer.width, layer.height, 0.08, 16), fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: fitFont(layer.width, layer.height, 0.06, 13), opacity: 0.75 }}>{body}</div>
      </div>
    </div>
  );
}

export function FloatingTooltip({ layer, props, brand }: MotionComponentProps) {
  const text = asString(props.text, asString(props.label, "Tip"));
  const accent = brandAccent(brand);
  return (
    <div
      style={{
        ...cardChrome(brand, { glass: true, shadow: true, accent, pad: "10px 14px", radius: 10 }),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: fitFont(layer.width, layer.height, 0.14, 15),
        fontWeight: 600,
      }}
    >
      {text}
    </div>
  );
}

export function Modal({ layer, props, progress, brand }: MotionComponentProps) {
  const title = asString(props.title, "Confirm");
  const body = asString(props.body, "Are you sure?");
  const cta = asString(props.cta, "Continue");
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const scale = 0.92 + 0.08 * Math.min(1, p / 0.3);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 22 }), display: "flex", flexDirection: "column", gap: 12, transform: `scale(${scale})`, opacity: Math.min(1, p / 0.25) }}>
      <div style={{ fontSize: fitFont(layer.width, layer.height, 0.08, 22), fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: fitFont(layer.width, layer.height, 0.055, 15), opacity: 0.8, flex: 1 }}>{body}</div>
      <div style={{ alignSelf: "flex-end", padding: "10px 16px", borderRadius: 10, background: accent, color: "#0b1220", fontWeight: 800, fontSize: 14 }}>{cta}</div>
    </div>
  );
}

export function CommandPalette({ layer, props, progress, brand }: MotionComponentProps) {
  const query = asString(props.query, "Create campaign…");
  const items = asStringArray(props.items).slice(0, 5);
  const list = items.length ? items : ["New campaign", "Import audience", "Open analytics", "Invite teammate"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const typed = query.slice(0, Math.ceil(query.length * Math.min(1, p / 0.5)));
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 0, radius: 14 }), display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(148,163,184,0.2)", fontSize: 16 }}>
        ⌘ {typed}
        {p < 0.5 ? "|" : ""}
      </div>
      {list.map((it, i) => (
        <div key={i} style={{ padding: "10px 16px", fontSize: 14, background: i === 0 ? `${accent}22` : "transparent", opacity: progressReveal(p, i, list.length) }}>
          {it}
        </div>
      ))}
    </div>
  );
}

export function SettingsPanel({ layer, props, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 5);
  const list = items.length ? items : ["Notifications", "Privacy", "Billing", "Team"];
  const accent = brandAccent(brand);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 14 }), display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{asString(props.title, "Settings")}</div>
      {list.map((it, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(148,163,184,0.12)", fontSize: 13 }}>
          <span>{it}</span>
          <span style={{ width: 36, height: 20, borderRadius: 999, background: i % 2 === 0 ? accent : "rgba(148,163,184,0.3)" }} />
        </div>
      ))}
    </div>
  );
}

export function CodeEditor({ layer, props, progress, brand }: MotionComponentProps) {
  const code = asString(props.code, "const launch = await ship();\nconsole.log(launch);");
  const lines = code.split("\n");
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const visible = Math.max(1, Math.ceil(lines.length * Math.min(1, p / 0.8)));
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 14, bg: "#0a0f1a" }), fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: fitFont(layer.width, layer.height, 0.045, 14) }}>
      {lines.slice(0, visible).map((ln, i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 4 }}>
          <span style={{ opacity: 0.35, width: 18 }}>{i + 1}</span>
          <span style={{ color: i === 0 ? accent : brandFg(brand) }}>{ln}</span>
        </div>
      ))}
    </div>
  );
}

export function TerminalWindow({ layer, props, progress, brand }: MotionComponentProps) {
  const lines = asStringArray(props.lines);
  const list = lines.length ? lines : ["$ npm run ship", "✓ build ok", "✓ deploy live"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const visible = Math.max(1, Math.ceil(list.length * Math.min(1, p / 0.75)));
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 14, bg: "#05080f" }), fontFamily: "ui-monospace, Menlo, monospace", fontSize: fitFont(layer.width, layer.height, 0.05, 14) }}>
      {list.slice(0, visible).map((ln, i) => (
        <div key={i} style={{ marginBottom: 6, color: ln.startsWith("✓") ? "#4ade80" : brandFg(brand) }}>
          {ln}
        </div>
      ))}
      {p < 0.9 ? <span style={{ opacity: 0.6 }}>_</span> : null}
    </div>
  );
}
