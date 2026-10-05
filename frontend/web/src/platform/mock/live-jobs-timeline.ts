// 可推进 mock 任务的时间线定义：相位表、fromStage 归一、按速度缩放的时间线。
// 纯数据/纯函数，不持有任何 job 注册状态。

export type LiveMockFromStage = "upload" | "ocr" | "translate" | "render" | "translation";

export type LiveMockJobMeta = {
  jobId: string;
  documentId?: string;
  title?: string;
  pageCount?: number;
  startedAtMs: number;
  /** 总时长缩放（1 = 默认约 16s 跑完整条；fromStage 时只跑剩余段） */
  speed?: number;
  /**
   * 从哪一阶段开始推进。
   * - 省略 / upload：整条流水线
   * - ocr：跳过排队，从 OCR 起
   * - translate：跳过排队+OCR，从翻译起
   * - render：只跑渲染
   */
  fromStage?: LiveMockFromStage;
};

export type PhaseKey = "upload" | "ocr" | "translate" | "render" | "done";

type PhaseDef = {
  key: PhaseKey;
  status: string;
  stage: string;
  displayStage: string;
  currentStage: string;
  detail: (p: { current: number; total: number; percent: number }) => string;
  durationMs: number;
  unit: string;
  total: number;
};

const PHASES: PhaseDef[] = [
  {
    key: "upload",
    status: "queued",
    stage: "queued",
    displayStage: "ocr",
    currentStage: "queued",
    durationMs: 1_500,
    unit: "none",
    total: 1,
    detail: () => "正在读取文档并排队…",
  },
  {
    key: "ocr",
    status: "running",
    stage: "ocr_processing",
    displayStage: "ocr",
    currentStage: "ocr_processing",
    durationMs: 4_000,
    unit: "page",
    total: 12,
    detail: ({ current, total }) => `正在执行 OCR，第 ${current}/${total} 页`,
  },
  {
    key: "translate",
    status: "running",
    stage: "translating",
    displayStage: "translation",
    currentStage: "translating",
    durationMs: 7_000,
    unit: "batch",
    total: 40,
    detail: ({ current, total }) => `正在翻译正文，第 ${current}/${total} 批`,
  },
  {
    key: "render",
    status: "running",
    stage: "rendering",
    displayStage: "render",
    currentStage: "rendering",
    durationMs: 3_000,
    unit: "page",
    total: 12,
    detail: ({ current, total }) => `正在渲染第 ${current}/${total} 页`,
  },
  {
    key: "done",
    status: "succeeded",
    stage: "finished",
    displayStage: "done",
    currentStage: "finished",
    durationMs: 0,
    unit: "none",
    total: 1,
    detail: () => "处理完成，可以对照阅读",
  },
];

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/** API stage 名 → 流水线 from 相位（done 不作为起点） */
export function normalizeLiveMockFromStage(stage?: string | null): PhaseKey {
  const value = `${stage || ""}`.trim().toLowerCase();
  if (!value || value === "upload" || value === "queued") return "upload";
  if (value === "ocr" || value === "ocr_processing") return "ocr";
  if (
    value === "translate"
    || value === "translation"
    || value === "translating"
  ) {
    return "translate";
  }
  if (value === "render" || value === "rendering") return "render";
  return "upload";
}

function phaseStartIndex(fromStage?: LiveMockFromStage | PhaseKey | string): number {
  const key = normalizeLiveMockFromStage(fromStage);
  const idx = PHASES.findIndex((p) => p.key === key);
  return idx >= 0 ? idx : 0;
}

/**
 * 生成时间线：fromStage 之前的相位 duration=0（瞬间完成），
 * 从 fromStage 起按正常时长推进。
 */
export function phaseTimeline(speed = 1, fromStage?: LiveMockFromStage | PhaseKey | string) {
  const scale = Number.isFinite(speed) && speed > 0 ? speed : 1;
  const startIdx = phaseStartIndex(fromStage);
  let cursor = 0;
  return PHASES.map((phase, index) => {
    // done 始终接在末尾；from 之前的非 done 相位跳过时长
    const skip = index < startIdx && phase.key !== "done";
    const durationMs = skip ? 0 : Math.round(phase.durationMs / scale);
    const startMs = cursor;
    const endMs = cursor + durationMs;
    cursor = endMs;
    return {
      phase,
      startMs,
      endMs,
      durationMs,
      skipped: skip,
    };
  });
}

export { clamp01 };
