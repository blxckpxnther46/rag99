import React from "react";

export function Logo({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="60%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      
      {/* Outer retrieval/loop dotted line */}
      <path
        d="M16 3C8.82 3 3 8.82 3 16C3 23.18 8.82 29 16 29C23.18 29 29 23.18 29 16"
        stroke="url(#logo-grad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 2"
        className="opacity-40"
      />
      
      {/* Layered data structure / Nested Loop */}
      <path
        d="M16 7C11.03 7 7 11.03 7 16C7 20.97 11.03 25 16 25C20.97 25 25 20.97 25 16C25 11.03 20.97 7 16 7Z"
        fill="url(#logo-grad)"
        fillOpacity="0.15"
        stroke="url(#logo-grad)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      
      {/* Connected retrieval node path (representing 99 / RAG) */}
      <path
        d="M13 13C13 11.34 14.34 10 16 10C17.66 10 19 11.34 19 13C19 14.66 17.66 16 16 16C14.34 16 13 17.34 13 19"
        stroke="#60a5fa"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="22" r="1.5" fill="#e3e3e3" />
    </svg>
  );
}
