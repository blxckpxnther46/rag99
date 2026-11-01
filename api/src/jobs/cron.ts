/**
 * Scheduled Jobs / Cron Runner
 *
 * Demonstrates:
 * - Periodic background tasks
 * - Scheduled garbage collection of orphaned chunks and telemetry rotation
 */

export class CronScheduler {
  private intervals: NodeJS.Timeout[] = [];

  /**
   * Schedule a periodic job running at fixed intervals
   */
  schedule(name: string, intervalMs: number, task: () => Promise<void>) {
    console.log(`[CronScheduler] Scheduled job registered: ${name} (every ${intervalMs}ms)`);
    const timer = setInterval(async () => {
      try {
        await task();
      } catch (err) {
        console.error(`[CronScheduler] Error in scheduled job ${name}:`, err);
      }
    }, intervalMs);
    this.intervals.push(timer);
  }

  stopAll() {
    for (const timer of this.intervals) {
      clearInterval(timer);
    }
    this.intervals = [];
  }
}

export const scheduler = new CronScheduler();
