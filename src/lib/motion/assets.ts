import { mkdir, writeFile, access, copyFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { MotionProject, ProjectAsset } from "@/lib/motion/types";
import {
  fluxConfigured,
  generateFluxImage,
  genAssetFileName,
} from "@/lib/providers/flux";

export function jobDir(jobId: string) {
  return path.join(process.cwd(), "public", "generated", jobId);
}

export function assetsDir(jobId: string) {
  return path.join(jobDir(jobId), "assets");
}

export function scenesDir(jobId: string) {
  return path.join(jobDir(jobId), "scenes");
}

/** Job-scoped directory for exported PNG frames (never shared between jobs). */
export function framesDir(jobId: string) {
  return path.join(jobDir(jobId), "frames");
}

/** Job-scoped scratch directory for intermediate render artifacts. */
export function jobTmpDir(jobId: string) {
  return path.join(jobDir(jobId), "tmp");
}

/** Static brand files under public/assets (served as /assets/…). */
export function staticAssetPath(fileName: string) {
  return path.join(process.cwd(), "public", "assets", fileName);
}

const BUILTIN_IDS = [
  "builtin:gradient-panel",
  "builtin:dashboard",
  "builtin:browser",
  "builtin:card",
  "builtin:logo",
  "builtin:screenshot",
  "builtin:icon-chart",
  "builtin:icon-clock",
  "builtin:icon-database",
  "builtin:icon-pill",
  "builtin:icon-shield",
  "builtin:claude-mark",
  "builtin:iphone-frame",
] as const;

function svgToPng(svg: string, width: number, height: number) {
  return sharp(Buffer.from(svg)).resize(width, height, { fit: "fill" }).png().toBuffer();
}

function gradientPanelSvg(w: number, h: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#1e3a5f"/><stop offset="100%" stop-color="#3b82f6"/>
  </linearGradient></defs>
  <rect width="100%" height="100%" rx="24" fill="url(#g)"/>
</svg>`;
}

function dashboardSvg(w: number, h: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" rx="20" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <rect x="4%" y="8%" width="28%" height="12%" rx="8" fill="#1e293b"/>
  <rect x="36%" y="8%" width="28%" height="12%" rx="8" fill="#1e293b"/>
  <rect x="68%" y="8%" width="28%" height="12%" rx="8" fill="#1e293b"/>
  <rect x="4%" y="28%" width="60%" height="60%" rx="12" fill="#111827"/>
  <rect x="68%" y="28%" width="28%" height="28%" rx="12" fill="#172554"/>
  <rect x="68%" y="60%" width="28%" height="28%" rx="12" fill="#1e3a5f"/>
  <circle cx="18%" cy="14%" r="10" fill="#3b82f6"/>
  <circle cx="50%" cy="14%" r="10" fill="#22c55e"/>
  <circle cx="82%" cy="14%" r="10" fill="#f59e0b"/>
</svg>`;
}

function browserSvg(w: number, h: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" rx="16" fill="#111827" stroke="#475569" stroke-width="2"/>
  <rect width="100%" height="12%" fill="#1e293b"/>
  <circle cx="4%" cy="6%" r="5" fill="#ef4444"/><circle cx="8%" cy="6%" r="5" fill="#f59e0b"/><circle cx="12%" cy="6%" r="5" fill="#22c55e"/>
  <rect x="20%" y="3.5%" width="55%" height="5%" rx="6" fill="#0f172a"/>
  <rect x="4%" y="18%" width="92%" height="74%" rx="8" fill="#0b1220"/>
</svg>`;
}

function cardSvg(w: number, h: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" rx="18" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <rect x="10%" y="12%" width="40%" height="8%" rx="6" fill="#3b82f6"/>
  <rect x="10%" y="30%" width="80%" height="6%" rx="4" fill="#64748b"/>
  <rect x="10%" y="42%" width="70%" height="6%" rx="4" fill="#475569"/>
  <rect x="10%" y="60%" width="80%" height="28%" rx="10" fill="#0f172a"/>
</svg>`;
}

function logoSvg(w: number, h: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" rx="28" fill="#172554"/>
  <circle cx="50%" cy="42%" r="22%" fill="#3b82f6"/>
  <rect x="28%" y="70%" width="44%" height="10%" rx="8" fill="#93c5fd"/>
</svg>`;
}

function screenshotSvg(w: number, h: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" rx="12" fill="#020617" stroke="#1e293b" stroke-width="3"/>
  <rect x="6%" y="8%" width="40%" height="35%" rx="8" fill="#1e3a5f"/>
  <rect x="52%" y="8%" width="42%" height="16%" rx="8" fill="#334155"/>
  <rect x="52%" y="28%" width="42%" height="15%" rx="8" fill="#1e293b"/>
  <rect x="6%" y="50%" width="88%" height="40%" rx="10" fill="#0f172a"/>
</svg>`;
}

function iconChartSvg(w: number, h: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#1e3a5f"/>
  <rect x="14" y="36" width="8" height="18" rx="3" fill="#3b82f6"/>
  <rect x="28" y="26" width="8" height="28" rx="3" fill="#60a5fa"/>
  <rect x="42" y="18" width="8" height="36" rx="3" fill="#93c5fd"/>
</svg>`;
}

function iconClockSvg(w: number, h: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="28" fill="#1e3a5f"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#60a5fa" stroke-width="3"/>
  <line x1="32" y1="32" x2="32" y2="18" stroke="#93c5fd" stroke-width="3" stroke-linecap="round"/>
  <line x1="32" y1="32" x2="42" y2="32" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
</svg>`;
}

function iconDatabaseSvg(w: number, h: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 64 64">
  <ellipse cx="32" cy="18" rx="22" ry="8" fill="#3b82f6"/>
  <path d="M10 18v20c0 4.4 9.8 8 22 8s22-3.6 22-8V18" fill="#1e3a5f"/>
  <path d="M10 38v8c0 4.4 9.8 8 22 8s22-3.6 22-8v-8" fill="#172554" stroke="#60a5fa" stroke-width="2"/>
</svg>`;
}

function iconPillSvg(w: number, h: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 64 64">
  <rect x="10" y="24" width="44" height="16" rx="8" fill="#3b82f6"/>
  <rect x="10" y="24" width="22" height="16" rx="8" fill="#93c5fd"/>
</svg>`;
}

function iconShieldSvg(w: number, h: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 64 64">
  <path d="M32 6L10 14v16c0 14 9.4 26.8 22 30 12.6-3.2 22-16 22-30V14L32 6z" fill="#1e3a5f" stroke="#60a5fa" stroke-width="2"/>
  <path d="M24 32l6 6 12-14" fill="none" stroke="#93c5fd" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

async function writeBuiltin(
  dir: string,
  id: string,
  width: number,
  height: number,
): Promise<ProjectAsset> {
  const file = `${id.replace("builtin:", "")}.png`;
  const filePath = path.join(dir, file);

  if (id === "builtin:claude-mark" || id === "builtin:iphone-frame") {
    const fileName = id === "builtin:claude-mark" ? "claude-mark.png" : "iphone-frame.png";
    const src = staticAssetPath(fileName);
    try {
      await access(src);
      if (id === "builtin:claude-mark") {
        const size = Math.min(width, height, 512);
        await sharp(src)
          .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toFile(filePath);
      } else {
        // Keep native aspect (square mockup); fit inside requested box
        await sharp(src)
          .resize(Math.min(width, 900), Math.min(height, 900), {
            fit: "inside",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toFile(filePath);
      }
    } catch {
      if (id === "builtin:claude-mark") {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="6" fill="#D97757"/>
          ${Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const x2 = 32 + Math.cos(a) * 26;
            const y2 = 32 + Math.sin(a) * 26;
            return `<line x1="32" y1="32" x2="${x2}" y2="${y2}" stroke="#D97757" stroke-width="4" stroke-linecap="round"/>`;
          }).join("")}
        </svg>`;
        await writeFile(filePath, await svgToPng(svg, width, height));
      } else {
        await writeFile(filePath, await svgToPng(browserSvg(width, height), width, height));
      }
    }
    return {
      id,
      type: "image",
      source: "builtin",
      path: filePath,
      mimeType: "image/png",
      width,
      height,
      status: "ready",
    };
  }

  let svg = "";
  switch (id) {
    case "builtin:gradient-panel":
      svg = gradientPanelSvg(width, height);
      break;
    case "builtin:dashboard":
      svg = dashboardSvg(width, height);
      break;
    case "builtin:browser":
      svg = browserSvg(width, height);
      break;
    case "builtin:card":
      svg = cardSvg(width, height);
      break;
    case "builtin:logo":
      svg = logoSvg(width, height);
      break;
    case "builtin:icon-chart":
      svg = iconChartSvg(width, height);
      break;
    case "builtin:icon-clock":
      svg = iconClockSvg(width, height);
      break;
    case "builtin:icon-database":
      svg = iconDatabaseSvg(width, height);
      break;
    case "builtin:icon-pill":
      svg = iconPillSvg(width, height);
      break;
    case "builtin:icon-shield":
      svg = iconShieldSvg(width, height);
      break;
    default:
      svg = screenshotSvg(width, height);
  }
  const buf = await svgToPng(svg, width, height);
  await writeFile(filePath, buf);
  return {
    id,
    type: "image",
    source: "builtin",
    path: filePath,
    mimeType: "image/png",
    width,
    height,
    status: "ready",
  };
}

/** Collect every asset id referenced by a project (backgrounds, images, component props). */
function collectReferencedAssetIds(project: MotionProject): Set<string> {
  const ids = new Set<string>();
  for (const scene of project.scenes) {
    if (scene.background.type === "image") ids.add(scene.background.assetId);
    for (const layer of scene.layers) {
      if (layer.type === "image") ids.add(layer.assetId);
      if (layer.type === "component") {
        for (const key of ["icon", "logo"]) {
          const v = (layer.props as Record<string, unknown>)[key];
          if (typeof v === "string" && v) ids.add(v);
        }
      }
    }
  }
  return ids;
}

export async function prepareProjectAssets(project: MotionProject): Promise<ProjectAsset[]> {
  const dir = assetsDir(project.id);
  await mkdir(dir, { recursive: true });
  await mkdir(scenesDir(project.id), { recursive: true });

  const needed = new Set<string>(BUILTIN_IDS);
  const genJobs = new Map<string, { prompt: string; width: number; height: number }>();

  for (const scene of project.scenes) {
    if (scene.background.type === "image") needed.add(scene.background.assetId);
    for (const layer of scene.layers) {
      if (layer.type !== "image") continue;
      needed.add(layer.assetId);
      if (layer.assetId.startsWith("gen:") && layer.imagePrompt?.trim()) {
        const prev = genJobs.get(layer.assetId);
        genJobs.set(layer.assetId, {
          prompt: layer.imagePrompt.trim(),
          width: Math.max(prev?.width ?? 0, Math.round(layer.width)),
          height: Math.max(prev?.height ?? 0, Math.round(layer.height)),
        });
      }
    }
  }

  const referenced = collectReferencedAssetIds(project);
  for (const id of referenced) needed.add(id);

  const assets: ProjectAsset[] = [];
  const producedBuiltins = new Set<string>();
  for (const id of needed) {
    if (!id.startsWith("builtin:")) continue;
    const w = Math.round(project.format.width * 0.5);
    const h = Math.round(project.format.height * 0.45);
    const asset = await writeBuiltin(dir, id, Math.max(320, w), Math.max(240, h));
    asset.url = `/generated/${project.id}/assets/${id.replace("builtin:", "")}.png`;
    assets.push(asset);
    producedBuiltins.add(id);
  }

  // Ensure phone / claude builtins exist for Flux fallbacks
  for (const id of ["builtin:iphone-frame", "builtin:claude-mark"] as const) {
    if (producedBuiltins.has(id)) continue;
    if (![...needed].some((n) => n.startsWith("gen:"))) continue;
    try {
      await access(staticAssetPath(id === "builtin:iphone-frame" ? "iphone-frame.png" : "claude-mark.png"));
      const asset = await writeBuiltin(dir, id, 512, 512);
      asset.url = `/generated/${project.id}/assets/${id.replace("builtin:", "")}.png`;
      assets.push(asset);
      producedBuiltins.add(id);
    } catch {
      /* optional static files */
    }
  }

  const phoneFallback = producedBuiltins.has("builtin:iphone-frame")
    ? "builtin:iphone-frame"
    : producedBuiltins.has("builtin:card")
      ? "builtin:card"
      : "builtin:gradient-panel";
  const genericFallback = producedBuiltins.has("builtin:card")
    ? "builtin:card"
    : "builtin:gradient-panel";

  for (const [assetId, job] of genJobs) {
    const file = genAssetFileName(assetId);
    const filePath = path.join(dir, file);
    const url = `/generated/${project.id}/assets/${file}`;
    let ok = false;
    if (fluxConfigured()) {
      console.warn(`[assets] Flux generating ${assetId}…`);
      ok = await generateFluxImage({
        prompt: job.prompt,
        width: job.width || project.format.width,
        height: job.height || project.format.height,
        outPath: filePath,
      });
    } else {
      console.warn(`[assets] Flux not configured — fallback for ${assetId}`);
    }

    if (!ok) {
      // Prefer phone frame for device-ish prompts
      const usePhone =
        /phone|iphone|device|frame/i.test(job.prompt) || /phone|iphone|device|frame/i.test(assetId);
      const fb = usePhone ? phoneFallback : genericFallback;
      const fbFile = `${fb.replace("builtin:", "")}.png`;
      const fbPath = path.join(dir, fbFile);
      try {
        await copyFile(fbPath, filePath);
        ok = true;
      } catch {
        // last resort: write a simple dark plate via sharp
        await sharp({
          create: {
            width: Math.max(64, job.width || 512),
            height: Math.max(64, job.height || 512),
            channels: 4,
            background: { r: 20, g: 20, b: 22, alpha: 1 },
          },
        })
          .png()
          .toFile(filePath);
        ok = true;
      }
    }

    if (ok) {
      assets.push({
        id: assetId,
        type: "image",
        source: "generated",
        path: filePath,
        mimeType: "image/png",
        width: job.width,
        height: job.height,
        status: "ready",
        url,
      });
    }
  }

  // Any referenced non-builtin / non-gen asset still missing → placeholder
  const fallbackId = genericFallback;
  const fallbackUrl = `/generated/${project.id}/assets/${fallbackId.replace("builtin:", "")}.png`;
  for (const id of referenced) {
    if (id.startsWith("builtin:")) continue;
    if (assets.some((a) => a.id === id)) continue;
    assets.push({
      id,
      type: "image",
      source: "generated",
      path: "",
      mimeType: "image/png",
      status: "missing",
      fallbackId,
      url: fallbackUrl,
    });
  }

  // Also cover gen: ids that somehow weren't in genJobs (no prompt)
  for (const id of needed) {
    if (!id.startsWith("gen:")) continue;
    if (assets.some((a) => a.id === id)) continue;
    assets.push({
      id,
      type: "image",
      source: "generated",
      path: "",
      mimeType: "image/png",
      status: "missing",
      fallbackId: phoneFallback,
      url: `/generated/${project.id}/assets/${phoneFallback.replace("builtin:", "")}.png`,
    });
  }

  await writeFile(path.join(jobDir(project.id), "assets.json"), JSON.stringify(assets, null, 2));
  await writeFile(path.join(jobDir(project.id), "project.json"), JSON.stringify(project, null, 2));
  return assets;
}

export function assetPathById(assets: ProjectAsset[], id: string): string | null {
  return assets.find((a) => a.id === id)?.path ?? null;
}

export async function renderTextLayerPng(args: {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
  outPath: string;
}): Promise<void> {
  const escapeXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const lines = wrapText(args.text, Math.max(8, Math.floor(args.width / (args.fontSize * 0.55))));
  const lineHeight = args.fontSize * 1.25;
  const blockH = lines.length * lineHeight;
  const startY = (args.height - blockH) / 2 + args.fontSize;
  const anchor = args.align === "center" ? "middle" : args.align === "right" ? "end" : "start";
  const x =
    args.align === "center" ? args.width / 2 : args.align === "right" ? args.width - 8 : 8;

  const textNodes = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="${args.fontSize}" font-weight="${args.fontWeight}" fill="${escapeXml(args.color)}">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${args.width}" height="${args.height}">
  ${textNodes}
</svg>`;
  const buf = await svgToPng(svg, args.width, args.height);
  await writeFile(args.outPath, buf);
}

export async function renderShapeLayerPng(args: {
  width: number;
  height: number;
  shape: "rectangle" | "circle" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  outPath: string;
}): Promise<void> {
  const fill = args.fill ?? "#3b82f6";
  const stroke = args.stroke ?? "none";
  const sw = args.strokeWidth ?? 0;
  const r = args.borderRadius ?? 12;
  let body = "";
  if (args.shape === "circle") {
    body = `<ellipse cx="50%" cy="50%" rx="48%" ry="48%" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  } else if (args.shape === "line") {
    body = `<line x1="5%" y1="50%" x2="95%" y2="50%" stroke="${args.stroke ?? fill}" stroke-width="${Math.max(2, sw || 4)}" stroke-linecap="round"/>`;
  } else {
    body = `<rect x="2%" y="2%" width="96%" height="96%" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${args.width}" height="${args.height}">${body}</svg>`;
  const buf = await svgToPng(svg, args.width, args.height);
  await writeFile(args.outPath, buf);
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 6);
}
