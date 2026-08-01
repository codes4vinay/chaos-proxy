import type { RequestEvent } from "../types";

interface PulseStripProps {
  events: RequestEvent[];
}

export function PulseStrip({ events }: PulseStripProps) {
  return (
    <section className="pulse-section">
      <div className="section-label">LIVE PULSE</div>
      <div className="pulse-strip">
        {events.length === 0 && (
          <div className="pulse-empty">waiting for traffic…</div>
        )}
        {events.map((e, i) => (
          <div
            key={i}
            className={`pulse-bar ${e.failed ? "pulse-fail" : "pulse-ok"}`}
            style={{
              height: `${Math.min(100, (e.durationMs / 400) * 100)}%`,
            }}
            title={`${e.durationMs}ms — ${e.failed ? "failed" : "ok"}`}
          />
        ))}
      </div>
    </section>
  );
}
