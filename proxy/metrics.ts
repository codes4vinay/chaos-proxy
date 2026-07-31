/**
 * METRICS
 * ------------------------------------------------------------------
 * Tracks recent request outcomes (how long each took, whether it
 * failed) so we can calculate real latency percentiles (p50/p95/p99)
 * and a failure rate — instead of guessing how "chaotic" things
 * currently are.
 *
 * These stats are what the assertion engine (next phase) will use
 * to decide whether chaos has gone too far and should auto-disable.
 */

interface RequestRecord {
  durationMs: number;
  failed: boolean;
  timestamp: number;
}

// Rolling window of recent requests. Kept in memory only — bounded
// in size so it doesn't grow forever.
const records: RequestRecord[] = [];

const MAX_RECORDS = 1000;

/**
 * Call this once per completed request (success or failure) to log
 * its outcome into the rolling window.
 */
export function recordMetric(durationMs: number, failed: boolean): void {
  records.push({
    durationMs,
    failed,
    timestamp: Date.now(),
  });

  // Keep memory bounded — drop the oldest record once we exceed the cap.
  if (records.length > MAX_RECORDS) {
    records.shift();
  }
}

/**
 * Returns the latency value at a given percentile (e.g. 50, 95, 99)
 * across all currently recorded requests.
 *
 * How it works: sort all durations ascending, then walk that
 * percentage of the way through the sorted list and read the value
 * sitting there. e.g. p99 with 100 sorted values reads the 99th one —
 * only 1% of requests were slower than that.
 */
export function getPercentile(p: number): number {
  if (records.length === 0) return 0;

  const sortedDurations = records
    .map((r) => r.durationMs)
    .sort((a, b) => a - b);

  const index = Math.ceil((p / 100) * sortedDurations.length) - 1;

  return sortedDurations[index];
}

/**
 * Returns a summary snapshot of current system health, combining
 * percentile latency numbers with the overall failure rate.
 */
export function getStats() {
  const failedCount = records.filter((r) => r.failed).length;

  return {
    p50: getPercentile(50),
    p95: getPercentile(95),
    p99: getPercentile(99),
    failureRate: records.length > 0 ? failedCount / records.length : 0,
    total: records.length,
  };
}
