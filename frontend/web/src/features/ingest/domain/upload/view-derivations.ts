// upload 视图端口的派生 helper（纯函数）。
//
// 从 upload-store.ts 抽出：把「从原始入参算出要写入 store 的值」这段无副作用
// 逻辑独立出来，便于直接单测。

import type { UploadFileLabelSource } from "./view-state.js";

/** 上传进度：有合法 loaded/total 算出百分比文案，否则给不确定态 18%。 */
export function resolveUploadProgress(
  loaded: number,
  total: number,
): { percent: number; text: string } {
  const hasNumbers = Number.isFinite(loaded) && Number.isFinite(total) && total > 0;
  const percent = hasNumbers
    ? Math.max(0, Math.min(100, (loaded / total) * 100))
    : 18;
  return {
    percent,
    text: hasNumbers ? `上传中 ${percent.toFixed(0)}%` : "上传中",
  };
}

/** 文件标签：有名字用名字（并带 title），否则退回默认文案。 */
export function resolveFileLabel(
  file: UploadFileLabelSource,
  defaultFileLabel: string,
): { label: string; labelTitle: string } {
  const name = file?.name ? `${file.name}` : "";
  return {
    label: name || defaultFileLabel,
    labelTitle: name,
  };
}
