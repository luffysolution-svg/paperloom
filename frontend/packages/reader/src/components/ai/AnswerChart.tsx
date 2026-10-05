// 回答里的图表：柱 / 折线 / 饼，手写 SVG。
//
// 不引图表库：只要这三种，而 Chart.js / Recharts 之类都要拖进几十 KB，还得单独把
// 应用的主题色接进去。手写的直接用 currentColor 和 CSS 变量，跟着主题走，reader 包
// 也不用多一个依赖。

import { useId } from "react";
import {
  categoryLabels,
  valueDomain,
  type ChartSeries,
  type ChartSpec,
} from "../../shared/content/chart-spec.js";

const WIDTH = 640;
const HEIGHT = 300;
const PAD = { top: 16, right: 16, bottom: 44, left: 52 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/** 系列配色。用色相环上等距的几个点，深浅主题下都还算得住。 */
const SERIES_COLORS = [
  "var(--chart-1, #4c6ef5)",
  "var(--chart-2, #f08c00)",
  "var(--chart-3, #2f9e44)",
  "var(--chart-4, #e03131)",
  "var(--chart-5, #ae3ec9)",
  "var(--chart-6, #0c8599)",
];

const colorAt = (index: number) => SERIES_COLORS[index % SERIES_COLORS.length];

/** 纵轴刻度值。固定 5 条，够读数又不至于糊成一片。 */
function ticks(min: number, max: number): number[] {
  const steps = 4;
  return Array.from({ length: steps + 1 }, (_, i) => min + ((max - min) * i) / steps);
}

function formatTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000) return `${(value / 1000).toFixed(0)}k`;
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(abs < 1 ? 2 : 1);
}

/** 横轴标签太密就隔几个显示一次，而不是让它们叠在一起。 */
function labelStride(count: number): number {
  if (count <= 8) return 1;
  return Math.ceil(count / 8);
}

function Axes({
  spec,
  min,
  max,
  labels,
}: {
  spec: ChartSpec;
  min: number;
  max: number;
  labels: string[];
}) {
  const scaleY = (value: number) => PAD.top + PLOT_H - ((value - min) / (max - min)) * PLOT_H;
  const stride = labelStride(labels.length);
  const slot = PLOT_W / Math.max(1, labels.length);
  return (
    <g className="reader-answer-chart-axes">
      {ticks(min, max).map((value) => (
        <g key={value}>
          <line
            className="reader-answer-chart-grid"
            x1={PAD.left}
            x2={PAD.left + PLOT_W}
            y1={scaleY(value)}
            y2={scaleY(value)}
          />
          <text className="reader-answer-chart-tick" x={PAD.left - 8} y={scaleY(value)} textAnchor="end" dominantBaseline="middle">
            {formatTick(value)}
          </text>
        </g>
      ))}
      {labels.map((label, index) => (
        index % stride === 0 ? (
          <text
            key={`${label}-${index}`}
            className="reader-answer-chart-tick"
            x={PAD.left + slot * (index + 0.5)}
            y={PAD.top + PLOT_H + 18}
            textAnchor="middle"
          >
            {label.length > 10 ? `${label.slice(0, 9)}…` : label}
          </text>
        ) : null
      ))}
      {spec.yLabel ? (
        <text className="reader-answer-chart-axis-label" x={PAD.left} y={PAD.top - 4} textAnchor="start">
          {spec.yLabel}
        </text>
      ) : null}
      {spec.xLabel ? (
        <text
          className="reader-answer-chart-axis-label"
          x={PAD.left + PLOT_W}
          y={HEIGHT - 6}
          textAnchor="end"
        >
          {spec.xLabel}
        </text>
      ) : null}
    </g>
  );
}

function BarChart({ spec, min, max }: { spec: ChartSpec; min: number; max: number }) {
  const labels = categoryLabels(spec);
  const slot = PLOT_W / Math.max(1, labels.length);
  const groupWidth = slot * 0.7;
  const barWidth = groupWidth / spec.series.length;
  const scaleY = (value: number) => PAD.top + PLOT_H - ((value - min) / (max - min)) * PLOT_H;
  const zeroY = scaleY(0);

  return (
    <>
      {spec.series.map((series, seriesIndex) => (
        <g key={series.name} fill={colorAt(seriesIndex)}>
          {series.points.map((point, pointIndex) => {
            const top = scaleY(point.value);
            const x = PAD.left + slot * pointIndex + (slot - groupWidth) / 2 + barWidth * seriesIndex;
            return (
              <rect
                key={`${point.label}-${pointIndex}`}
                x={x}
                // 负值的柱子从 0 往下长，所以取两端的较小值当上边。
                y={Math.min(top, zeroY)}
                width={Math.max(1, barWidth - 1)}
                height={Math.max(1, Math.abs(zeroY - top))}
                rx={2}
              >
                <title>{`${series.name} · ${point.label}: ${point.value}`}</title>
              </rect>
            );
          })}
        </g>
      ))}
    </>
  );
}

function LineChart({ spec, min, max }: { spec: ChartSpec; min: number; max: number }) {
  const labels = categoryLabels(spec);
  const slot = PLOT_W / Math.max(1, labels.length);
  const scaleY = (value: number) => PAD.top + PLOT_H - ((value - min) / (max - min)) * PLOT_H;
  const pointX = (index: number) => PAD.left + slot * (index + 0.5);

  return (
    <>
      {spec.series.map((series: ChartSeries, seriesIndex) => {
        const d = series.points
          .map((point, index) => `${index === 0 ? "M" : "L"} ${pointX(index)} ${scaleY(point.value)}`)
          .join(" ");
        return (
          <g key={series.name} stroke={colorAt(seriesIndex)} fill={colorAt(seriesIndex)}>
            <path className="reader-answer-chart-line" d={d} fill="none" />
            {series.points.map((point, index) => (
              <circle
                key={`${point.label}-${index}`}
                cx={pointX(index)}
                cy={scaleY(point.value)}
                r={3}
                stroke="none"
              >
                <title>{`${series.name} · ${point.label}: ${point.value}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </>
  );
}

function PieChart({ spec }: { spec: ChartSpec }) {
  const points = spec.series[0]?.points ?? [];
  // 负值在饼图里没有意义（占比不能是负的），按 0 处理而不是画出反向扇形。
  const values = points.map((p) => Math.max(0, p.value));
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return null;

  const cx = PAD.left + PLOT_W / 2;
  const cy = PAD.top + PLOT_H / 2;
  const r = Math.min(PLOT_W, PLOT_H) / 2 - 8;
  let angle = -Math.PI / 2; // 从 12 点方向开始，顺时针

  return (
    <>
      {points.map((point, index) => {
        const share = values[index] / total;
        const next = angle + share * Math.PI * 2;
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        const x2 = cx + r * Math.cos(next);
        const y2 = cy + r * Math.sin(next);
        const large = share > 0.5 ? 1 : 0;
        const d = share >= 1
          // 整圆用两段弧画：起点终点重合时 A 指令画不出东西。
          ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
        angle = next;
        return (
          <path key={`${point.label}-${index}`} d={d} fill={colorAt(index)}>
            <title>{`${point.label}: ${point.value}（${(share * 100).toFixed(1)}%）`}</title>
          </path>
        );
      })}
    </>
  );
}

function Legend({ spec }: { spec: ChartSpec }) {
  // 饼图的图例按扇区走，其余按系列走。
  const entries = spec.kind === "pie"
    ? (spec.series[0]?.points ?? []).map((p) => p.label)
    : spec.series.map((s) => s.name);
  if (entries.length < 2) return null;
  return (
    <ul className="reader-answer-chart-legend">
      {entries.map((label, index) => (
        <li key={`${label}-${index}`}>
          <span className="reader-answer-chart-swatch" style={{ background: colorAt(index) }} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}

export function AnswerChart({ spec }: { spec: ChartSpec }) {
  const titleId = useId();
  const { min, max } = valueDomain(spec);
  const labels = categoryLabels(spec);
  const caption = spec.title
    || `${spec.series.length} 个系列的${spec.kind === "pie" ? "占比" : "对比"}图`;

  return (
    <figure className="reader-answer-chart">
      <svg
        className={`reader-answer-chart-svg is-${spec.kind}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={titleId}
        preserveAspectRatio="xMidYMid meet"
      >
        <title id={titleId}>{caption}</title>
        {spec.kind !== "pie" ? (
          <Axes spec={spec} min={min} max={max} labels={labels} />
        ) : null}
        {spec.kind === "bar" ? <BarChart spec={spec} min={min} max={max} /> : null}
        {spec.kind === "line" ? <LineChart spec={spec} min={min} max={max} /> : null}
        {spec.kind === "pie" ? <PieChart spec={spec} /> : null}
      </svg>
      <Legend spec={spec} />
      {spec.title ? <figcaption className="reader-answer-chart-caption">{spec.title}</figcaption> : null}
    </figure>
  );
}
