/**
 * 下载失败时不该在磁盘上留下一个 0 字节的文件。
 *
 * `prepareDownloadTarget` 走的是 `showSaveFilePicker`，用户点确定的那一刻文件就被
 * 建出来了。如果它排在请求前面，而请求失败了，磁盘上就留下一个空文件——用户看到的
 * 不是错误提示，而是一份「打开什么都没有的文档」。
 *
 * Word 导出在打包环境里失败时就是这么表现的（打包里没带 node 和 retainpdf2doc），
 * 排查了很久才发现根本没请求成功。所以顺序必须是:先确认响应成功，再问保存位置。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { downloadProtectedResponse } = await import("../../src/platform/utils/downloads.ts");

/** 假的文件系统句柄:blob 分支要用 document 建下载链接，Node 里没有。 */
function fakeFileSystemTarget() {
  const chunks = [];
  return {
    kind: "file-system",
    chunks,
    handle: {
      createWritable: async () => ({
        write: async (chunk) => { chunks.push(chunk); },
        close: async () => {},
        abort: async () => {},
      }),
    },
  };
}

function recordingTarget(log) {
  return () => {
    log.push("prepare-target");
    return Promise.resolve(fakeFileSystemTarget());
  };
}

describe("下载顺序", () => {
  it("请求失败时根本不去创建保存目标", async () => {
    const log = [];
    await assert.rejects(
      () => downloadProtectedResponse({
        fetchResponse: async () => {
          log.push("fetch");
          return new Response("boom", { status: 500 });
        },
        fallbackName: "x.docx",
        target: recordingTarget(log),
      }),
      /下载失败/,
    );
    assert.deepEqual(log, ["fetch"], "请求失败了却还是创建了保存目标，磁盘上会留下空文件");
  });

  it("请求成功时才创建保存目标，且顺序在后", async () => {
    const log = [];
    await downloadProtectedResponse({
      fetchResponse: async () => {
        log.push("fetch");
        return new Response("ok", {
          status: 200,
          headers: { "content-disposition": 'attachment; filename="a.docx"' },
        });
      },
      fallbackName: "x.docx",
      target: recordingTarget(log),
    });
    assert.deepEqual(log, ["fetch", "prepare-target"], "保存目标不是在响应之后创建的");
  });

  it("用户在保存对话框里取消时安静返回，不抛错", async () => {
    const result = await downloadProtectedResponse({
      fetchResponse: async () => new Response("ok", { status: 200 }),
      fallbackName: "x.docx",
      target: () => Promise.resolve({ kind: "aborted" }),
    });
    assert.equal(result, "");
  });

  it("仍然接受已经准备好的目标对象——老调用方不受影响", async () => {
    const filename = await downloadProtectedResponse({
      fetchResponse: async () => new Response("ok", { status: 200 }),
      fallbackName: "legacy.docx",
      target: fakeFileSystemTarget(),
    });
    assert.equal(filename, "legacy.docx");
  });
});
