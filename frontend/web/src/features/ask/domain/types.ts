// 主页 AI 问答 Tab 的轻量类型（不绑阅读器 job）

/** @ 文档 */
export type HomeAskDocScope = {
  kind: "document";
  id: string;
  title: string;
  job_id?: string;
  source_filename?: string;
};

/** @ 合集（发送时展开为合集内文档列表，软限定检索） */
export type HomeAskCollectionScope = {
  kind: "collection";
  id: string;
  title: string;
  document_count?: number;
};

export type HomeAskScope = HomeAskDocScope | HomeAskCollectionScope;

/** @deprecated 兼容旧命名 */
export type HomeAskDocRef = HomeAskDocScope;

export type HomeAskCitation = {
  ref?: number | string;
  block_id?: string;
  page_idx?: number;
  page?: number;
  job_id?: string;
  document_id?: string;
  snippet?: string;
  [key: string]: unknown;
};

export type HomeAskMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: HomeAskCitation[];
  progress?: string;
  /**
   * `cancelled` = 用户点了停止、回答只写了半截。
   *
   * 它此前不存在：中断被标成 `complete`，再往正文尾巴上拼一句 Markdown 斜体
   * `_（已停止生成）_` 当标记。那样做的代价是标记混进了 `content`——半截回答和写完的
   * 回答在数据上分不出来，标记会被「复制」抄走、被「引用」带进下一个问题，也会跟着
   * `content` 一起被当成回答内容。中断是一种状态，不是正文的一部分。
   */
  status?: "pending" | "streaming" | "complete" | "cancelled" | "error";
  /**
   * 服务端消息树里的父节点。会话本来就是一棵树（后端存 parent_id/head_id），
   * 重新生成要靠它把新答案挂成同一个提问下的兄弟分支，而不是再追加一轮提问。
   */
  parentId?: string;
  /**
   * 用户消息真正发给模型的那串文本（`buildScopedQuestion` 拼过范围之后的结果），
   * 只在它和展示用的 `content` 不一致时才有。重新生成要原样重发它——拿展示文本
   * 去发会把「@标题」那串后缀也当成问题的一部分。
   */
  prompt?: string;
  /**
   * 用户当初敲进输入框的原文。编辑历史提问时拿它回填——`content` 带着「@标题」后缀、
   * 从服务端恢复的那份还是拼过范围的整段 prompt，两者都不适合直接放进编辑框。
   */
  rawQuestion?: string;
  /**
   * 回答为什么不完整。目前只有 "rounds_exhausted"：模型的工具轮次预算用尽，是被
   * 强制收尾的。它写出来的话语气照常，用户看不出它其实没做完——所以要标出来。
   */
  incompleteReason?: string;
};

export function scopeKey(s: HomeAskScope): string {
  return `${s.kind}:${s.id}`;
}
