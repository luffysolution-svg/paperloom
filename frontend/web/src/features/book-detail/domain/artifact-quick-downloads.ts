// 常用下载投影：从 sections 里挑出四种稳定入口，全局按生成时间取最新。
// 不存在的入口返回 null，由 UI 呈现为不可用空态。

import type {
  ArtifactCenterItem,
  ArtifactCenterSection,
  ArtifactQuickDownloads,
} from "./artifact-center-types.js";

function latestArtifact(items: ArtifactCenterItem[]): ArtifactCenterItem | null {
  if (!items.length) return null;
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.generatedAt || "") || 0;
    const rightTime = Date.parse(right.generatedAt || "") || 0;
    return rightTime - leftTime;
  })[0] || null;
}

/** 常用下载只投影五种稳定入口；完整产物仍由文件 Tab 展示。 */
export function selectArtifactQuickDownloads(
  sections: ArtifactCenterSection[] = [],
): ArtifactQuickDownloads {
  const items = sections.flatMap((section) => section.items);
  const byLabel = (label: string) => latestArtifact(items.filter((item) => item.label === label));
  return {
    source: latestArtifact(items.filter((item) => item.group === "source" && item.kind === "PDF")),
    markdown: byLabel("Markdown") || latestArtifact(items.filter((item) => item.label.startsWith("Markdown"))),
    translated: byLabel("译文 PDF"),
    comparison: byLabel("对照 PDF"),
    word: byLabel("Word 排版稿"),
  };
}
