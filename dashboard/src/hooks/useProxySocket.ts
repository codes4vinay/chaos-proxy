import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { PROXY_URL } from "../config";
import type { RequestEvent, Stats, StatSnapshot } from "../types";

export function useProxySocket() {
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<StatSnapshot[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(PROXY_URL);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("request-event", (event: RequestEvent) => {
      setEvents((prev) => [...prev.slice(-59), event]);
    });

    const statsInterval = setInterval(() => {
      fetch(`${PROXY_URL}/stats`)
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

    return () => {
      socket.disconnect();
      clearInterval(statsInterval);
    };
  }, []);

  return { events, stats, history, connected };
}
