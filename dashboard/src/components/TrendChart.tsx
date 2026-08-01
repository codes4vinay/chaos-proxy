import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatSnapshot } from "../types";

interface TrendChartProps {
  history: StatSnapshot[];
}

export function TrendChart({ history }: TrendChartProps) {
  return (
    <section className="chart-section">
      <div className="section-label">P99 LATENCY & FAILURE RATE (LAST 2 MIN)</div>
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
  );
}
