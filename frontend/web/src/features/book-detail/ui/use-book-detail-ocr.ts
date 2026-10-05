import { useState } from "react";
import { usePageRange } from "./use-page-range.js";

export function useBookDetailOcr({
  open,
  documentId,
  pageCount,
  actions,
  onStarted,
  onCancelled,
}: any) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const range = usePageRange({ open, documentId, pageCount });

  async function handleOcr() {
    const payload: any = { workflow: "ocr" };
    if (range.rangeOn) {
      const checked = range.validateRange();
      if (!checked.valid) {
        setError(checked.error);
        return;
      }
      payload.ocr = { page_ranges: `${checked.s}-${checked.e}` };
    }
    setError("");
    setPending(true);
    try {
      const result = await actions.submitDocument(documentId, payload);
      if (result) {
        await onStarted?.({
          ...result,
          document_id: result.document_id || documentId,
          workflow: result.workflow || "ocr",
        });
      }
    } catch (cause) {
      setError(`${cause?.message || cause || "发起 OCR 失败"}`);
    } finally {
      setPending(false);
    }
  }

  // 取消运行中的 OCR 任务（jobId 由详情侧从当前 OCR 状态任务取出）。
  async function handleCancel(jobId?: string | null) {
    const id = `${jobId || ""}`.trim();
    if (!id || cancelling) return;
    setError("");
    setCancelling(true);
    try {
      await actions.cancelJob?.(id, "ocr");
      await onCancelled?.();
    } catch (cause) {
      setError(`${cause?.message || cause || "取消 OCR 失败"}`);
    } finally {
      setCancelling(false);
    }
  }

  return {
    ...range,
    error,
    pending,
    cancelling,
    handleOcr,
    handleCancel,
  };
}
