/**
 * The Kinetta mark: a cyan-to-blue tile with a soft glow.
 *
 * Lifted out of the landing page so the studio can wear the same badge — a
 * visitor who presses "Start creating" should not feel handed to a different
 * product. The landing still carries its own copy of this; it is a lane the
 * other side of the split owns, so it adopts this when it next moves rather
 * than being edited from here.
 */
export function Mark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative grid place-items-center rounded-[10px] bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_0_24px_-4px_rgba(34,211,238,0.7)] ${className}`}
    >
      <span className="h-1/2 w-1/2 rounded-full bg-white/90" />
    </span>
  );
}
