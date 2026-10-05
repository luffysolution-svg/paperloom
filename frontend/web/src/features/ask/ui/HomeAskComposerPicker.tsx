// HomeAskComposer @ 选择器下拉

import { BookOpen, FolderOpen, Loader2 } from "lucide-react";
import type { HomeAskScope } from "../domain/types.js";
import { scopeKey } from "../domain/types.js";
import { MAX_SCOPES } from "./use-home-ask-composer.js";

export type HomeAskComposerPickerProps = {
  listId: string;
  loadingOpts: boolean;
  optionsLoaded: boolean;
  filtered: HomeAskScope[];
  highlight: number;
  scopeCount: number;
  onHighlight: (index: number) => void;
  onPick: (item: HomeAskScope) => void;
};

export function HomeAskComposerPicker({
  listId,
  loadingOpts,
  optionsLoaded,
  filtered,
  highlight,
  scopeCount,
  onHighlight,
  onPick,
}: HomeAskComposerPickerProps) {
  return (
    <div className="home-ask-picker app-floating-surface" role="listbox" id={listId} aria-label="选择文档或合集">
      {loadingOpts && !optionsLoaded ? (
        <div className="home-ask-picker-empty">
          <Loader2 className="home-ask-spin" size={14} aria-hidden />
          加载中…
        </div>
      ) : filtered.length === 0 ? (
        <div className="home-ask-picker-empty">
          {optionsLoaded ? "没有匹配的文章或合集" : "暂无数据"}
        </div>
      ) : (
        filtered.map((item, index) => (
          <button
            key={scopeKey(item)}
            type="button"
            role="option"
            aria-selected={index === highlight}
            className={`home-ask-picker-item${index === highlight ? " is-active" : ""}${
              item.kind === "collection" ? " is-collection" : ""
            }`}
            onMouseEnter={() => onHighlight(index)}
            onClick={() => onPick(item)}
          >
            {item.kind === "collection" ? (
              <FolderOpen size={14} strokeWidth={2} aria-hidden />
            ) : (
              <BookOpen size={14} strokeWidth={2} aria-hidden />
            )}
            <span className="home-ask-picker-title">{item.title}</span>
            <span className="home-ask-picker-kind">
              {item.kind === "collection"
                ? `合集${item.document_count != null ? ` · ${item.document_count}` : ""}`
                : "文章"}
            </span>
          </button>
        ))
      )}
      {scopeCount >= MAX_SCOPES ? (
        <div className="home-ask-picker-hint">最多指定 {MAX_SCOPES} 个范围</div>
      ) : (
        <div className="home-ask-picker-hint">合集会展开其中的文献再检索</div>
      )}
    </div>
  );
}
