// 邀请码：状态说成人话、生成表单的检查（范围和后端一致，错误标到对应输入框）、表单 → 请求体。
import type { CreateInviteInput, InviteView } from "@retainpdf/api/auth";

export const INVITE_STATUS_LABELS: Record<string, string> = {
  active: "可用",
  used_up: "已用完",
  expired: "已过期",
  revoked: "已作废",
};

export const inviteStatusLabel = (status: string) => INVITE_STATUS_LABELS[status] || status || "—";

/** 只有还能用的邀请码才给「作废」：用完、过期、作废的再作废没有意义。 */
export const canRevokeInvite = (invite: Pick<InviteView, "status">) => invite.status === "active";

export type InviteField = "max_uses" | "initial_pages" | "expires_in_days" | "note";

export type InviteForm = { maxUses: string; initialPages: string; expiresInDays: string; note: string };

export const EMPTY_INVITE_FORM: InviteForm = { maxUses: "1", initialPages: "0", expiresInDays: "7", note: "" };

export type InviteFormProblem = { field: InviteField; message: string } | null;

function intIn(text: string, min: number, max: number): boolean {
  return /^\d+$/.test(text) && Number(text) >= min && Number(text) <= max;
}

/** 有效天数留空 = 不过期；其余三项按后端范围检查。 */
export function inviteFormProblem(form: InviteForm): InviteFormProblem {
  if (!intIn(form.maxUses.trim(), 1, 1000)) return { field: "max_uses", message: "可用次数要填 1～1000 的整数。" };
  if (!intIn(form.initialPages.trim(), 0, 100000)) return { field: "initial_pages", message: "赠送页数要填 0～100000 的整数。" };
  const days = form.expiresInDays.trim();
  if (days && !intIn(days, 1, 365)) return { field: "expires_in_days", message: "有效天数要填 1～365 的整数，留空表示不过期。" };
  if (Array.from(form.note).length > 200) return { field: "note", message: "备注最多 200 字。" };
  return null;
}

export function inviteInput(form: InviteForm): CreateInviteInput {
  const days = form.expiresInDays.trim();
  const note = form.note.trim();
  return {
    max_uses: Number(form.maxUses.trim()),
    initial_pages: Number(form.initialPages.trim()),
    ...(days ? { expires_in_days: Number(days) } : {}),
    ...(note ? { note } : {}),
  };
}

/** 后端 400 INVALID_INVITE_INPUT 的 details.field → 标到哪个输入框。 */
export function inviteErrorField(error: unknown): InviteField | "" {
  const e = (error || {}) as { code?: string; details?: { field?: unknown } };
  if (`${e.code || ""}` !== "INVALID_INVITE_INPUT") return "";
  const field = `${e.details?.field || ""}`;
  return field === "max_uses" || field === "initial_pages" || field === "expires_in_days" || field === "note" ? field : "";
}
