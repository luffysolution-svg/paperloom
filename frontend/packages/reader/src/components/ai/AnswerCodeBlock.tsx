// 回答里的代码块：语言标签 + 复制按钮。
//
// 正文仍然交给 markstream 的 <pre> 渲染。它自带的富代码块**没有**启用，是有意的：
// 那套东西带 HTML 预览 iframe，而这个渲染器周围写着「AI 输出不可信」、htmlPolicy 设成
// escape，把模型写的 HTML 放进 iframe 预览正是它在防的事。
//
// 所以这里只包一层外壳。没有语法高亮——那需要一个真正的词法分析器，手写不靠谱，
// 引 shiki/prism 是一次依赖决定，不该顺手塞进来。

import { useCallback, useState } from "react";

const COPIED_MS = 1600;

/** 语言标签的显示名。markstream 给的是围栏里的原文，统一一下大小写。 */
function displayLanguage(raw: string): string {
  const language = `${raw || ""}`.trim().toLowerCase();
  if (!language || language === "text" || language === "plain") return "";
  const NAMES: Record<string, string> = {
    js: "JavaScript",
    jsx: "JSX",
    ts: "TypeScript",
    tsx: "TSX",
    py: "Python",
    python: "Python",
    rs: "Rust",
    rust: "Rust",
    sh: "Shell",
    bash: "Shell",
    zsh: "Shell",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    sql: "SQL",
    html: "HTML",
    css: "CSS",
    md: "Markdown",
    markdown: "Markdown",
  };
  return NAMES[language] || language;
}

export function AnswerCodeBlock({
  language,
  code,
  children,
}: {
  language: string;
  code: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const label = displayLanguage(language);

  const copy = useCallback(() => {
    const text = `${code || ""}`;
    if (!text.trim()) return;
    // 剪贴板在非安全上下文或被拒权限时会 reject。失败就不变成对勾——
    // 按钮没变就是没复制上，不假装成功。
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        globalThis.setTimeout?.(() => setCopied(false), COPIED_MS);
      },
      () => {},
    );
  }, [code]);

  return (
    <div className="reader-answer-code">
      <div className="reader-answer-code-bar">
        <span className="reader-answer-code-lang">{label}</span>
        <button
          type="button"
          className="reader-answer-code-copy"
          onClick={copy}
          title="复制代码"
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      {children}
    </div>
  );
}
