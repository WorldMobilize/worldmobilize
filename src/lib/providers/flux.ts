import { writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_BASE = "https://api.bfl.ai";
const POLL_MS = 800;
const MAX_POLLS = 90;

export function fluxConfigured(): boolean {
  return Boolean(process.env.BFL_API_KEY?.trim());
}

function fluxModelPath(): string {
  const model = process.env.FLUX_MODEL?.trim() || "flux-pro-1.1";
  // Accept "flux-pro-1.1" or full "/v1/flux-pro-1.1"
  if (model.startsWith("/")) return model;
  if (model.startsWith("v1/")) return `/${model}`;
  return `/v1/${model}`;
}

function fluxBaseUrl(): string {
  return (process.env.BFL_API_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, "");
}

function snapDim(n: number): number {
  // BFL typically wants multiples of 32
  const clamped = Math.max(256, Math.min(1440, Math.round(n)));
  return Math.round(clamped / 32) * 32;
}

/**
 * Generate a mute image via Black Forest Labs FLUX and write PNG to outPath.
 * Returns false if not configured or generation fails (caller should fallback).
 */
export async function generateFluxImage(args: {
  prompt: string;
  width: number;
  height: number;
  outPath: string;
}): Promise<boolean> {
  const apiKey = process.env.BFL_API_KEY?.trim();
  if (!apiKey) return false;

  const prompt = [
    args.prompt.trim(),
    "CRITICAL: no text, no letters, no words, no logos with typography, no UI labels, blank readable regions only.",
  ]
    .filter(Boolean)
    .join(" ");

  if (!prompt) return false;

  const width = snapDim(args.width);
  const height = snapDim(args.height);
  const endpoint = `${fluxBaseUrl()}${fluxModelPath()}`;

  let submit: Response;
  try {
    submit = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "x-key": apiKey,
      },
      body: JSON.stringify({ prompt, width, height }),
    });
  } catch (err) {
    console.warn("[flux] submit failed", err);
    return false;
  }

  if (!submit.ok) {
    const body = await submit.text().catch(() => "");
    console.warn(`[flux] submit HTTP ${submit.status}: ${body.slice(0, 200)}`);
    return false;
  }

  const submitted = (await submit.json()) as {
    id?: string;
    polling_url?: string;
    status?: string;
  };
  const pollingUrl = submitted.polling_url;
  if (!pollingUrl) {
    console.warn("[flux] no polling_url in response", submitted);
    return false;
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    let poll: Response;
    try {
      poll = await fetch(pollingUrl, {
        headers: { accept: "application/json", "x-key": apiKey },
      });
    } catch (err) {
      console.warn("[flux] poll failed", err);
      continue;
    }
    if (!poll.ok) continue;
    const data = (await poll.json()) as {
      status?: string;
      result?: { sample?: string };
    };
    const status = data.status ?? "";
    if (status === "Ready" && data.result?.sample) {
      const imgRes = await fetch(data.result.sample);
      if (!imgRes.ok) {
        console.warn(`[flux] download HTTP ${imgRes.status}`);
        return false;
      }
      const buf = Buffer.from(await imgRes.arrayBuffer());
      await writeFile(args.outPath, buf);
      return true;
    }
    if (status === "Error" || status === "Failed" || status === "Request Moderated") {
      console.warn("[flux] generation failed", data);
      return false;
    }
  }

  console.warn("[flux] timed out waiting for image");
  return false;
}

/** Safe filename from gen: asset id */
export function genAssetFileName(assetId: string): string {
  const raw = assetId.replace(/^gen:/, "").replace(/[^a-zA-Z0-9_-]+/g, "_");
  return `${raw || "image"}.png`;
}

export function genAssetLocalPath(jobDirAssets: string, assetId: string): string {
  return path.join(jobDirAssets, genAssetFileName(assetId));
}
