/**
 * ASSERTIONS
 * ------------------------------------------------------------------
 * A safety mechanism that watches live metrics and automatically
 * disables chaos injection if things get "too broken" — protecting
 * against runaway chaos experiments that could cause real damage
 * if this were pointed at something more important than a demo.
 *
 * This is what separates a real chaos-engineering tool from a blind
 * fault injector: it's not just capable of breaking things, it also
 * knows when to stop — and remembers that it did, and why.
 */

import { getStats } from "./metrics";
import { chaosRules } from "./chaosRules";

// Thresholds that define "too broken." If either is crossed,
// chaos gets auto-disabled. These are intentionally simple fixed
// values for now — later this could be made configurable per experiment.
const MAX_P99_MS = 800;
const MAX_FAILURE_RATE = 0.3; // 30%

// Tracks whether we've already auto-disabled chaos, so we don't spam
// the console with the same warning every 2 seconds once triggered.
let hasTriggered = false;

/**
 * Shape of a single recorded trigger event — a snapshot of what the
 * system looked like at the moment chaos was auto-disabled, and why.
 */
interface TriggerEvent {
  timestamp: number;
  reason: string;
  p99: number;
  failureRate: number;
}

// In-memory log of every time an assertion has fired. This is what
// turns a fleeting console.log into an actual queryable audit trail —
// exposed later via a /history endpoint in server.ts.
const triggerHistory: TriggerEvent[] = [];

/**
 * Checks current system health against the defined thresholds.
 * Intended to be run on a timer (see server.ts) so it continuously
 * monitors live traffic rather than checking once.
 */
export function checkAssertions(): void {
  const stats = getStats();

  // Don't evaluate on too little data — a single slow/failed request
  // out of only 1-2 total would trigger a false alarm.
  if (stats.total < 5) return;

  const p99TooHigh = stats.p99 > MAX_P99_MS;
  const failureRateTooHigh = stats.failureRate > MAX_FAILURE_RATE;

  if ((p99TooHigh || failureRateTooHigh) && !hasTriggered) {
    // Turn chaos off by zeroing out both chance values.
    // Because chaosRules is a shared, mutable object, this change
    // takes effect immediately on the very next incoming request.
    chaosRules.delayChance = 0;
    chaosRules.failChance = 0;

    hasTriggered = true;

    const reason = p99TooHigh
      ? "p99 latency too high"
      : "failure rate too high";

    // Log it for immediate visibility while developing...
    console.log("🚨 Assertion violated — chaos auto-disabled:", {
      p99: stats.p99,
      failureRate: stats.failureRate,
      reason,
    });

    // ...and also persist it in memory so it can be looked back on
    // later via /history, rather than only existing as a log line
    // that scrolls away.
    triggerHistory.push({
      timestamp: Date.now(),
      reason,
      p99: stats.p99,
      failureRate: stats.failureRate,
    });
  }
}

/**
 * Returns the full history of assertion triggers recorded so far —
 * an audit trail of every time chaos was automatically shut off,
 * and why.
 */
export function getTriggerHistory(): TriggerEvent[] {
  return triggerHistory;
}
