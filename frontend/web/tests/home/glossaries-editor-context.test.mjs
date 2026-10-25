// 术语表 PUT 是整表覆盖。编辑器不展示词条的 context（语境），但读进来、存回去时要原样带上——
// 以前编辑器把它丢了、保存时又写死成空串，打开任何一张表点一次保存，所有词条的语境都被清空。
import test from "node:test";
import assert from "node:assert/strict";

import { createGlossariesViewFeature } from "../../src/features/glossaries/domain/glossaries-store.js";

test("打开术语表再保存，词条的 context 原样带回去", () => {
  const feature = createGlossariesViewFeature({ dialogStore: { open() {}, close() {} } });
  feature.viewPort.renderEditor({
    name: "化学",
    entries: [
      { source: "benzene", target: "苯", level: "preferred", match_mode: "exact", context: "有机化学", note: "" },
      { source: "mole", target: "", level: "preserve", match_mode: "exact", context: "" },
    ],
  });
  const payload = feature.viewPort.readEditorPayload();
  assert.deepEqual(payload.entries.map((entry) => [entry.source, entry.context]), [
    ["benzene", "有机化学"],
    ["mole", ""],
  ]);
});
