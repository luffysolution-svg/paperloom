// 设置里通往管理后台的入口：「账号管理」分栏指向账号页；多用户下管理员的「接口设置」分栏指向平台设置
// （多用户模式所有任务统一用平台配置的模型和 OCR，本机填的 Key 后端不认）。
import { buildAdminUrl } from "@/platform/navigation/pages.js";

const ENTRIES = {
  accounts: {
    text: "建账号、生成邀请码、重置密码、停用 / 删除、改身份、发放页数、查看每个账号的用量和任务，都在管理后台里。",
    label: "打开管理后台",
  },
  platform: {
    text: "多用户模式下所有任务统一用平台配置的翻译模型和 OCR，这里填的本机接口不会生效。平台的模型、密钥和检测都在管理后台的「平台设置」里。",
    label: "打开平台设置",
  },
} as const;

export function AdminConsoleEntry({ section = "accounts" }: { section?: keyof typeof ENTRIES }) {
  const entry = ENTRIES[section];
  return (
    <div className="auth-account" data-admin-entry={section}>
      <p className="auth-sub">{entry.text}</p>
      <p><a className="auth-primary" href={buildAdminUrl(section === "platform" ? "platform" : "")} target="_blank" rel="noopener">{entry.label}</a></p>
    </div>
  );
}
