import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { ChaosRules } from "../types";

interface RulesFormProps {
  rulesForm: ChaosRules | null;
  setRulesForm: Dispatch<SetStateAction<ChaosRules | null>>;
  onSubmit: (e: FormEvent) => void;
}

export function RulesForm({
  rulesForm,
  setRulesForm,
  onSubmit,
}: RulesFormProps) {
  return (
    <form className="control-card" onSubmit={onSubmit}>
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
  );
}
