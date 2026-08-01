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
}

export function RunTestForm({ onStarted }: RunTestFormProps) {
  const [runTestForm, setRunTestForm] = useState<RunTestConfig>({
    path: "/hello",
    count: 10,
    intervalMs: 200,
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

  return (
    <form className="control-card run-test-card" onSubmit={handleRunTestSubmit}>
      <div className="control-card-title">Run Test</div>
      <label>
        Path
        <input
          type="text"
          value={runTestForm.path}
          onChange={(e) =>
            setRunTestForm((f) => ({ ...f, path: e.target.value }))
          }
        />
      </label>
      <label>
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
      <label>
        Interval (ms)
        <input
          type="number"
          min="0"
          value={runTestForm.intervalMs}
          onChange={(e) =>
            setRunTestForm((f) => ({
              ...f,
              intervalMs: Number(e.target.value),
            }))
          }
        />
      </label>
      <button type="submit">Run Test</button>
    </form>
  );
}
