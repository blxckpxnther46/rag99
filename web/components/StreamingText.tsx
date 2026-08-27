"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

/* ─────────────────────────────────────────────────────────
 * STREAMING TEXT — simulated word-reveal wrapper from beautifului.dev
 * Incrementally reveals content character-by-character to simulate streaming,
 * while maintaining complete markdown block layout formatting.
 * ───────────────────────────────────────────────────────── */

export default function StreamingText({
  content,
  speed = 10,
  onComplete,
  components,
}: {
  content: string;
  speed?: number;
  onComplete?: () => void;
  components?: any;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Reset if content changes
    setDisplayedText("");
    setCurrentIndex(0);
  }, [content]);

  useEffect(() => {
    if (currentIndex >= content.length) {
      onComplete?.();
      return;
    }

    // Adjust step size to control typing speed nicely
    const step = content.charAt(currentIndex) === " " ? 2 : 4;
    const timer = setTimeout(() => {
      const nextIndex = Math.min(content.length, currentIndex + step);
      setDisplayedText(content.substring(0, nextIndex));
      setCurrentIndex(nextIndex);
    }, speed);

    return () => clearTimeout(timer);
  }, [content, currentIndex, speed, onComplete]);

  // Preprocess links for inline citations
  const preprocessed = displayedText.replace(/\[(\d+)\]/g, (match, num) => `[📄 ${num}](cite:${num})`);
  const isDone = currentIndex >= content.length;

  return (
    <div className="relative">
      <ReactMarkdown components={components}>
        {preprocessed}
      </ReactMarkdown>
      {!isDone && (
        <span
          className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 rounded-full bg-[#60a5fa] animate-pulse"
          style={{ animation: "fade-in 150ms ease-out both" }}
        />
      )}
    </div>
  );
}
