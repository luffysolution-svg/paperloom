# PaperLoom 发布收尾计划 — 2026-10-05

后续公开部署与产物核对已进入 [发布前核对计划](paperloom-publication-preflight-20261005.md)；最新状态见 [核对记录](../reports/paperloom-publication-preflight-20261005.md)。以下保留本阶段记录，测试数量和候选包以最新核对为准。

目标：完成本地发布准备，再用用户 Zotero 文献验证安装版的解析、翻译、AI 问答和 Obsidian 导出，使用本轮真实截图重写中文 README。

本轮沿用现有实现，并按后续要求补充书库批量写回 Zotero。清理和构建只操作核对过的测试目录；不重置工作树、不覆盖既有 dist、不写 Zotero 数据库，不 commit、push、tag、发布或上传。

## 执行与验收

- [x] 核对 `main / 9303483e` 工作树，记录本轮基线。
- [x] 删除两轮临时构建、测试数据和 Obsidian 比较产物；保留回滚备份和验证记录。验收：目标目录不存在，原有源码、dist、用户书库仍在。
- [ ] 对剩余完整测试失败逐项归因。只修复影响交付的已复现问题，保留环境限制和未解决失败的记录；不修改门禁来掩盖失败。
- [x] 实现 Zotero 批量写回：后端 3/3，前端 API+架构 18/18，typecheck 通过。复用同一附件和授权，最新无 PDF 任务回退到已有 PDF。
- [x] 完成依赖／字体／fixture 清单和 secrets 扫描：当前源码及独立净化历史复验零命中。公开分发许可与原历史凭据撤销仍未落实，不记为发布通过。
- [x] 重建 Windows NSIS／便携包并安装验证，核对源码快照与哈希。非 Windows 安装验收需要对应环境。
- [x] 三篇真实 Zotero 文献完成 MinerU、DeepSeek、PDF 阅读、AI 问答、Obsidian 批量导出及 Zotero 批量写回；失败块恢复后为零，最终批量选中正确恢复任务，附件和图片核对通过。
- [x] 拍摄真实书库、文档进度、PDF 对照、Markdown、AI、Zotero 批量结果及 Obsidian YAML／中文正文／表格截图，来源留档。
- [x] 替换中文 README 旧效果展示，按用户使用顺序重写；保留原项目致谢、功能、指定营销表述与可选插件。
- [x] 检查 Markdown 链接、图片、差异、secrets 和工作树保护，记录剩余门禁。

## 本地记录

- 验证记录：`tmp/paperloom-release-evidence-20261005/`（不公开）。
- 安装回滚备份：`tmp/paperloom-install-backups/20261004/`。
- 验证工具缓存：`tmp/paperloom-tools/`。
- 本轮最终 E2E 使用单独数据目录；用户原有 PaperLoom 文献与 Obsidian 手写笔记不用于清理。

## 取舍

用户已明确要求继续完成本地工作，本轮直接推进已授权范围。许可证不确定性、历史凭据撤销和平台不可用属于事实门禁，不能用推测填写“通过”。最终文献 E2E 与 README 截图放在实现和构建之后，避免再次验证已过时的候选程序。

完整测试仍待处理：最终 Rust 961 通过／17 失败／4 忽略；Python 前轮失败不变。前端 1874／0／2、contracts 20/20、desktop 45/45、database 87/87，Markdown 导出 API 10/10。详情见收尾报告。
