// HomeAskComposer 的输入 / @ 选择器 / 范围状态与交互逻辑（纯逻辑，不含渲染）

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  filterDocumentOptions,
  loadPickerOptions,
  parseAtQuery,
} from "../domain/document-picker.js";
import { OPEN_BROWSER_CREDENTIALS_EVENT } from "./use-home-ask-composer-effects.js";
import { buildQuoteBlock, mergeQuoteIntoDraft } from "@retainpdf/reader/runtime/ai";
import type { HomeAskScope } from "../domain/types.js";
import { scopeKey } from "../domain/types.js";

export const MAX_SCOPES = 4;

/**
 * 缺凭据时发送的引导：不锁输入，只把焦点送到凭据横幅的「打开设置」按钮
 * （横幅直达「设置 → API 设置」）；横幅不存在才兜底派发打开设置事件。
 */
export function guideToCredentialSetup(anchor?: HTMLTextAreaElement | null) {
  try {
    const scope =
      anchor?.closest?.(".home-ask-composer") ??
      (typeof document !== "undefined" ? document : null);
    const target = scope?.querySelector?.(".home-ask-key-banner-btn") as HTMLElement | null;
    if (target && typeof target.focus === "function") {
      target.focus();
      return;
    }
  } catch {
    /* 取 DOM 引用失败就走事件兜底 */
  }
  try {
    document.dispatchEvent(new CustomEvent(OPEN_BROWSER_CREDENTIALS_EVENT));
  } catch {
    /* 非浏览器环境静默忽略 */
  }
}

export type UseHomeAskComposerParams = {
  disabled: boolean;
  isRunning: boolean;
  credentialBlocked: boolean;
  credentialMessage: string;
  scopes: HomeAskScope[];
  onScopesChange: (next: HomeAskScope[]) => void;
  onSend: (question: string) => void;
  /**
   * 待插入的引用。带 id 是因为要靠它判断「这是一次新的引用」——同一段话可能被连着
   * 引用两次，光比文本会把第二次吃掉。
   */
  quoteRequest?: { id: string; text: string } | null;
};

export function useHomeAskComposer({
  disabled,
  isRunning,
  credentialBlocked,
  credentialMessage,
  scopes,
  onScopesChange,
  onSend,
  quoteRequest = null,
}: UseHomeAskComposerParams) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState<HomeAskScope[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [atStart, setAtStart] = useState(-1);
  const [atQuery, setAtQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [loadingOpts, setLoadingOpts] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const listId = useId();
  const lastQuoteIdRef = useRef("");

  // 引用进草稿：不覆盖已经写了一半的内容，插完把光标送到末尾等着接着写。
  useEffect(() => {
    const id = `${quoteRequest?.id || ""}`;
    if (!id || id === lastQuoteIdRef.current) return;
    lastQuoteIdRef.current = id;
    const block = buildQuoteBlock(quoteRequest?.text || "");
    if (!block) return;
    setText((prev) => mergeQuoteIntoDraft(prev, block));
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, [quoteRequest]);

  const filtered = filterDocumentOptions(
    options,
    atQuery,
    scopes.map((s) => scopeKey(s)),
  );

  const ensureOptions = useCallback(async () => {
    if (optionsLoaded || loadingOpts) return;
    setLoadingOpts(true);
    try {
      const list = await loadPickerOptions(100);
      setOptions(list);
      setOptionsLoaded(true);
    } catch {
      setOptions([]);
      setOptionsLoaded(true);
    } finally {
      setLoadingOpts(false);
    }
  }, [loadingOpts, optionsLoaded]);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setAtStart(-1);
    setAtQuery("");
    setHighlight(0);
  }, []);

  const pickScope = useCallback((item: HomeAskScope) => {
    if (!item.id) return;
    if (scopes.some((s) => scopeKey(s) === scopeKey(item))) {
      closePicker();
      return;
    }
    if (scopes.length >= MAX_SCOPES) {
      closePicker();
      return;
    }
    const el = textareaRef.current;
    const value = text;
    const start = atStart >= 0 ? atStart : value.lastIndexOf("@");
    if (start >= 0 && el) {
      const caret = el.selectionStart ?? value.length;
      const next = `${value.slice(0, start)}${value.slice(caret)}`.replace(/\s{2,}/g, " ");
      setText(next.trimStart());
    }
    onScopesChange([...scopes, item]);
    closePicker();
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [atStart, closePicker, onScopesChange, scopes, text]);

  const syncAtState = useCallback((value: string, caret: number) => {
    const parsed = parseAtQuery(value, caret);
    if (!parsed) {
      if (pickerOpen) closePicker();
      return;
    }
    void ensureOptions();
    setAtStart(parsed.start);
    setAtQuery(parsed.query);
    setPickerOpen(true);
    setHighlight(0);
  }, [closePicker, ensureOptions, pickerOpen]);

  const handleTextChange = useCallback((value: string, caret: number) => {
    setText(value);
    syncAtState(value, caret);
  }, [syncAtState]);

  const handleSend = () => {
    if (disabled || isRunning) return;
    // 缺凭据不锁输入/不锁发送键：发送时刻才引导补 Key（焦点送横幅按钮），
    // 历史、@ 选文档、草稿输入全程可用。
    if (credentialBlocked) {
      if (!text.trim()) return;
      guideToCredentialSetup(textareaRef.current);
      return;
    }
    const q = text.trim();
    if (!q) return;
    onSend(q);
    setText("");
    closePicker();
  };

  // 缺凭据只影响发送时刻的去向，不禁用输入框本身。
  const inputDisabled = disabled;

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (pickerOpen && filtered.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlight((h) => (h + 1) % filtered.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlight((h) => (h - 1 + filtered.length) % filtered.length);
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        pickScope(filtered[highlight] || filtered[0]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closePicker();
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const canSend = Boolean(text.trim()) && !disabled && !isRunning;

  const scopeHint = (() => {
    // 缺凭据的提示归横幅管——横幅就在上面几十像素处，而且带「打开设置」按钮。
    // 这里再说一遍等于同一句话在同一屏出现两次，还是不带动作的那一遍。
    if (!scopes.length) return "全库 · @ 文章或合集";
    const cols = scopes.filter((s) => s.kind === "collection").length;
    const docs = scopes.filter((s) => s.kind === "document").length;
    const parts: string[] = [];
    if (cols) parts.push(`${cols} 合集`);
    if (docs) parts.push(`${docs} 篇`);
    return parts.join(" · ") || "已限定";
  })();

  return {
    text,
    pickerOpen,
    highlight,
    filtered,
    loadingOpts,
    optionsLoaded,
    textareaRef,
    listId,
    inputDisabled,
    canSend,
    scopeHint,
    closePicker,
    pickScope,
    handleSend,
    onKeyDown,
    handleTextChange,
    syncAtState,
    setHighlight,
  };
}
