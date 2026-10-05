# PaperLoom 发布收尾记录 — 2026-10-05

本文件记录前一轮验收；后续 Docker、AI 修复、三语 README 和完整 Linux 门禁的当前状态以 [最新发布核对](paperloom-publication-preflight-20261005.md) 为准。下文旧产物目录不再是当前候选集合。

本轮按用户要求清理临时产物，补充批量 Zotero 写回，再进行最终安装版真实文献验证。未经授权不提交、推送、打 tag、发布或上传。

## 已完成

- 核对 `main / 9303483e`，初始 538 项改动；清理后 532 个基线文件全部存在且哈希未变。后续源码修改单独核对，原 generated dist 未重建。
- 删除两轮临时构建、安装包、测试数据库及 Obsidian `MinerU-vs-Paddle-20261005` 比较笔记；保留原安装回滚备份及少量证据。新测试只使用新目录。
- Windows 前端测试的路径分隔符、ESM 文件 URL、Python smoke 启动和 contracts CRLF 比较问题已复现并作最小修复。门禁白名单未放宽。
- 完整前端 **1874 通过、0 失败、2 跳过**；contracts **20/20**；上传服务 focused **9/9**；TypeScript 通过。
- 新增 `POST /api/v1/integrations/zotero/writeback-batch` 和书库多选入口。后端 **3/3**、前端 API+架构 **18/18**。最多 200 篇，修剪／去重，逐篇处理与结果；选择最新实际可用的成功译文 PDF，较新的 Translate-only 任务不挡住已有 PDF。重复写回更新同一附件，授权复用。
- 用户将安全排查限定为密钥泄露；广义漏洞审计已停止，未修改 ZIP 路径或其他未请求的安全行为。
- 当前源码 gitleaks 9 条命中均为文档占位／开发常量。新增只匹配具体占位值和目录表达式的窄 allowlist，复验零命中。原 git 历史 32 条命中，其中 9 条涉及 3 个不同的真实候选凭据（含一份过期 JWT）；原历史未重写。独立无 remote 的 `paperloom-publication-history-sanitized-v2.git` 已清除候选值，961 commits 历史复验零命中。服务商撤销状态仍未获得证据。旧 v1 副本清理被工具策略拒绝，保留 `DO_NOT_PUBLISH.txt`；它不是可发布副本。
- DroidSansFallbackFull 内嵌名称表明确 Google 2006／Ascender、Apache-2.0，源码与安装版 SHA-256 相同；补充通知及 Apache／AGPL 完整文本。商业许可未确认，公开安装包的 AGPL 对应源码义务仍需落实。
- 四个 PDF 中找到明确 CC 许可；其余 fixtures 未获得再分发依据，ND 文献的译文／提取物不得默认视为可再分发。未删除 fixture。
- 最终 Rust workspace 完整测试 **961 通过、17 失败、4 忽略**，仍是 Windows 路径、脚本/进程和原有用例，未把全量门禁记成通过。Python 未修改，前一轮的全量失败结果继续保留。
- Windows release 编译、NSIS／便携包重建与实际目录安装通过。真实授权等待发现 Node HTTP 全局 agent 的 5 秒 timeout 导致网关 504；延迟后端回归先失败再通过，为代理请求指定 `agent: false` 后桌面完整测试 **45/45**。新安装版已包含修复。
- 三篇新文献第一轮翻译分别有 **25、25、45 个 failed 块**，不能以 succeeded 状态当作完整翻译。用本轮提供的 DeepSeek 凭据恢复后，三篇 failed 均为 **0**；translated 为 95／88／69，kept_origin 为 30／5／5，均标记 should_translate=false，抽查为公式、作者/地址或子图标签。现有 completion_note 把全部 kept_origin 泛称“多为余额不足”等，属于既有文案不准确；未为此扩大改动。
- 最终导出发现恢复任务只设置 active_job_id、未更新 jobs.document_id，导致批量仍选旧译文。新增红绿回归，activation 和任务归属改为同一事务，数据库完整 **87/87**。另补恢复任务的 Obsidian 导出沿 artifact_job_id 读取原 OCR Markdown／图片，保留最新翻译正文、元数据和附件；未修改图注。
- 首次 Zotero 真实批量写回：2 created、1 updated、0 failed；重复为 0 created、3 updated、0 failed。三个文档各仅一个标记附件，同一 ID，PDF 13／15／11 页，MD5 与导出文件一致。前端多选按钮也实测更新 3 篇成功。
- Obsidian 批量导出 3 written、0 failed；HTML Table Math 0.1.2 启用，HOF 表格 14 个公式、5 个 rowspan，零 MathJax 错误／raw-eq／溢出，抽查图片正常。已保存 raw frontmatter 和正文真实截图。
- 最终候选安装版上，批量操作实际选择三篇恢复后的任务（`20261004190321-*`）。Zotero 3 updated／0 failed，各仅一附件；Obsidian 3 written／0 failed，图片引用 54／17／26，全部存在，PDF 页数 13／15／11，三个 MD5 均与 Zotero 相同。中文摘要与引言和 frontmatter 已重新截图，旧原文保留导致的正文缺译已消除。
- AI 实际问答已返回 397 和 1602 字回答，带来源引用；第 9 页引用跳转正确。两条回答都有 rounds_exhausted，界面如实提示提前收尾。旧密钥余额错误和早期网关 504 单独保留；未伪造成功问答。
- 独立代码复核未报告本轮新增的 Critical／Important。暂缓的 Minor：恢复导出在本地存在空／部分图片目录时可能优先选该目录；当前真实恢复任务的本地图片目录不存在，沿源任务读取的链路已通过。未扩展混合图片目录行为。任务关联后再次保存／未知文档的额外回归未新增，现有完整数据库用例通过。

## 交付与剩余门禁

- 中文 README 已从用户使用顺序重写并替换 9 张真实效果截图；图片／本地链接检查通过，RetainPDF 致谢、项目功能及指定营销表述保留。旧图片文件保留，中文 README 已不引用旧 gallery。
- 最终 Windows NSIS 安装包、便携包、blockmap、源码快照和 SHA256SUMS 留在 `tmp/paperloom-release-artifacts-20261005/`，未签名／未发布／未上传，版本保持 0.1.2。实际安装目录已包含批量写回、网关等待、恢复任务关联和 OCR 导出资源复用修复。
- 早期临时产物已清理；最后验收的三篇文献、六篇原文／译文笔记和资源保留在用户 vault 的 `PaperLoom/Release-Validation-20261005/`。中间任务编号笔记的删除被工具策略拒绝，已改为移出 vault 到本地证据目录归档，未丢失数据。
- 发布仍待：Rust／Python 全量剩余失败、AGPL 对应源码及完整第三方通知义务、未明确权利的 fixture／论文摘录、原历史凭据撤销或采用净化历史的正式决定、非 Windows 构建与安装验收。真实 Zotero 撤销后重授权和一次性授权未完成。没有把这些项目记成通过。

本地证据位于 `tmp/paperloom-release-evidence-20261005/`，回滚备份位于 `tmp/paperloom-install-backups/20261004/`。早期报告的临时路径已经清理，不能继续作为存在的交付文件链接。
