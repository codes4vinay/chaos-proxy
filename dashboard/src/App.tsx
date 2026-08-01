import { AlertBanner } from "./components/AlertBanner";
import { ControlPanel } from "./components/ControlPanel";
import { PulseStrip } from "./components/PulseStrip";
import { RequestLog } from "./components/RequestLog";
import { StatGrid } from "./components/StatGrid";
import { StatusPill } from "./components/StatusPill";
import { TrendChart } from "./components/TrendChart";
import { useProxySocket } from "./hooks/useProxySocket";
import "./App.css";

function App() {
  const { events, stats, history, connected } = useProxySocket();

  return (
    <div className="dash">
      <header className="dash-header">
        <div className="dash-title">
          <span className="dash-title-main">CHAOS PROXY</span>
          <span className="dash-title-sub">Live traffic console</span>
        </div>
        <StatusPill connected={connected} />
      </header>

      <AlertBanner stats={stats} />
      <StatGrid stats={stats} />
      <ControlPanel />
      <TrendChart history={history} />
      <PulseStrip events={events} />
      <RequestLog events={events} />
    </div>
  );
}

export default App;
