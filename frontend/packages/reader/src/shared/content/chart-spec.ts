// 回答里的图表：声明式规格的解析与校验。
//
// 模型给的是**数据 + 图表类型**，不是 SVG。让模型直接吐 SVG 有两个问题：一是画出来
// 的东西不可靠（坐标、比例、文字溢出全靠它自己算），二是那是一段要塞进页面的标记，
// 等于给注入开了一道门——之前为同一类问题已经把 MathJax 的 html 包摘掉过。
//
// 规格由我们自己渲染，因此可以吃现有的主题变量，也不用引图表库。

/** 回答里标记图表块用的 fence 语言标签。 */
export const CHART_FENCE_LANGUAGE = "retainpdf-chart";

export type ChartKind = "bar" | "line" | "pie";

export type ChartPoint = {
  label: string;
  value: number;
};

export type ChartSeries = {
  name: string;
  points: ChartPoint[];
};

export type ChartSpec = {
  kind: ChartKind;
  title: string;
  xLabel: string;
  yLabel: string;
  series: ChartSeries[];
};

/** 一次最多画多少个系列 / 多少个点。超出的截断，而不是画成一团糊。 */
export const MAX_SERIES = 6;
export const MAX_POINTS = 40;

const KINDS: ReadonlySet<string> = new Set(["bar", "line", "pie"]);

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toText(value: unknown, fallback = ""): string {
  const text = `${value ?? ""}`.trim();
  return text || fallback;
}

function parsePoints(raw: unknown): ChartPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: ChartPoint[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const value = toFiniteNumber(item.value ?? item.y);
    // 缺值的点直接丢：补 0 会凭空造出一个"这里是零"的结论。
    if (value === null) continue;
    points.push({ label: toText(item.label ?? item.x, `${points.length + 1}`), value });
    if (points.length >= MAX_POINTS) break;
  }
  return points;
}

function parseSeries(raw: unknown): ChartSeries[] {
  if (!Array.isArray(raw)) return [];
  const series: ChartSeries[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const points = parsePoints(item.points ?? item.data);
    if (!points.length) continue;
    series.push({ name: toText(item.name, `系列 ${series.length + 1}`), points });
    if (series.length >= MAX_SERIES) break;
  }
  return series;
}

/**
 * 解析图表规格。任何一处不成立都返回 null——调用方据此退回普通代码块显示，
 * 让用户至少看得见模型原本写了什么，而不是一个空白或半截图形。
 */
export function parseChartSpec(source: string): ChartSpec | null {
  const text = `${source || ""}`.trim();
  if (!text) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    // 流式过程中 JSON 还没写完，解析失败是常态，不是错误。
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const item = raw as Record<string, unknown>;
  const kind = `${item.kind ?? item.type ?? ""}`.trim().toLowerCase();
  if (!KINDS.has(kind)) return null;

  const series = parseSeries(item.series);
  if (!series.length) return null;

  // 饼图只有一个系列有意义；多给了就取第一个，而不是叠着画。
  const normalized = kind === "pie" ? series.slice(0, 1) : series;

  return {
    kind: kind as ChartKind,
    title: toText(item.title),
    xLabel: toText(item.xLabel ?? item.x_label),
    yLabel: toText(item.yLabel ?? item.y_label),
    series: normalized,
  };
}

/**
 * 纵轴范围。
 *
 * 含负数时必须把 0 包进来，否则柱子会从画布底部长出来、读者看不出正负。全正的数据
 * 也从 0 起——柱状图截断基线是最经典的误导手法。
 */
export function valueDomain(spec: ChartSpec): { min: number; max: number } {
  const values = spec.series.flatMap((s) => s.points.map((p) => p.value));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const min = Math.min(0, rawMin);
  const max = Math.max(0, rawMax);
  // 所有值都相同（含全 0）时给一个非零跨度，免得后面除以 0。
  if (min === max) return { min, max: max + 1 };
  return { min, max };
}

/** 横轴上的标签，取各系列里最长的那条。 */
export function categoryLabels(spec: ChartSpec): string[] {
  let longest: ChartPoint[] = [];
  for (const s of spec.series) {
    if (s.points.length > longest.length) longest = s.points;
  }
  return longest.map((p) => p.label);
}
