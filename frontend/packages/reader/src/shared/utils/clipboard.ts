/**
 * 写剪贴板。`navigator.clipboard` 在非安全上下文（局域网 IP 打开的 http 页面）里不存在，
 * 退回 execCommand("copy")；两条都失败返回 false，不假装成功。
 */
export async function copyReaderText(text: string): Promise<boolean> {
  const value = `${text || ""}`;
  if (!value.trim()) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // 落到下面的兜底
  }
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
