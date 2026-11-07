import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AI_AGENT_EVENT, answerAgentInteraction } from "@retainpdf/api";

export function AgentInteractionPanel({ conversationId, running }: { conversationId: string; running: boolean }) {
  const [pending, setPending] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setPending([]); setAnswers({}); setError("");
    const receive = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail || detail.conversation_id !== conversationId) return;
      if (detail.type === "agent_interaction") {
        setPending((items) => items.some((v) => v.interaction_id === detail.interaction_id) ? items : [...items, detail]);
      } else if (detail.type === "agent_interaction_resolved") {
        setPending((items) => items.filter((v) => v.interaction_id !== detail.interaction_id));
      }
    };
    document.addEventListener(AI_AGENT_EVENT, receive);
    return () => document.removeEventListener(AI_AGENT_EVENT, receive);
  }, [conversationId]);
  useEffect(() => { if (!running) setPending([]); }, [running]);
  const current = pending[0];
  useEffect(() => {
    const fields = current?.request?.requestedSchema?.properties || {};
    const initial = Object.fromEntries(Object.entries(fields).flatMap(([name, field]: [string, any]) =>
      Object.hasOwn(field, "default") ? [[name, field.default]] : field.type === "boolean" ? [[name, false]] : []));
    setAnswers(initial); setError("");
  }, [current?.interaction_id]);
  if (!current || !running) return null;
  const request = current.request;
  const properties: Record<string, any> = request.requestedSchema?.properties || {};

  async function respond(answer: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      await answerAgentInteraction(current.interaction_id, answer);
      setPending((items) => items.filter((v) => v.interaction_id !== current.interaction_id)); setAnswers({});
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="reader-ai-agent-interaction" aria-label="Agent 请求确认" aria-live="polite">
    <div className="reader-ai-agent-interaction-head"><ShieldCheck size={17} aria-hidden="true" /><strong>{current.connection_name} {current.kind === "permission" ? "请求权限" : "需要你的补充"}</strong></div>
    <p>{request.message || request.toolCall?.title || "请确认本次操作"}</p>
    {current.kind === "permission" && request.toolCall?.rawInput?.command ? <pre className="reader-ai-agent-command">{String(request.toolCall.rawInput.command).slice(0, 4000)}</pre> : null}
    {current.kind === "permission" && request.toolCall?.locations?.length ? <p className="reader-ai-connection-notice">{request.toolCall.locations.map((v: any) => v.path).filter(Boolean).join("、")}</p> : null}
    {current.kind === "form" ? <form onSubmit={(e) => { e.preventDefault(); void respond({ action: "accept", content: answers }); }}>
      {Object.entries(properties).map(([name, schema]) => <label className="reader-ai-agent-form-field" key={name}>
        <span>{schema.title || name}{request.requestedSchema?.required?.includes(name) ? " *" : ""}</span>
        {schema.description ? <small>{schema.description}</small> : null}
        {schema.type === "array" && schema.items?.enum ? <select multiple aria-label={schema.title || name} value={Array.isArray(answers[name]) ? answers[name] as string[] : []}
          onChange={(e) => setAnswers((v) => ({ ...v, [name]: Array.from(e.target.selectedOptions, (item) => item.value) }))}>
          {schema.items.enum.map((value: string) => <option key={value} value={value}>{value}</option>)}</select>
          : schema.enum ? <select aria-label={schema.title || name} required={request.requestedSchema?.required?.includes(name)} value={String(answers[name] ?? "")}
          onChange={(e) => setAnswers((v) => ({ ...v, [name]: e.target.value }))}><option value="">请选择</option>{schema.enum.map((v: string) => <option key={v} value={v}>{v}</option>)}</select>
          : <input aria-label={schema.title || name} type={schema.type === "boolean" ? "checkbox" : ["integer", "number"].includes(schema.type) ? "number" : "text"}
              value={schema.type === "boolean" ? undefined : String(answers[name] ?? "")}
              checked={schema.type === "boolean" ? Boolean(answers[name]) : undefined}
              min={schema.minimum} max={schema.maximum} minLength={schema.minLength} maxLength={schema.maxLength}
              step={schema.type === "number" ? "any" : undefined}
              required={schema.type !== "boolean" && request.requestedSchema?.required?.includes(name)}
              onChange={(e) => setAnswers((v) => ({ ...v, [name]: schema.type === "boolean" ? e.target.checked : ["integer", "number"].includes(schema.type) ? Number(e.target.value) : e.target.value }))} />}
      </label>)}
      <div className="reader-ai-agent-interaction-actions"><button type="submit" disabled={busy}>发送补充</button><button type="button" disabled={busy} onClick={() => void respond({ action: "decline" })}>拒绝</button><button type="button" disabled={busy} onClick={() => void respond({ action: "cancel" })}>取消</button></div>
    </form> : <div className="reader-ai-agent-interaction-actions">
      {request.options?.map((option: any) => <button type="button" disabled={busy} key={option.optionId} onClick={() => void respond({ option_id: option.optionId })}>{option.name}</button>)}
      <button type="button" disabled={busy} onClick={() => void respond({})}>取消</button>
    </div>}
    {error ? <p role="alert" className="reader-ai-connection-error">{error}</p> : null}
  </section>;
}
