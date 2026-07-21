"use client";

import type { CSSProperties } from "react";
import { asString } from "@/components/motion/components/chrome";
import { asStringArray, clamp01 } from "@/components/motion/components/rng";

const CLAUDE_ORANGE = "#D97757";
const CLAUDE_BG = "#1a1a1a";
const CLAUDE_PANEL = "#2a2a2a";
const CLAUDE_MUTED = "#9a9a9a";

type ChatMsg = { role: "user" | "assistant"; text: string };

function parseMessages(props: Record<string, unknown>): ChatMsg[] {
  const raw = props.messages ?? props.chat;
  if (!Array.isArray(raw)) return [];
  const out: ChatMsg[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    const role = asString(m.role, "assistant") === "user" ? "user" : "assistant";
    const text = asString(m.text, asString(m.content));
    if (text) out.push({ role, text });
  }
  return out.slice(0, 8);
}

/**
 * Faithful Claude iOS UI for the phone screen hole (home + chat).
 * progress-driven, export-safe.
 */
export function ClaudeMobileHomeContent({
  props,
  progress,
  markSrc,
}: {
  props: Record<string, unknown>;
  progress: number;
  markSrc?: string;
}) {
  const p = clamp01(progress);
  const greeting = asString(props.greeting, asString(props.title, "Evening, Max"));
  const placeholder = asString(props.placeholder, "How can I help you today?");
  const model = asString(props.model, "Opus 4.6 Extended");
  const messages = parseMessages(props);
  const mode = asString(props.mode, messages.length ? "chat" : "home");
  const isChat = mode === "chat" || messages.length > 0;

  const chips = asStringArray(props.chips);
  const chipList =
    chips.length > 0
      ? chips
      : ["</> Code", "✎ Write", "🎓 Learn", "☕ Life stuff", "💡 Claude's choice"];
  const row1 = chipList.slice(0, 4);
  const row2 = chipList.slice(4, 5);

  const fade = (delay: number) => Math.max(0, Math.min(1, (p - delay) / 0.2));

  const root: CSSProperties = {
    width: "100%",
    height: "100%",
    background: asString(props.screenColor, CLAUDE_BG),
    color: "#f5f5f4",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    // Extra top for Dynamic Island; extra bottom for home indicator / frame curve.
    padding: isChat ? "14% 5.5% 5%" : "13% 5.5% 5.5%",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    overflow: "hidden",
  };

  return (
    <div style={root}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: fade(0),
          marginBottom: isChat ? "4%" : "5%",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "1.2em", opacity: 0.85, letterSpacing: 1 }}>‖</span>
        <span style={{ fontSize: "1.05em", opacity: 0.75 }}>◌</span>
      </div>

      {isChat ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "3.2%",
            overflow: "hidden",
            paddingBottom: "3%",
          }}
        >
          {messages.length === 0 ? (
            <div style={{ opacity: 0.5, fontSize: "0.85em", textAlign: "center", marginTop: "20%" }}>
              Start chatting with Claude…
            </div>
          ) : (
            messages.map((msg, i) => {
              const reveal = fade(0.08 + i * 0.14);
              const isUser = msg.role === "user";
              return (
                <div
                  key={`${msg.role}-${i}`}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "92%",
                    opacity: reveal,
                    transform: `translateY(${(1 - reveal) * 12}px)`,
                  }}
                >
                  {!isUser ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                      {markSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={markSrc} alt="" style={{ width: "0.9em", height: "0.9em", objectFit: "contain" }} />
                      ) : null}
                      <span style={{ fontSize: "0.65em", opacity: 0.55 }}>Claude</span>
                    </div>
                  ) : null}
                  <div
                    style={{
                      background: isUser ? "#333332" : "transparent",
                      borderRadius: isUser ? "1.1em" : 0,
                      padding: isUser ? "0.65em 0.85em" : 0,
                      fontSize: "0.82em",
                      lineHeight: 1.45,
                      color: "#f5f5f4",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2.8%",
            opacity: fade(0.06),
            transform: `translateY(${(1 - fade(0.06)) * 10}px)`,
            minHeight: 0,
          }}
        >
          {markSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={markSrc}
              alt=""
              style={{ width: "10%", aspectRatio: "1", objectFit: "contain" }}
            />
          ) : (
            <div style={{ width: "10%", aspectRatio: "1", borderRadius: "50%", background: CLAUDE_ORANGE }} />
          )}
          <div
            style={{
              fontFamily: 'Georgia, "Times New Roman", Times, serif',
              fontSize: "1.45em",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              textAlign: "center",
              lineHeight: 1.15,
            }}
          >
            {greeting}
          </div>
        </div>
      )}

      {/* Composer — always inset from bottom curve */}
      <div
        style={{
          background: CLAUDE_PANEL,
          borderRadius: "1em",
          padding: "0.75em 0.75em 0.6em",
          opacity: fade(isChat ? 0.35 : 0.18),
          transform: `translateY(${(1 - fade(isChat ? 0.35 : 0.18)) * 12}px)`,
          marginBottom: isChat ? 0 : "3%",
          flexShrink: 0,
        }}
      >
        <div style={{ color: CLAUDE_MUTED, fontSize: "0.85em", marginBottom: "0.9em", lineHeight: 1.3 }}>
          {placeholder}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4em" }}>
          <div style={{ width: "1.55em", height: "1.55em", display: "flex", alignItems: "center", justifyContent: "center", color: CLAUDE_MUTED, fontSize: "1.1em" }}>
            +
          </div>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: "0.68em",
              color: "#d4d4d4",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {model} <span style={{ opacity: 0.55 }}>▾</span>
          </div>
          <div
            style={{
              width: "1.7em",
              height: "1.7em",
              borderRadius: "0.4em",
              background: CLAUDE_ORANGE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9em",
            }}
          >
            ↑
          </div>
        </div>
      </div>

      {!isChat ? (
        <div
          style={{
            opacity: fade(0.28),
            display: "flex",
            flexDirection: "column",
            gap: "2%",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.8%", justifyContent: "center", width: "100%" }}>
            {row1.map((c) => (
              <Chip key={c} label={c} />
            ))}
          </div>
          {row2.map((c) => (
            <Chip key={c} label={c} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <div
      style={{
        border: "1px solid #4a4a4a",
        borderRadius: 999,
        padding: "0.4em 0.65em",
        fontSize: "0.62em",
        color: "#e7e5e4",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}
    >
      {label}
    </div>
  );
}
