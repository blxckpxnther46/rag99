"use client";

/**
 * ─────────────────────────────────────────────────────────────
 * @concept Loading & Error UI States
 * ─────────────────────────────────────────────────────────────
 * Visual Representation of In-Flight & Non-Happy-Path States:
 *
 * 1. PROPS THAT DETERMINE DISPLAY:
 *    - `label` (string, optional, defaults to "Processing"):
 *      Specifies the active operational text (e.g., "Uploading...", "Processing",
 *      "Vectorizing document...", or "Error connecting").
 *    - `variant` (string, optional, defaults to "Drive"):
 *      Selects the geometric matrix animation ("Drive", "Dots", "Orbit").
 *
 * 2. VISUAL REPRESENTATION OF NON-HAPPY-PATH & IN-FLIGHT STATES:
 *    - Active / In-Flight Processing:
 *      * Rendered via `LoaderGrid`: A 3x3 pixel matrix pulsing through a staggered
 *        delay array (delays 0ms to 270ms) causing a sweeping wavefront animation.
 *      * Text Shimmer Effect: The `label` uses a CSS linear gradient (90deg, #80868b -> #e3e3e3)
 *        with `background-size: 200%` and keyframe `shimmer-text` to indicate ongoing activity.
 *      * Live Elapsed Timer: `useElapsed` counts tenths of a second (100ms interval)
 *        giving real-time feedback so the user knows the request is not frozen.
 *    - Error / Failure Representation:
 *      * If a non-happy-path failure occurs, the parent container can pass an error `label`
 *        (e.g., label="Upload failed") or conditionally render the error boundary.
 *      * In the application chat view (`chats/[chatId]/page.tsx`), network or server errors
 *        transition the UI from this `LoadingState` to an error banner styled with
 *        `bg-red-500/10 text-red-400 border border-red-500/20` displaying the exact error message.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * LOADING STATE — pixel-grid loader from beautifului.dev
 *
 * Variants:
 *   Drive  — square cells, chevron wavefront driving right
 *   Dots   — same wavefront, circular cells
 *   Orbit  — a comet lapping the grid perimeter
 * ───────────────────────────────────────────────────────── */

// Line-by-line logic: Precomputed delay matrix for chevron wavefront (3x3 grid)
// Row r (0..2), Col c (0..2) calculates staggered millisecond offsets: (c + |r - 1|) * 90ms
const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

// Line-by-line logic: Clockwise perimeter indices for 'Orbit' circular variant
const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

// Internal logic: Mapping variant prop to delay timings, total cycle duration, and border-radius
const PATTERNS: Record<string, { delays: (number | null)[]; dur: number; round: boolean }> = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
};

/**
 * Visual Renderer: Renders 9 individual pixel cells in a CSS Grid (3 cols x 4px).
 * Inactive cells have 0.07 opacity; active cells cycle opacity using CSS animation `pixel-on`.
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
          // Dynamic styling: round ? rounded-full (Dots) : rounded-[1px] (Drive/Orbit)
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
 * Internal Timer Hook:
 * - Starts a 100ms interval timer on mount.
 * - Manages clean lifecycle via useEffect cleanup `clearInterval(t)` to avoid memory leaks.
 * - Formats elapsed duration into `X.Ys` or `Xm Y.Ys` for tabular presentation.
 */
function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    // 100ms interval fires on macrotask queue to update elapsed deciseconds
    const t = setInterval(() => setDs((d) => d + 1), 100);
    // Cleanup callback executed on unmount prevents memory leaks and zombie timers
    return () => clearInterval(t);
  }, []);
  const total = ds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

/**
 * Main LoadingState Component:
 * Evaluates `label` and `variant` props to visually render current progress state.
 */
export default function LoadingState({
  label = "Processing",
  variant = "Drive",
}: {
  label?: string;
  variant?: string;
}) {
  // Internal hook calculates dynamic live seconds
  const elapsed = useElapsed();
  // Safe lookup: falls back to PATTERNS.Drive if unknown variant passed
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Drive;

  return (
    // role="status" provides accessibility (ARIA) for screen readers
    <div role="status" className="flex w-fit items-center gap-2.5">
      {/* 3x3 Animated Matrix */}
      <LoaderGrid delays={delays} dur={dur} round={round} />
      {/* Shimmering Text displaying the status label */}
      <span
        className="bg-clip-text text-[13px] font-medium text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #80868b 35%, #e3e3e3 50%, #80868b 65%)",
          backgroundSize: "200% 100%",
          animation: "shimmer-text 1.4s linear infinite",
        }}
      >
        {label}
      </span>
      {/* Numeric live timer */}
      <span className="font-mono text-[12px] text-slate-500 tabular-nums">{elapsed}</span>
    </div>
  );
}
