// 校验徽标图标。
//
// tone 的四个取值是 UI 契约：
//   "valid"   通过
//   "error"   失败
//   "pending" 请求进行中 —— 只有它会禁用检测按钮
//   ""        中性提示（如「使用旧配置；请填写 Key 后检测」），按钮仍可点
//
// 曾经没有 "pending"，检测中靠「有消息且无 tone」推断，于是每条中性提示都被
// 误判成进行中，把检测按钮锁成灰色——文案让用户去检测，按钮却点不动。
export function validationIcon(tone = "", content = "") {
  if (!content) {
    return "";
  }
  if (tone === "valid") {
    return "\u2713";
  }
  if (tone === "error") {
    return "!";
  }
  return "\u2026";
}
