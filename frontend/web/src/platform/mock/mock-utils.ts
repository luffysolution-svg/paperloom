/** platform/mock 共享纯 helper：id 归一、时间戳、序号 id、标题/文件名命中。 */

/** id 归一：空值兜底为空串并去掉首尾空白（镜像原 `\`${value || ""}\`.trim()`）。 */
export function trimId(value: unknown): string {
  return `${value || ""}`.trim();
}

/** 统一取墙钟 ISO 时间戳。 */
export function nowIso(): string {
  return new Date().toISOString();
}

/** mock 实体的顺序 id（fav-001 / col-002）。 */
export function sequentialId(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(3, "0")}`;
}

/** 大小写不敏感的字面包含匹配；各段以换行拼接（镜像后端 LIKE 的标题/文件名检索）。 */
export function matchesAnyText(parts: unknown[], needle: string): boolean {
  return parts.map((part) => `${part || ""}`).join("\n").toLowerCase().includes(`${needle}`.toLowerCase());
}
