"use client";

import { useEffect, useState } from "react";
import type { CitationType } from "../lib/types";

/* ─────────────────────────────────────────────────────────
 * CONTEXT CARDS — retrieved chunks display from beautifului.dev
 * Displays the exact matched text snippets for each reference.
 * ───────────────────────────────────────────────────────── */

export default function ContextCards({ chunks }: { chunks: CitationType[] }) {
  const [chipsShown, setChipsShown] = useState(false);

  useEffect(() => {
    const chips = setTimeout(() => setChipsShown(true), 400);
    return () => clearTimeout(chips);
  }, []);

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        className="flex items-center gap-2 px-0.5"
        style={{ animation: "fade-in 400ms ease-out both" }}
      >
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Retrieved Evidence Chunks</span>
        <span className="inline-flex h-5 items-center rounded-md bg-blue-950/20 border border-[#2563eb]/20 px-1.5 text-[11px] font-mono font-semibold text-[#60a5fa] tabular-nums">
          {chunks.length}
        </span>
      </div>

      {chunks.map((chunk, i) => {
        const charCount = chunk.content ? `${chunk.content.length.toLocaleString()} characters` : "0 characters";
        const fileExt = chunk.source.split(".").pop()?.toUpperCase() || "TXT";
        
        // Colors based on file types
        let badgeColor = "bg-[#d97706]"; // orange
        if (fileExt === "PDF") badgeColor = "bg-[#dc2626]"; // red
        if (fileExt === "DOCX") badgeColor = "bg-[#2563eb]"; // blue
        if (fileExt === "TXT" || fileExt === "MD") badgeColor = "bg-[#16a34a]"; // green

        return (
          <div
            key={`${chunk.source}-${chunk.chunk}-${i}`}
            className="overflow-hidden rounded-xl bg-[#11131A]/60 border border-white/5 shadow-md"
            style={{
              animation: `fade-up 400ms cubic-bezier(0.23,1,0.32,1) ${i * 100}ms both`,
            }}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-white/5 bg-[#1a1c24]/30 px-3.5 py-2.5">
              <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-white">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[#60a5fa]">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                <span className="truncate">{chunk.source}</span>
              </span>
              <span className="shrink-0 text-[11px] text-slate-500 font-mono tabular-nums">
                {charCount} (chunk {chunk.chunk})
              </span>
            </div>

            {/* Chunk text content */}
            <p className="px-3.5 pt-3 pb-2 text-[12.5px] leading-relaxed text-slate-300 font-normal">
              {chunk.content || "No evidence snippet text parsed."}
            </p>

            {/* Metadata source pill */}
            <div className="px-3.5 pb-3">
              <span
                className="inline-flex h-6 items-center gap-1.5 rounded-full bg-blue-950/20 border border-[#2563eb]/20 px-2.5
                  text-[11px] font-semibold text-[#60a5fa] transition-colors duration-350 hover:bg-blue-950/40 cursor-pointer"
                style={{
                  opacity: chipsShown ? 1 : 0,
                  transform: chipsShown ? "scale(1)" : "scale(0.95)",
                  transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                  transitionDelay: `${i * 80}ms`,
                  transitionProperty: "all",
                }}
              >
                <span className={`flex h-4.5 items-center justify-center rounded-[4px] px-1 text-[8px] font-bold text-white ${badgeColor}`}>
                  {fileExt}
                </span>
                <span>chunk {chunk.chunk}</span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
