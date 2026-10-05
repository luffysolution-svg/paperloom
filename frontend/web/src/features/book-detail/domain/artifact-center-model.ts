// 产物中心模型 façade：对外保持稳定的导出名与导入路径。
// 实现按职责拆分到同级模块：
//   artifact-center-types       类型定义
//   artifact-values             低层取值/归一化
//   artifact-classification     分组、标签、预览判定
//   artifact-resources          下载 URL 解析与细清单补全
//   artifact-center-sections    section 组装与可见性过滤
//   artifact-quick-downloads    常用下载投影与排序
//   artifact-format             字节/时间格式化

export type {
  AgentArtifactProjection,
  ArtifactCenterGroupId,
  ArtifactCenterItem,
  ArtifactCenterJob,
  ArtifactCenterSection,
  ArtifactLinks,
  ArtifactManifest,
  ArtifactManifestItem,
  ArtifactQuickDownloadId,
  ArtifactQuickDownloads,
  ArtifactResourceLink,
  BuildArtifactCenterInput,
} from "./artifact-center-types.js";

export { buildArtifactCenterSections } from "./artifact-center-sections.js";
export { mergeArtifactLinksIntoManifest } from "./artifact-resources.js";
export { selectArtifactQuickDownloads } from "./artifact-quick-downloads.js";
export { formatArtifactBytes, formatArtifactTime } from "./artifact-format.js";
