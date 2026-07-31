/**
 * DEGRADATION
 * ------------------------------------------------------------------
 * Models chaos intensity as a smooth triangle wave over time, instead
 * of a flat, constant probability. Real-world degradation (an
 * overloaded service, a struggling network) doesn't stay at one fixed
 * failure rate forever — it builds up, peaks, and recovers, often in
 * repeating waves.
 *
 * getCurrentIntensity() returns a value between 0 and 1 representing
 * "how bad things are right now" in the current cycle. This value is
 * meant to be multiplied against chaosRules.failChance / delayChance
 * in server.ts, so the configured value acts as a ceiling that the
 * ramp smoothly climbs toward and falls away from, rather than a
 * flat rate applied at all times.
 */

// When the ramp cycle began. Set once, when this module first loads
// (i.e. when the proxy starts).
const experimentStartTime = Date.now();

// How long one full rise-and-fall cycle takes, in milliseconds.
// 60s here means: 30s ramping up to peak intensity, 30s ramping back down.
const RAMP_DURATION_MS = 60000;

/**
 * Returns the current chaos intensity as a value from 0 (no chaos)
 * to 1 (peak chaos), based on a repeating triangle wave.
 */
export function getCurrentIntensity(): number {
  // How much time has passed since the ramp started.
  const elapsed = Date.now() - experimentStartTime;

  // Where we are WITHIN the current cycle (cycles repeat forever,
  // so we use modulo to "wrap around" instead of growing forever).
  const positionInCycle = elapsed % RAMP_DURATION_MS;

  const halfDuration = RAMP_DURATION_MS / 2;

  if (positionInCycle < halfDuration) {
    // First half of the cycle: intensity rises linearly from 0 to 1.
    // e.g. at the very start, positionInCycle = 0 -> intensity = 0.
    // At the halfway point, positionInCycle = halfDuration -> intensity = 1.
    return positionInCycle / halfDuration;
  } else {
    // Second half of the cycle: intensity falls linearly from 1 back to 0.
    // We first figure out how far INTO this falling half we are...
    const timeIntoFallingHalf = positionInCycle - halfDuration;
    // ...then mirror it: the further in we are, the lower the intensity.
    return 1 - timeIntoFallingHalf / halfDuration;
  }
}
