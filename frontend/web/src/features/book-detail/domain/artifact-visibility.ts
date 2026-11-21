// 文件页的可见性：每个分组只把「最终那份」用得上的文件摆在明面上，其余收进默认折叠的「调试文件」。
//
// 一本书常有好几次任务（失败重试、重新渲染），每次任务都带一整套文件；同一次任务里也会有
// 两个键指向同一份内容（layout_json 和 provider_result_json 都是 paddle_result.json）。
// 全摊开的话同名文件出现两三次、排查日志和 Markdown 一样显眼，用户分不清该下哪个。
//
// 这里只决定「怎么摆」，不删任何文件：sections 本身原样保留（左栏快捷下载也从它挑最新的），
// 被收起来的文件在调试区里仍然能下载。

import type { ArtifactCenterItem, ArtifactCenterSection } from "./artifact-center-types.js";

export type ArtifactDebugEntry = {
  item: ArtifactCenterItem;
  /** 所在分组的名字（调试区把各组的文件放在一起，靠它分辨来源）。 */
  sectionLabel: string;
  /** true：同类文件有更新的一份，这份是旧任务留下的。 */
  superseded: boolean;
  /** 「翻译与阅读」里已经有同名文件，这份是 OCR 组里的重复。 */
  duplicate?: boolean;
};

export type ArtifactCenterLayout = {
  sections: ArtifactCenterSection[];
  debug: ArtifactDebugEntry[];
};

function jobRank(section: ArtifactCenterSection, item: ArtifactCenterItem): number {
  // 成功任务的文件优先于失败 / 取消任务的同类文件，哪怕失败的那次更晚。
  const job = section.jobs.find((candidate) => candidate.jobId === item.jobId);
  return !job || job.status === "succeeded" ? 1 : 0;
}

function isNewer(section: ArtifactCenterSection, left: ArtifactCenterItem, right: ArtifactCenterItem): boolean {
  const rank = jobRank(section, left) - jobRank(section, right);
  if (rank !== 0) return rank > 0;
  const time = (Date.parse(left.generatedAt || "") || 0) - (Date.parse(right.generatedAt || "") || 0);
  if (time !== 0) return time > 0;
  return (left.attempt ?? 0) > (right.attempt ?? 0);
}

/** 把每个分组拆成「明面上的文件」和「调试文件」。同类（同一个人话标签）只留最新的一份。 */
export function layoutArtifactCenter(sections: ArtifactCenterSection[] = []): ArtifactCenterLayout {
  const debug: ArtifactDebugEntry[] = [];
  const visible = sections.map((section) => {
    const latestByLabel = new Map<string, ArtifactCenterItem>();
    for (const item of section.items) {
      if (item.debug) continue;
      const current = latestByLabel.get(item.label);
      if (!current || isNewer(section, item, current)) latestByLabel.set(item.label, item);
    }
    const items: ArtifactCenterItem[] = [];
    for (const item of section.items) {
      if (!item.debug && latestByLabel.get(item.label) === item) {
        items.push(item);
      } else {
        debug.push({ item, sectionLabel: section.label, superseded: !item.debug });
      }
    }
    return { ...section, items };
  });
  // 跨组去重：OCR 组和「翻译与阅读」组常各有一份 Markdown、结构化文档、Markdown 任务包
  // （分别来自 OCR 任务和翻译任务）。以「翻译与阅读」为准 —— 用户要的成品在那里；OCR 组里
  // 同名的收进调试区。翻译组没有的（例如只做了 OCR 的书）OCR 组照常摆。
  const translationLabels = new Set(
    visible.find((section) => section.id === "translation")?.items.map((item) => item.label) || [],
  );
  const deduped = visible.map((section) => {
    if (section.id !== "ocr" || !translationLabels.size) return section;
    const items = section.items.filter((item) => {
      if (!translationLabels.has(item.label)) return true;
      debug.push({ item, sectionLabel: section.label, superseded: false, duplicate: true });
      return false;
    });
    return { ...section, items, mergedIntoTranslation: section.items.length > 0 && items.length === 0 };
  });
  return {
    // 只剩调试文件、又没有任务可说的分组（典型是「诊断与报告」）整组收起，不留一张空卡。
    sections: deduped.filter((section) => section.items.length > 0 || section.jobs.length > 0),
    debug,
  };
}
