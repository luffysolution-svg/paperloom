// 可拖动悬浮工具钮（FAB）：点击展开菜单，拖动改位置。
// 菜单：摘录 / Markdown / AI + 批注 + 下载（原始 / 译文 / 对照）。
// Markdown / AI 与 ReaderAssistantDock 同行为（workspace 辅助面板），
// 展示行与 registry.ts READER_TOOLS 对齐。
//
// 拖拽定位、菜单/外点关闭、三路下载 busy 与菜单展示行已拆到同目录子模块：
// use-reader-fab-position / use-reader-fab-menu / use-reader-fab-downloads /
// ReaderFabMenu。主组件只组合行为并保留 ReaderFab 导出名。

import { Bookmark, FileCode2, Sparkles, StickyNote, X } from "lucide-react";
import { useCallback, useId, useRef, type ReactElement } from "react";
import type { ReaderDownloadContext } from "../../hooks/use-reader-session.js";
import type { ReaderToolId } from "../../tools/registry.js";
import { READER_TOOLS } from "../../tools/registry.js";
import { useReaderContext } from "./reader-context.js";
import { useReaderFabDownloads } from "./use-reader-fab-downloads.js";
import { useReaderFabMenu } from "./use-reader-fab-menu.js";
import { useReaderFabPosition } from "./use-reader-fab-position.js";
import {
  ReaderFabDownloadSection,
  ReaderFabMenuHeader,
  ReaderFabToolRow,
} from "./ReaderFabMenu.js";

/** FAB 菜单里的工具 id：除注册表工具外，批注由 FAB 直接开合本地面板。 */
export type ReaderFabToolId = ReaderToolId | "notes";

const TOOL_ICONS: Record<ReaderFabToolId, typeof Bookmark> = {
  favorites: Bookmark,
  markdown: FileCode2,
  ai: Sparkles,
  notes: StickyNote,
};

const AUXILIARY_TOOLS = READER_TOOLS;

export type ReaderFabProps = {
  /** 当前打开的工具 id；null 表示都关 */
  activeTool: ReaderFabToolId | null;
  /** 本批注数量，用于工具项 badge */
  noteCount: number;
  /** 无 job 时为 true；缺省从 reader context 取 controller.sourceOnly（不是 sourceViewOnly） */
  sourceOnly?: boolean;
  onToggleTool: (id: ReaderFabToolId) => void;
  /** 缺省时从 reader context 取 controller.download */
  download?: ReaderDownloadContext;
};

export function ReaderFab(props: ReaderFabProps): ReactElement {
  const { activeTool, noteCount, onToggleTool } = props;
  const ctx = useReaderContext();
  const sourceOnly = props.sourceOnly ?? ctx?.sourceOnly ?? false;
  const download = props.download ?? ctx?.download;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const { open, setOpen, closeMenu, toggleMenu } = useReaderFabMenu(rootRef);
  const { pos, openUp, onPointerDown, onPointerMove, onPointerUp } = useReaderFabPosition({
    onDragStart: closeMenu,
    onActivate: toggleMenu,
  });
  const { urls, downloadItems, busyActions, handleDownload } = useReaderFabDownloads(download);

  const handleTool = useCallback((id: ReaderFabToolId) => {
    onToggleTool(id);
    setOpen(false);
  }, [onToggleTool, setOpen]);

  return (
    <div
      ref={rootRef}
      className={`reader-fab${open ? " is-open" : ""}${openUp ? " is-open-up" : ""}`}
      style={{ left: pos.x, top: pos.y }}
      data-reader-fab=""
    >
      {open ? (
        <div
          id={menuId}
          className="reader-fab-menu reader-floating-surface"
          role="menu"
          aria-label="阅读工具"
        >
          <ReaderFabMenuHeader onClose={closeMenu} />

          {(() => {
            const notesActive = activeTool === "notes";
            return (
              <button
                type="button"
                role="menuitem"
                className={`reader-fab-row${notesActive ? " is-active" : ""}`}
                aria-pressed={notesActive}
                onClick={() => handleTool("notes")}
                style={{ ["--fab-i" as string]: 0 }}
              >
                <span className="reader-fab-row-icon" aria-hidden="true">
                  <StickyNote size={18} strokeWidth={2} />
                </span>
                <span className="reader-fab-row-copy">
                  <span className="reader-fab-row-title">批注</span>
                  <span className="reader-fab-row-sub">
                    {notesActive ? "关闭悬浮窗" : "本地批注 · 导出"}
                  </span>
                </span>
                {noteCount > 0 ? (
                  <span className="reader-fab-row-badge">{noteCount}</span>
                ) : null}
              </button>
            );
          })()}

          {AUXILIARY_TOOLS.map((tool, index) => {
            const Icon = TOOL_ICONS[tool.id];
            const isActive = activeTool === tool.id;
            const disabled = tool.needsJob && sourceOnly;
            let sub = isActive ? tool.subOpen : tool.subIdle;
            if (disabled) {
              sub = "需打开任务阅读";
            }
            return (
              <ReaderFabToolRow
                key={tool.id}
                index={index}
                icon={Icon}
                title={tool.label}
                sub={sub}
                active={isActive}
                disabled={disabled}
                onClick={() => handleTool(tool.id)}
              />
            );
          })}

          <ReaderFabDownloadSection
            urls={urls}
            items={downloadItems}
            busyActions={busyActions}
            onDownload={handleDownload}
          />
        </div>
      ) : null}

      <button
        type="button"
        className={`reader-fab-trigger${open ? " is-open" : ""}${activeTool ? " has-active-tool" : ""}`}
        aria-label={open ? "收起工具菜单" : "打开工具菜单"}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="menu"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="reader-fab-icon" aria-hidden="true">
          {open ? <X size={20} strokeWidth={2.5} /> : (
            <span className="reader-fab-dots">
              <i /><i /><i />
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
