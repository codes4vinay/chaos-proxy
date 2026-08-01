import type { RequestEvent } from "../types";

interface RequestLogProps {
  events: RequestEvent[];
}

export function RequestLog({ events }: RequestLogProps) {
  return (
    <section className="feed-section">
      <div className="section-label">REQUEST LOG</div>
      <div className="feed-list">
        {[...events]
          .reverse()
          .slice(0, 20)
          .map((e, i) => (
            <div key={i} className={`feed-row ${e.failed ? "feed-fail" : ""}`}>
              <span className="feed-time">
                {new Date(e.timestamp).toLocaleTimeString()}
              </span>
              <span className="feed-duration">{e.durationMs}ms</span>
              <span
                className={`feed-status ${e.failed ? "feed-status-fail" : "feed-status-ok"}`}
              >
                {e.failed ? "FAILED" : "OK"}
              </span>
            </div>
          ))}
      </div>
    </section>
  );
}
