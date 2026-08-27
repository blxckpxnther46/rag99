import React from "react";

/**
 * Replaced filters with null as the liquid glass effect has been completely removed.
 */
export function LiquidGlassFilters() {
  return (
    <svg className="fixed pointer-events-none w-0 h-0" style={{ visibility: "hidden" }}>
      <defs>
        <filter id="rag-liquid-glass">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.03" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="rag-liquid-glass-soft">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.04" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

interface GlassProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

/**
 * High-quality, standard glassmorphic panel.
 */
export function LiquidGlassPanel({ children, className = "", style = {}, ...props }: GlassProps) {
  return (
    <div 
      className={`relative ${className}`}
      style={{
        backgroundColor: "rgba(8, 10, 14, 0.55)",
        backdropFilter: "blur(24px) saturate(125%)",
        WebkitBackdropFilter: "blur(24px) saturate(125%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "inset 2px 2px 0 -2px rgba(255,255,255,0.40), inset 0 0 3px 1px rgba(255,255,255,0.25)",
        ...style
      }}
      {...props}
    >
      <div className="relative z-10 w-full h-full flex flex-col">{children}</div>
    </div>
  );
}

interface ButtonProps extends GlassProps {
  active?: boolean;
}

/**
 * Clean, standard glassmorphic button.
 */
export function LiquidGlassButton({ children, className = "", style = {}, active = false, ...props }: ButtonProps) {
  return (
    <button 
      className={`relative overflow-hidden transition-all duration-150 border ${
        active 
          ? "bg-white/[0.075] border-white/[0.09] text-white shadow-sm" 
          : "bg-white/[0.025] border-white/[0.055] text-zinc-300 hover:bg-white/[0.05] hover:border-white/[0.07] hover:text-white active:bg-white/[0.07] active:border-white/[0.09]"
      } ${className}`}
      style={{
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: active ? "inset 1px 1px 0 rgba(255,255,255,0.15)" : "none",
        ...style
      }}
      {...props}
    >
      <div className="relative z-10 flex items-center justify-center gap-2.5 w-full h-full">{children}</div>
    </button>
  );
}

/**
 * Standard glassmorphic input wrapper.
 */
export function LiquidGlassWrapper({ children, className = "", style = {}, ...props }: GlassProps) {
  return (
    <div 
      className={`relative flex items-center bg-white/[0.02] border border-white/[0.055] transition-all duration-150 focus-within:border-white/[0.12] hover:border-white/[0.08] ${className}`}
      style={{
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        ...style
      }}
      {...props}
    >
      <div className="relative z-10 flex items-center w-full h-full">{children}</div>
    </div>
  );
}

/**
 * Translucent status badge.
 */
export function LiquidGlassBadge({ children, className = "", style = {}, ...props }: GlassProps) {
  return (
    <span 
      className={`inline-flex items-center justify-center font-mono font-semibold tracking-wider uppercase shrink-0 transition-all ${className}`}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "inset 1px 1px 0 -1px rgba(255,255,255,0.2)",
        ...style
      }}
      {...props}
    >
      {children}
    </span>
  );
}
