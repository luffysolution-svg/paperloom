export type TurnPart = {
  id: string;
  type: "text" | "reasoning" | "tool";
  text?: string;
  status?: string;
  started_ms?: number;
  duration_ms?: number;
  title?: string;
  tool?: string;
  summary?: string;
  input?: unknown;
  input_preview?: string;
  output?: unknown;
  content?: unknown;
  [key: string]: unknown;
};
export type TurnEvent = { type: string; seq?: number; elapsed_ms?: number; [key: string]: any };
export type TurnMetrics = { elapsed_ms?: number; first_event_ms?: number; first_text_ms?: number; usage?: Record<string, any>; [key: string]: any };
export function applyTurnEvent(parts: TurnPart[], event: TurnEvent): TurnPart[] {
  if (Array.isArray(event.parts)) return event.parts;
  if (event.type === "answer_delta" || event.type === "reasoning_delta") {
    if (!event.text) return parts;
    const type = event.type === "answer_delta" ? "text" : "reasoning";
    const id = event.part_id || (parts.at(-1)?.type === type ? parts.at(-1)!.id : `part-${event.seq || parts.length}`);
    const index = parts.findIndex((part) => part.id === id);
    const next = parts.slice();
    if (index >= 0) next[index] = { ...parts[index], text: (parts[index].text || "") + event.text };
    else next.push({ id, type, text: event.text, status: "running", started_ms: event.elapsed_ms ?? 0 });
    return next;
  }
  if (event.type === "agent_tool") {
    const id = `tool:${event.tool_call_id || event.tool}`;
    const index = parts.findIndex((part) => part.id === id);
    const { type: _type, ...fields } = event;
    const part: TurnPart = { ...(parts[index] || { started_ms: event.elapsed_ms ?? 0 }), ...fields, id, type: "tool" };
    if (["completed", "failed", "cancelled"].includes(part.status || "")) part.duration_ms = (event.elapsed_ms || 0) - (part.started_ms || 0);
    if (index < 0) return [...parts, part];
    return parts.map((item, i) => i === index ? part : item);
  }
  return parts;
}

export function timelineFromTrace(raw: unknown): { parts?: TurnPart[]; metrics?: TurnMetrics; status?: string } {
  try {
    const trace = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
    return Array.isArray(trace) ? trace.find((entry) => entry?.type === "turn_timeline") || {} : {};
  } catch { return {}; }
}
