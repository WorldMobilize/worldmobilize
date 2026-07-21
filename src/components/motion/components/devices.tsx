"use client";

import type { MotionComponentProps } from "@/components/motion/components/registry";
import {
  asString,
  brandAccent,
  brandFg,
  cardChrome,
  fitFont,
  readChromeProps,
} from "@/components/motion/components/chrome";
import { asBool, clamp01 } from "@/components/motion/components/rng";
import { ClaudeMobileHomeContent } from "@/components/motion/components/ClaudeMobileHome";

/**
 * Screen hole inside cropped public/assets/iphone-frame.png (306×586).
 * Frame has white→transparent so UI shows through the display.
 */
const IPHONE_FRAME_SCREEN = {
  // Slightly oversized under the bezel to kill light-leak gaps at rounded corners.
  leftPct: 6.21,
  topPct: 5.97,
  widthPct: 87.91,
  heightPct: 92.49,
} as const;

/** Native aspect of the cropped phone asset (W/H). */
export const IPHONE_FRAME_ASPECT = 306 / 586;

function DeviceShell({
  layer,
  props,
  brand,
  progress,
  kind,
  bezel = 10,
  radius = 28,
  notch = false,
}: MotionComponentProps & { kind: string; bezel?: number; radius?: number; notch?: boolean }) {
  const chrome = readChromeProps(props);
  const accent = chrome.accent ?? brandAccent(brand);
  const title = asString(props.title, kind);
  const body = asString(props.body, title);
  const p = clamp01(progress);
  const bob = Math.sin(p * Math.PI * 2) * 4;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${bob}px)`,
      }}
    >
      <div
        style={{
          width: "78%",
          height: "92%",
          borderRadius: radius,
          padding: bezel,
          background: "linear-gradient(160deg, #1e293b, #0f172a)",
          boxShadow: "0 24px 50px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.08)",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {notch ? (
          <div
            style={{
              position: "absolute",
              top: bezel + 4,
              left: "50%",
              transform: "translateX(-50%)",
              width: "34%",
              height: 10,
              borderRadius: 8,
              background: "#020617",
              zIndex: 2,
            }}
          />
        ) : null}
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: Math.max(8, radius - bezel),
            background: brand?.backgroundColor ?? "#07111f",
            border: `1px solid ${accent}33`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
            boxSizing: "border-box",
            color: brandFg(brand),
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 8, background: accent, marginBottom: 10, opacity: 0.4 + 0.6 * Math.min(1, p / 0.3) }} />
          <div style={{ fontSize: fitFont(layer.width, layer.height, 0.07, 18), fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: fitFont(layer.width, layer.height, 0.045, 13), opacity: 0.75, marginTop: 6 }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function PhoneScreenInner({ layer, props, brand, progress, assets }: MotionComponentProps) {
  const ui = asString(props.ui, asString(props.variant, "simple"));
  const isClaude =
    ui === "claude" ||
    ui === "claude-home" ||
    ui === "ClaudeMobileHome" ||
    asString(props.screen, "") === "claude";

  if (isClaude) {
    const markSrc =
      assets?.find((a) => a.id === "builtin:claude-mark")?.url ?? "/assets/claude-mark.png";
    // Font size scales with screen hole width so copy stays readable on tall 9:16.
    const screenW = layer.width * (IPHONE_FRAME_SCREEN.widthPct / 100);
    const base = Math.max(11, Math.min(18, screenW * 0.045));
    return (
      <div style={{ width: "100%", height: "100%", fontSize: base }}>
        <ClaudeMobileHomeContent props={props} progress={progress} markSrc={markSrc} />
      </div>
    );
  }

  const chrome = readChromeProps(props);
  const accent = chrome.accent ?? brandAccent(brand);
  const title = asString(props.title, "App");
  const body = asString(props.body, title);
  const p = clamp01(progress);
  const screenBg = asString(props.screenColor, brand?.backgroundColor ?? "#FAF9F5");
  const fg = asString(props.color, brandFg(brand));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: screenBg,
        color: fg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "12% 8%",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "18%",
          aspectRatio: "1",
          borderRadius: "50%",
          background: accent,
          marginBottom: "6%",
          opacity: 0.35 + 0.65 * Math.min(1, p / 0.35),
        }}
      />
      <div style={{ fontSize: fitFont(layer.width * 0.8, layer.height * 0.2, 0.08, 18), fontWeight: 800 }}>
        {title}
      </div>
      <div
        style={{
          fontSize: fitFont(layer.width * 0.8, layer.height * 0.15, 0.055, 13),
          opacity: 0.72,
          marginTop: 6,
        }}
      >
        {body}
      </div>
    </div>
  );
}

function IPhoneFrameDevice(p: MotionComponentProps) {
  const bob = Math.sin(clamp01(p.progress) * Math.PI * 2) * 3;
  const frameSrc =
    p.assets?.find((a) => a.id === "builtin:iphone-frame")?.url ?? "/assets/iphone-frame.png";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${bob}px)`,
      }}
    >
      {/* Fill the layer box; cropped phone asset is tall (~0.52), so on 9:16
          a near-full-width layer makes the device dominate the frame. */}
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div
          style={{
            position: "absolute",
            left: `${IPHONE_FRAME_SCREEN.leftPct}%`,
            top: `${IPHONE_FRAME_SCREEN.topPct}%`,
            width: `${IPHONE_FRAME_SCREEN.widthPct}%`,
            height: `${IPHONE_FRAME_SCREEN.heightPct}%`,
            // No radius — frame chrome masks edges; radius caused white corner leaks.
            borderRadius: 0,
            overflow: "hidden",
            zIndex: 1,
            background: "#1a1a1a",
          }}
        >
          <PhoneScreenInner {...p} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frameSrc}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      </div>
    </div>
  );
}

export function iPhone(p: MotionComponentProps) {
  // Default to the real frame asset; props.frame=false falls back to CSS shell.
  if (asBool(p.props.frame, true)) {
    return <IPhoneFrameDevice {...p} />;
  }
  return <DeviceShell {...p} kind="iPhone" notch radius={32} bezel={8} />;
}

/** Director alias → iPhone with Claude dark home UI inside the screen. */
export function ClaudeMobileHome(p: MotionComponentProps) {
  return iPhone({ ...p, props: { ...p.props, ui: "claude", frame: true } });
}

export function AndroidPhone(p: MotionComponentProps) {
  return <DeviceShell {...p} kind="Android" radius={26} bezel={8} />;
}
export function Tablet(p: MotionComponentProps) {
  return <DeviceShell {...p} kind="Tablet" radius={20} bezel={12} />;
}
export function Laptop(p: MotionComponentProps) {
  return <LaptopLike {...p} label="Laptop" />;
}
export function MacBook(p: MotionComponentProps) {
  return <LaptopLike {...p} label="MacBook" />;
}
export function DesktopMonitor(p: MotionComponentProps) {
  const chrome = readChromeProps(p.props);
  const accent = chrome.accent ?? brandAccent(p.brand);
  const title = asString(p.props.title, "Desktop");
  const body = asString(p.props.body, title);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <div style={{ width: "88%", height: "78%", borderRadius: 10, padding: 8, background: "#111827", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", boxSizing: "border-box" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 6, background: p.brand?.backgroundColor ?? "#0b1220", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: brandFg(p.brand), border: `1px solid ${accent}33` }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{body}</div>
        </div>
      </div>
      <div style={{ width: 18, height: 14, background: "#1f2937" }} />
      <div style={{ width: "28%", height: 6, borderRadius: 4, background: "#1f2937" }} />
    </div>
  );
}

function LaptopLike({ layer, props, brand, progress, label }: MotionComponentProps & { label: string }) {
  const chrome = readChromeProps(props);
  const accent = chrome.accent ?? brandAccent(brand);
  const title = asString(props.title, label);
  const body = asString(props.body, title);
  const p = clamp01(progress);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: "86%",
          height: "72%",
          borderRadius: "12px 12px 4px 4px",
          padding: 8,
          background: "linear-gradient(180deg,#334155,#0f172a)",
          boxShadow: "0 22px 44px rgba(0,0,0,0.5)",
          boxSizing: "border-box",
          transform: `perspective(800px) rotateX(${6 - 3 * p}deg)`,
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: 6, background: brand?.backgroundColor ?? "#07111f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: brandFg(brand), border: `1px solid ${accent}33` }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: accent, marginBottom: 8 }} />
          <div style={{ fontSize: fitFont(layer.width, layer.height, 0.06, 18), fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{body}</div>
        </div>
      </div>
      <div style={{ width: "92%", height: 10, borderRadius: "0 0 10px 10px", background: "#1e293b", marginTop: 2 }} />
    </div>
  );
}

export function BrowserMockup(p: MotionComponentProps) {
  // Re-export style: thin wrapper using same props as BrowserWindow via import would cycle — inline minimal
  const chrome = readChromeProps(p.props);
  const accent = chrome.accent ?? brandAccent(p.brand);
  const url = asString(p.props.url, "https://app.example.com");
  const body = asString(p.props.body, asString(p.props.title, "Browser"));
  return (
    <div style={{ ...cardChrome(p.brand, { ...chrome, accent, pad: 0, radius: 14 }), display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 6, padding: "10px 12px", background: "rgba(0,0,0,0.35)" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ flex: 1, marginLeft: 8, fontSize: 11, opacity: 0.7, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{url}</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>{body}</div>
    </div>
  );
}
