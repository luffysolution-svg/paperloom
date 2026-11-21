import test from "node:test";
import assert from "node:assert/strict";

import { createGlossaryOptionsLoader } from "../../src/features/ingest/domain/workflow/glossary-options.js";

function createLoader({ items, defaultSelectedId, onOptions }) {
  return createGlossaryOptionsLoader({
    fetchGlossaries: async () => ({ items }),
    apiPrefix: "/api",
    setDeveloperGlossaryOptions: (options, selectedId) => onOptions(options, selectedId),
    setText: () => {},
    getDefaultSelectedId: () => defaultSelectedId,
  });
}

test("删除术语表后不再回退到已不存在的默认术语表 id", async () => {
  const calls = [];
  const loader = createLoader({
    items: [{ glossary_id: "glossary-new", name: "New" }],
    defaultSelectedId: "glossary-deleted",
    onOptions: (options, selectedId) => calls.push([options.map((item) => item.glossary_id), selectedId]),
  });

  await loader.loadGlossaryOptions({ force: true, selectedId: "" });

  assert.deepEqual(calls, [[["glossary-new"], ""]]);
});

test("默认术语表仍在列表中时回退保持不变", async () => {
  const calls = [];
  const loader = createLoader({
    items: [{ glossary_id: "glossary-kept", name: "Kept" }],
    defaultSelectedId: "glossary-kept",
    onOptions: (options, selectedId) => calls.push([options.map((item) => item.glossary_id), selectedId]),
  });

  await loader.loadGlossaryOptions({ force: true, selectedId: "" });

  assert.deepEqual(calls, [[["glossary-kept"], "glossary-kept"]]);
});

test("显式选中的术语表 id 仍然透传", async () => {
  const calls = [];
  const loader = createLoader({
    items: [{ glossary_id: "glossary-new", name: "New" }],
    defaultSelectedId: "glossary-deleted",
    onOptions: (options, selectedId) => calls.push([options.map((item) => item.glossary_id), selectedId]),
  });

  await loader.loadGlossaryOptions({ force: true, selectedId: "glossary-new" });

  assert.deepEqual(calls, [[["glossary-new"], "glossary-new"]]);
});

test("停用的术语表不进建任务的下拉（引用停用的表后端回 400），没写 enabled 的照旧算启用", async () => {
  const calls = [];
  const loader = createLoader({
    items: [
      { glossary_id: "glossary-on", name: "On", enabled: true },
      { glossary_id: "glossary-off", name: "Off", enabled: false },
      { glossary_id: "glossary-legacy", name: "Legacy" },
    ],
    defaultSelectedId: "glossary-off",
    onOptions: (options, selectedId) => calls.push([options.map((item) => item.glossary_id), selectedId]),
  });

  await loader.loadGlossaryOptions({ force: true, selectedId: "" });

  assert.deepEqual(calls, [[["glossary-on", "glossary-legacy"], ""]], "停用的表既不进下拉，也不当默认选中");
});
