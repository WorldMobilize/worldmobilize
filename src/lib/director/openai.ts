import OpenAI from "openai";

/**
 * A user turn is either plain text or text plus images. Reference images ride
 * in as data URLs rather than links, so the model never has to reach back into
 * a server that is only listening on localhost.
 */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
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
  // Only a user turn may carry image parts; system and assistant stay text, so
  // the union is narrowed per role rather than cast wholesale.
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: args.system },
    ...args.messages.map((m): OpenAI.Chat.ChatCompletionMessageParam => {
      if (m.role === "user") {
        return typeof m.content === "string"
          ? { role: "user", content: m.content }
          : { role: "user", content: m.content as OpenAI.Chat.ChatCompletionContentPart[] };
      }
      const text = typeof m.content === "string" ? m.content : "";
      return m.role === "system" ? { role: "system", content: text } : { role: "assistant", content: text };
    }),
  ];

  const completion = await client.chat.completions.create({
    model: args.model,
    response_format: { type: "json_object" },
    messages,
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
