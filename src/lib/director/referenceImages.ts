import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ContentPart } from "@/lib/director/openai";
import type { ReferenceImage } from "@/lib/motion/types";

/**
 * Turn uploaded reference images into content parts the brain can see.
 *
 * They are inlined as data URLs on purpose: the server usually listens on
 * localhost only, so a public URL would be unreachable from OpenAI's side.
 * Uploads are already normalised to PNG and capped at 2048px by the upload
 * route, so there is no second resize here.
 *
 * A missing file is skipped rather than fatal — losing a reference should
 * degrade the direction, not fail the job.
 */
export async function referenceImageParts(refs: ReferenceImage[]): Promise<ContentPart[]> {
  const parts: ContentPart[] = [];
  for (const ref of refs) {
    // The id is validated at the API boundary; re-derive the path from it
    // rather than trusting a stored url that could point anywhere.
    if (!/^ref_[a-z0-9_]+$/i.test(ref.id)) continue;
    const file = path.join(process.cwd(), "public", "uploads", `${ref.id}.png`);
    try {
      const bytes = await readFile(file);
      parts.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${bytes.toString("base64")}`, detail: "auto" },
      });
    } catch {
      /* reference no longer on disk — plan without it */
    }
  }
  return parts;
}

/** How the brain is told what to do with the images it is about to see. */
export function referenceImageBrief(refs: ReferenceImage[]): string {
  if (refs.length === 0) return "";
  const list = refs
    .map((r, i) => `  ${i + 1}. assetId "${r.id}" — ${r.width}x${r.height}${r.name ? ` (${r.name})` : ""}`)
    .join("\n");
  return [
    "",
    `REFERENCE IMAGES — the user attached ${refs.length}. They are shown to you below, in this order:`,
    list,
    "Use them two ways, and say which you chose in the scene purpose:",
    "  1. Visual direction — take palette, lighting and mood from them. If they carry a clear",
    "     brand colour, set brand.primaryColor/accentColor from it rather than inventing one.",
    "  2. Actual content — to put one on screen, emit an image layer with that exact assetId",
    '     (e.g. { "type": "image", "assetId": "ref_...", "fit": "contain" }). Do NOT invent a',
    "     gen: prompt for something the user already gave you.",
    "A logo or product shot is almost always meant to appear, not merely to inspire.",
  ].join("\n");
}
