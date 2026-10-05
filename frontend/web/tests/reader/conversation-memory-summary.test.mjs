/**
 * 记忆摘要不该出现在聊天记录里。
 *
 * 对话轮数超过阈值时，后端会做抽取式压缩，把「【对话摘要】…」以 `role="assistant"`
 * 落库（Rust 的 role 只接受 user/assistant），并让下一条 user 消息以它为 parent——
 * 压缩后的上下文靠这条链延续，所以它**必须**留在库里、留在链上。
 *
 * 但它不是回答。第 13 轮起，用户会在聊天里看到一条自己没问过的、机器生成的消息；
 * regenerate 时它还会变成同一个 user 节点下的兄弟分支，出现在分支切换器里。
 *
 * 落库时带的 `model="memory/extractive_v1"` 就是标记。投影时按它跳过，并把它的子节点
 * 重新接到它的父节点上——直接跳过会让下一条 user 消息变成孤儿，整段历史断掉。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { messagesToBranchItems } from "@retainpdf/api";

const BASE = {
  conversation_id: "c1",
  created_at: "2026-09-18T00:00:00Z",
};

function message(id, role, content, extra = {}) {
  return { ...BASE, message_id: id, seq: 0, role, content, ...extra };
}

describe("记忆摘要的投影", () => {
  it("摘要不进消息列表", () => {
    const items = messagesToBranchItems([
      message("u1", "user", "第一个问题"),
      message("a1", "assistant", "第一个回答", { parent_id: "u1" }),
      message("s1", "assistant", "【对话摘要】前面聊了…", {
        parent_id: "a1",
        model: "memory/extractive_v1",
      }),
      message("u2", "user", "第二个问题", { parent_id: "s1" }),
      message("a2", "assistant", "第二个回答", { parent_id: "u2" }),
    ]);

    const ids = items.map((item) => item.message.id);
    assert.deepEqual(ids, ["u1", "a1", "u2", "a2"], "摘要出现在了聊天记录里");
  });

  it("摘要的子节点重新接到摘要的父节点上", () => {
    const items = messagesToBranchItems([
      message("u1", "user", "问题"),
      message("a1", "assistant", "回答", { parent_id: "u1" }),
      message("s1", "assistant", "【对话摘要】…", {
        parent_id: "a1",
        model: "memory/extractive_v1",
      }),
      message("u2", "user", "下一个问题", { parent_id: "s1" }),
    ]);

    const u2 = items.find((item) => item.message.id === "u2");
    assert.equal(u2.parentId, "a1", "下一条消息成了孤儿，历史会断开");
  });

  it("连续多条摘要也能穿过去", () => {
    const items = messagesToBranchItems([
      message("u1", "user", "问题"),
      message("s1", "assistant", "摘要一", { parent_id: "u1", model: "memory/extractive_v1" }),
      message("s2", "assistant", "摘要二", { parent_id: "s1", model: "memory/extractive_v2" }),
      message("u2", "user", "下一个", { parent_id: "s2" }),
    ]);

    assert.deepEqual(items.map((item) => item.message.id), ["u1", "u2"]);
    assert.equal(items.find((item) => item.message.id === "u2").parentId, "u1");
  });

  it("普通回答带 model 字段时不受影响", () => {
    const items = messagesToBranchItems([
      message("u1", "user", "问题"),
      message("a1", "assistant", "回答", { parent_id: "u1", model: "deepseek-flash" }),
    ]);

    assert.deepEqual(items.map((item) => item.message.id), ["u1", "a1"]);
  });

  it("没有 model 字段的历史消息照常投影", () => {
    const items = messagesToBranchItems([
      message("u1", "user", "问题"),
      message("a1", "assistant", "回答", { parent_id: "u1" }),
    ]);

    assert.deepEqual(items.map((item) => item.message.id), ["u1", "a1"]);
  });
});
