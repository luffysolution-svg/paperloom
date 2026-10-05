// HomeAskComposer 底栏：范围提示 + 发送 / 停止

import { ArrowUp, Square } from "lucide-react";

export type HomeAskComposerToolbarProps = {
  scopeHint: string;
  isRunning: boolean;
  canSend: boolean;
  onStop?: () => void;
  onSend: () => void;
};

export function HomeAskComposerToolbar({
  scopeHint,
  isRunning,
  canSend,
  onStop,
  onSend,
}: HomeAskComposerToolbarProps) {
  return (
    <div className="home-ask-toolbar">
      <span className="home-ask-scope-hint">{scopeHint}</span>
      {isRunning ? (
        <button
          type="button"
          className="home-ask-send home-ask-send-stop"
          aria-label="停止生成"
          title="停止生成"
          disabled={!onStop}
          onClick={() => onStop?.()}
        >
          <Square size={12} strokeWidth={2.6} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          className="home-ask-send"
          aria-label="发送"
          disabled={!canSend}
          onClick={onSend}
        >
          <ArrowUp size={16} strokeWidth={2.5} aria-hidden />
        </button>
      )}
    </div>
  );
}
