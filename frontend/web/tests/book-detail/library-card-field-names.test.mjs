// 书籍详情从书架卡片（LibraryCardItem）兜底取值时，字段名要按卡片的写：文件名是
// source_file_name（书的 DocumentRecord 才叫 source_filename），卡片上没有 year。
// 卡片类型带 `[key: string]: unknown` 索引签名，写错字段名 tsc 不报，以前还用 `as` 强转
// 把 unknown 盖过去，于是兜底永远取不到值。
import test from "node:test";
import assert from "node:assert/strict";
import { body, readSource } from "../helpers/source-text.mjs";

const FILES = [
  "../../src/features/book-detail/ui/BookDetailDialog.tsx",
  "../../src/features/book-detail/ui/panels/translate/TranslateProgress.tsx",
];

for (const rel of FILES) {
  test(`书架卡片字段名：${rel.split("/").pop()} 不读卡片上不存在的字段`, () => {
    const src = body(readSource(rel, import.meta.url));
    assert.doesNotMatch(src, /\bitem\??\.source_filename\b/, "卡片上的文件名字段是 source_file_name");
    assert.doesNotMatch(src, /\bitem\??\.year\b/, "卡片上没有 year");
    assert.match(src, /\bitem\??\.source_file_name\b/, "文件名兜底要读 source_file_name");
  });
}
