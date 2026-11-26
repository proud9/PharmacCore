"use client";

import { Pause, Play } from "lucide-react";

/** Pause / play control for a guide animation. Hidden when the visitor prefers reduced motion. */
export function PlayToggle({ playing, reduced, onToggle }: { playing: boolean; reduced: boolean; onToggle: () => void }) {
  if (reduced) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-pine-700 transition hover:bg-sage-100"
      aria-label={playing ? "Pause the animation" : "Play the animation"}
    >
      {playing ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
      {playing ? "Pause" : "Play"}
    </button>
  );
}
