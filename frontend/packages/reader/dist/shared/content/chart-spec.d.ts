/** 回答里标记图表块用的 fence 语言标签。 */
export declare const CHART_FENCE_LANGUAGE = "retainpdf-chart";
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
export declare const MAX_SERIES = 6;
export declare const MAX_POINTS = 40;
/**
 * 解析图表规格。任何一处不成立都返回 null——调用方据此退回普通代码块显示，
 * 让用户至少看得见模型原本写了什么，而不是一个空白或半截图形。
 */
export declare function parseChartSpec(source: string): ChartSpec | null;
/**
 * 纵轴范围。
 *
 * 含负数时必须把 0 包进来，否则柱子会从画布底部长出来、读者看不出正负。全正的数据
 * 也从 0 起——柱状图截断基线是最经典的误导手法。
 */
export declare function valueDomain(spec: ChartSpec): {
    min: number;
    max: number;
};
/** 横轴上的标签，取各系列里最长的那条。 */
export declare function categoryLabels(spec: ChartSpec): string[];
//# sourceMappingURL=chart-spec.d.ts.map