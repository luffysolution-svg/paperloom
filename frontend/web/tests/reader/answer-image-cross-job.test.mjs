/**
 * 图片不在阅读中的那个 job 里时，也要显示得出来。
 *
 * 真实故障:回答里出现「[图片不可用：非绝热核运动方程]」。图片 URL 指向
 * `20260918070108-3f4bec`——那是 OCR 那个 job，图片**真的在那里**（直接请求返回 200）；
 * 而阅读中的是翻译 job `20260918070141-be37aa`。上传先跑 OCR、翻译另起一个 job 复用
 * 它的产物，图片就留在了 OCR 那边。
 *
 * 前端对图片是 fail-closed 的:只接受「路径里的 job == 当前阅读的 job」，于是这类图片
 * 一律被拒。但不能因此放行任意 job——那等于把「引用指向别的文档」那类问题放回来，
 * 而那正是今天刚修过的一类。
 *
 * 所以后端在 URL 上带 `?doc=<document_id>`，只有它出现在本次回答的引用里才放行。
 * URL 写在译文里，这个判据对历史回答同样成立；而放行之后要用**路径里的** job 重建
 * 请求，不是当前 job——图片就在那个 job 里。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  answerDocumentIds,
  resolveAnswerImageUrl,
} from "../../../packages/reader/src/shared/ai/answer-enhance.ts";

const READING_JOB = "20260918070141-be37aa";
const SOURCE_JOB = "20260918070108-3f4bec";
const DOCUMENT = "2707250c6ff604b63f5ca71750d7ac90cd26c8e8489180d3b895d4fafaac6310";
const IMAGE = "page-5/10bd31acab9446f9bad67012e516323a10f0953d792919b7945324b47ab9db4f.jpg";

const CITATIONS = [{ ref: 1, document_id: DOCUMENT, job_id: READING_JOB }];
const ALLOWED = answerDocumentIds(CITATIONS);

const sourceUrl = `/api/v1/jobs/${SOURCE_JOB}/markdown/images/${IMAGE}?doc=${DOCUMENT}`;

describe("跨 job 的回答图片", () => {
  it("同一文档的上游 job 放行，并用那个 job 重建请求", () => {
    const resolved = resolveAnswerImageUrl(sourceUrl, READING_JOB, {}, ALLOWED);
    assert.ok(resolved, "图片被拒了，界面上会显示「图片不可用」");
    assert.match(resolved, new RegExp(SOURCE_JOB), `重建时用错了 job：${resolved}`);
    assert.match(resolved, new RegExp(IMAGE.split("/").pop()));
  });

  it("没有 doc 标记的外部 job 仍然拒绝", () => {
    const bare = `/api/v1/jobs/${SOURCE_JOB}/markdown/images/${IMAGE}`;
    assert.equal(resolveAnswerImageUrl(bare, READING_JOB, {}, ALLOWED), "");
  });

  it("doc 标记指向别的文档时拒绝", () => {
    const other = `/api/v1/jobs/${SOURCE_JOB}/markdown/images/${IMAGE}?doc=another-document`;
    assert.equal(resolveAnswerImageUrl(other, READING_JOB, {}, ALLOWED), "");
  });

  it("本 job 的图片照常放行，不依赖标记", () => {
    const own = `/api/v1/jobs/${READING_JOB}/markdown/images/${IMAGE}`;
    assert.ok(resolveAnswerImageUrl(own, READING_JOB, {}, ALLOWED));
  });

  it("引用为空时不放行任何外部 job", () => {
    assert.equal(resolveAnswerImageUrl(sourceUrl, READING_JOB, {}, []), "");
  });

  it("其它协议与主机一律拒绝", () => {
    for (const raw of [
      "//evil.test/x.jpg",
      "https://evil.test/api/v1/jobs/j/markdown/images/a.jpg?doc=" + DOCUMENT,
      "data:image/png;base64,AAAA",
      "blob:http://localhost/abc",
    ]) {
      assert.equal(resolveAnswerImageUrl(raw, READING_JOB, {}, ALLOWED), "", raw);
    }
  });

  it("answerDocumentIds 去重且忽略空值", () => {
    assert.deepEqual(
      answerDocumentIds([
        { document_id: DOCUMENT },
        { document_id: DOCUMENT },
        { document_id: "" },
        {},
      ]),
      [DOCUMENT],
    );
  });
});
