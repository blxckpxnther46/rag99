"use client";

/**
 * ─────────────────────────────────────────────────────────────
 * @concept Loading & Error UI States
 * ─────────────────────────────────────────────────────────────
 * WHAT THIS FILE IS FOR:
 * Provides distinct, accessible visual feedback for both in-flight
 * and non-happy-path application states across data fetching,
 * vector processing, and error conditions.
 *
 * 1. PROPS & CONDITIONAL STATE SELECTION:
 *    - `status` ("fetching" | "processing" | "error", optional, defaults to "processing"):
 *      Determines the visual state rendered by conditional branching.
 *    - `label` (string, optional):
 *      User-facing status text (e.g., "Fetching document chunks...", "Synthesizing answer...", "Error loading chat").
 *    - `variant` ("Drive" | "Dots" | "Orbit", optional, defaults to "Drive"):
 *      Selects the 3x3 pixel animation matrix geometry.
 *
 * 2. CONDITIONAL RENDERING LOGIC FOR NON-HAPPY-PATH SCENARIOS:
 *    - State 1: "fetching" (Data retrieval in-flight):
 *      * Renders dynamic 3x3 `LoaderGrid` with a sweeping wavefront.
 *      * Shimmering text gradient to show network I/O is active.
 *    - State 2: "processing" (Heavy CPU / AI synthesis):
 *      * Renders `LoaderGrid` accompanied by the `useElapsed()` live timer,
 *        giving real-time feedback so the user knows the long-running LLM
 *        synthesis is actively progressing.
 *    - State 3: "error" (Non-happy-path failure):
 *      * Switches to an alert container with a red warning badge (`#ef4444`).
 *      * Disables the animation matrix and presents clear recovery guidance.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * PIXEL GRID DELAY MATRICES
 * ───────────────────────────────────────────────────────── */

// Delay matrix for chevron wavefront (3x3 grid)
// Offsets: (c + |r - 1|) * 90ms create a rightward-driving chevron
const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

// Clockwise perimeter indices for 'Orbit' circular variant
const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

const PATTERNS: Record<string, { delays: (number | null)[]; dur: number; round: boolean }> = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
};

/**
 * Visual LoaderGrid Component:
 * Iterates through 9 pixel cells. Applies staggered CSS animation delays
 * to produce smooth wavefront motion.
 */
function LoaderGrid({
  delays,
  dur,
  round,
}: {
  delays: (number | null)[];
  dur: number;
  round: boolean;
}) {
  return (
    <span aria-hidden className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]">
      {delays.map((delay, index) => (
        <span
          key={index}
          className={`size-[4px] bg-[#e3e3e3] ${round ? "rounded-full" : "rounded-[1px]"}`}
          style={{
            opacity: delay === null ? 0.07 : 0.15,
            animation: delay === null ? "none" : `pixel-on ${dur}ms ease-in-out ${delay}ms infinite`,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Live Elapsed Timer Hook:
 * Increments deciseconds every 100ms via `setInterval`.
 * Encapsulates cleanup in `useEffect` to guarantee no zombie timers on unmount.
 */
function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, []);
  const total = ds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export interface LoadingStateProps {
  label?: string;
  variant?: string;
  status?: "fetching" | "processing" | "error";
}

/**
 * Main LoadingState Component with Explicit Conditional Rendering:
 */
export default function LoadingState({
  label,
  variant = "Drive",
  status = "processing",
}: LoadingStateProps) {
  const elapsed = useElapsed();
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Drive;

  // CONDITIONAL BRANCH 1: Non-Happy-Path Error State
  if (status === "error") {
    return (
      <div
        role="alert"
        className="flex w-fit items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 border border-red-500/20 text-red-400 text-xs font-medium"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{label || "An unexpected error occurred during processing."}</span>
      </div>
    );
  }

  // CONDITIONAL BRANCH 2: Data Fetching State (e.g., initial network query or document upload)
  if (status === "fetching") {
    return (
      <div role="status" className="flex w-fit items-center gap-2.5">
        <LoaderGrid delays={delays} dur={dur} round={round} />
        <span className="text-xs font-medium text-blue-400/90 animate-pulse">
          {label || "Fetching document chunks..."}
        </span>
      </div>
    );
  }

  // CONDITIONAL BRANCH 3: In-Flight AI Processing State (LLM Synthesis & Vector Search)
  return (
    <div role="status" className="flex w-fit items-center gap-2.5">
      <LoaderGrid delays={delays} dur={dur} round={round} />
      <span
        className="bg-clip-text text-[13px] font-medium text-transparent"
        style={{
          backgroundImage: "linear-gradient(90deg, #80868b 35%, #e3e3e3 50%, #80868b 65%)",
          backgroundSize: "200% 100%",
          animation: "shimmer-text 1.4s linear infinite",
        }}
      >
        {label || "Processing"}
      </span>
      <span className="font-mono text-[12px] text-slate-500 tabular-nums">{elapsed}</span>
    </div>
  );
}
