import type { Stats } from "../types";
import { StatCard } from "./StatCard";

interface StatGridProps {
  stats: Stats | null;
}

export function StatGrid({ stats }: StatGridProps) {
  return (
    <section className="stat-grid">
      <StatCard label="P50" value={stats ? `${stats.p50}ms` : "—"} />
      <StatCard label="P95" value={stats ? `${stats.p95}ms` : "—"} />
      <StatCard
        label="P99"
        value={stats ? `${stats.p99}ms` : "—"}
        accent="warn"
      />
      <StatCard
        label="FAILURE RATE"
        value={stats ? `${(stats.failureRate * 100).toFixed(1)}%` : "—"}
        accent={stats && stats.failureRate > 0.3 ? "fail" : "default"}
      />
      <StatCard
        label="TOTAL REQUESTS"
        value={stats ? `${stats.total}` : "—"}
      />
    </section>
  );
}
