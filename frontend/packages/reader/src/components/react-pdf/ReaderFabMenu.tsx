// ReaderFab 菜单的展示子模块：头部、工具行、下载区。
// 从 ReaderFab.tsx 抽出，保持原有 DOM 结构与 class 不变。

import { Columns2, Download, FileText, Languages, X } from "lucide-react";
import { type ReactElement } from "react";
import {
  READER_DOWNLOAD_ACTIONS,
  readerDownloadDisabledReason,
  trimReaderDownloadString,
} from "../../external.js";
import type { FabDownloadAction, FabDownloadUrls } from "./use-reader-fab-downloads.js";

type FabIcon = typeof FileText;

const DOWNLOAD_ICONS: Record<FabDownloadAction, FabIcon> = {
  source: FileText,
  sideBySide: Columns2,
  translated: Languages,
};

const DOWNLOAD_SHORT: Record<FabDownloadAction, string> = {
  source: "原文",
  sideBySide: "对照",
  translated: "译文",
};

export type ReaderFabMenuHeaderProps = {
  onClose: () => void;
};

export function ReaderFabMenuHeader({ onClose }: ReaderFabMenuHeaderProps): ReactElement {
  return (
    <header className="reader-fab-menu-head">
      <div className="reader-fab-menu-head-text">
        <strong>工具</strong>
        <span>拖动圆钮可移动</span>
      </div>
      <button
        type="button"
        className="reader-fab-menu-close reader-floating-close"
        aria-label="关闭菜单"
        onClick={onClose}
      >
        <X size={14} strokeWidth={2.5} aria-hidden />
      </button>
    </header>
  );
}

export type ReaderFabToolRowProps = {
  index: number;
  icon: FabIcon;
  title: string;
  sub: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
};

export function ReaderFabToolRow({
  index,
  icon: Icon,
  title,
  sub,
  active,
  disabled,
  onClick,
}: ReaderFabToolRowProps): ReactElement {
  return (
    <button
      type="button"
      role="menuitem"
      className={`reader-fab-row${active ? " is-active" : ""}${disabled ? " is-disabled" : ""}`}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      style={{ ["--fab-i" as string]: index + 1 }}
    >
      <span className="reader-fab-row-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2} />
      </span>
      <span className="reader-fab-row-copy">
        <span className="reader-fab-row-title">{title}</span>
        <span className="reader-fab-row-sub">{sub}</span>
      </span>
    </button>
  );
}

export type ReaderFabDownloadSectionProps = {
  urls: FabDownloadUrls;
  items: readonly FabDownloadAction[];
  busyActions: ReadonlySet<FabDownloadAction>;
  onDownload: (action: FabDownloadAction) => void;
};

export function ReaderFabDownloadSection({
  urls,
  items,
  busyActions,
  onDownload,
}: ReaderFabDownloadSectionProps): ReactElement {
  return (
    <div className="reader-fab-section" role="group" aria-label="下载">
      <div className="reader-fab-section-head">
        <Download size={12} strokeWidth={2.5} aria-hidden />
        <span>下载 PDF</span>
      </div>
      <div className="reader-fab-download-grid">
        {items.map((action, index) => {
          const meta = READER_DOWNLOAD_ACTIONS[action];
          const url = trimReaderDownloadString(urls[action]);
          const busy = busyActions.has(action);
          const enabled = Boolean(url) && !busy;
          const reason = enabled ? "" : readerDownloadDisabledReason(action, urls);
          const Icon = DOWNLOAD_ICONS[action];
          return (
            <button
              key={action}
              type="button"
              role="menuitem"
              id={`reader-fab-download-${action}`}
              className={`reader-fab-chip${busy ? " is-busy" : ""}${enabled ? "" : " is-disabled"}`}
              disabled={!enabled}
              title={enabled ? `下载${meta.label}` : reason}
              onClick={() => void onDownload(action)}
              style={{ ["--fab-i" as string]: index }}
            >
              <span className="reader-fab-chip-icon" aria-hidden="true">
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="reader-fab-chip-label">{DOWNLOAD_SHORT[action]}</span>
              <span className="reader-fab-chip-state">
                {busy ? "…" : enabled ? "↓" : "—"}
              </span>
            </button>
          );
        })}
      </div>
      {items.every((a) => !trimReaderDownloadString(urls[a])) ? (
        <p className="reader-fab-empty">产物尚未就绪</p>
      ) : null}
    </div>
  );
}
