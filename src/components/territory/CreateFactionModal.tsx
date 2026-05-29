"use client";

import { useEffect, useMemo, useState } from "react";
type CapitalTarget = { id: string; name: string };

const PALETTE = ["#22d3ee", "#a78bfa", "#fb7185", "#34d399", "#fbbf24", "#60a5fa", "#f472b6", "#c084fc"];

export function CreateFactionModal(props: {
  open: boolean;
  territory: CapitalTarget | null;
  onClose: () => void;
  onCreate: (args: { territoryId: string; name: string; color: string }) => void;
}) {
  const presets = useMemo(() => PALETTE, []);
  const [name, setName] = useState("");
  const [color, setColor] = useState(presets[0]!);

  useEffect(() => {
    if (!props.open) return;
    setName("");
    setColor(presets[0]!);
  }, [props.open, presets]);

  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  if (!props.open || !props.territory) return null;

  const canCreate = name.trim().length >= 2 && /^#([0-9a-fA-F]{6})$/.test(color);

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/65" aria-label="Close" onClick={props.onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-md rounded-3xl p-5 shadow-[0_0_60px_rgba(34,211,238,0.12)]">
          <div className="text-lg font-semibold text-zinc-50">Found a faction</div>
          <p className="mt-1 text-sm text-zinc-400">
            Choose your capital: <span className="font-semibold text-zinc-200">{props.territory.name}</span>
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <div className="text-xs font-semibold text-zinc-300">Faction name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Shadow Legion"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-50 outline-none focus:border-fuchsia-300/40"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-300">Color</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setColor(p)}
                    className={[
                      "h-8 w-8 rounded-full border transition",
                      color === p ? "border-white/40" : "border-white/10",
                    ].join(" ")}
                    style={{ backgroundColor: p, boxShadow: `0 0 14px ${p}55` }}
                    aria-label={`Pick ${p}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={props.onClose}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-zinc-100 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canCreate}
              onClick={() => {
                if (!props.territory) return;
                const trimmed = name.trim();
                if (trimmed.length < 2) return;
                props.onCreate({
                  territoryId: props.territory.id,
                  name: trimmed,
                  color,
                });
                props.onClose();
              }}
              className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-400/90 to-fuchsia-400/90 py-3 text-sm font-semibold text-black disabled:opacity-50"
            >
              Establish capital
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

