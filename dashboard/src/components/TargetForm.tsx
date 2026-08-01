import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { TargetConfig } from "../types";

interface TargetFormProps {
  targetForm: TargetConfig | null;
  setTargetForm: Dispatch<SetStateAction<TargetConfig | null>>;
  onSubmit: (e: FormEvent) => void;
}

export function TargetForm({
  targetForm,
  setTargetForm,
  onSubmit,
}: TargetFormProps) {
  return (
    <form className="control-card" onSubmit={onSubmit}>
      <div className="control-card-title">Target Backend</div>
      <label>
        Host
        <input
          type="text"
          value={targetForm?.host ?? ""}
          onChange={(e) =>
            setTargetForm((f) => (f ? { ...f, host: e.target.value } : f))
          }
        />
      </label>
      <label>
        Port
        <input
          type="number"
          value={targetForm?.port ?? ""}
          onChange={(e) =>
            setTargetForm((f) =>
              f ? { ...f, port: Number(e.target.value) } : f,
            )
          }
        />
      </label>
      <button type="submit">Update Target</button>
    </form>
  );
}
