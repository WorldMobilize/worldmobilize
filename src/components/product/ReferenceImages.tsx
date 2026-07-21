"use client";

import { useRef, useState } from "react";
import type { ReferenceImage } from "@/lib/motion/types";

/**
 * Reference images the user hands the Director alongside the brief.
 *
 * One upload covers both things a reference can be for: the brain is shown the
 * pixels, so it takes palette and mood from them, and it can also place the
 * image in a scene by its id. Which is why there is no "style or content?"
 * toggle here — the model decides from what the picture actually is, and a logo
 * almost always wants to appear rather than merely inspire.
 */
export function ReferenceImages({
  images,
  onChange,
  disabled = false,
}: {
  images: ReferenceImage[];
  onChange: (next: ReferenceImage[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX = 6;

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX - images.length);
    if (list.length === 0) return;

    setError(null);
    setBusy((n) => n + list.length);
    const added: ReferenceImage[] = [];
    for (const file of list) {
      const body = new FormData();
      body.append("file", file);
      try {
        const res = await fetch("/api/uploads", { method: "POST", body });
        const data = (await res.json()) as ReferenceImage & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Caricamento fallito");
        added.push(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Caricamento fallito");
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (added.length) onChange([...images, ...added]);
  };

  const full = images.length >= MAX;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          Immagini di riferimento{" "}
          <span className="text-zinc-600">— logo, prodotto, stile</span>
        </p>
        {images.length > 0 ? (
          <span className="text-[11px] text-zinc-600">
            {images.length}/{MAX}
          </span>
        ) : null}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled && !full) void upload(e.dataTransfer.files);
        }}
        className={`mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-2 transition-colors ${
          dragging ? "border-cyan-400/60 bg-cyan-400/5" : "border-white/10"
        }`}
      >
        {images.map((img) => (
          <span key={img.id} className="group relative">
            {/* Plain img: these are arbitrary user uploads at unknown sizes,
                and next/image would want a loader and a configured domain for
                no benefit on a 64px thumbnail. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.name ?? "riferimento"}
              className="h-16 w-16 rounded-lg border border-white/10 object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(images.filter((i) => i.id !== img.id))}
              disabled={disabled}
              title="Rimuovi"
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white/15 bg-zinc-900 text-[11px] text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:text-red-300"
            >
              ✕
            </button>
          </span>
        ))}

        {busy > 0
          ? Array.from({ length: busy }, (_, i) => (
              <span
                key={`busy-${i}`}
                className="h-16 w-16 animate-pulse rounded-lg border border-white/10 bg-zinc-800"
              />
            ))
          : null}

        {!full ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="h-16 rounded-lg border border-white/10 px-4 text-xs text-zinc-500 transition-colors hover:border-white/25 hover:text-zinc-300 disabled:opacity-40"
          >
            {images.length === 0 ? "Trascina qui o scegli file" : "Aggiungi"}
          </button>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
