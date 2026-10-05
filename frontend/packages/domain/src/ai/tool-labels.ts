// 工具事件标签真值：web home-ask 与 reader assistant 共用的纯映射。
export const TOOL_EVENT_LABELS: Record<string, string> = {
  search_markdown: "检索 Markdown",
  read_markdown_chunk: "阅读 Markdown 片段",
  list_documents: "确认文档信息",
  read_blocks: "阅读相关段落",
  search_favorites: "查找收藏",
  search_fulltext: "检索文档内容",
  calculate_expression: "计算表达式",
  calculate_statistics: "计算统计量",
  analyze_table: "分析文档表格",
  generate_chart: "生成图表",
};

export function describeToolEvent(
  event: { tool?: string; event?: string; type?: string; title?: string } | string | null | undefined,
): string {
  // 不看 `type`。SSE 事件的 `type` 是信封名（`agent_tool`），不是工具名——退到它会
  // 在界面上显示「执行 agent_tool」，把事件类型当成工具报给用户。
  const key = typeof event === "string"
    ? event
    : `${event?.tool || event?.event || ""}`;
  if (TOOL_EVENT_LABELS[key]) return TOOL_EVENT_LABELS[key];
  if (key) return `执行 ${key}`;
  // 后端的 title 是英文的，只在没有工具名时兜底，好过显示「处理中」。
  const title = typeof event === "string" ? "" : `${event?.title || ""}`.trim();
  return title || "处理中";
}
