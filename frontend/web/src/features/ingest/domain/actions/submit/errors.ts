import { isRefusedSubmission } from "@/platform/api/index.js";
import { buildErrorDiagnostic } from "@/platform/utils/error-diagnostics.js";
import type { RunSubmitFlowOptions, SetTextFn } from "./contracts.js";

// 提交失败的归一口径：missing_upload 由调用方判定并复位上传态；其余错误统一
// 落 error-box 诊断（operation/url/details 与原 submit-flow.ts 一致）。页数额度不够、磁盘空间不够
// 不是故障，直接显示那句中文，不给诊断。
export function reportSubmitError({
  err,
  workflow,
  apiPrefix,
  uploadId,
  currentRenderSourceJobId,
  setText,
}: {
  err: unknown;
  workflow?: string;
  apiPrefix?: string;
  uploadId?: string;
  currentRenderSourceJobId?: RunSubmitFlowOptions["currentRenderSourceJobId"];
  setText: SetTextFn;
}) {
  if (isRefusedSubmission(err)) {
    setText("error-box", (err as Error).message);
    return;
  }
  setText("error-box", buildErrorDiagnostic(err, {
    operation: "提交 PDF 任务",
    url: `${apiPrefix || ""}/jobs`,
    details: {
      workflow,
      upload_id: uploadId,
      render_source_job_id: currentRenderSourceJobId?.(),
    },
  }));
}
