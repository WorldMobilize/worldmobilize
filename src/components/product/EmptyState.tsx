"use client";

/**
 * The first screen anyone arriving from the landing page sees.
 *
 * It replaced a 700px empty rectangle reading "Genera un video per iniziare",
 * which taught nothing and set no expectations. Two jobs here: say what the
 * thing does in one line, and hand over a brief worth pressing the button on —
 * writing a good one from a blank textarea is the hard part, not the waiting.
 */

export type Example = {
  label: string;
  hint: string;
  prompt: string;
};

export const EXAMPLES: Example[] = [
  {
    label: "Lancio prodotto",
    hint: "5 scene · 18s · 16:9",
    prompt: `Scene 1 (0–3s): the product name lands over a dark premium background, a soft glow behind it.

Scene 2 (3–8s): three feature cards fly in and stack, each with a short label and a number counting up.

Scene 3 (8–13s): a browser mockup shows the product in use, cursor moving, one highlighted detail.

Scene 4 (13–18s): logo and tagline, slow glow pulse.

Camera: gentle push-ins, premium tech feel.`,
  },
  {
    label: "Numeri e risultati",
    hint: "4 scene · 15s · 16:9",
    prompt: `15-second data video, dark editorial style.

Scene 1 (0–4s): headline "The numbers behind the launch" over a subtle grid.

Scene 2 (4–9s): a line chart draws itself, a KPI tile counts to 128% beside it.

Scene 3 (9–13s): three metric cards appear in sequence: revenue, retention, referrals.

Scene 4 (13–15s): closing logo with the tagline.`,
  },
  {
    label: "Storia per social",
    hint: "4 scene · 12s · 9:16",
    prompt: `12-second vertical 9:16 video for social, bold and fast.

Scene 1 (0–3s): a big question lands centre screen, hard cut in.

Scene 2 (3–7s): a phone mockup shows a chat, the answer typing itself out.

Scene 3 (7–10s): four brand chips pop into a grid.

Scene 4 (10–12s): logo, tagline, quick glow.

Camera: whip pans between scenes.`,
  },
];

export function EmptyState({ onPick }: { onPick: (example: Example) => void }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8">
      <h2 className="text-lg font-medium text-zinc-100">Descrivi un video, lo giro io</h2>
      <p className="mt-2 max-w-xl text-sm text-zinc-400">
        Scrivi le scene come le racconteresti a un montatore. Ottieni un MP4 completo, con
        animazioni e voce, in tre-cinque minuti. Puoi poi ritoccare le singole scene e
        rigenerare solo quelle.
      </p>

      <p className="mt-7 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Oppure parti da qui
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => onPick(ex)}
            className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            <span className="block text-sm text-zinc-200">{ex.label}</span>
            <span className="mt-0.5 block text-xs text-zinc-500">{ex.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
