// 展示组件边界：只收 props 发回调，不直连 services/store；
// 提交禁用/文案由 UploadTile 容器按凭据·预算就绪态映射为 submit* props。
// 提交按钮常显：不可提交时保持禁用，但用 title + 下方一行 submit-hint
// 说明原因与下一步（选文件 / 补凭据 / 设术语表），hint 内的动作按钮用
// DOM 级导航把用户带到缺失项（#file / 凭据设置事件），不新增 props。
import type { ReactNode } from "react";
import { Languages, Loader2, ScanSearch, SlidersHorizontal } from "lucide-react";
import { APP_EVENTS } from "@/platform/contracts/app-contract.js";

type ProcessingChoicePanelProps = {
  visible: boolean;
  uploadReady: boolean;
  submitBusy: boolean;
  submitDisabled: boolean;
  submitLabel: string;
  ocrOnly: boolean;
  pageRangeButtonVisible: boolean;
  pageRangeOpen: boolean;
  onToggleTranslationOptions: () => void;
  onStoreOnly: () => void;
  translationOptionsSlot: ReactNode;
};

export function ProcessingChoicePanel({
  visible,
  uploadReady,
  submitBusy,
  submitDisabled,
  submitLabel,
  ocrOnly,
  pageRangeButtonVisible,
  pageRangeOpen,
  onToggleTranslationOptions,
  onStoreOnly,
  translationOptionsSlot,
}: ProcessingChoicePanelProps) {
  // 禁用原因与下一步：仅凭 uploadReady/submitDisabled 即可区分
  // 「缺文件」与「文件就绪但被凭据·预算·源任务拦住」两类。
  const blocked = submitDisabled && !submitBusy;
  const missingUpload = !uploadReady;
  let submitTitle = ocrOnly ? "上传完成后开始 OCR" : "上传完成后开始翻译";
  let hintText = "";
  let hintActionLabel = "";
  if (blocked && missingUpload) {
    submitTitle = "请先选择 PDF 文件并等待上传完成";
    hintText = "请先选择 PDF 文件并等待上传完成，再提交任务。";
    hintActionLabel = "选择文件";
  } else if (blocked) {
    submitTitle = "请先完成接口设置后再提交";
    hintText = "文件已就绪，提交前请先完成接口设置，也可在选项中设置术语表。";
    hintActionLabel = "打开设置";
  }

  // hint 动作：把用户带到缺失项。缺文件 → 打开发布文件框；已就绪被拦 →
  // 打开浏览器凭据设置（与 CredentialGateNotice 同一事件）。
  function handleHintAction() {
    if (typeof document === "undefined") return;
    if (missingUpload) {
      const input = document.getElementById("file");
      if (input instanceof HTMLInputElement && !input.disabled) {
        input.click();
        return;
      }
      (input as HTMLElement | null)?.focus?.();
      return;
    }
    document.dispatchEvent(new CustomEvent(APP_EVENTS.openBrowserCredentials));
  }

  return (
    <div id="upload-action-slot" className={`upload-action-slot${visible ? "" : " hidden"}`}>
      <div className="upload-action-group">
        <button
          id="page-range-btn"
          type="button"
          className={`page-range-mini secondary${pageRangeButtonVisible && !ocrOnly ? "" : " hidden"}`}
          aria-label="翻译选项"
          aria-expanded={pageRangeOpen}
          title="设置页码范围和术语表"
          onClick={onToggleTranslationOptions}
        >
          <SlidersHorizontal aria-hidden="true" />
          选项
        </button>
        <button
          id="store-only-btn"
          type="button"
          className={`secondary${uploadReady ? "" : " hidden"}`}
          disabled={!uploadReady || submitBusy}
          title="只加入书架，稍后再处理"
          onClick={onStoreOnly}
        >
          仅收藏
        </button>
        <button
          id="submit-btn"
          type="submit"
          disabled={submitDisabled || submitBusy}
          {...(submitBusy ? { "data-busy": "1" } : {})}
          {...(blocked && hintText ? { "aria-describedby": "submit-hint" } : {})}
          title={submitTitle}
        >
          {submitBusy ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : ocrOnly ? (
            <ScanSearch aria-hidden="true" />
          ) : (
            <Languages aria-hidden="true" />
          )}
          {submitBusy ? "提交中…" : ocrOnly ? "开始 OCR" : submitLabel || "直接翻译"}
        </button>
      </div>

      {hintText ? (
        <p id="submit-hint" className="submit-hint" aria-live="polite">
          <span className="submit-hint-text">{hintText}</span>
          <button type="button" className="submit-hint-action secondary" onClick={handleHintAction}>
            {hintActionLabel}
          </button>
        </p>
      ) : null}

      {translationOptionsSlot}
    </div>
  );
}
