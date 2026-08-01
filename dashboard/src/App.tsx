import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

interface RequestEvent {
  durationMs: number;
  failed: boolean;
  timestamp: number;
}

interface Stats {
  p50: number;
  p95: number;
  p99: number;
  failureRate: number;
  total: number;
}

interface StatSnapshot {
  time: string;
  p99: number;
  failureRatePct: number;
}

// Shape of the mutable chaos config on the backend (chaosRules.ts).
interface ChaosRules {
  delayChance: number;
  delayMs: number;
  failChance: number;
}

// Shape of the mutable target config on the backend.
interface TargetConfig {
  host: string;
  port: number;
}

function App() {
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<StatSnapshot[]>([]);
  const [connected, setConnected] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const alertTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local form state for the control panel — these are just what's
  // TYPED into the inputs, separate from what's actually applied on
  // the backend, until the user hits "Update".
  const [rulesForm, setRulesForm] = useState<ChaosRules | null>(null);
  const [targetForm, setTargetForm] = useState<TargetConfig | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:3000");

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("request-event", (event: RequestEvent) => {
      setEvents((prev) => [...prev.slice(-59), event]);
    });

    const statsInterval = setInterval(() => {
      fetch("http://localhost:3000/stats")
        .then((r) => r.json())
        .then((data: Stats) => {
          setStats(data);
          setHistory((prev) => [
            ...prev.slice(-59),
            {
              time: new Date().toLocaleTimeString(),
              p99: data.p99,
              failureRatePct: Math.round(data.failureRate * 100),
            },
          ]);
        })
        .catch(() => {});
    }, 2000);

    // Load current config into the control panel forms once, on mount,
    // so the inputs start pre-filled with real live values instead of
    // being empty or guessed.
    fetch("http://localhost:3000/rules")
      .then((r) => r.json())
      .then(setRulesForm)
      .catch(() => {});

    fetch("http://localhost:3000/target")
      .then((r) => r.json())
      .then(setTargetForm)
      .catch(() => {});

    return () => {
      socket.disconnect();
      clearInterval(statsInterval);
    };
  }, []);

  useEffect(() => {
    if (stats && stats.failureRate > 0.3 && stats.total >= 5) {
      setAlert(
        `Failure rate ${(stats.failureRate * 100).toFixed(0)}% — assertion threshold breached`,
      );
      if (alertTimeout.current) clearTimeout(alertTimeout.current);
      alertTimeout.current = setTimeout(() => setAlert(null), 6000);
    }
  }, [stats]);

  // Sends the current rulesForm state to the backend. Runs on submit,
  // not on every keystroke — so partial/in-progress edits don't get
  // applied until the user is actually ready.
  async function handleRulesSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rulesForm) return;

    const res = await fetch("http://localhost:3000/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rulesForm),
    });
    const updated = await res.json();
    setRulesForm(updated);
    flashSaveMessage("Chaos rules updated");
  }

  async function handleTargetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetForm) return;

    const res = await fetch("http://localhost:3000/target", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(targetForm),
    });
    const updated = await res.json();
    setTargetForm(updated);
    flashSaveMessage("Target updated");
  }

  function flashSaveMessage(msg: string) {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 2500);
  }

  return (
    <div className="dash">
      <header className="dash-header">
        <div className="dash-title">
          <span className="dash-title-main">CHAOS PROXY</span>
          <span className="dash-title-sub">live traffic console</span>
        </div>
        <div
          className={`status-pill ${connected ? "status-live" : "status-down"}`}
        >
          <span className="status-dot" />
          {connected ? "CONNECTED" : "DISCONNECTED"}
        </div>
      </header>

      {alert && (
        <div className="alert-banner">
          <span>⚠ {alert}</span>
        </div>
      )}

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

      {/* Control panel — lets the user reconfigure chaos rules and
          the proxy target directly from the UI, without touching
          code or restarting anything. */}
      <section className="control-section">
        <div className="section-label">CONTROL PANEL</div>
        <div className="control-grid">
          <form className="control-card" onSubmit={handleTargetSubmit}>
            <div className="control-card-title">Target Backend</div>
            <label>
              Host
              <input
                type="text"
                value={targetForm?.host ?? ""}
                onChange={(e) =>
                  setTargetForm((f) => (f ? { ...f, host: e.target.value } : f))
                }
              />
            </label>
            <label>
              Port
              <input
                type="number"
                value={targetForm?.port ?? ""}
                onChange={(e) =>
                  setTargetForm((f) =>
                    f ? { ...f, port: Number(e.target.value) } : f,
                  )
                }
              />
            </label>
            <button type="submit">Update Target</button>
          </form>

          <form className="control-card" onSubmit={handleRulesSubmit}>
            <div className="control-card-title">Chaos Rules</div>
            <label>
              Fail chance (0–1)
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={rulesForm?.failChance ?? ""}
                onChange={(e) =>
                  setRulesForm((f) =>
                    f ? { ...f, failChance: Number(e.target.value) } : f,
                  )
                }
              />
            </label>
            <label>
              Delay chance (0–1)
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={rulesForm?.delayChance ?? ""}
                onChange={(e) =>
                  setRulesForm((f) =>
                    f ? { ...f, delayChance: Number(e.target.value) } : f,
                  )
                }
              />
            </label>
            <label>
              Delay (ms)
              <input
                type="number"
                min="0"
                value={rulesForm?.delayMs ?? ""}
                onChange={(e) =>
                  setRulesForm((f) =>
                    f ? { ...f, delayMs: Number(e.target.value) } : f,
                  )
                }
              />
            </label>
            <button type="submit">Update Rules</button>
          </form>
        </div>
        {saveMessage && <div className="save-toast">{saveMessage}</div>}
      </section>

      <section className="chart-section">
        <div className="section-label">
          P99 LATENCY & FAILURE RATE (LAST 2 MIN)
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid stroke="#1e2730" strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                stroke="#5b6672"
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                tick={{ fill: "#5b6672" }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                stroke="#ffb020"
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                tick={{ fill: "#ffb020" }}
                label={{
                  value: "p99 (ms)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#ffb020",
                  fontSize: 10,
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#ff4757"
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                tick={{ fill: "#ff4757" }}
                label={{
                  value: "fail %",
                  angle: 90,
                  position: "insideRight",
                  fill: "#ff4757",
                  fontSize: 10,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "#121820",
                  border: "1px solid #1e2730",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="p99"
                stroke="#ffb020"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="failureRatePct"
                stroke="#ff4757"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

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

      <section className="feed-section">
        <div className="section-label">REQUEST LOG</div>
        <div className="feed-list">
          {[...events]
            .reverse()
            .slice(0, 20)
            .map((e, i) => (
              <div
                key={i}
                className={`feed-row ${e.failed ? "feed-fail" : ""}`}
              >
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
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "warn" | "fail";
}) {
  return (
    <div className={`stat-card stat-${accent}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default App;
