# PaperLoom 与 retain-pdf 的差异及本次同步

2026-11-21 对比了 PaperLoom `main` 的 `40162d2cc`（软件版本 0.2.7）和 retain-pdf `main` 的 `97f08772e`（11 月 10 日）。建议继续维护 PaperLoom 的桌面工作流，把上传、识别、翻译和排版中能独立验证的修复按功能回移。整树替换会丢失现有的阅读器问答和桌面 AI 服务。[上游源码](https://github.com/wxyhgk/retain-pdf/tree/97f08772e)

## 两个基线

- **哪些是 PaperLoom 的变化**。公开版从一次源码快照开始，与上游没有 Git 共同祖先。本地还保存着迁移前的历史，它与上游最后的共同提交是 9 月 21 日的 `857868407`。用这个提交对比两端文件内容，PaperLoom 一侧有 849 个路径发生变化，其中 303 个仅本地有变化，546 个在两边都变过，后者有 521 个至今内容或存在状态不同。统计包含文档、构建产物和删除的路径，改名按旧、新两个路径计数。
- **上次检查后上游做了什么**。此前已按功能同步到 10 月 25 日部分变更。以记录中的 `a665c2aea` 为起点，上游新增 1,146 个提交（含分支提交和合并），Git diff 计 2,113 个文件。文献分页、流式上传、磁盘余量保护、老库升级备份和 FIFO 队列在本地已有实现。[此前验证记录](upstream-sync-real-tests-20261102.md) · [上游增量](https://github.com/wxyhgk/retain-pdf/compare/a665c2aea...97f08772e)

## 已回移

| 环节 | PaperLoom 中的改动 | 对应上游提交 |
| --- | --- | --- |
| 上传 PDF | 数页时丢弃图片、字体和正文流，保留解包页面树需要的对象流。沿用本地流式上传、去重和修复入口 | [00b50dbfc](https://github.com/wxyhgk/retain-pdf/commit/00b50dbfc) |
| Paddle OCR | 根据开头标记、相邻区块和完整单词判断图注与表注，修正含 `stable`、`suitable` 的图注误分类 | [ccd3e4bab](https://github.com/wxyhgk/retain-pdf/commit/ccd3e4bab) |
| MinerU OCR | 把拆回前后两页的同一段重新标为接续组，供翻译阶段使用。同步更新了离线修复样本的文档、报告和检查点指纹 | [704ad42d5](https://github.com/wxyhgk/retain-pdf/commit/704ad42d5) |
| OCR 坐标 | 首次校验前，修正每边越界不超过对应页边长 1% 的框，并记录原坐标。明显越界仍会报错 | [57e8b4dd1](https://github.com/wxyhgk/retain-pdf/commit/57e8b4dd1) |
| Typst | 处理带圈数字、字母和方括号里的 `@标记`，避免单处文本让整份 PDF 编译失败。本次只回移了大书分片提交里的文本转义部分 | [c9879fe7a](https://github.com/wxyhgk/retain-pdf/commit/c9879fe7a) · [2e734d0cb](https://github.com/wxyhgk/retain-pdf/commit/2e734d0cb) |
| 术语表 | 在现有粘贴导入入口支持制表符和分号分隔，按 CSV 引号规则识别字段。Excel 复制的备注可包含多个逗号 | [e587a4a5c](https://github.com/wxyhgk/retain-pdf/commit/e587a4a5c) · [bbbe3cc58](https://github.com/wxyhgk/retain-pdf/commit/bbbe3cc58) |

回归时还复现了两个 Windows 问题。命令型 OCR 用 POSIX 规则拆命令，会去掉可执行文件和脚本路径里的反斜杠，现交给 Windows 原生解析。OCR 回填工具计算格式化 JSON 的哈希时使用 LF，实际文件使用 CRLF，现按写盘的换行方式计算。两项都在原版上复现。

## 后续同步顺序

| 优先级 | 上游已有的变化 | 对 PaperLoom 的判断 |
| --- | --- | --- |
| 第一批 | [翻译零产出时报告主要错误](https://github.com/wxyhgk/retain-pdf/commit/a819d8b8c)、[重翻单项时恢复任务的模型连接](https://github.com/wxyhgk/retain-pdf/commit/fca1cdfdf) | 保留本地凭据和每任务选模型的入口，把错误归因和连接恢复接到本地翻译流程。用失效密钥、可重试错误及两个不同模型配置分别回归 |
| 第一批 | [受保护 PDF 分段读取](https://github.com/wxyhgk/retain-pdf/commit/cac1aa80e)、[按需加载书库封面](https://github.com/wxyhgk/retain-pdf/commit/84da78f80) | 本地受保护 PDF 的下载函数仍会读整个 `arrayBuffer()`。可独立移植传输层，复测鉴权、取消、快速切书和原译文对照，再接封面懒加载 |
| 第二批 | [双栏续句、译文链接、OCR 乱码恢复](https://github.com/wxyhgk/retain-pdf/commit/ece6f00c6)、[标题按原文字号排版](https://github.com/wxyhgk/retain-pdf/commit/5c35aad36)、[超长文档分片排版](https://github.com/wxyhgk/retain-pdf/commit/2e734d0cb) | 按输出 PDF 的变化拆开。用双栏论文、含链接的论文、带公式和图片的 Obsidian 笔记对照结果。标题改动涉及上游新增的渲染引擎 |
| 独立功能 | [GLM-OCR](https://github.com/wxyhgk/retain-pdf/commit/c55ec7ca8)、[OCR 与翻译并行](https://github.com/wxyhgk/retain-pdf/commit/289e23748)、[可选翻译 Agent](https://github.com/wxyhgk/retain-pdf/commit/e8f94076a) | 三者分别改变服务商配置、任务状态和翻译执行方式。可接入 PaperLoom，须处理旧任务续跑、打包依赖和凭据传递 |
| 保留本地实现 | 上游[移除独立 AI 服务](https://github.com/wxyhgk/retain-pdf/commit/f753a2e92)、[桌面移除 AI 启动与打包](https://github.com/wxyhgk/retain-pdf/commit/be35c3cb3)、[移出 Studio](https://github.com/wxyhgk/retain-pdf/commit/fbda70435) | 保留 Obsidian 入库、Zotero 导入与写回、阅读器问答、ACP、本地模型配置、WebDAV 全量迁移和桌面更新。上游的 Markdown ZIP 下载可另加导出入口，现有 vault、附件和笔记链接仍走 PaperLoom 的导出流程 |

新增翻译 Agent 用于翻译文档，和 PaperLoom 里给用户问答的 Agent 是两个入口。采用前者可以单独评估，无需删除后者。

## 验证范围

- Windows 的 OCR 文档、Typst 文本和翻译离线恢复测试共 320 项通过。带圈公式用桌面包自带的 Typst 做了实际编译。离线恢复会检查原任务文件、修复后的译文、检查点和产物指纹。
- Rust 后端 54 项通过，覆盖上传数页、术语表、Obsidian 和 Zotero；前端集成回归 13 项通过。数页测试使用仓库中的 10 份 PDF，将过滤流后的页数与完整加载的结果逐一对照。
- 验证使用仓库样本和测试库。真实个人 vault 写入、外部模型调用及桌面安装包发布不在本次验证范围内。
