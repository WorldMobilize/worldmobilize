import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  assetPathById,
  renderShapeLayerPng,
  renderTextLayerPng,
  scenesDir,
} from "@/lib/motion/assets";
import type { MotionLayer, MotionProject, MotionScene, ProjectAsset } from "@/lib/motion/types";
import { runFfmpeg, sampleKeyframes } from "@/lib/render/ffmpegExpressions";

async function writeBackgroundPng(
  scene: MotionScene,
  project: MotionProject,
  assets: ProjectAsset[],
  outPath: string,
): Promise<void> {
  const { width, height } = project.format;
  const bg = scene.background;
  if (bg.type === "solid") {
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: bg.color,
      },
    })
      .png()
      .toFile(outPath);
    return;
  }
  if (bg.type === "gradient") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs><linearGradient id="g" gradientTransform="rotate(${bg.angle})">
        <stop offset="0%" stop-color="${bg.from}"/><stop offset="100%" stop-color="${bg.to}"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`;
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    return;
  }
  const src = assetPathById(assets, bg.assetId);
  if (!src) throw new Error(`Missing background asset ${bg.assetId}`);
  await sharp(src)
    .resize(width, height, { fit: bg.fit === "contain" ? "contain" : "cover", background: "#000000" })
    .png()
    .toFile(outPath);
}

function trackValue(layer: MotionLayer, prop: "x" | "y" | "opacity" | "scale", t: number, fallback: number) {
  const track = layer.animations.find((a) => a.property === prop);
  if (!track || track.keyframes.length === 0) return fallback;
  return sampleKeyframes(track.keyframes, t);
}

async function materializeLayerPng(
  layer: MotionLayer,
  assets: ProjectAsset[],
  outPath: string,
): Promise<void> {
  if (layer.type === "text") {
    await renderTextLayerPng({
      text: layer.text,
      width: Math.round(layer.width),
      height: Math.round(layer.height),
      fontSize: layer.fontSize,
      fontWeight: layer.fontWeight,
      color: layer.color,
      align: layer.align,
      outPath,
    });
    return;
  }
  if (layer.type === "shape") {
    await renderShapeLayerPng({
      width: Math.round(layer.width),
      height: Math.round(layer.height),
      shape: layer.shape,
      fill: layer.fill,
      stroke: layer.stroke,
      strokeWidth: layer.strokeWidth,
      borderRadius: layer.borderRadius,
      outPath,
    });
    return;
  }
  if (layer.type === "component") {
    // Legacy FFmpeg renderer does not rasterize semantic components; the
    // Playwright frame exporter (Phase 10) is the source of truth for these.
    await sharp({
      create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toFile(outPath);
    return;
  }
  const src = assetPathById(assets, layer.assetId);
  if (!src) throw new Error(`Missing image asset ${layer.assetId}`);
  await sharp(src)
    .resize(Math.round(layer.width), Math.round(layer.height), {
      fit: layer.fit === "contain" ? "contain" : "cover",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outPath);
}

/**
 * Render one scene to MP4 using background + overlay layers with fade/slide intros.
 */
export async function renderScene(args: {
  project: MotionProject;
  scene: MotionScene;
  assets: ProjectAsset[];
  index: number;
}): Promise<string> {
  const { project, scene, assets, index } = args;
  if (scene.enabled === false) {
    throw new Error(`Scene ${scene.id} is disabled`);
  }

  const dir = scenesDir(project.id);
  await mkdir(dir, { recursive: true });
  const scenePad = String(index + 1).padStart(2, "0");
  const work = path.join(dir, `_work_${scenePad}`);
  await mkdir(work, { recursive: true });

  const bgPath = path.join(work, "bg.png");
  await writeBackgroundPng(scene, project, assets, bgPath);

  const layers = [...scene.layers]
    .filter((l) => l.enabled !== false)
    .sort((a, b) => a.zIndex - b.zIndex);

  const layerFiles: { layer: MotionLayer; file: string }[] = [];
  for (const layer of layers) {
    const file = path.join(work, `${layer.id}.png`);
    await materializeLayerPng(layer, assets, file);
    layerFiles.push({ layer, file });
  }

  const outPath = path.join(dir, `scene_${scenePad}.mp4`);
  const fps = project.format.fps;
  const dur = scene.durationSec;
  const { width, height } = project.format;

  // Build filter: loop bg as video, overlay each layer with enable window + fade
  const inputs: string[] = ["-loop", "1", "-t", String(dur), "-i", bgPath];
  for (const lf of layerFiles) {
    inputs.push("-loop", "1", "-t", String(dur), "-i", lf.file);
  }

  const filters: string[] = [];
  // scale bg
  filters.push(`[0:v]scale=${width}:${height},setsar=1,fps=${fps},format=rgba[base]`);

  let last = "base";
  layerFiles.forEach((lf, i) => {
    const inputIdx = i + 1;
    const layer = lf.layer;
    const start = layer.startSec;
    const end = Math.min(dur, layer.startSec + layer.durationSec);
    const labelIn = `l${i}`;
    const labelOut = `v${i}`;

    // Sample intro at t=0 vs settled (~0.6s into layer local time)
    const localSettle = 0.55;
    const x0 = trackValue(layer, "x", 0, layer.x);
    const y0 = trackValue(layer, "y", 0, layer.y);
    const x1 = trackValue(layer, "x", localSettle, layer.x);
    const y1 = trackValue(layer, "y", localSettle, layer.y);
    const o0 = trackValue(layer, "opacity", 0, 0);
    const o1 = trackValue(layer, "opacity", localSettle, layer.opacity);

    const fadeDur = Math.max(0.05, Math.min(0.8, localSettle));
    const fadeSt = start;

    filters.push(
      `[${inputIdx}:v]scale=${Math.round(layer.width)}:${Math.round(layer.height)},format=rgba,fade=t=in:st=${fadeSt}:d=${fadeDur}:alpha=1[${labelIn}]`,
    );

    // Linear slide for first fadeDur seconds of layer visibility
    const dx = x0 - x1;
    const dy = y0 - y1;
    const xExpr =
      Math.abs(dx) < 0.5
        ? String(Math.round(x1))
        : `'${Math.round(x1)}+${dx.toFixed(2)}*max(0,1-(t-${start})/${fadeDur})'`;
    const yExpr =
      Math.abs(dy) < 0.5
        ? String(Math.round(y1))
        : `'${Math.round(y1)}+${dy.toFixed(2)}*max(0,1-(t-${start})/${fadeDur})'`;

    // Apply base opacity via colorchannelmixer if needed
    const opacityBoost = o1 < 0.99 ? `,colorchannelmixer=aa=${o1.toFixed(3)}` : "";
    if (opacityBoost && o0 < o1) {
      // already fading in via fade filter; keep
    }

    filters.push(
      `[${last}][${labelIn}]overlay=x=${xExpr}:y=${yExpr}:enable='between(t\\,${start}\\,${end})'[${labelOut}]`,
    );
    last = labelOut;
    void o0;
  });

  filters.push(`[${last}]format=yuv420p[vout]`);

  const ffArgs = [
    "-y",
    ...inputs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[vout]",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    "-t",
    String(dur),
    outPath,
  ];

  await runFfmpeg(ffArgs, { jobId: project.id, sceneId: scene.id });
  return outPath;
}

export async function composeSceneVideos(args: {
  project: MotionProject;
  scenePaths: string[];
  voicePath: string | null;
}): Promise<string> {
  const { project, scenePaths, voicePath } = args;
  if (scenePaths.length === 0) throw new Error("No scenes to compose");

  const outDir = path.join(process.cwd(), "public", "generated", project.id);
  await mkdir(outDir, { recursive: true });
  const silent = path.join(outDir, "_timeline.mp4");
  const finalPath = path.join(outDir, "final.mp4");

  if (scenePaths.length === 1) {
    await runFfmpeg(
      ["-y", "-i", scenePaths[0]!, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", silent],
      { jobId: project.id, sceneId: "compose" },
    );
  } else {
    // xfade chain with fade transitions when possible
    const inputs = scenePaths.flatMap((p) => ["-i", p]);
    const filters: string[] = [];
    let prev = "0:v";
    let accDur = project.scenes.filter((s) => s.enabled !== false)[0]?.durationSec ?? 3;
    for (let i = 1; i < scenePaths.length; i++) {
      const scene = project.scenes.filter((s) => s.enabled !== false)[i];
      const prevScene = project.scenes.filter((s) => s.enabled !== false)[i - 1];
      const td = Math.min(
        0.5,
        prevScene?.transitionOut?.durationSec ?? 0.35,
        (prevScene?.durationSec ?? 1) / 3,
        (scene?.durationSec ?? 1) / 3,
      );
      const useFade = (prevScene?.transitionOut?.type ?? "fade") !== "cut" && td > 0.05;
      const outLabel = `xf${i}`;
      if (useFade) {
        const offset = Math.max(0, accDur - td);
        filters.push(
          `[${prev}][${i}:v]xfade=transition=fade:duration=${td.toFixed(3)}:offset=${offset.toFixed(3)}[${outLabel}]`,
        );
        accDur = accDur + (scene?.durationSec ?? 0) - td;
      } else {
        filters.push(`[${prev}][${i}:v]concat=n=2:v=1:a=0[${outLabel}]`);
        accDur = accDur + (scene?.durationSec ?? 0);
      }
      prev = outLabel;
    }
    filters.push(`[${prev}]format=yuv420p[vout]`);
    await runFfmpeg(
      ["-y", ...inputs, "-filter_complex", filters.join(";"), "-map", "[vout]", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", silent],
      { jobId: project.id, sceneId: "compose" },
    );
  }

  if (voicePath) {
    await runFfmpeg(
      [
        "-y",
        "-i",
        silent,
        "-i",
        voicePath,
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        finalPath,
      ],
      { jobId: project.id, sceneId: "audio" },
    );
  } else {
    await runFfmpeg(
      ["-y", "-i", silent, "-c", "copy", "-movflags", "+faststart", finalPath],
      { jobId: project.id, sceneId: "finalize" },
    );
  }

  await writeFile(
    path.join(outDir, "project.json"),
    JSON.stringify(project, null, 2),
  );

  return finalPath;
}
