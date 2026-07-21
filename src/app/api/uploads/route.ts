import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * Reference images the user hands the Director.
 *
 * They live outside any job folder because they are uploaded before a job
 * exists, and one image may seed several attempts — `public/generated/<jobId>/`
 * is wiped and rebuilt per render, which would take the source material with
 * it. `public/uploads/` is gitignored the same way generated media is.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 12 * 1024 * 1024;
/** Decoded by sharp, so the extension is never trusted. */
const ALLOWED = new Set(["jpeg", "png", "webp", "avif", "gif"]);

function randomId(): string {
  return `ref_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file'" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Too large: max ${Math.round(MAX_BYTES / 1024 / 1024)}MB` },
      { status: 413 },
    );
  }

  const input = Buffer.from(await file.arrayBuffer());

  // Decode before trusting anything: this both validates that the bytes really
  // are an image and gives us the dimensions the Director needs to place it.
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input).metadata();
  } catch {
    return NextResponse.json({ error: "Not a readable image" }, { status: 415 });
  }
  if (!meta.format || !ALLOWED.has(meta.format) || !meta.width || !meta.height) {
    return NextResponse.json(
      { error: `Unsupported image format${meta.format ? `: ${meta.format}` : ""}` },
      { status: 415 },
    );
  }

  // Normalise to PNG: one format downstream, metadata stripped, and animated
  // sources collapse to their first frame rather than half-rendering later.
  const png = await sharp(input, { animated: false })
    .rotate()
    .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const out = await sharp(png).metadata();

  const id = randomId();
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, `${id}.png`), png);

  return NextResponse.json(
    {
      id,
      url: `/uploads/${id}.png`,
      width: out.width ?? meta.width,
      height: out.height ?? meta.height,
      name: file.name,
    },
    { status: 201 },
  );
}
