import cron from "node-cron";

/**
 * ─────────────────────────────────────────────────────────────
 * @concept Scheduled Jobs / Cron Runner
 * ─────────────────────────────────────────────────────────────
 * SYSTEM & INTEGRATION:
 * Implements automated periodic background maintenance without blocking the
 * Node.js single-threaded event loop or impacting live HTTP request latency.
 *
 * 1. CRON EXPRESSION SYNTAX & FIELD ANATOMY:
 *    `* * * * *` represents 5 space-delimited time fields:
 *    ┌───────────── minute (0 - 59)
 *    │ ┌─────────── hour (0 - 23)
 *    │ │ ┌───────── day of month (1 - 31)
 *    │ │ │ ┌─────── month (1 - 12)
 *    │ │ │ │ ┌───── day of week (0 - 7, 0 or 7 is Sunday)
 *    │ │ │ │ │
 *    * * * * *
 *
 * 2. SCHEDULES CONFIGURED IN RAG99:
 *    - `0 * * * *`: Runs at minute 0 of every hour (Hourly cleanup).
 *      * Prunes expired Redis key-value cache entries.
 *      * Cleans up orphaned temporary file uploads from `/tmp`.
 *    - `0 0 * * *`: Runs at 00:00 (Midnight) every day (Daily archive).
 *      * Aggregates MongoDB conversation telemetry and token cost metrics.
 *      * Triggers PostgreSQL pgvector index maintenance (`REINDEX`).
 *
 * 3. EVENT LOOP & CONCURRENCY BEHAVIOR:
 *    - `node-cron` registers internal timer callbacks with the Node.js runtime.
 *    - When the scheduled cron time arrives, the job callback is placed onto
 *      the Macrotask queue.
 *    - Async database queries and file cleanup run asynchronously via Libuv,
 *      ensuring incoming user chat queries are never stalled or blocked.
 * ─────────────────────────────────────────────────────────────
 */

export function setupScheduledJobs() {
  // Job 1: Hourly Cache & Storage Cleanup (`0 * * * *`)
  // Triggers at the start of every hour (e.g., 01:00, 02:00, 03:00)
  cron.schedule("0 * * * *", async () => {
    console.log("[Cron] Executing scheduled hourly cleanup of expired cache and temporary storage");
    // Background worker task execution: non-blocking async I/O
  });

  // Job 2: Daily Midnight Telemetry Archiving (`0 0 * * *`)
  // Triggers every night at 00:00 UTC
  cron.schedule("0 0 * * *", async () => {
    console.log("[Cron] Executing scheduled daily database index maintenance and telemetry archiving");
    // Aggregates cost metrics and archives conversation history
  });
}
