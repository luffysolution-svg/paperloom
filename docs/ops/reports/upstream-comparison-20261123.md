# 2026-11-23 RetainPDF 上游对比

对比对象为 PaperLoom 本地 `v0.4.7`（`7727d716f`）和刚从 GitHub 拉取的 RetainPDF。上游默认分支 `main` 的末次提交是 11 月 22 日 13:31（UTC+8）的 `ebf75ef2f`。当天稍晚的桌面更新工作在 `trial/mac-sign`，该分支比 `main` 多 12 个提交。上游最近的版本标签 `v2026.11.22` 指向 `8bc2f61eb`。[上游主线](https://github.com/wxyhgk/retain-pdf/commit/ebf75ef2f0c5e930200754192a0f79a0da2a9974) · [上游标签](https://github.com/wxyhgk/retain-pdf/releases/tag/v2026.11.22) · [试验分支增量](https://github.com/wxyhgk/retain-pdf/compare/ebf75ef2f...4986e3951)

## 项目间直接影响使用和发版的差异

| 环节 | 上游改动 | PaperLoom 现状 |
|---|---|---|
| macOS 签名和公证 | 试验分支接入 Apple Developer ID、hardened runtime、公证及票据校验，并处理内置 Python.framework 的符号链接。最近的优化只单独签 Mach-O 文件和应用框架。 | 本地发布流程对内置组件做 ad hoc 签名，未接入上游的 Developer ID 公证流程。[签名实现](https://github.com/wxyhgk/retain-pdf/commit/c2554dd4b15a842cdd51c6d42cf9fec27e07c969) · [签名优化](https://github.com/wxyhgk/retain-pdf/commit/e130589bb9ca3b23ba6ace696850a34476807c7d) |
| 桌面自动更新 | 试验分支在打包后的 Windows 和 macOS 上使用 electron-updater，自动检查、下载并支持重启安装。Release 增加更新清单和 Mac ZIP。 | 本地已有独立的 GitHub Release 更新器，校验 SHA-256，并在安装前检查活动任务。Windows 支持安装版和便携版，macOS 打开 DMG 交给用户安装。Windows 安装包已有 blockmap。[上游更新器](https://github.com/wxyhgk/retain-pdf/commit/f03a88e5ec629d75286a3aec1dc6c20f6758de11) · [PaperLoom 更新器](../../../frontend/desktop/src/main/app-update.js) |
| 候选构建复用 | 主线可手动预建 Docker 镜像和三平台桌面包。打版本标签时核对提交、版本、测试和构建产物，条件满足就复用。 | 本地已有按改动范围选择检查的脚本，发版仍走 PaperLoom 自己的构建流程，未引入上游的候选预构建及提升工作流。[上游候选工作流](https://github.com/wxyhgk/retain-pdf/blob/ebf75ef2f/.github/workflows/prebuild-release-candidates.yml) · [PaperLoom 桌面发布流程](../../../.github/workflows/release-desktop.yml) |

## PaperLoom 已有的近期主线改动

- **字体和 Typst 按需下载**。下载清单、下载与校验模块、状态接口、npm 资源发布工作流均已存在。两边的核心下载模块和发布工作流内容一致。PaperLoom 的 Windows 安装包仍自带运行资源。[上游实现](https://github.com/wxyhgk/retain-pdf/commit/58ee247258bc542aa93ea9bea8b519502d6ed82d) · [本地配置](../../../backend/config/runtime_assets.json)
- **桌面 Python 包体与构建检查**。Windows 和 Linux 的运行时裁剪、工作区 Python 包导入检查、Windows 控制台 UTF-8 输出均已接入。本地打包脚本保留了 PaperLoom 专属资源。[上游裁剪](https://github.com/wxyhgk/retain-pdf/commit/18acdef9088c2e7a85933d150691de703544f16c) · [本地裁剪实现](../../../frontend/desktop/scripts/runtime-prune.mjs)
- **翻译、阅读器和书库**。GLM-OCR 检测和智谱翻译的 Chat Completions 协议修复、整表译文、原书书签保留、书库条目和标签迁移、前端按改动挑选测试，在本地都有对应实现。PaperLoom 的翻译自检另外检查作者－年份引文遗漏。[智谱协议](https://github.com/wxyhgk/retain-pdf/commit/cebb0f3821756e7c6f3e36fe470f6b5f45b33e4f) · [上游整表翻译](https://github.com/wxyhgk/retain-pdf/commit/33d5ed1d9) · [本地翻译自检](../../../backend/translation-agent/retainpdf_translation_agent/checks.py)

## 比较口径

两条公开主线没有共同的 Git 祖先。上次书面同步记录采用的上游基准是 `97f08772e`。从该基准到本次上游 `main` 有 610 个提交，其中 150 个在第一父链上。逐路径比较这段上游增量，按新增、修改、删除分别计入，改名分作两个路径，共涉及 1,721 个路径。其中 1,529 个在 PaperLoom `v0.4.7` 的文件内容或删除状态已与上游末端一致。其余路径包含品牌、版本、生成文件以及双方独立实现。上表另核对了相关源码与工作流。[上次同步记录](upstream-sync-20261121.md) · [上游增量](https://github.com/wxyhgk/retain-pdf/compare/97f08772e...ebf75ef2f)
