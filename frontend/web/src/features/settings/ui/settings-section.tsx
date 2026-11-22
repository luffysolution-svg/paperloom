// 设置弹窗里 settings 域拥有的分栏登记（格式见 ui/settings/settings-section.ts）。
import type { SettingsSection } from "@/ui/settings/settings-section.js";
import { IconArchive, IconPalette, IconPlug } from "./settings-icons.jsx";
import { AgentIntegrationPanel } from "./AgentIntegrationPanel.jsx";
import { BackupPanel } from "./BackupPanel.jsx";
import { ThemeAppearancePanel } from "./ThemeAppearancePanel.jsx";

export const archiveBackupSettingsSection: SettingsSection = {
  id: "migration",
  label: "整库迁移",
  Icon: IconArchive,
  order: 75,
  description: "导出或导入完整 PaperLoom 数据包（含书库、译文与可选凭据），并支持 WebDAV 云端归档。",
  render: () => <BackupPanel />,
};

export const appearanceSettingsSection: SettingsSection = {
  id: "appearance",
  label: "外观",
  Icon: IconPalette,
  order: 90,
  description: "选择界面配色，立即生效并记住本机选择。",
  // 纯本地状态，一直挂着（测试契约 #theme-appearance-panel 在切过来之前就要能找到）。
  lazy: false,
  render: () => <ThemeAppearancePanel />,
};

export const agentIntegrationSettingsSection: SettingsSection = {
  id: "agents",
  label: "MCP 与 Skills",
  Icon: IconPlug,
  order: 110,
  description: "全局接入 Codex、Claude Code、Pi、WorkBuddy 与 Hermes，共享科研 Skills 且自动去重。",
  render: () => <AgentIntegrationPanel />,
};
