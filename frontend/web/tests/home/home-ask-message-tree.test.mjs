/**
 * 会话本来就是一棵树，主页此前把它当成了一个数组。
 *
 * 后端存 `parent_id` / `head_id`（`conversations.rs`），`GET /conversations/{id}` 返回的
 * 是**全量**消息——它自己的注释写着「全量消息建树」。主页的 messagesFromDetail 却直接
 * 平铺，丢掉父链、忽略 head。
 *
 * 这在只会线性追加的时候看不出问题。一旦「重新生成」开始把新答案挂成同一个提问下的
 * 兄弟分支，平铺就会把**被丢弃的旧答案和新答案一起铺出来**。
 *
 * 顺带修的另一件事：记忆压缩的摘要以 role="assistant" 落库（Rust 只收 user/assistant），
 * 靠 model="memory/…" 标记。阅读器那侧走 messagesToBranchItems 会把它藏掉并把子节点重接
 * 到它父节点上；主页没有这一步，于是压缩一发生，线程里就冒出一条用户没问过的
 * 「【对话摘要】…」。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { messagesFromDetail, findTurnUserMessage } = await import(
  "../../src/features/ask/domain/home-ask-message-mapping.ts"
);

const contents = (list) => list.map((m) => m.content);

describe("从会话详情还原可见路径", () => {
  it("只走 head 那一条分支，被丢弃的兄弟答案不显示", () => {
    // u1 下挂了两个答案：a1 是被重新生成掉的旧版，a2 是当前 head。
    const out = messagesFromDetail({
      head_id: "a2",
      messages: [
        { message_id: "u1", role: "user", content: "问题", parent_id: "" },
        { message_id: "a1", role: "assistant", content: "旧答案", parent_id: "u1" },
        { message_id: "a2", role: "assistant", content: "新答案", parent_id: "u1" },
      ],
    });
    assert.deepEqual(contents(out), ["问题", "新答案"], "旧的兄弟分支也被铺出来了");
  });

  it("保留父链，重新生成要靠它定位挂哪儿", () => {
    const out = messagesFromDetail({
      head_id: "a1",
      messages: [
        { message_id: "u1", role: "user", content: "问题", parent_id: "" },
        { message_id: "a1", role: "assistant", content: "答案", parent_id: "u1" },
      ],
    });
    assert.equal(out[1].parentId, "u1");
  });

  it("记忆摘要不当成回答显示，它的子节点重接到它父节点上", () => {
    const out = messagesFromDetail({
      head_id: "a2",
      messages: [
        { message_id: "u1", role: "user", content: "第一个问题", parent_id: "" },
        { message_id: "a1", role: "assistant", content: "第一个回答", parent_id: "u1" },
        { message_id: "s1", role: "assistant", content: "【对话摘要】…", parent_id: "a1", model: "memory/extractive_v1" },
        { message_id: "u2", role: "user", content: "第二个问题", parent_id: "s1" },
        { message_id: "a2", role: "assistant", content: "第二个回答", parent_id: "u2" },
      ],
    });
    assert.ok(!out.some((m) => m.content.includes("【对话摘要】")), "摘要被当成回答显示了");
    // 摘要被藏掉之后整条历史还得是连着的，不能断在它那里。
    assert.deepEqual(contents(out), ["第一个问题", "第一个回答", "第二个问题", "第二个回答"]);
  });

  it("旧数据没有 parent_id 时按原顺序平铺——否则历史会话全都只剩一条", () => {
    const out = messagesFromDetail({
      messages: [
        { message_id: "m1", role: "user", content: "问一" },
        { message_id: "m2", role: "assistant", content: "答一" },
        { message_id: "m3", role: "user", content: "问二" },
        { message_id: "m4", role: "assistant", content: "答二" },
      ],
    });
    assert.deepEqual(contents(out), ["问一", "答一", "问二", "答二"]);
  });

  it("head_id 指向不存在的消息时也退回平铺，而不是给一段空的", () => {
    const out = messagesFromDetail({
      head_id: "不存在",
      messages: [
        { message_id: "u1", role: "user", content: "问题", parent_id: "" },
        { message_id: "a1", role: "assistant", content: "答案", parent_id: "u1" },
      ],
    });
    assert.deepEqual(contents(out), ["问题", "答案"]);
  });

  it("父链成环不会转死", () => {
    const out = messagesFromDetail({
      head_id: "b",
      messages: [
        { message_id: "a", role: "user", content: "甲", parent_id: "b" },
        { message_id: "b", role: "assistant", content: "乙", parent_id: "a" },
      ],
    });
    assert.ok(out.length <= 2);
  });
});

describe("定位某条回答对应的提问", () => {
  const thread = [
    { id: "u1", role: "user", content: "第一轮问题" },
    { id: "a1", role: "assistant", content: "第一轮回答", parentId: "u1" },
    { id: "u2", role: "user", content: "第二轮问题", parentId: "a1" },
    { id: "a2", role: "assistant", content: "第二轮回答", parentId: "u2" },
  ];

  it("走父链而不是「线程里最后一条提问」", () => {
    assert.equal(findTurnUserMessage(thread, "a1")?.content, "第一轮问题");
    assert.equal(findTurnUserMessage(thread, "a2")?.content, "第二轮问题");
  });

  it("没有父链时退回前面最近的那条提问", () => {
    const flat = thread.map(({ parentId, ...rest }) => rest);
    assert.equal(findTurnUserMessage(flat, "a1")?.content, "第一轮问题");
  });

  it("父节点不是 user 时也退回前面最近的提问", () => {
    // 压缩摘要曾经会当爹：parentId 指过去是一条 assistant。
    const odd = [
      { id: "u1", role: "user", content: "问题" },
      { id: "s1", role: "assistant", content: "摘要" },
      { id: "a1", role: "assistant", content: "回答", parentId: "s1" },
    ];
    assert.equal(findTurnUserMessage(odd, "a1")?.content, "问题");
  });

  it("找不到就给 null，不要瞎猜一条", () => {
    assert.equal(findTurnUserMessage(thread, "不存在"), null);
    assert.equal(findTurnUserMessage([{ id: "a1", role: "assistant", content: "孤儿" }], "a1"), null);
  });
});


describe("刷新之后还记得这条回答是怎么结束的", () => {
  /**
   * 以前恢复出来的消息一律标成 complete：半截回答和被强制收尾的回答，刷新一次就都
   * 变成看起来正常的答案。现在服务端在 ai_messages.finish_reason 上记着。
   */
  const restored = (finish) => messagesFromDetail({
    head_id: "a1",
    messages: [
      { message_id: "u1", role: "user", content: "问题", parent_id: "" },
      { message_id: "a1", role: "assistant", content: "半截回答", parent_id: "u1", finish_reason: finish },
    ],
  });

  it("中断的回答恢复成 cancelled，而不是「正常答完」", () => {
    assert.equal(restored("cancelled").at(-1).status, "cancelled");
  });

  it("被强制收尾的回答带回原因", () => {
    const answer = restored("rounds_exhausted").at(-1);
    assert.equal(answer.status, "complete");
    assert.equal(answer.incompleteReason, "rounds_exhausted");
  });

  it("正常答完的不带任何标记", () => {
    const answer = restored("").at(-1);
    assert.equal(answer.status, "complete");
    assert.equal(answer.incompleteReason, undefined);
  });

  it("旧消息没有这个字段，照旧当成正常答完", () => {
    const out = messagesFromDetail({
      head_id: "a1",
      messages: [
        { message_id: "u1", role: "user", content: "问题", parent_id: "" },
        { message_id: "a1", role: "assistant", content: "回答", parent_id: "u1" },
      ],
    });
    assert.equal(out.at(-1).status, "complete");
  });

  it("提问不受影响——结束原因只描述回答", () => {
    assert.equal(restored("cancelled")[0].status, "complete");
  });
});
