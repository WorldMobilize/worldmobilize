import OpenAI from "openai";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function requireApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is missing.");
  return key;
}

export function brainModel(): string {
  return (
    process.env.DIRECTOR_BRAIN_MODEL?.trim() ||
    process.env.DIRECTOR_MODEL?.trim() ||
    "gpt-5.5"
  );
}

export function armModel(): string {
  return process.env.DIRECTOR_ARM_MODEL?.trim() || "gpt-4o-mini";
}

/** When false/0/off (default), skip parallel arms — brain executes the full MotionProject alone. */
export function armsEnabled(): boolean {
  const v = process.env.DIRECTOR_ARMS_ENABLED?.trim().toLowerCase();
  if (v === undefined || v === "") return false;
  return !(v === "0" || v === "false" || v === "off" || v === "no");
}

export async function callOpenAIJson(args: {
  model: string;
  system: string;
  messages: ChatMessage[];
  label?: string;
}): Promise<unknown> {
  const client = new OpenAI({ apiKey: requireApiKey() });
  const label = args.label ?? args.model;
  console.warn(`[director] calling OpenAI model=${args.model} label=${label}`);
  const completion = await client.chat.completions.create({
    model: args.model,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: args.system }, ...args.messages],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error(`OpenAI (${label}) returned an empty response.`);
  return JSON.parse(content) as unknown;
}

export async function persistJson(
  jobId: string,
  filename: string,
  raw: unknown,
): Promise<void> {
  try {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const { jobDir } = await import("@/lib/motion/assets");
    await mkdir(jobDir(jobId), { recursive: true });
    await writeFile(`${jobDir(jobId)}/${filename}`, JSON.stringify(raw, null, 2), "utf8");
  } catch {
    /* diagnostics only */
  }
}
