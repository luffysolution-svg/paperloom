import { useState } from "react";
import { ChevronDown, ChevronUp, Download, Minimize2, Search, X } from "lucide-react";
import type { HomeAskMessage } from "../domain/types.js";

export function HomeAskThreadToolbar({ title, messages, running, onCompress, onFind }: {
  title: string; messages: HomeAskMessage[]; running: boolean; onCompress: () => void; onFind: (id: string) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const matches = query.trim() ? messages.filter((m) => m.content.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : [];
  function find(next: number) {
    if (!matches.length) return;
    const selected = (next + matches.length) % matches.length;
    setIndex(selected); onFind(matches[selected].id);
  }
  function download() {
    const body = messages.map((m) => `## ${m.role === "user" ? "提问" : "回答"}\n\n${m.content}\n`
      + (m.citations?.length ? `\n${m.citations.map((c) => `[${c.ref}] 第 ${Number(c.page_idx || 0) + 1} 页 ${c.snippet || ""}`).join("\n")}\n` : "")).join("\n");
    const url = URL.createObjectURL(new Blob([`# ${title}\n\n${body}`], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${title.replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "对话"}.md`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="home-ask-thread-toolbar">
    {searching ? <div className="home-ask-thread-search"><Search size={15} aria-hidden="true" />
      <input autoFocus aria-label="查找对话内容" placeholder="查找这段对话" value={query} onChange={(event) => { setQuery(event.target.value); setIndex(0); }}
        onKeyDown={(event) => { if (event.key === "Enter") find(index + (event.shiftKey ? -1 : 1)); if (event.key === "Escape") setSearching(false); }} />
      <span>{matches.length ? `${index + 1}/${matches.length}` : query ? "无匹配" : ""}</span>
      <button type="button" aria-label="上一处" disabled={!matches.length} onClick={() => find(index - 1)}><ChevronUp size={15} /></button>
      <button type="button" aria-label="下一处" disabled={!matches.length} onClick={() => find(index + 1)}><ChevronDown size={15} /></button>
      <button type="button" aria-label="关闭查找" onClick={() => setSearching(false)}><X size={15} /></button>
    </div> : <><div className="home-ask-conversation-title" title={title}>{title}</div><div className="home-ask-thread-tools">
      <button type="button" aria-label="查找对话" title="查找对话" onClick={() => setSearching(true)}><Search size={16} /></button>
      <button type="button" aria-label="压缩上下文" title="将较早的对话压缩为摘要，再继续讨论" disabled={running || messages.length < 4} onClick={onCompress}><Minimize2 size={16} /></button>
      <button type="button" aria-label="导出对话" title="导出为 Markdown" onClick={download}><Download size={16} /></button>
    </div></>}
  </div>;
}
