import { FileCode2, Sparkles, X } from "lucide-react";
import type { ReactElement } from "react";
import { useReaderContext } from "./reader-context.js";
import type { ReaderAssistantPanel } from "./reader-assistant-types.js";

// 既有 import 兼容：类型真值已移至叶子文件。
export type { ReaderAssistantPanel } from "./reader-assistant-types.js";

const PANELS = [
  { id: "markdown", label: "Markdown", Icon: FileCode2 },
  { id: "ai", label: "AI 问答", Icon: Sparkles },
] as const;

export type ReaderAssistantDockProps = {
  active: ReaderAssistantPanel | null;
  /** 缺省时从 reader context 的 assistant actions 取 */
  onSelect?: (panel: ReaderAssistantPanel) => void;
  onClose?: () => void;
};

/**
 * Markdown 和 AI 是阅读辅助工具，不参与 PDF 阅读模式的选择。
 * 关闭时只显示安静的右侧工具栏；打开后由 Dock 顶栏负责切换与关闭。
 */
export function ReaderAssistantDock(props: ReaderAssistantDockProps): ReactElement {
  const ctx = useReaderContext();
  const { active } = props;
  const onSelect = props.onSelect ?? ctx?.assistant.select ?? (() => {});
  const onClose = props.onClose ?? ctx?.assistant.close ?? (() => {});
  if (!active) {
    return (
      <nav className="reader-assistant-rail" aria-label="阅读辅助工具">
        {PANELS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className="reader-assistant-rail-button"
            aria-label={`打开${label}`}
            title={label}
            onClick={() => onSelect(id)}
          >
            <Icon size={18} strokeWidth={2} aria-hidden />
            <span>{label === "AI 问答" ? "AI" : "MD"}</span>
          </button>
        ))}
      </nav>
    );
  }

  return (
    <header className="reader-assistant-dock-header">
      <div className="reader-assistant-dock-tabs" role="tablist" aria-label="阅读辅助面板">
        {PANELS.map(({ id, label, Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`reader-assistant-dock-tab${selected ? " is-active" : ""}`}
              onClick={() => onSelect(id)}
            >
              <Icon size={15} strokeWidth={2.15} aria-hidden />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="reader-assistant-dock-close"
        aria-label="关闭阅读辅助面板"
        title="关闭辅助面板"
        onClick={onClose}
      >
        <X size={16} strokeWidth={2.25} aria-hidden />
      </button>
    </header>
  );
}
