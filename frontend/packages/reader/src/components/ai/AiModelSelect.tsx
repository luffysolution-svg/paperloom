import { useId, useState, type KeyboardEvent } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown, Loader2, RefreshCw, Search } from "lucide-react";

export type AiModelItem = { value: string; name: string; group?: string };

export function AiModelList({ items, value, onSelect, allowCustom = false, defaultLabel = "服务默认模型", defaultValue = "", loading = false, error = "", onRefresh }: {
  items: AiModelItem[]; value: string; onSelect: (value: string) => void; allowCustom?: boolean;
  defaultLabel?: string; defaultValue?: string; loading?: boolean; error?: string; onRefresh?: () => void;
}) {
  const [query, setQuery] = useState("");
  const listId = useId();
  const search = query.trim();
  const filtered = items.filter((item) => (search || !defaultLabel || item.value !== defaultValue) && `${item.name} ${item.value} ${item.group || ""}`.toLowerCase().includes(search.toLowerCase()));
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const targets = [...event.currentTarget.querySelectorAll<HTMLElement>("input, [role='option']")];
    const index = targets.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    targets[(index + (event.key === "ArrowDown" ? 1 : -1) + targets.length) % targets.length]?.focus();
  }
  return <div className="reader-ai-model-list" onKeyDown={navigate}>
    <div className="reader-ai-model-search"><Search size={15} aria-hidden="true" />
      <input aria-label="搜索模型" role="combobox" aria-autocomplete="list" aria-controls={listId} aria-expanded="true"
        autoComplete="off" placeholder={allowCustom ? "搜索或输入模型名称…" : "搜索模型…"} value={query} onChange={(event) => setQuery(event.target.value)} />
      {onRefresh ? <button type="button" className="reader-ai-menu-icon" aria-label="刷新模型列表" disabled={loading} onClick={onRefresh}>
        {loading ? <Loader2 size={14} className="reader-ai-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
      </button> : null}
    </div>
    <div className="reader-ai-model-results" id={listId} role="listbox" aria-label="可用模型" aria-busy={loading}>
      {!search && defaultLabel ? <button type="button" role="option" aria-selected={!value || value === defaultValue} className="reader-ai-model-option" onClick={() => onSelect("")}>
        <span>{defaultLabel}</span>{!value || value === defaultValue ? <Check size={15} aria-hidden="true" /> : null}
      </button> : null}
      {filtered.map((item, index) => <div key={item.value}>
        {item.group && item.group !== filtered[index - 1]?.group ? <p className="reader-ai-menu-label">{item.group}</p> : null}
        <button type="button" role="option" aria-selected={value === item.value} className="reader-ai-model-option" onClick={() => onSelect(item.value)}>
          <span title={item.value}>{item.name}</span>{value === item.value ? <Check size={15} aria-hidden="true" /> : null}
        </button>
      </div>)}
      {allowCustom && search && !items.some((item) => item.value === search) ? <button type="button" role="option" aria-selected="false" className="reader-ai-model-option reader-ai-model-custom" onClick={() => onSelect(search)}>
        <span>使用「{search}」</span><small>自定义模型</small>
      </button> : null}
      {!filtered.length && (!allowCustom || !search) ? <p className="reader-ai-menu-empty">{loading ? "正在读取模型…" : search ? "没有匹配的模型" : allowCustom ? "可搜索列表，也可输入服务商提供的模型名称。" : "由 Agent 使用其默认模型。"}</p> : null}
    </div>
    {error ? <p className="reader-ai-menu-notice" role="status">{error}</p> : null}
  </div>;
}

export function AiModelSelect({ value, items, onChange, disabled = false, loading = false, error = "", onRefresh }: {
  value: string; items: string[]; onChange: (value: string) => void; disabled?: boolean;
  loading?: boolean; error?: string; onRefresh?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Trigger type="button" className="reader-ai-model-field" aria-label="选择默认模型" disabled={disabled}>
      <span className={value ? "" : "reader-ai-placeholder"}>{value || "选择或输入模型"}</span><ChevronDown size={15} aria-hidden="true" />
    </Popover.Trigger>
    <Popover.Portal><Popover.Content className="reader-ai-service-menu reader-ai-model-field-menu" align="start" sideOffset={6} collisionPadding={12} aria-label="选择默认模型">
      <AiModelList value={value} items={items.map((model) => ({ value: model, name: model }))} onSelect={(model) => { onChange(model); setOpen(false); }}
        allowCustom defaultLabel="" loading={loading} error={error} onRefresh={onRefresh} />
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
