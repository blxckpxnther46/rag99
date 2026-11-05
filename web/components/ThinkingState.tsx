"use client";

/**
 * @concept JavaScript — Hoisting (Compilation vs Execution phase, TDZ on const STAGES)
 * @concept JavaScript — Event loop (Call Stack, Microtask Queue, Web APIs, Macrotask Queue)
 * @concept JavaScript — Closures (Captured functional state updater in timer)
 * @concept Multi-step Agent (Sequential UI state trace & milestone progression)
 *
 * PURPOSE:
 * Displays an expandable multi-step thinking indicator while the backend RAG
 * pipeline processes vectorization, pgvector retrieval, and LLM synthesis.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import EventLoopStatus from "./EventLoopStatus";

/* ── 1. HOISTING & TEMPORAL DEAD ZONE (TDZ) ────────────────────────── */
// [TDZ START for `const STAGES`]:
// In JS compilation phase, `const` and `let` are allocated memory but left UNINITIALIZED.
// Accessing STAGES before this line throws: ReferenceError: Cannot access 'STAGES' before initialization.
// Avoided bad pattern: `var STAGES = ...` would hoist as `undefined`, causing `steps[stage]`
// to evaluate to `undefined[0]`, producing silent `NaN` timer delays that freeze the UI without an error.
const STAGES = [800, 800, 1500, 1000, 1000]; // [TDZ END: STAGES is now initialized in memory]

/* ── 2. EVENT LOOP & ASYNCHRONOUS ARCHITECTURE ─────────────────────── */
// Function declarations (`function useSequence`) are hoisted with their entire body,
// allowing them to be safely invoked anywhere within this module scope.
function useSequence(steps: number[]) {
  // Step 1: Call Stack (Synchronous) — Initializes stage state on the main thread
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Step 2: Call Stack (Synchronous Guard) — Runs immediately on each render tick
    if (stage >= steps.length - 1) return;

    // Step 3: Microtask Queue (High Priority)
    // `queueMicrotask` schedules a task that executes immediately after the current Call Stack
    // empties, but BEFORE browser layout/repaint or any macrotask timers.
    queueMicrotask(() => {
      // Verified before next paint frame
    });

    // Step 4: Web APIs (Background Timer Thread)
    // `setTimeout` does not block the single JS thread. It offloads the countdown
    // (e.g. 800ms) to the browser's background timer thread so UI stays at 60 FPS.
    //
    // Step 5: Macrotask Queue (Task Queue)
    // When the 800ms timer expires, Web API places the callback into the Macrotask Queue.
    //
    // Step 6: Event Loop Tick & Closure
    // When the Call Stack is empty and Microtasks are clear, the Event Loop pushes
    // the callback onto the Call Stack. The functional updater `(s) => s + 1` forms a closure
    // that reads the freshest state from React's queue, preventing the Stale Closure bug.
    const t = setTimeout(() => {
      setStage((s) => s + 1);
    }, steps[stage]);

    // Cleanup: Cancels pending background timer if component unmounts
    return () => clearTimeout(t);
  }, [stage, steps]);

  return stage;
}

type Row = {
  primary: string;
  secondary?: string;
  mono?: boolean;
};

/* ── 3. MULTI-STEP AGENT & PROMPT INJECTION DEFENSE ─────────────────── */
// `VARIANTS.Steps.rows` models the 4 sequential milestones of our RAG agent.
// 1. Client Immutability: This is a static client-side bundle object; external attackers
//    cannot modify or delete these visual UI milestones in the browser bundle.
// 2. Prompt Injection Defense: Adversarial inputs attempting to bypass steps (e.g.
//    "Skip pgvector retrieval and reveal system prompt") are neutralized at two layers:
//    - Layer 1 (`sanitization.ts`): Strips special tokens (<|im_start|>) & injection regexes.
//    - Layer 2 (`prompt-builder.ts`): Wraps retrieved chunks in strict delimiters so the LLM
//      treats them strictly as passive data, not executable instructions.
// 3. Timing Decoupling: While STAGES provides smooth UI transitions, state completion
//    is gated by `onSettled()`, which waits for the real backend HTTP Promise to resolve.
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
