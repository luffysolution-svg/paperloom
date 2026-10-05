/**
 * 回答里的图表。
 *
 * 模型给的是**数据 + 图表类型**（一个 ```retainpdf-chart 围栏块里的 JSON），SVG 由我们
 * 自己画。让模型直接吐 SVG 既不可靠，又等于把一段模型生成的标记塞进页面——之前为同
 * 一类问题已经把 MathJax 的 html 包摘掉过。
 *
 * 最要紧的一条不是图好不好看，而是**解析失败必须退回普通代码块**：流式过程中 JSON
 * 还没写完是常态，不能因此闪一块空白；模型写坏了的时候，让用户看见它原本写了什么，
 * 比给半截图形有用。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { parseChartSpec, valueDomain, categoryLabels, CHART_FENCE_LANGUAGE, MAX_SERIES, MAX_POINTS } =
  await import("../../../packages/reader/src/shared/content/chart-spec.ts");

const bar = (extra = {}) => JSON.stringify({
  type: "bar",
  title: "两种方法的耗时",
  series: [{ name: "耗时", points: [{ label: "信赖域", value: 12 }, { label: "线搜索", value: 7 }] }],
  ...extra,
});

describe("图表规格的解析", () => {
  it("认得柱/折线/饼三种", () => {
    for (const kind of ["bar", "line", "pie"]) {
      const spec = parseChartSpec(bar({ type: kind }));
      assert.equal(spec?.kind, kind);
    }
  });

  it("kind 和 type 两种写法都收——模型两种都会写", () => {
    assert.ok(parseChartSpec(JSON.stringify({
      kind: "bar", series: [{ name: "a", points: [{ label: "x", value: 1 }] }],
    })));
  });

  it("没写完的 JSON 返回 null 而不是抛——流式期间这是常态", () => {
    assert.equal(parseChartSpec('{"type":"bar","series":[{"name":'), null);
  });

  it("不认识的图表类型返回 null", () => {
    assert.equal(parseChartSpec(bar({ type: "甘特图" })), null);
  });

  it("没有任何数据点返回 null——不画空图", () => {
    assert.equal(parseChartSpec(JSON.stringify({ type: "bar", series: [] })), null);
    assert.equal(parseChartSpec(JSON.stringify({ type: "bar", series: [{ name: "a", points: [] }] })), null);
  });

  it("空字符串、非对象、数组都返回 null", () => {
    assert.equal(parseChartSpec(""), null);
    assert.equal(parseChartSpec("[1,2,3]"), null);
    assert.equal(parseChartSpec('"就一个字符串"'), null);
  });

  it("缺值的点被丢掉，而不是补成 0——补 0 会凭空造出一个结论", () => {
    const spec = parseChartSpec(JSON.stringify({
      type: "bar",
      series: [{ name: "a", points: [{ label: "甲", value: 3 }, { label: "乙" }, { label: "丙", value: 5 }] }],
    }));
    assert.deepEqual(spec.series[0].points.map((p) => p.label), ["甲", "丙"]);
  });

  it("数字写成字符串也认", () => {
    const spec = parseChartSpec(JSON.stringify({
      type: "bar", series: [{ name: "a", points: [{ label: "甲", value: "3.5" }] }],
    }));
    assert.equal(spec.series[0].points[0].value, 3.5);
  });

  it("NaN / Infinity 不进来", () => {
    const spec = parseChartSpec(JSON.stringify({
      type: "bar", series: [{ name: "a", points: [{ label: "甲", value: "abc" }, { label: "乙", value: 1 }] }],
    }));
    assert.deepEqual(spec.series[0].points.map((p) => p.label), ["乙"]);
  });

  it("系列和点都有上限，超了截断而不是画成一团糊", () => {
    const many = parseChartSpec(JSON.stringify({
      type: "line",
      series: Array.from({ length: MAX_SERIES + 4 }, (_, i) => ({
        name: `s${i}`,
        points: Array.from({ length: MAX_POINTS + 10 }, (_, j) => ({ label: `${j}`, value: j })),
      })),
    }));
    assert.equal(many.series.length, MAX_SERIES);
    assert.equal(many.series[0].points.length, MAX_POINTS);
  });

  it("饼图只留第一个系列——多个系列的饼没有意义", () => {
    const spec = parseChartSpec(JSON.stringify({
      type: "pie",
      series: [
        { name: "a", points: [{ label: "甲", value: 1 }] },
        { name: "b", points: [{ label: "乙", value: 2 }] },
      ],
    }));
    assert.equal(spec.series.length, 1);
  });
});

describe("纵轴范围", () => {
  it("全正的数据也从 0 起——截断基线是最经典的误导", () => {
    const spec = parseChartSpec(JSON.stringify({
      type: "bar", series: [{ name: "a", points: [{ label: "甲", value: 100 }, { label: "乙", value: 104 }] }],
    }));
    assert.equal(valueDomain(spec).min, 0);
  });

  it("有负数时把 0 包进来，正负才分得出", () => {
    const spec = parseChartSpec(JSON.stringify({
      type: "bar", series: [{ name: "a", points: [{ label: "甲", value: -5 }, { label: "乙", value: 3 }] }],
    }));
    const { min, max } = valueDomain(spec);
    assert.ok(min <= -5 && max >= 3 && min < 0 && max > 0);
  });

  it("所有值相同时跨度不为 0——否则后面要除以 0", () => {
    const spec = parseChartSpec(JSON.stringify({
      type: "bar", series: [{ name: "a", points: [{ label: "甲", value: 0 }, { label: "乙", value: 0 }] }],
    }));
    const { min, max } = valueDomain(spec);
    assert.notEqual(max - min, 0);
  });
});

describe("横轴标签", () => {
  it("取各系列里最长的那条，短系列不会把标签截没", () => {
    const spec = parseChartSpec(JSON.stringify({
      type: "line",
      series: [
        { name: "短", points: [{ label: "一", value: 1 }] },
        { name: "长", points: [{ label: "一", value: 1 }, { label: "二", value: 2 }, { label: "三", value: 3 }] },
      ],
    }));
    assert.deepEqual(categoryLabels(spec), ["一", "二", "三"]);
  });
});

describe("围栏标签", () => {
  it("是一个不会和真实语言撞车的名字", () => {
    assert.equal(CHART_FENCE_LANGUAGE, "retainpdf-chart");
  });
});
