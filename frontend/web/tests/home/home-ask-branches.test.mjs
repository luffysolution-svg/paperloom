/**
 * 多版回答之间的切换。
 *
 * 上一版改动让重新生成把新答案挂成兄弟节点、旧的从可见路径上换下去。那一步本身制造了
 * 一个缺口：旧答案还在服务端，但用户再也看不到它了。在此之前点重新生成，新旧两条都留
 * 在对话里（代价是多一条重复提问）——也就是说「对比两版回答」从难看但可行，变成了做
 * 不到。切换器补的就是这个。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { branchNavigation, headForBranch } = await import(
  "../../src/features/ask/domain/home-ask-branches.ts"
);

/** 一问两答：u1 下面挂着 a1（旧）和 a2（重新生成出来的）。 */
const TWO_VERSIONS = [
  { id: "u1", role: "user", content: "问题" },
  { id: "a1", role: "assistant", content: "第一版", parentId: "u1" },
  { id: "a2", role: "assistant", content: "第二版", parentId: "u1" },
];

describe("分支导航信息", () => {
  it("同一个提问下的多版回答给出「第几版/共几版」", () => {
    const nav = branchNavigation(TWO_VERSIONS, [TWO_VERSIONS[0], TWO_VERSIONS[2]]);
    assert.deepEqual(nav.a2, { index: 2, count: 2, prevId: "a1", nextId: "" });
  });

  it("只有一版时不给导航——不该显示一个 1/1 的切换器", () => {
    const single = [
      { id: "u1", role: "user", content: "问题" },
      { id: "a1", role: "assistant", content: "回答", parentId: "u1" },
    ];
    assert.deepEqual(branchNavigation(single, single), {});
  });

  it("两头的边界:第一版没有上一个，最后一版没有下一个", () => {
    const first = branchNavigation(TWO_VERSIONS, [TWO_VERSIONS[0], TWO_VERSIONS[1]]).a1;
    assert.equal(first.prevId, "");
    assert.equal(first.nextId, "a2");
  });

  it("三版之间前后都能走", () => {
    const three = [...TWO_VERSIONS, { id: "a3", role: "assistant", content: "第三版", parentId: "u1" }];
    const nav = branchNavigation(three, [three[0], three[2]]).a2;
    assert.deepEqual([nav.index, nav.count, nav.prevId, nav.nextId], [2, 3, "a1", "a3"]);
  });

  it("只算同一个 parent 下的，不同轮次的回答不是彼此的版本", () => {
    const twoTurns = [
      { id: "u1", role: "user", content: "问一" },
      { id: "a1", role: "assistant", content: "答一", parentId: "u1" },
      { id: "u2", role: "user", content: "问二", parentId: "a1" },
      { id: "a2", role: "assistant", content: "答二", parentId: "u2" },
    ];
    assert.deepEqual(branchNavigation(twoTurns, twoTurns), {}, "把不同轮次当成了多版回答");
  });

  it("没有父链的旧数据不算多版——否则整段历史会变成「互为分支」", () => {
    const legacy = [
      { id: "m1", role: "user", content: "问一" },
      { id: "m2", role: "assistant", content: "答一" },
      { id: "m3", role: "user", content: "问二" },
      { id: "m4", role: "assistant", content: "答二" },
    ];
    assert.deepEqual(branchNavigation(legacy, legacy), {});
  });

  it("提问本身不参与版本计数", () => {
    const nav = branchNavigation(TWO_VERSIONS, [TWO_VERSIONS[0], TWO_VERSIONS[2]]);
    assert.equal(nav.u1, undefined);
  });
});

describe("切过去之后 head 落在哪", () => {
  it("那一版下面没有续写时就是它自己", () => {
    assert.equal(headForBranch(TWO_VERSIONS, "a1"), "a1");
  });

  it("走到这条分支最新的续写，而不是停在被切中的那一版", () => {
    // a1 那条分支后面还继续问过 u2/a3；切回 a1 应该把整段续写一起带出来。
    const withFollowUp = [
      ...TWO_VERSIONS,
      { id: "u2", role: "user", content: "追问", parentId: "a1" },
      { id: "a3", role: "assistant", content: "追问的回答", parentId: "u2" },
    ];
    assert.equal(headForBranch(withFollowUp, "a1"), "a3");
  });

  it("续写自己也有多版时取最后添加的那条", () => {
    const nested = [
      ...TWO_VERSIONS,
      { id: "u2", role: "user", content: "追问", parentId: "a1" },
      { id: "a3", role: "assistant", content: "旧的追问回答", parentId: "u2" },
      { id: "a4", role: "assistant", content: "新的追问回答", parentId: "u2" },
    ];
    assert.equal(headForBranch(nested, "a1"), "a4");
  });

  it("目标不存在时给空串，调用方据此不动 head", () => {
    assert.equal(headForBranch(TWO_VERSIONS, "不存在"), "");
    assert.equal(headForBranch(TWO_VERSIONS, ""), "");
  });

  it("父子成环不会转死", () => {
    const cyclic = [
      { id: "a", role: "assistant", content: "甲", parentId: "b" },
      { id: "b", role: "assistant", content: "乙", parentId: "a" },
    ];
    assert.ok(["a", "b"].includes(headForBranch(cyclic, "a")));
  });
});
