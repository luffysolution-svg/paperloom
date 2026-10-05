// 提问范围（@ 文档 / 合集）→ 模型 prompt，以及合集展开为文档列表
//
// 纯逻辑：不发 UI 状态、不依赖 React；合集展开失败时降级为仅靠 prompt 里的合集名提示。

import { resolveCollectionDocuments } from "./document-picker.js";
import type { HomeAskDocScope, HomeAskScope } from "./types.js";

function labelScope(s: HomeAskScope): string {
  if (s.kind === "collection") {
    const n = s.document_count != null ? `（${s.document_count} 篇）` : "";
    return `合集「${s.title}」${n}`;
  }
  return `文档「${s.title}」`;
}

export function buildScopedQuestion(
  question: string,
  scopes: HomeAskScope[],
  resolvedDocs: HomeAskDocScope[] = [],
): string {
  const q = `${question || ""}`.trim();
  if (!q) return "";
  if (!scopes.length) return q;

  const hasCollection = scopes.some((s) => s.kind === "collection");
  if (!hasCollection && scopes.length === 1 && scopes[0].kind === "document") {
    return `（范围：文档「${scopes[0].title}」）${q}`;
  }

  const scopeLines = scopes.map((s, i) => `${i + 1}. ${labelScope(s)}`).join("\n");
  if (resolvedDocs.length > 0) {
    const docLines = resolvedDocs
      .slice(0, 40)
      .map((d, i) => `  ${i + 1}. ${d.title} (document_id=${d.id})`)
      .join("\n");
    const more = resolvedDocs.length > 40 ? `\n  …共 ${resolvedDocs.length} 篇` : "";
    return (
      `请仅在下列范围内检索与回答（不要使用范围外的文献）：\n`
      + `范围选择：\n${scopeLines}\n`
      + `包含文档：\n${docLines}${more}\n\n`
      + `问题：${q}`
    );
  }
  return `请在以下范围内检索并回答：\n${scopeLines}\n\n问题：${q}`;
}

/** 展开 scopes → 文档列表；单文档硬 scope 时返回 primary */
export async function resolveScopesForAsk(scopes: HomeAskScope[]): Promise<{
  primaryDoc: HomeAskDocScope | null;
  resolvedDocs: HomeAskDocScope[];
}> {
  if (!scopes.length) {
    return { primaryDoc: null, resolvedDocs: [] };
  }

  const docs: HomeAskDocScope[] = [];
  const seen = new Set<string>();

  for (const s of scopes) {
    if (s.kind === "document") {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        docs.push(s);
      }
      continue;
    }
    try {
      const list = await resolveCollectionDocuments(s.id, 100);
      for (const d of list) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          docs.push(d);
        }
      }
    } catch {
      // 合集展开失败时仍靠 prompt 里的合集名提示模型
    }
  }

  // 仅一个文档（无论直接 @ 还是合集里只有一篇）→ 硬限定
  const primaryDoc = docs.length === 1 ? docs[0] : null;
  return { primaryDoc, resolvedDocs: docs };
}
