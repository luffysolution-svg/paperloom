import { memo, useEffect, useState } from "react";
import { BookOpen, Brain, Check, ChevronDown, CircleAlert, Clock3, ListChecks, Loader2, Search, Wrench } from "lucide-react";
import type { TurnMetrics, TurnPart } from "@retainpdf/api";
import { AiMarkdownAnswer } from "./AiMarkdownAnswer.js";
import type { AiCitationLike } from "../../shared/ai/answer-enhance.js";

const TOOL_NAMES: Record<string, string> = {
  search_fulltext: "检索文献", read_blocks: "阅读原文", list_documents: "查找文献", search_favorites: "检索收藏",
  search_markdown: "检索全文", read_markdown_chunk: "阅读全文",
  calculate_expression: "计算表达式", calculate_statistics: "统计分析", analyze_table: "分析表格", generate_chart: "生成图表",
};
const seconds = (ms = 0) => `${Math.max(1, Math.round(ms / 1000))} 秒`;
function preview(value: unknown): string {
  return (typeof value === "string" ? value : JSON.stringify(value, null, 2) || "").slice(0, 8000);
}

function Activity({ part, running }: { part: TurnPart; running: boolean }) {
  const active = running && !["completed", "failed", "cancelled"].includes(part.status || "");
  const Icon = part.type === "reasoning" ? Brain : /search/.test(part.tool || "") ? Search : /read|list/.test(part.tool || "") ? BookOpen : Wrench;
  const label = part.type === "reasoning" ? "思考过程" : TOOL_NAMES[part.tool || ""] || part.title || "执行工具";
  return <details className={`reader-ai-activity-step${active ? " is-active" : ""}`}>
    <summary>
      <Icon size={15} aria-hidden="true" />
      <span className="reader-ai-activity-label" title={label}>{label}</span>
      {part.summary || (active && part.type === "reasoning" && part.text) ? <span className="reader-ai-activity-summary">{part.summary || part.text?.slice(-90).replace(/\s+/g, " ")}</span> : null}
      <span className="reader-ai-activity-state">{part.status === "failed" ? <CircleAlert size={13} aria-label="执行失败" />
        : active ? <Loader2 size={13} className="reader-ai-spin" aria-label="进行中" />
        : <Check size={13} aria-label="已完成" />}</span>
      {part.duration_ms != null ? <span className="reader-ai-activity-time">{seconds(part.duration_ms)}</span> : null}
      <ChevronDown size={13} className="reader-ai-details-chevron" aria-hidden="true" />
    </summary>
    <div className="reader-ai-activity-detail">
      {part.type === "reasoning" ? <div className="reader-ai-reasoning-text">{part.text}</div>
        : <>
            {part.input != null || part.input_preview ? <><span className="reader-ai-detail-label">输入</span><pre>{preview(part.input ?? part.input_preview)}</pre></> : null}
            {part.output != null || part.content != null ? <><span className="reader-ai-detail-label">结果</span><pre>{preview(part.output ?? part.content)}</pre></> : null}
            {!part.input && !part.input_preview && !part.output && !part.content ? <p>{active ? "正在执行，结果会在这里更新。" : part.summary || "执行已结束。"}</p> : null}
          </>}
    </div>
  </details>;
}

export function AiRunStatus({ label, running, elapsedMs = 0 }: { label?: string; running: boolean; elapsedMs?: number }) {
  const [elapsed, setElapsed] = useState(elapsedMs);
  useEffect(() => {
    setElapsed(elapsedMs);
    if (!running) return;
    const start = Date.now() - elapsedMs;
    const timer = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(timer);
  }, [running, elapsedMs]);
  if (!running && !elapsedMs) return null;
  return <div className="reader-ai-run-status" role="status" aria-live="polite">
    {running ? <Loader2 size={14} className="reader-ai-spin" aria-hidden="true" /> : <Clock3 size={13} aria-hidden="true" />}
    <span>{running ? label || "正在处理问题" : "耗时"}</span><span className="reader-ai-run-elapsed">{seconds(elapsed)}</span>
  </div>;
}

export const AiTurnContent = memo(function AiTurnContent({ parts = [], content, citations = [], streaming = false, metrics, jobId, onJumpCitation }: {
  parts?: TurnPart[]; content: string; citations?: AiCitationLike[]; streaming?: boolean; metrics?: TurnMetrics; jobId?: string;
  onJumpCitation?: (citation: AiCitationLike) => void;
}) {
  if (!parts.length) return <AiMarkdownAnswer content={content} streaming={streaming} citations={citations} jobId={jobId} onJumpCitation={onJumpCitation} />;
  const lastText = parts.map((part) => part.type).lastIndexOf("text");
  const groups: { key: string; parts: TurnPart[]; textIndex?: number }[] = [];
  parts.forEach((part, index) => {
    if (part.type === "text") groups.push({ key: part.id, parts: [part], textIndex: index });
    else if (groups.at(-1)?.textIndex === undefined && groups.length) groups.at(-1)!.parts.push(part);
    else groups.push({ key: part.id, parts: [part] });
  });
  return <div className="reader-ai-turn-content">
    {groups.map((group) => group.textIndex != null
      ? <AiMarkdownAnswer key={group.key} content={group.parts[0].text || ""} streaming={streaming && group.textIndex === lastText}
          citations={citations} citationFooterMax={group.textIndex === lastText ? 8 : 0} jobId={jobId} onJumpCitation={onJumpCitation} />
      : <div key={group.key}><details className="reader-ai-activity-group" aria-label="执行过程" open={streaming}>
          <summary className="reader-ai-activity-group-head"><ListChecks size={15} aria-hidden="true" /><span>思考与执行</span>
            <span className="reader-ai-activity-summary">{group.parts.length} 个步骤</span><ChevronDown size={13} className="reader-ai-details-chevron" aria-hidden="true" /></summary>
          <div className="reader-ai-activity-list">{group.parts.map((part) => <Activity key={part.id} part={part} running={streaming} />)}</div>
        </details></div>)}
    {!streaming && metrics?.usage ? <details className="reader-ai-usage"><summary>上下文与用量<ChevronDown size={12} aria-hidden="true" /></summary>
      <dl className="reader-ai-usage-facts">{Object.entries({ "输入 Token": metrics.usage.input_tokens ?? metrics.usage.prompt_tokens ?? metrics.usage.used,
        "输出 Token": metrics.usage.output_tokens ?? metrics.usage.completion_tokens,
        "上下文上限": metrics.usage.size ?? metrics.usage.context_window,
        "首段正文": metrics.first_text_ms != null ? seconds(metrics.first_text_ms) : undefined })
        .filter(([, value]) => value != null).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>)}</dl></details> : null}
  </div>;
});
