/**
 * Resolve target duration for a job from the user brief and/or explicit UI value.
 * The brief wins when it states a length ("5-second", "5s", …).
 */

const DURATION_RE =
  /(?:^|[^\d])(\d{1,2}(?:\.\d+)?)\s*(?:-|–)?\s*(?:second(?:s)?|sec(?:s)?|s)\b/i;
const DURATION_RE_ALT =
  /(?:duration|length|runtime|lasts?|for)\s*(?:of\s*)?(?:about\s*|~|≈)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/i;

export function parseDurationFromPrompt(prompt: string): number | null {
  const text = prompt.trim();
  if (!text) return null;
  const m = text.match(DURATION_RE) || text.match(DURATION_RE_ALT);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Allowed project length: short heroes (3s) up to 30s. */
export function clampDurationSec(sec: number): number {
  return Math.min(30, Math.max(3, Math.round(sec * 10) / 10));
}

/**
 * Pick duration. User wording in the prompt is law.
 * Explicit body duration is used only when the prompt does not specify one.
 */
export function resolveDurationTargetSec(opts: {
  prompt: string;
  bodyDuration?: unknown;
  fallbackSec?: number;
}): number {
  const fromPrompt = parseDurationFromPrompt(opts.prompt);
  if (fromPrompt != null) return clampDurationSec(fromPrompt);

  const fromBody = Number(opts.bodyDuration);
  if (Number.isFinite(fromBody) && fromBody > 0) return clampDurationSec(fromBody);

  return clampDurationSec(opts.fallbackSec ?? 12);
}
