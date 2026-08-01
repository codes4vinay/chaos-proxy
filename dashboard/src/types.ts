export interface RequestEvent {
  durationMs: number;
  failed: boolean;
  timestamp: number;
}

export interface Stats {
  p50: number;
  p95: number;
  p99: number;
  failureRate: number;
  total: number;
}

export interface StatSnapshot {
  time: string;
  p99: number;
  failureRatePct: number;
}

// Shape of the mutable chaos config on the backend (chaosRules.ts).
export interface ChaosRules {
  delayChance: number;
  delayMs: number;
  failChance: number;
}

// Shape of the mutable target config on the backend.
export interface TargetConfig {
  host: string;
  port: number;
}
