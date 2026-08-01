import type { FormEvent } from "react";
import { useState } from "react";
import { PROXY_URL } from "../config";

interface RunTestFormProps {
  onStarted: (message: string) => void;
}

interface RunTestConfig {
  path: string;
  count: number;
  intervalMs: number;
  concurrent: boolean;
}

export function RunTestForm({ onStarted }: RunTestFormProps) {
  const [runTestForm, setRunTestForm] = useState<RunTestConfig>({
    path: "/hello",
    count: 10,
    intervalMs: 200,
    concurrent: false,
  });

  async function handleRunTestSubmit(e: FormEvent) {
    e.preventDefault();

    await fetch(`${PROXY_URL}/run-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(runTestForm),
    });
    onStarted("Test run started");
  }

  const isBurstMode = runTestForm.concurrent;

  return (
    <form className="control-card run-test-card" onSubmit={handleRunTestSubmit}>
      <div className="control-card-title">Run Test</div>
      <label className="run-test-field">
        Path
        <input
          type="text"
          value={runTestForm.path}
          onChange={(e) =>
            setRunTestForm((f) => ({ ...f, path: e.target.value }))
          }
        />
      </label>
      <label className="run-test-field">
        Count
        <input
          type="number"
          min="1"
          value={runTestForm.count}
          onChange={(e) =>
            setRunTestForm((f) => ({ ...f, count: Number(e.target.value) }))
          }
        />
      </label>
      <label className="run-test-field">
        Interval (ms)
        <input
          type="number"
          min="0"
          value={runTestForm.intervalMs}
          disabled={isBurstMode}
          className={isBurstMode ? "is-disabled" : ""}
          onChange={(e) =>
            setRunTestForm((f) => ({
              ...f,
              intervalMs: Number(e.target.value),
            }))
          }
        />
      </label>
      <label className="run-test-checkbox">
        <span className="checkbox-pill">
          <input
            type="checkbox"
            checked={runTestForm.concurrent}
            onChange={(e) =>
              setRunTestForm((f) => ({ ...f, concurrent: e.target.checked }))
            }
          />
          <span>Fire concurrently (burst)</span>
        </span>
        <span className="muted-text">
          {isBurstMode
            ? "Every request fires at once"
            : "Send requests with a steady delay"}
        </span>
      </label>
      <button type="submit">Run Test</button>
    </form>
  );
}
