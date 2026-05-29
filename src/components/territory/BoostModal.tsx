"use client";

import { useEffect, useMemo, useState } from "react";

export function BoostModal(props: {
  open: boolean;
  brandName?: string;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(250);
  const presets = useMemo(() => [50, 250, 1000, 5000], []);
  const canSubmit = Number.isFinite(amount) && amount >= 50;

  useEffect(() => {
    if (!props.open) setAmount(250);
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/65" aria-label="Close" onClick={props.onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-md rounded-3xl p-5 shadow-[0_0_60px_rgba(34,211,238,0.12)]">
          <div className="text-lg font-semibold text-zinc-50">Boost {props.brandName ?? "brand"}</div>
          <p className="mt-1 text-sm text-zinc-400">Mock budget — fuels expansion and border wars.</p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmit) return;
              props.onSubmit(Math.floor(amount));
              props.onClose();
            }}
          >
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    amount === p
                      ? "border-cyan-300/30 bg-cyan-400/15 text-cyan-100"
                      : "border-white/10 bg-white/5 text-zinc-200"
                  }`}
                >
                  ${p.toLocaleString("en-US")}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={50}
              step={50}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-50 outline-none focus:border-fuchsia-300/40"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-400/90 to-fuchsia-400/90 py-3 text-sm font-semibold text-black disabled:opacity-50"
            >
              Apply boost
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
