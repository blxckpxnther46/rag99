"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * THINKING STATE — expandable agent trace from beautifului.dev
 * Fully customized for rag99 RAG execution steps
 * ───────────────────────────────────────────────────────── */

const STAGES = [800, 800, 1500, 1000, 1000];

function useSequence(steps: number[]) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= steps.length - 1) return;
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
                  "linear-gradient(90deg, #80868b 35%, #e3e3e3 50%, #80868b 65%)",
                backgroundSize: "200% 100%",
                animation: "shimmer-text 1.4s linear infinite",
              }}
            >
              {v.active}
            </span>
          ) : (
            <span
              className="text-[13px] font-semibold whitespace-nowrap text-[#60a5fa]"
              style={{ animation: "fade-in 350ms ease-out both" }}
            >
              {v.done}
            </span>
          )}
        </span>
        <svg
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#80868b" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="transition-transform duration-300 ml-1"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* expandable trace */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-400"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-[5px] pl-4">
            <span
              aria-hidden
              className="absolute left-[3px] w-px bg-white/5"
              style={{ 
                top: -8, 
                height: lineHeight ? lineHeight - 2 : 0, 
                transition: "height 500ms cubic-bezier(0.23,1,0.32,1)" 
              }}
            />
            <div ref={traceRef} className="flex flex-col gap-1 py-1">
              {v.rows.slice(0, visible).map((row, i) => {
                const isLastAndWorking = i === visible - 1 && working;
                const content = (
                  <>
                    {i < visible - 1 || !working ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <span className="size-3 shrink-0 rounded-full border-[1.5px] border-white/10 border-t-[#60a5fa]" style={{ animation: "spin 700ms linear infinite" }} />
                    )}
                    <span className={`min-w-0 truncate text-[12px] ${isLastAndWorking ? "font-semibold text-white" : "text-slate-400"}`}>
                      {row.primary}
                    </span>
                    {row.secondary && (
                      <span className="shrink-0 text-[11px] text-slate-500 font-mono">
                        {row.secondary}
                      </span>
                    )}
                  </>
                );
                
                return (
                  <div 
                    key={row.primary} 
                    className="flex min-h-7 w-full items-center gap-2.5 rounded-lg px-2 py-0.5 text-left"
                    style={{ animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 120}ms both` }}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
