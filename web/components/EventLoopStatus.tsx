"use client";

/**
 * ─────────────────────────────────────────────────────────────
 * @concept JavaScript — Event loop
 * ─────────────────────────────────────────────────────────────
 * FRONTEND JAVASCRIPT EVENT LOOP ARCHITECTURE:
 * Demonstrates the browser runtime execution flow:
 * 1. Synchronous Call Stack:
 *    - LIFO single-threaded execution context where code runs immediately.
 * 2. Microtask Queue:
 *    - High-priority async jobs scheduled via `queueMicrotask` and `Promise.resolve().then(...)`.
 *    - Emptied completely before the browser continues to rendering or macrotasks.
 * 3. Macrotask Queue (Task Queue):
 *    - Standard async timers (`setTimeout`, `setInterval`) and event callbacks.
 *    - Handled one at a time per event loop tick after the microtask queue is clear.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";

export interface EventLoopTrace {
  callStackExecuted: boolean;
  microtaskExecuted: boolean;
  macrotaskExecuted: boolean;
  order: string[];
}

/**
 * Executes a deterministic Event Loop sequence:
 * Synchronous Call Stack -> Microtask Queue -> Macrotask Queue
 */
export function scheduleEventLoopSequence(onTraceUpdate?: (trace: EventLoopTrace) => void): () => void {
  const trace: EventLoopTrace = {
    callStackExecuted: false,
    microtaskExecuted: false,
    macrotaskExecuted: false,
    order: [],
  };

  // 1. Call Stack: Synchronous execution phase
  trace.callStackExecuted = true;
  trace.order.push("Call Stack (Synchronous)");
  onTraceUpdate?.({ ...trace });

  let cancelled = false;

  // 2. Microtask Queue: Queued for execution prior to paint
  queueMicrotask(() => {
    if (cancelled) return;
    trace.microtaskExecuted = true;
    trace.order.push("Microtask Queue (queueMicrotask)");
    onTraceUpdate?.({ ...trace });
  });

  Promise.resolve().then(() => {
    if (cancelled) return;
    trace.order.push("Microtask Queue (Promise.then)");
    onTraceUpdate?.({ ...trace });
  });

  // 3. Macrotask / Task Queue: Scheduled on timer callback
  const timer = setTimeout(() => {
    if (cancelled) return;
    trace.macrotaskExecuted = true;
    trace.order.push("Macrotask Queue (setTimeout)");
    onTraceUpdate?.({ ...trace });
  }, 0);

  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

export default function EventLoopStatus() {
  const [trace, setTrace] = useState<EventLoopTrace>({
    callStackExecuted: true,
    microtaskExecuted: false,
    macrotaskExecuted: false,
    order: ["Call Stack initialized"],
  });

  useEffect(() => {
    const cancel = scheduleEventLoopSequence((updated) => {
      setTrace(updated);
    });
    return cancel;
  }, []);

  return (
    <div
      className="hidden"
      aria-hidden="true"
      data-testid="event-loop-status"
      data-microtask={trace.microtaskExecuted}
      data-macrotask={trace.macrotaskExecuted}
    >
      <span>JavaScript — Event loop: Call Stack, Microtask Queue, Task Queue</span>
    </div>
  );
}
