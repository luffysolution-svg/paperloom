import test from "node:test";
import assert from "node:assert/strict";

const calls = [];
let nextResponse = { status: 200, body: {} };
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: `${url}`, init });
  return new Response(JSON.stringify(nextResponse.body), {
    status: nextResponse.status,
    headers: { "Content-Type": "application/json" },
  });
};

const {
  exportDocumentsToObsidian,
  exportJobToObsidian,
  getObsidianIntegration,
} = await import("../../src/platform/api/domains/obsidian.ts");
const { openExternalUri } =
  await import("../../src/features/book-detail/ui/panels/ObsidianExportDialog.tsx");

test("obsidian api: 读取库列表时解开响应信封", async () => {
  calls.length = 0;
  nextResponse = {
    status: 200,
    body: {
      code: 0,
      data: {
        vaults: [{ id: "abc", name: "Notes", available: true }],
        settings: { folder: "Lit" },
      },
    },
  };
  const data = await getObsidianIntegration();
  assert.equal(data.vaults[0].id, "abc");
  assert.equal(data.settings.folder, "Lit");
  assert.match(calls[0].url, /\/api\/v1\/integrations\/obsidian$/);
});

test("obsidian api: 导出走 jobs/{id}/obsidian/export 并带上冲突策略", async () => {
  calls.length = 0;
  nextResponse = {
    status: 200,
    body: { data: { status: "conflict", note_path: "Lit/a.md" } },
  };
  const result = await exportJobToObsidian("job 1", {
    vault_id: "abc",
    folder: "Lit",
    include_source: false,
    folder_by_collection: true,
    on_conflict: "rename",
  });
  assert.equal(result.status, "conflict");
  assert.match(calls[0].url, /\/api\/v1\/jobs\/job%201\/obsidian\/export$/);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    vault_id: "abc",
    folder: "Lit",
    include_source: false,
    folder_by_collection: true,
    on_conflict: "rename",
  });
});

test("obsidian api: 批量导出按 document_id 提交并保留逐项结果", async () => {
  calls.length = 0;
  nextResponse = {
    status: 200,
    body: {
      data: {
        written: 1,
        conflicts: 0,
        skipped: 0,
        failed: 1,
        items: [
          {
            document_id: "doc-1",
            job_id: "job-1",
            result: { status: "created" },
            message: null,
          },
          {
            document_id: "doc-2",
            job_id: null,
            result: null,
            message: "没有可导出的已完成译文",
          },
        ],
      },
    },
  };
  const result = await exportDocumentsToObsidian(["doc-1", "doc-2"], {
    vault_id: "abc",
    folder: "Lit",
    include_source: true,
    on_conflict: "rename",
  });
  assert.equal(result.written, 1);
  assert.equal(result.failed, 1);
  assert.match(
    calls[0].url,
    /\/api\/v1\/integrations\/obsidian\/export-batch$/,
  );
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    document_ids: ["doc-1", "doc-2"],
    vault_id: "abc",
    folder: "Lit",
    include_source: true,
    on_conflict: "rename",
  });
});

test("obsidian api: 失败时把后端消息带给用户", async () => {
  nextResponse = {
    status: 404,
    body: { message: "obsidian vault not found: x" },
  };
  await assert.rejects(
    exportJobToObsidian("job-1", {
      vault_id: "x",
      folder: "",
      include_source: true,
    }),
    /obsidian vault not found: x\(404\)/,
  );
});

test("openExternalUri: 桌面端走 window.open，浏览器直接改 location", () => {
  const opened = [];
  globalThis.window = {
    retainPdfDesktop: {},
    open: (uri, target) => opened.push([uri, target]),
  };
  openExternalUri("obsidian://open?vault=a&file=b");
  assert.deepEqual(opened, [["obsidian://open?vault=a&file=b", "_blank"]]);

  globalThis.window = { location: { href: "http://app/" } };
  openExternalUri("obsidian://open?vault=a&file=b");
  assert.equal(
    globalThis.window.location.href,
    "obsidian://open?vault=a&file=b",
  );
  delete globalThis.window;
});
