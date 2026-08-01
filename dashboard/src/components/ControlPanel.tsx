import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { PROXY_URL } from "../config";
import type { ChaosRules, TargetConfig } from "../types";
import { RulesForm } from "./RulesForm";
import { RunTestForm } from "./RunTestForm";
import { TargetForm } from "./TargetForm";

export function ControlPanel() {
  const [rulesForm, setRulesForm] = useState<ChaosRules | null>(null);
  const [targetForm, setTargetForm] = useState<TargetConfig | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load current config into the control panel forms once, on mount,
    // so the inputs start pre-filled with real live values instead of
    // being empty or guessed.
    fetch(`${PROXY_URL}/rules`)
      .then((r) => r.json())
      .then(setRulesForm)
      .catch(() => {});

    fetch(`${PROXY_URL}/target`)
      .then((r) => r.json())
      .then(setTargetForm)
      .catch(() => {});
  }, []);

  // Sends the current rulesForm state to the backend. Runs on submit,
  // not on every keystroke — so partial/in-progress edits don't get
  // applied until the user is actually ready.
  async function handleRulesSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rulesForm) return;

    const res = await fetch(`${PROXY_URL}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rulesForm),
    });
    const updated = await res.json();
    setRulesForm(updated);
    flashSaveMessage("Chaos rules updated");
  }

  async function handleTargetSubmit(e: FormEvent) {
    e.preventDefault();
    if (!targetForm) return;

    const res = await fetch(`${PROXY_URL}/target`, {
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
    <section className="control-section">
      <div className="section-label">CONTROL PANEL</div>
      <div className="control-grid">
        <RunTestForm onStarted={flashSaveMessage} />
        <TargetForm
          targetForm={targetForm}
          setTargetForm={setTargetForm}
          onSubmit={handleTargetSubmit}
        />
        <RulesForm
          rulesForm={rulesForm}
          setRulesForm={setRulesForm}
          onSubmit={handleRulesSubmit}
        />
      </div>
      {saveMessage && <div className="save-toast">{saveMessage}</div>}
    </section>
  );
}
