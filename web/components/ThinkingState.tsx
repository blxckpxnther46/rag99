"use client";

/**
 * ─────────────────────────────────────────────────────────────
 * CONCEPTS IMPLEMENTED IN THIS FILE:
 * @concept JavaScript — Hoisting (Compilation vs Execution phase, TDZ on const STAGES)
 * @concept JavaScript — Event loop (Frontend timer macrotask scheduling via setTimeout)
 * @concept JavaScript — Closures (Captured setStage in timer callback)
 * @concept Multi-step Agent (Sequential UI state trace & milestone progression)
 * ─────────────────────────────────────────────────────────────
 * WHAT THIS FILE IS FOR:
 * Displays an animated, expandable multi-step thinking indicator
 * while the backend RAG pipeline processes vectorization, retrieval,
 * and LLM synthesis.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import EventLoopStatus from "./EventLoopStatus";

/* ─────────────────────────────────────────────────────────
 * THINKING STATE — expandable agent trace from beautifului.dev
 * Fully customized for rag99 RAG execution steps
 * ───────────────────────────────────────────────────────── */

/**
 * ─────────────────────────────────────────────────────────────
 * @concept JavaScript — Hoisting & Temporal Dead Zone (TDZ)
 * ─────────────────────────────────────────────────────────────
 * Scoping and Declaration Mechanics:
 * 1. `var`:
 *    - Hoisted to top of function/global scope during compilation/creation phase.
 *    - Initialized automatically with `undefined`.
 *    - If accessed before declaration, it yields `undefined` without throwing an error.
 * 2. `let` and `const`:
 *    - Hoisted to top of enclosing block during compilation phase.
 *    - NOT initialized with any default value.
 *    - The variable remains in the "Temporal Dead Zone" (TDZ) from the beginning
 *      of the block until the evaluation of the declaration line.
 *    - If accessed before initialization, JavaScript engine throws:
 *      `ReferenceError: Cannot access 'STAGES' before initialization`.
 * 3. Function Declarations:
 *    - `function useSequence(...)`: Hoisted completely with its implementation body,
 *      so it can be invoked anywhere in the enclosing scope.
 */
// 'const STAGES' is block-scoped in module and resides in TDZ until this line runs.
const STAGES = [800, 800, 1500, 1000, 1000];

/**
 * ─────────────────────────────────────────────────────────────
 * @concept JavaScript — Event loop
 * ─────────────────────────────────────────────────────────────
 * Frontend JavaScript Event Loop Execution:
 * Orchestrates synchronous Call Stack execution, high-priority
 * Microtask Queue processing, and Macrotask (Task Queue) timers:
 * 1. Call Stack: Synchronous stage validation and state assertion.
 * 2. Microtask Queue: `queueMicrotask` and `Promise.resolve().then(...)`
 *    execute immediately when the Call Stack empties, prior to paint.
 * 3. Macrotask Queue: `setTimeout` pushes timer callbacks to the Task Queue,
 *    processed on subsequent turns of the browser event loop.
 * ─────────────────────────────────────────────────────────────
 */
export function scheduleEventLoopStage(
  onMicrotask: () => void,
  onMacrotask: () => void,
  delayMs: number
): () => void {
  // Step 1: Call Stack — synchronous execution
  let active = true;

  // Step 2: Microtask Queue — executes before browser paint
  queueMicrotask(() => {
    if (active) onMicrotask();
  });

  // Step 3: Macrotask Queue — schedules timer on Task Queue
  const timer = setTimeout(() => {
    if (active) onMacrotask();
  }, delayMs);

  return () => {
    active = false;
    clearTimeout(timer);
  };
}

/**
 * ─────────────────────────────────────────────────────────────
 * @concept JavaScript — Closures
 * ─────────────────────────────────────────────────────────────
 * Scoping & Closure Encapsulation:
 * - Function declaration `useSequence` is hoisted to the top of its scope.
 * - Closures: The timer callback retains a live closure over `setStage`, and the
 *   functional state updater `(s) => s + 1` accesses the latest stage without stale closure bugs.
 * ─────────────────────────────────────────────────────────────
 */
function useSequence(steps: number[]) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= steps.length - 1) return;
    // Macrotask queue: schedules next step timer
    const t = setTimeout(() => setStage((s) => s + 1), steps[stage]);
    // Effect cleanup: cancels pending timer if component unmounts or deps change
    return () => clearTimeout(t);
  }, [stage, steps]);
  return stage;
}

type Row = {
  primary: string;
  secondary?: string;
  mono?: boolean;
};

/**
 * ─────────────────────────────────────────────────────────────
 * @concept Multi-step Agent vs Sequential UI State & Injection Defense
 * ─────────────────────────────────────────────────────────────
 * 1. Front-end Immutability:
 *    - `VARIANTS.Steps.rows` is a static, immutable TypeScript object compiled
 *      into the client-side JavaScript bundle on Vercel.
 *    - An external attacker cannot tamper with this client-side step progression
 *      because it does not accept external network input.
 * 2. Backend Security & False Evidence Ingestion:
 *    - Real multi-step agent flow happens on the backend:
 *      Step 1: Embedding generation via client pool.
 *      Step 2: Vector retrieval using pgvector cosine distance `<=>`.
 *      Step 3: Prompt assembly with sanitized inputs and isolated delimiters.
 *      Step 4: LLM synthesis with JSON response parsing.
 *    - In Step 3 ("Retrieving semantic evidence"): An attacker attempting to inject
 *      malicious instructions via an uploaded document (Indirect Prompt Injection)
 *      is neutralized because:
 *      a) Document chunks are wrapped in rigid delimiters (`Evidence: [1] file, chunk N: ...`).
 *      b) System instructions explicitly forbid executing code or following commands inside chunks.
 *      c) User input is passed through `sanitizePrompt()` in `sanitization.ts`.
 * ─────────────────────────────────────────────────────────────
 */
const VARIANTS: Record<
  string,
  { active: string; done: string; rows: Row[] }
> = {
  Steps: {
    active: "Thinking",
    done: "Thought completed",
    rows: [
      { primary: "Vectorizing search query..." },
      { primary: "Querying pgvector document database..." },
      { primary: "Retrieving semantic evidence..." },
      { primary: "Synthesizing answer from sources..." },
    ],
  },
};

export default function ThinkingState({ onSettled }: { onSettled?: () => void }) {
  const stage = useSequence(STAGES);
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  
  const v = VARIANTS.Steps;
  const autoExpanded = stage >= 1 && stage < 4;
  const expanded = manualExpanded ?? autoExpanded;
  const working = stage < 4;
  const visible = stage < 1 ? 0 : stage === 1 ? 2 : stage === 2 ? 3 : v.rows.length;
  
  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useLayoutEffect(() => {
    if (traceRef.current) {
      setLineHeight(traceRef.current.offsetHeight);
    }
  }, [visible, expanded, stage]);

  const settledRef = useRef(false);
  useEffect(() => {
    if (working || settledRef.current) return;
    settledRef.current = true;
    onSettled?.();
  }, [working, onSettled]);

  return (
    <div
      className="flex w-full max-w-sm flex-col"
      style={{
        minHeight: working || expanded ? 150 : undefined,
        transition: "min-height 400ms cubic-bezier(0.23,1,0.32,1)",
      }}
    >
      {/* header */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? autoExpanded))}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-lg px-2.5 py-1.5
          transition-colors duration-100 hover:bg-white/5 text-left outline-none"
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill={working ? "#60a5fa" : "#80868b"}
          className={working ? "animate-pulse" : ""}
        >
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
        <span role="status" className="contents">
          {working ? (
            <span
              className="bg-clip-text text-[13px] font-semibold whitespace-nowrap text-transparent"
              style={{
                backgroundImage:
                  "radial-gradient(circle 60px at 0% 0%, #60a5fa, #80868b)",
              }}
            >
              {v.active}
            </span>
          ) : (
            <span className="text-[13px] font-semibold whitespace-nowrap text-white/50">
              {v.done}
            </span>
          )}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* rows */}
      {expanded && (
        <div className="relative mt-2 pl-4">
          <div
            className="absolute left-1.5 top-2 w-[1px] bg-slate-800 transition-all duration-300"
            style={{ height: lineHeight ? `${lineHeight - 16}px` : "0px" }}
          />
          <div ref={traceRef} className="space-y-3">
            {v.rows.slice(0, visible).map((row, idx) => {
              const isCurrent = idx === visible - 1 && working;
              return (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500/80" />
                  <div className="flex flex-col">
                    <span className={isCurrent ? "text-blue-300 font-medium" : "text-slate-400"}>
                      {row.primary}
                    </span>
                    {row.secondary && (
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {row.secondary}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* JavaScript — Event loop frontend status monitor */}
      <EventLoopStatus />
    </div>
  );
}
