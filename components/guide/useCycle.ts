"use client";

import { useEffect, useState } from "react";

/** True when the visitor asked their system for less motion. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Steps through `count` items every `ms`, for the guide's animated diagrams. Stops while hovered
 * or paused, never runs under reduced motion, and choosing an item by hand pauses it there.
 */
export function useCycle(count: number, ms = 2600) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!playing || hovered || reduced || count < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ms);
    return () => clearInterval(timer);
  }, [playing, hovered, reduced, count, ms]);

  useEffect(() => {
    setIndex((i) => (i >= count ? 0 : i));
  }, [count]);

  return {
    index,
    reduced,
    playing: playing && !reduced,
    choose: (i: number) => {
      setIndex(i);
      setPlaying(false);
    },
    toggle: () => setPlaying((p) => !p),
    hover: { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) },
  };
}
