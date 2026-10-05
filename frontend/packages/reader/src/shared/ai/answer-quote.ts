// 选中回答里的一段话 → 引用进输入框的文本块。
//
// 放在 reader 包里是因为两侧都要用：阅读器的 AI 面板和主页问答。引用块的形状必须一致
// ——两份实现迟早会漂移，而漂移的表现是「同一段话在两个界面引用出来不一样」。

/**
 * 引用块最长多少字。
 *
 * 选中整屏再引用，等于把刚生成的回答原样塞回请求里——上下文白白多出一大段，而用户
 * 真正想指的往往只是其中一句。超了就截断并标出来，而不是默默发全文。
 */
export const MAX_QUOTE_CHARS = 600;

/**
 * 把选中的文字变成 Markdown 引用块，后面留一个空行给用户接着写。
 *
 * 用 `>` 而不是直接粘原文：模型能看出这是「用户指着的那段」，不是新问题的一部分；
 * 用户自己在输入框里也一眼能分出哪段是引用、哪段是自己要问的。
 */
export function buildQuoteBlock(raw: string): string {
  const text = `${raw || ""}`.replace(/\r\n?/g, "\n").trim();
  if (!text) return "";

  const clipped = text.length > MAX_QUOTE_CHARS
    ? `${text.slice(0, MAX_QUOTE_CHARS).trimEnd()}…（已截断）`
    : text;

  // 空行在引用块中间会把它断成两块，用 `>` 顶上去保持是同一块。
  const quoted = clipped
    .split("\n")
    .map((line) => (line.trim() ? `> ${line}` : ">"))
    .join("\n");

  return `${quoted}\n\n`;
}

/**
 * 把引用块并进现有草稿。
 *
 * 已经写了一半的草稿不能被覆盖——用户可能先打了半句问题才回头去选那段话。引用统一
 * 放在最前面，问题跟在后面，和用户从上往下读的顺序一致。
 */
export function mergeQuoteIntoDraft(draft: string, quote: string): string {
  const block = `${quote || ""}`;
  if (!block) return `${draft || ""}`;
  const rest = `${draft || ""}`.trimStart();
  return rest ? `${block}${rest}` : block;
}
