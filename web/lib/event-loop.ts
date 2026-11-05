/**
 * ─────────────────────────────────────────────────────────────
 * @concept JavaScript — Event loop
 * ─────────────────────────────────────────────────────────────
 * FRONTEND EVENT LOOP UTILITY:
 * Explains and coordinates:
 * - Call Stack: Synchronous execution frame
 * - Microtask Queue: Highest priority queue (Promise.resolve, queueMicrotask)
 * - Macrotask Queue: Timer callbacks (setTimeout, setInterval)
 * ─────────────────────────────────────────────────────────────
 */

export function runMicrotask(callback: () => void): void {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
  } else {
    Promise.resolve().then(callback);
  }
}

export function runMacrotask(callback: () => void, delayMs = 0): () => void {
  const timer = setTimeout(callback, delayMs);
  return () => clearTimeout(timer);
}
