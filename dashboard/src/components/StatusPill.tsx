interface StatusPillProps {
  connected: boolean;
}

export function StatusPill({ connected }: StatusPillProps) {
  return (
    <div className={`status-pill ${connected ? "status-live" : "status-down"}`}>
      <span className="status-dot" />
      {connected ? "CONNECTED" : "DISCONNECTED"}
    </div>
  );
}
