"use client";

import { useState } from "react";
import { MOTION_PRESET_IDS } from "@/lib/motion/presets";
import type { MotionLayer, MotionScene } from "@/lib/motion/types";

type LayerPatch = Record<string, unknown>;

export function LayerInspector({
  layer,
  onPatchLayer,
  onPatchPreset,
  onDeleteLayer,
}: {
  scene?: MotionScene;
  layer: MotionLayer | null;
  onPatchLayer: (layerId: string, patch: LayerPatch) => void;
  onPatchPreset: (layerId: string, preset: string) => void;
  onDeleteLayer?: (layerId: string) => void;
}) {
  const [showJson, setShowJson] = useState(false);

  if (!layer) {
    return (
      <p className="text-xs text-zinc-500">
        Seleziona un layer nell&apos;anteprima o dalla lista per modificarlo.
      </p>
    );
  }

  const patch = (p: LayerPatch) => onPatchLayer(layer.id, p);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">{layer.name}</p>
          <p className="text-[11px] text-zinc-500">
            {layer.type} · #{layer.id}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
            {layer.type}
          </span>
          {onDeleteLayer ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Rimuovere il layer “${layer.name}”?`)) {
                  onDeleteLayer(layer.id);
                }
              }}
              className="rounded-lg border border-red-900/60 bg-red-950/30 px-2 py-1 text-[11px] text-red-300 hover:bg-red-950/60"
            >
              Rimuovi
            </button>
          ) : null}
        </div>
      </div>

      {/* Type-specific fields */}
      {layer.type === "text" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Testo" className="sm:col-span-2">
            <textarea
              rows={2}
              className={inputCls}
              value={layer.text}
              onChange={(e) => patch({ text: e.target.value })}
            />
          </Field>
          <Field label="Colore">
            <input
              type="color"
              className={colorCls}
              value={layer.color}
              onChange={(e) => patch({ color: e.target.value })}
            />
          </Field>
          <Field label="Allineamento">
            <select
              className={inputCls}
              value={layer.align}
              onChange={(e) => patch({ align: e.target.value })}
            >
              <option value="left">left</option>
              <option value="center">center</option>
              <option value="right">right</option>
            </select>
          </Field>
          <Field label="Dimensione font">
            <input
              type="number"
              className={inputCls}
              value={layer.fontSize}
              onChange={(e) => patch({ fontSize: Number(e.target.value) })}
            />
          </Field>
          <Field label="Peso font">
            <input
              type="number"
              step={100}
              min={100}
              max={900}
              className={inputCls}
              value={layer.fontWeight}
              onChange={(e) => patch({ fontWeight: Number(e.target.value) })}
            />
          </Field>
        </div>
      ) : null}

      {layer.type === "shape" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Riempimento">
            <input
              type="color"
              className={colorCls}
              value={layer.fill ?? "#3b82f6"}
              onChange={(e) => patch({ fill: e.target.value })}
            />
          </Field>
          <Field label="Bordo (raggio)">
            <input
              type="number"
              className={inputCls}
              value={layer.borderRadius ?? 12}
              onChange={(e) => patch({ borderRadius: Number(e.target.value) })}
            />
          </Field>
        </div>
      ) : null}

      {layer.type === "image" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Asset ID" className="sm:col-span-2">
            <input
              className={inputCls}
              value={layer.assetId}
              onChange={(e) => patch({ assetId: e.target.value })}
            />
          </Field>
          <Field label="Fit">
            <select className={inputCls} value={layer.fit} onChange={(e) => patch({ fit: e.target.value })}>
              <option value="contain">contain</option>
              <option value="cover">cover</option>
            </select>
          </Field>
        </div>
      ) : null}

      {layer.type === "component" ? (
        <ComponentProps layer={layer} onPatch={patch} />
      ) : null}

      {/* Transform + timing (all layer types) */}
      <div className="grid gap-2 sm:grid-cols-4">
        <NumField label="X" value={layer.x} onChange={(v) => patch({ x: v })} />
        <NumField label="Y" value={layer.y} onChange={(v) => patch({ y: v })} />
        <NumField label="Largh." value={layer.width} onChange={(v) => patch({ width: v })} />
        <NumField label="Alt." value={layer.height} onChange={(v) => patch({ height: v })} />
        <NumField label="Rotaz." value={layer.rotation} onChange={(v) => patch({ rotation: v })} />
        <NumField label="Scala" step={0.05} value={layer.scale} onChange={(v) => patch({ scale: v })} />
        <NumField
          label="Opacità"
          step={0.05}
          value={layer.opacity}
          onChange={(v) => patch({ opacity: v })}
        />
        <NumField label="Z" value={layer.zIndex} onChange={(v) => patch({ zIndex: v })} />
        <NumField label="Start (s)" step={0.1} value={layer.startSec} onChange={(v) => patch({ startSec: v })} />
        <NumField
          label="Durata (s)"
          step={0.1}
          value={layer.durationSec}
          onChange={(v) => patch({ durationSec: v })}
        />
        <NumField label="Blur" value={layer.blur ?? 0} onChange={(v) => patch({ blur: v })} />
      </div>

      <Field label="Animazione (preset)">
        <select
          className={inputCls}
          value={layer.animationPreset ?? "fadeIn"}
          onChange={(e) => onPatchPreset(layer.id, e.target.value)}
        >
          {MOTION_PRESET_IDS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>

      <button
        type="button"
        onClick={() => setShowJson((s) => !s)}
        className="text-[11px] text-zinc-400 underline-offset-2 hover:underline"
      >
        {showJson ? "Nascondi JSON" : "Mostra JSON layer"}
      </button>
      {showJson ? (
        <pre className="max-h-56 overflow-auto rounded-lg bg-black/60 p-3 text-[10px] text-zinc-300">
          {JSON.stringify(layer, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function ComponentProps({
  layer,
  onPatch,
}: {
  layer: Extract<MotionLayer, { type: "component" }>;
  onPatch: (patch: LayerPatch) => void;
}) {
  const entries = Object.entries(layer.props ?? {});
  return (
    <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <p className="text-[11px] font-medium text-zinc-400">
        Componente: <span className="text-zinc-200">{layer.component}</span>
      </p>
      {entries.length === 0 ? (
        <p className="text-[11px] text-zinc-500">Nessuna proprietà.</p>
      ) : (
        entries.map(([key, value]) => (
          <Field key={key} label={key}>
            <input
              className={inputCls}
              value={Array.isArray(value) ? value.join(" · ") : String(value ?? "")}
              onChange={(e) => {
                const raw = e.target.value;
                const next = Array.isArray(value) ? raw.split("·").map((s) => s.trim()) : raw;
                onPatch({ props: { [key]: next } });
              }}
            />
          </Field>
        ))
      )}
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white";
const colorCls = "mt-1 h-10 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-xs text-zinc-400 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        step={step}
        className={inputCls}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}
