import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FolderOpen, Terminal } from "lucide-react";
import { Badge, Button, SegmentedControl, type SegmentedOption } from "@retainpdf/ui";
import {
  AGENT_CATALOG,
  SKILL_ITEMS,
  buildManualSnippets,
  compactDisplayPath,
  type ManualConfigTarget,
} from "./agent-integration-catalog.js";

const TARGET_OPTIONS: ReadonlyArray<SegmentedOption<ManualConfigTarget>> = [
  { value: "universal", label: "通用 JSON" },
  ...AGENT_CATALOG.map((item) => ({ value: item.id, label: item.label })),
];

export interface AgentManualConfigSectionProps {
  cliPath: string;
  homeDir?: string;
  platform?: string;
  sharedSkillsDir?: string;
  workbuddyConfigPath?: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "true");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function AgentManualConfigSection({
  cliPath,
  homeDir,
  platform,
  sharedSkillsDir,
  workbuddyConfigPath,
}: AgentManualConfigSectionProps) {
  const [target, setTarget] = useState<ManualConfigTarget>("universal");
  const [copiedId, setCopiedId] = useState<string>("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const snippets = useMemo(
    () => buildManualSnippets(target, { cliPath, homeDir, platform, workbuddyConfigPath }),
    [cliPath, homeDir, platform, target, workbuddyConfigPath],
  );

  const skillsDisplayPath = compactDisplayPath(sharedSkillsDir || "~/.agents/skills", homeDir);

  async function handleCopy(id: string, value: string) {
    const ok = await copyText(value);
    if (!ok) return;
    setCopiedId(id);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopiedId(""), 1800);
  }

  return (
    <div className="agent-integration-manual" data-agent-manual-section>
      <SegmentedControl<ManualConfigTarget>
        label="选择客户端配置模板"
        size="sm"
        value={target}
        options={TARGET_OPTIONS}
        onChange={setTarget}
        className="agent-integration-target-tabs"
      />

      <div className="agent-integration-snippet-list">
        {snippets.map((snippet) => {
          const copied = copiedId === snippet.id;
          return (
            <article key={snippet.id} className="agent-integration-code-card">
              <header className="agent-integration-code-head">
                <div className="agent-integration-code-meta">
                  <span className="agent-integration-code-title">
                    <Terminal size={13} aria-hidden />
                    <strong>{snippet.title}</strong>
                  </span>
                  <span className="agent-integration-code-path">{snippet.pathLabel}</span>
                </div>
                <div className="agent-integration-code-actions">
                  <Badge tone="muted">{snippet.language}</Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopy(snippet.id, snippet.code)}
                    data-copy-snippet={snippet.id}
                  >
                    {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                    {copied ? "已复制" : "复制"}
                  </Button>
                </div>
              </header>
              <pre className="agent-integration-code-pre"><code>{snippet.code}</code></pre>
              {snippet.note ? <p className="agent-integration-code-note">{snippet.note}</p> : null}
            </article>
          );
        })}
      </div>

      <article className="agent-integration-skills-box">
        <header className="agent-integration-code-head">
          <div className="agent-integration-code-meta">
            <span className="agent-integration-code-title">
              <FolderOpen size={13} aria-hidden />
              <strong>科研 Skills 统一共享目录</strong>
            </span>
            <span className="agent-integration-code-path">{skillsDisplayPath}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy("skills-dir", sharedSkillsDir || "~/.agents/skills")}
          >
            {copiedId === "skills-dir" ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
            {copiedId === "skills-dir" ? "已复制路径" : "复制路径"}
          </Button>
        </header>
        <div className="agent-integration-skill-chips">
          {SKILL_ITEMS.map((skill) => (
            <div key={skill.id} className="agent-integration-skill-chip">
              <code>{skill.id}</code>
              <span>{skill.desc}</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
