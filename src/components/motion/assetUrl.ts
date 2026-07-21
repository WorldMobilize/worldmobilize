import type { ProjectAsset } from "@/lib/motion/types";

/**
 * Resolve a layer/background assetId to a browser-loadable URL.
 *
 * Priority:
 * 1. Explicit manifest entry (ProjectAsset with a usable web path).
 * 2. Builtin ids -> deterministic public path under the job folder.
 * 3. Values that already look like a URL / absolute web path -> used as-is.
 * 4. Otherwise null (caller renders a placeholder).
 */
export function resolveAssetUrl(
  assetId: string | undefined | null,
  opts: { jobId?: string; assets?: ProjectAsset[] } = {},
): string | null {
  if (!assetId) return null;
  const { jobId, assets } = opts;

  const manifest = assets?.find((a) => a.id === assetId);
  if (manifest) {
    if (manifest.url) return manifest.url;
    const web = toWebPath(manifest.path);
    if (web) return web;
    if (manifest.fallbackId) {
      return resolveAssetUrl(manifest.fallbackId, opts);
    }
  }

  // Uploaded reference images. Deterministic like the ids below, and job
  // independent on purpose: one upload can seed several attempts, so it must
  // not live in a job folder that each render wipes and rebuilds.
  if (/^ref_[a-z0-9_]+$/i.test(assetId)) return `/uploads/${assetId}.png`;

  if (assetId.startsWith("builtin:")) {
    const name = assetId.replace("builtin:", "");
    if (jobId) return `/generated/${jobId}/assets/${name}.png`;
    return null;
  }

  if (assetId.startsWith("gen:") && jobId) {
    const name = assetId.replace(/^gen:/, "").replace(/[^a-zA-Z0-9_-]+/g, "_") || "image";
    return `/generated/${jobId}/assets/${name}.png`;
  }

  if (/^(https?:)?\/\//.test(assetId) || assetId.startsWith("/")) return assetId;
  if (assetId.startsWith("data:")) return assetId;

  return null;
}

/** Convert an absolute filesystem path under /public into a web path. */
export function toWebPath(fsPath: string): string | null {
  if (!fsPath) return null;
  if (fsPath.startsWith("/") && !fsPath.includes("\\")) {
    // Already a web-style path (or unix absolute under public handled below).
    if (fsPath.startsWith("/generated") || fsPath.startsWith("/assets")) return fsPath;
  }
  const normalized = fsPath.replace(/\\/g, "/");
  const marker = "/public/";
  const idx = normalized.lastIndexOf(marker);
  if (idx >= 0) return normalized.slice(idx + marker.length - 1); // keep leading slash
  const genIdx = normalized.lastIndexOf("/generated/");
  if (genIdx >= 0) return normalized.slice(genIdx);
  return null;
}
