import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnnotationsMarkdown,
  groupAnnotationsByPage,
  groupByPageAndCreatedAt,
  sortAnnotations,
  sortByPageAndCreatedAt,
} from "../../../../frontend/packages/reader/src/shared/content/annotations/view-model.ts";
import {
  buildNotesMarkdown,
  groupNotesByPage,
  readerNoteToAnnotationItem,
  sortNotes,
} from "../../../../frontend/packages/reader/src/annotations/types.ts";
import * as runtimeContent from "../../../../frontend/packages/reader/src/runtime/content.ts";

function makeNote(overrides = {}) {
  return {
    id: "n1",
    page: 2,
    pane: "source",
    quote: "hello",
    note: "world",
    createdAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

test("readerNoteToAnnotationItem 把本地 1-based page 收敛为共享 0-based pageIdx", () => {
  assert.equal(readerNoteToAnnotationItem(makeNote({ page: 3 })).pageIdx, 2);
  assert.equal(readerNoteToAnnotationItem(makeNote({ page: 1 })).pageIdx, 0);
  const item = readerNoteToAnnotationItem(makeNote({ page: 4, quote: "q", note: "n" }));
  assert.deepEqual(
    { pageIdx: item.pageIdx, quoteText: item.quoteText, note: item.note },
    { pageIdx: 3, quoteText: "q", note: "n" },
  );
});

test("本地注记导出与共享批注导出一致（格式与 1-based 页码统一）", () => {
  const note = makeNote({ page: 2, quote: "hello", note: "world" });
  const local = buildNotesMarkdown("Demo", [note]);
  const canonical = buildAnnotationsMarkdown({
    title: "Demo",
    annotations: [readerNoteToAnnotationItem(note)],
  });
  assert.equal(local, canonical);
  assert.match(local, /# Demo 批注/);
  assert.match(local, /## 第 2 页/);
});

test("sortNotes/groupNotesByPage 与共享排序分组核心同序（page 升序 + createdAt 升序）", () => {
  const notes = [
    makeNote({ id: "b", page: 2, createdAt: "2026-07-02T00:00:00Z" }),
    makeNote({ id: "a", page: 1, createdAt: "2026-07-03T00:00:00Z" }),
    makeNote({ id: "c", page: 2, createdAt: "2026-07-01T00:00:00Z" }),
  ];
  assert.deepEqual(sortNotes(notes).map((n) => n.id), ["a", "c", "b"]);
  assert.deepEqual(
    groupNotesByPage(notes).map((g) => [g.page, g.items.map((i) => i.id)]),
    [[1, ["a"]], [2, ["c", "b"]]],
  );

  const generic = groupByPageAndCreatedAt(notes, (n) => n.page);
  assert.deepEqual(
    generic.map((g) => [g.pageIdx, g.items.map((i) => i.id)]),
    [[1, ["a"]], [2, ["c", "b"]]],
  );
  assert.deepEqual(
    sortByPageAndCreatedAt(notes, (n) => n.page).map((n) => n.id),
    sortNotes(notes).map((n) => n.id),
  );
});

test("runtime/content 公开面仍暴露共享批注模型（仅供宿主/契约测试）", () => {
  for (const name of [
    "sortByPageAndCreatedAt",
    "groupByPageAndCreatedAt",
    "sortAnnotations",
    "groupAnnotationsByPage",
    "buildAnnotationsMarkdown",
    "annotationAnchor",
  ]) {
    assert.equal(typeof runtimeContent[name], "function", `missing ${name}`);
  }
  assert.equal(typeof runtimeContent.ANNOTATION_KIND_META, "object");
});
