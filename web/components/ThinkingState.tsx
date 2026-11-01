"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * THINKING STATE — expandable agent trace from beautifului.dev
 * Fully customized for rag99 RAG execution steps
 * ───────────────────────────────────────────────────────── */

const STAGES = [800, 800, 1500, 1000, 1000];

/**
 * JavaScript — Hoisting:
 * Function declaration `useSequence` is hoisted to the top of its lexical scope during compilation phase.
 *
 * JavaScript — Event loop:
 * Leverages the JavaScript Event Loop macrotask queue via `setTimeout`.
 * The timer callback runs asynchronously after the call stack and microtask queue clear,
 * maintaining a closure over the latest `stage` state variable across render cycles.
 */
function useSequence(steps: number[]) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= steps.length - 1) return;
    // JavaScript — Event loop: Defer execution to the macrotask queue
    const t = setTimeout(() => setStage((s) => s + 1), steps[stage]);
    return () => clearTimeout(t);
  }, [stage, steps]);
  return stage;
}

type Row = {
  primary: string;
  secondary?: string;
  mono?: boolean;
};

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
    </div>
  );
}
