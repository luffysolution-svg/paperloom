// 邀请码注册：地址栏里带的邀请码、提交前的检查、邀请链接怎么拼。
import { MIN_PASSWORD_LENGTH, USERNAME_PATTERN } from "./auth-errors.js";

export const MAX_PASSWORD_LENGTH = 128;

/** 管理员发的链接形如 index.html?invite=ABCD-EFGH-JKMN；没有返回空串。 */
export function readInviteParam(search?: string): string {
  const query = search ?? (typeof globalThis.location !== "undefined" ? globalThis.location.search : "");
  try {
    return `${new URLSearchParams(query).get("invite") || ""}`.trim();
  } catch {
    return "";
  }
}

/** 邀请链接：首页地址加 ?invite=（没登录时首页就是登录界面，带了邀请码会直接打开注册表单）。 */
export function buildInviteLink(code: string, origin?: string, pathname?: string): string {
  const base = origin ?? (typeof globalThis.location !== "undefined" ? globalThis.location.origin : "");
  const path = pathname ?? (typeof globalThis.location !== "undefined" ? globalThis.location.pathname : "/");
  const home = path.replace(/[^/]*$/, "index.html");
  return `${base}${home}?invite=${encodeURIComponent(code)}`;
}

/** 提交前的检查；没问题返回空串。邀请码原样提交，大小写、空格、连字符后端都认。 */
export function registerProblem({
  inviteCode,
  username,
  password,
  confirm,
}: {
  inviteCode: string;
  username: string;
  password: string;
  confirm: string;
}): string {
  if (!inviteCode.trim()) return "请填邀请码。";
  if (!USERNAME_PATTERN.test(username.trim())) return "用户名 3～32 位，只能用字母、数字、点、下划线、连字符。";
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return `密码要 ${MIN_PASSWORD_LENGTH}～${MAX_PASSWORD_LENGTH} 位。`;
  }
  if (password !== confirm) return "两次输入的密码不一样。";
  return "";
}
