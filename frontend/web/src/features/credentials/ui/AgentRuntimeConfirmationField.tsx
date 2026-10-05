import type { AgentRuntimeConfigView } from "@/platform/api/index.js";
import { Check, ShieldCheck, Zap } from "lucide-react";

export interface AgentRuntimeConfirmationFieldProps {
  confirmationMode: AgentRuntimeConfigView["agent_confirmation_mode"];
  onConfirmationModeChange: (
    mode: AgentRuntimeConfigView["agent_confirmation_mode"],
  ) => void;
  busy: boolean;
}

export function AgentRuntimeConfirmationField({
  confirmationMode,
  onConfirmationModeChange,
  busy,
}: AgentRuntimeConfirmationFieldProps) {
  return (
    <fieldset className="credential-agent-confirmation">
      <legend>
        操作确认
        <span>全局设置</span>
      </legend>
      <div className="credential-agent-confirmation-options" role="radiogroup" aria-label="Agent 操作确认方式">
        <button
          type="button"
          role="radio"
          aria-checked={confirmationMode === "explicit"}
          className={confirmationMode === "explicit" ? "is-selected" : ""}
          onClick={() => onConfirmationModeChange("explicit")}
          disabled={busy}
        >
          <ShieldCheck aria-hidden="true" />
          <span>需要确认</span>
          {confirmationMode === "explicit" ? <Check className="credential-agent-confirmation-check" aria-hidden="true" /> : null}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={confirmationMode === "green_light"}
          className={confirmationMode === "green_light" ? "is-selected" : ""}
          onClick={() => onConfirmationModeChange("green_light")}
          disabled={busy}
        >
          <Zap aria-hidden="true" />
          <span>绿灯模式</span>
          {confirmationMode === "green_light" ? <Check className="credential-agent-confirmation-check" aria-hidden="true" /> : null}
        </button>
      </div>
      {confirmationMode === "green_light" ? (
        <p>
          AI 可直接执行并应用受支持的 PDF 操作，无需逐步确认；不允许执行 shell 或任意系统命令。
        </p>
      ) : null}
    </fieldset>
  );
}
