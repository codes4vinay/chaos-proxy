import { useEffect, useState } from "react";
import { io } from "socket.io-client";

interface RequestEvent {
  durationMs: number;
  failed: boolean;
  timestamp: number;
}

function App() {
  const [events, setEvents] = useState<RequestEvent[]>([]);

  useEffect(() => {
    const socket = io("http://localhost:3000");

    socket.on("request-event", (event: RequestEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, 50)); // keep last 50
    });

    return () => {
      socket.disconnect(); // cleanup when component unmounts
    };
  }, []); // empty array = run once, on mount

  return (
    <div>
      <h1>Chaos Proxy Dashboard</h1>
      <ul>
        {events.map((e, i) => (
          <li key={i} style={{ color: e.failed ? "red" : "green" }}>
            {new Date(e.timestamp).toLocaleTimeString()} — {e.durationMs}ms —{" "}
            {e.failed ? "FAILED" : "OK"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
