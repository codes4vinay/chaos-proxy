/**
 * CHAOS RULES
 * ------------------------------------------------------------------
 * Central config for what fault injection behavior is currently active.
 * This object is intentionally mutable — the control API (later phase)
 * will update these values at runtime without restarting the proxy.
 */

export const chaosRules = {
  delayChance: 0.3, // 30% of requests get an artificial delay
  delayMs: 300, // how long that delay lasts
  failChance: 0.1, // 10% of requests get a fake failure instead of being forwarded
};
