import { useEffect, useRef, useState } from "react";
import type { Stats } from "../types";

interface AlertBannerProps {
  stats: Stats | null;
}

export function AlertBanner({ stats }: AlertBannerProps) {
  const [alert, setAlert] = useState<string | null>(null);
  const alertTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (stats && stats.failureRate > 0.3 && stats.total >= 5) {
      setAlert(
        `Failure rate ${(stats.failureRate * 100).toFixed(0)}% — assertion threshold breached`,
      );
      if (alertTimeout.current) clearTimeout(alertTimeout.current);
      alertTimeout.current = setTimeout(() => setAlert(null), 6000);
    }
  }, [stats]);

  if (!alert) return null;

  return (
    <div className="alert-banner">
      <span>⚠ {alert}</span>
    </div>
  );
}
