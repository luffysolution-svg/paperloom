// 处理流水线轨道：把 OCR / 翻译 / 渲染 / 完成 画成同一条流程，
// OCR 不再是与翻译并列的独立能力，而是流水线第一站。
//
// 承接原有 DOM 契约（测试与门禁依赖）：
// - 根节点 data-translation-process="true"，四个站点各带 data-stage-key；
// - OCR 站带 data-processing-capability="ocr"，翻译站带 ="translation"；
// - 两站内各有一个 .book-detail-status 显示该站状态，翻译站还带一句说明。
//
// loading（首帧未知）：任务数据还没回来时，轨道只占位不下结论——四站显示
// 「读取中…」，data-state="loading"，根节点带 data-loading="true"。
// 曾经这里没有这个态，首帧一律按 pending 渲染成「未执行 / 尚未翻译」，
// 而那份文档的 OCR 其实正在跑。视觉沿用 is-pending 的样式类，
// 避免引入尚未打进 CSS 产物的新类名。

import { Check, TriangleAlert, X } from "lucide-react";

import type { LibraryCardItem } from "@/features/library/domain.js";
import { translationProcessModel } from "../../../domain/translation-process-model.js";

const STAGES = [
  { key: "ocr", label: "OCR" },
  { key: "translate", label: "翻译" },
  { key: "render", label: "渲染" },
  { key: "done", label: "完成" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];
type StepState = "pending" | "active" | "done" | "failed" | "cancelled";

type StatusTone = { label?: string; tone?: string };

function toneOf(state: string): string {
  if (state === "done") return "done";
  if (state === "active") return "active";
  if (state === "failed") return "failed";
  return "muted";
}

/** 没有翻译 job 时，用 OCR 状态推出轨道（翻译及之后为待执行）。 */
function deriveOcrModel(ocrStatus: StatusTone = {}) {
  const state: StepState = ocrStatus.tone === "active"
    ? "active"
    : ocrStatus.tone === "done"
      ? "done"
      : ocrStatus.tone === "failed"
        ? "failed"
        : "pending";
  return {
    currentStage: state === "pending" ? "" : "ocr",
    status: "",
    ocrReused: false,
    steps: STAGES.map((stage) => ({
      ...stage,
      state: (stage.key === "ocr" ? state : "pending") as StepState,
    })),
  };
}

/** 首帧未知：四站都停在占位，不声称任何一站「没跑过」。 */
function loadingModel() {
  return {
    currentStage: "",
    status: "",
    ocrReused: false,
    steps: STAGES.map((stage) => ({ ...stage, state: "pending" as StepState })),
  };
}

function StepMark({ state }: { state: string }) {
  if (state === "done") return <Check aria-hidden="true" />;
  if (state === "failed") return <TriangleAlert aria-hidden="true" />;
  if (state === "cancelled") return <X aria-hidden="true" />;
  return <span className="book-detail-pipeline-mark-idle" aria-hidden="true" />;
}

export type ProcessingPipelineRailProps = {
  item?: LibraryCardItem;
  hasTranslationJob?: boolean;
  ocrStatus?: StatusTone;
  translationStatus?: StatusTone;
  /** 翻译站说明，例如"复用已有 OCR，直接翻译并生成阅读产物" */
  translationDescription?: string;
  /** 首帧未知：任务数据还没回来，轨道只占位，不给「未执行 / 尚未翻译」的结论。 */
  loading?: boolean;
};

export function ProcessingPipelineRail({
  item = {},
  hasTranslationJob = false,
  ocrStatus = {},
  translationStatus = {},
  translationDescription = "",
  loading = false,
}: ProcessingPipelineRailProps) {
  const model = loading
    ? loadingModel()
    : hasTranslationJob ? translationProcessModel(item) : deriveOcrModel(ocrStatus);
  const stationLabels: Record<StageKey, string> = {
    ocr: loading ? "读取中…" : ocrStatus.label || "未执行",
    translate: loading ? "读取中…" : translationStatus.label || "未翻译",
    render: "",
    done: "",
  };

  return (
    <section
      className="book-detail-pipeline"
      aria-label="处理流程"
      data-translation-process="true"
      data-current-stage={model.currentStage}
      data-status={model.status}
      {...(loading ? { "data-loading": "true", "aria-busy": true } : {})}
    >
      <ol className="book-detail-pipeline-track" aria-label="OCR、翻译、渲染、完成">
        {STAGES.map((stage) => {
          const step = model.steps.find((entry) => entry.key === stage.key)
            || { key: stage.key, label: stage.label, state: "pending" as StepState };
          const capability = stage.key === "ocr"
            ? "ocr"
            : stage.key === "translate"
              ? "translation"
              : undefined;
          const label = stage.key === "ocr" && model.ocrReused ? "OCR 复用" : stage.label;
          return (
            <li
              key={stage.key}
              className={`book-detail-pipeline-stage is-${step.state}`}
              data-stage-key={stage.key}
              data-state={loading ? "loading" : step.state}
              {...(capability ? { "data-processing-capability": capability } : {})}
            >
              <span className="book-detail-pipeline-rail" aria-hidden="true">
                <span className="book-detail-pipeline-dot">
                  <StepMark state={step.state} />
                </span>
              </span>
              <span className="book-detail-pipeline-copy">
                <span className="book-detail-pipeline-head">
                  <span className="book-detail-pipeline-label">{label}</span>
                  {capability ? (
                    <span className={`book-detail-status book-detail-pipeline-status is-${toneOf(step.state)}`}>
                      {stationLabels[stage.key]}
                    </span>
                  ) : null}
                </span>
                {stage.key === "translate" && translationDescription ? (
                  <span className="book-detail-pipeline-desc">{translationDescription}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
