/**
 * 引用块最长多少字。
 *
 * 选中整屏再引用，等于把刚生成的回答原样塞回请求里——上下文白白多出一大段，而用户
 * 真正想指的往往只是其中一句。超了就截断并标出来，而不是默默发全文。
 */
export declare const MAX_QUOTE_CHARS = 600;
/**
 * 把选中的文字变成 Markdown 引用块，后面留一个空行给用户接着写。
 *
 * 用 `>` 而不是直接粘原文：模型能看出这是「用户指着的那段」，不是新问题的一部分；
 * 用户自己在输入框里也一眼能分出哪段是引用、哪段是自己要问的。
 */
export declare function buildQuoteBlock(raw: string): string;
/**
 * 把引用块并进现有草稿。
 *
 * 已经写了一半的草稿不能被覆盖——用户可能先打了半句问题才回头去选那段话。引用统一
 * 放在最前面，问题跟在后面，和用户从上往下读的顺序一致。
 */
export declare function mergeQuoteIntoDraft(draft: string, quote: string): string;
//# sourceMappingURL=answer-quote.d.ts.map