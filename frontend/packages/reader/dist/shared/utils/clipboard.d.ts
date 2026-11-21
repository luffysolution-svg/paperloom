/**
 * 写剪贴板。`navigator.clipboard` 在非安全上下文（局域网 IP 打开的 http 页面）里不存在，
 * 退回 execCommand("copy")；两条都失败返回 false，不假装成功。
 */
export declare function copyReaderText(text: string): Promise<boolean>;
//# sourceMappingURL=clipboard.d.ts.map