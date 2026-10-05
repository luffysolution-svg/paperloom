// 同一个提问下的多版回答：定位兄弟分支、算出切过去之后的新 head。
//
// 重新生成会把新答案挂成同一个 parent 下的兄弟节点（服务端 `regenerate` 的语义）。
// 树里留着全部版本，线程只显示 head 那一条——没有切换器的话，被换下去的版本就再也
// 回不来了。

import type { HomeAskMessage } from "./types.js";

export type HomeAskBranchNav = {
  /** 当前版本是第几个（从 1 数，直接拿去显示）。 */
  index: number;
  /** 这个提问下一共有几个版本。 */
  count: number;
  /** 上一个/下一个版本的消息 id；到头了就是空串。 */
  prevId: string;
  nextId: string;
};

/** 同一个 parent 下的同角色兄弟，按服务端给的顺序（append 顺序 = seq 顺序）。 */
function siblingsOf(nodes: HomeAskMessage[], message: HomeAskMessage): HomeAskMessage[] {
  const parentId = `${message.parentId || ""}`;
  // 没有父节点的消息（根、或者旧数据里压根没有父链）不存在兄弟版本的概念:
  // 那种情况下所有节点的 parentId 都是空，凑一起会变成"所有消息互为分支"。
  if (!parentId) return [message];
  return nodes.filter((n) => `${n.parentId || ""}` === parentId && n.role === message.role);
}

/**
 * 可见线程上每条消息的分支导航信息。只有真的存在多版时才给（count > 1）。
 */
export function branchNavigation(
  nodes: HomeAskMessage[],
  visible: HomeAskMessage[],
): Record<string, HomeAskBranchNav> {
  const nav: Record<string, HomeAskBranchNav> = {};
  for (const message of visible) {
    const siblings = siblingsOf(nodes, message);
    if (siblings.length < 2) continue;
    const index = siblings.findIndex((s) => s.id === message.id);
    if (index < 0) continue;
    nav[message.id] = {
      index: index + 1,
      count: siblings.length,
      prevId: index > 0 ? siblings[index - 1].id : "",
      nextId: index < siblings.length - 1 ? siblings[index + 1].id : "",
    };
  }
  return nav;
}

/**
 * 切到某个版本之后，head 应该落在哪儿。
 *
 * 不是那个版本自己——它下面可能还接着后续对话（在别的分支上继续问过）。沿着子节点
 * 一路走到底，取最后添加的那条，也就是这条分支最新的续写。
 */
export function headForBranch(nodes: HomeAskMessage[], targetId: string): string {
  const target = `${targetId || ""}`.trim();
  if (!target || !nodes.some((n) => n.id === target)) return "";

  let cursor = target;
  const seen = new Set<string>([cursor]);
  for (;;) {
    const children = nodes.filter((n) => `${n.parentId || ""}` === cursor);
    const next = children.length ? children[children.length - 1].id : "";
    if (!next || seen.has(next)) return cursor;
    seen.add(next);
    cursor = next;
  }
}
