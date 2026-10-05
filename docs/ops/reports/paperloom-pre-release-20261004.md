# PaperLoom 发布前验证 — 2026-10-04

状态：**未达到发布条件**。本报告记录实际验证，未 commit、push、创建 tag、发布 Release 或上传 artifacts。

## 工作树保护

- 开始时为 `main` / `9303483e`，`git status --porcelain` 有 520 项变更，包含用户既有源码和 generated dist。
- 先记录文件哈希，再检查代码；不执行 reset、checkout、clean 或全仓格式化。仅格式化本轮写回 Rust 文件。
- 构建在 `tmp/paperloom-preflight-20261004/candidate-source` 独立副本中进行，不重建或覆盖原工作树 dist。测试跳过 npm 自动重建前置脚本。
- Zotero 验证使用真实任务的 PaperLoom 数据副本；只通过 Zotero 本地 API 写入附件，不直接写 `zotero.sqlite`。

## Zotero 10 真实验证

环境：Windows，Zotero **10.0.5**，本地 API 已开启。真实 Zotero 导入的 Pan 2024 文献，已有成功译文 PDF（13 页）。

| 验证 | 结果 |
| --- | --- |
| 首次授权与创建 | Zotero 弹出授权，用户选择“始终允许”；原文献下创建“PaperLoom 中文译文”子附件。 |
| PDF 打开 | 用户确认显示正常；PDF 可解析，上传文件与 PaperLoom PDF 的 MD5 一致。 |
| 重复写回 | 返回 `updated`，附件 ID 不变，标记匹配的子附件总数为 1。 |
| 内容变化后更新 | 在数据副本 PDF 末尾加入合法注释改变哈希，写回仍更新同一附件，Zotero MD5 与新文件一致；之后恢复原 PDF 并再次写回。 |
| 撤销后重新授权 | **未完成原生 UI 验证**。本次原生电脑操控禁用，Chrome 连接报 `Codex auth token is unavailable`。 |
| “仅允许一次”重复提示 | **未完成真实 UI 验证**；fake server 三阶段授权测试通过。 |
| Zotero 9 / 8 | fake server 回归覆盖，版本检测在授权或写入前拒绝。未替换本机 Zotero。 |
| 非 Zotero 来源 / 未运行 / Docker 只读 | 三项均返回清晰的 HTTP 409 错误；独立数据副本与替代本地端口验证，不停止用户 Zotero。 |

本轮最小修复：

1. Zotero 10.0.5 的 `fromJSON` 按 JSON 字段顺序应用字段。原请求的 `filename` 排在 `linkMode` 前，导致“Link mode must be set before setting attachment path”。创建附件时省略文件名，由三阶段上传设置；测试先复现失败，再通过。
2. reqwest 连接错误默认含请求 URL，可能暴露临时上传地址。使用 `without_url()` 脱敏；回归测试先失败，再通过。
3. Obsidian 批量导出复用书籍详情面板违反跨功能边界，面板也超过体量门禁。将共用导出 UI 移至独立 `obsidian-export` 功能并保留原路径的兼容出口，拆出批量结果视图；不放宽门禁或登记依赖环。

## 测试门禁

| 命令 / 检查 | 实际结果 |
| --- | --- |
| 写回协议与错误回归（串行） | **8/8 通过**，含版本拒绝、授权复用、一次性授权、上传源限制、条件头和 URL 脱敏。 |
| 前端 focused API + 架构门禁 | **26/26 通过**，含 import cycles、跨功能边界与模块体量。 |
| TypeScript（跳过自动重建） | 通过。 |
| Electron 桌面端完整测试 | **44/44 通过**。 |
| 前端完整测试（Node 22.22.0，最终修复后） | **1861 通过、7 失败、1 跳过**。CSS 命名空间 3 项、开发服务 smoke 1 项、测试布局白名单 1 项、Windows ESM import 2 项。 |
| contracts 完整测试 | 19 通过、1 失败（create-job field generated-value 检查）；schema lint 与 generate:check 通过。 |
| Rust workspace `--no-fail-fast -- --test-threads=1`（MinerU DNS 修复后最终） | **954 通过、18 失败、4 忽略**。新增 DNS、错误分类和渲染恢复回归通过；既有 Windows/路径/进程失败与上传超时用例波动仍未关闭。 |
| Python AI，锁定环境，UTF-8 | **324 通过、24 失败、2 跳过**。普通 Windows 编码首次为 25 失败，UTF-8 消除 1 项编码失败。 |
| Python pipeline，UTF-8 + 安装版 Typst | **2210 通过、26 失败、22 跳过**，8 subtests 通过。首次缺 Typst/默认编码为 35 失败。 |
| Python ops / CI 脚本（最终） | **125 通过、1 失败**；文档链接/布局 **6/6 复验通过**，剩余为 Windows 进程组清理用例。 |
| Word 导出构建器 | **25/25 通过**。仓库的 `node --test tests/` 入口在 Windows 报 MODULE_NOT_FOUND，显式枚举 `tests/*.test.mjs` 跑完全部测试。 |
| Rust release workspace | 通过（保留既有 unused import/variable 警告）。 |

前端剩余 7 项在本轮首次完整测试中已出现；本轮相关的跨功能边界和体量失败已修复，修复中引入的依赖环也已消除。Python 源码本轮没有修改，Rust 的剩余失败未涉及本轮修改的写回模块。但这不代表 HEAD 或所有用户既有改动已经验证正确：其余失败仍需逐项归因。已确认的环境原因包括 Windows `file://` import、UTF-8／GBK、Unix-domain socket、shell/进程组语义、未启动开发 smoke 端口。没有通过重构无关模块来规避失败；测试门禁仍失败，Linux CI 全量验证也未完成。

## 开源治理、密钥与许可

- LICENSE 保留 RetainPDF 与 PaperLoom 两项 MIT 版权声明。CONTRIBUTING 更新项目名称与安全/行为准则链接；新增 SECURITY 与 CODE_OF_CONDUCT。没有发送任何邮件。
- Gitleaks **8.30.1** 已扫描当前源码副本和 `git --all` 历史，输出使用 `--redact=100`。
- 当前扫描 10 条命中：9 条在仓库源码（文档占位/本地示例与环境变量常量），1 条为复制的 Python 运行时常量；需用确定的 allowlist/复验留档，原始扫描不是零命中。
- 历史 32 条命中：23 条为占位符或代码常量；**9 条需要持有者核对和失效/撤销确认**。涉及旧 `front/runtime-config.js` JWT/API key、Paddle API 文档及 DeepSeek 文档。用户允许本机测试并明确不允许上传/泄露，未确认这些历史凭据失效。未输出 secret 值，未重写或删除 git 历史。
- npm lockfile 完整许可证清单与 Windows Rust dependency metadata 已保存到本地审计目录。npm 未知许可项均为本地 workspace/链接；含 MPL-2.0，Rust 含 CDLA-Permissive-2.0 证书数据。
- Python 开发环境 33 个 distribution、候选运行时 26 个 distribution 已记录许可 metadata；候选中 certifi、pikepdf 为 MPL 系列，PyMuPDF 为 AGPL／商业双许可证。开发环境仅两个第一方 workspace 包缺单独 license metadata。
- **PyMuPDF 1.26.5 运行时 metadata 明确为 AGPL-3.0 / Artifex commercial 双许可证**。必须明确实际适用许可与分发义务，不能仅凭根 MIT 文件放行安装包。
- Source Han Serif 的 OFL 与 Latin Modern Math 的 GUST 通知已有；VisualTeX MIT NOTICE 已有。本轮补充打包复制第一方 LICENSE、第三方通知与 VisualTeX LICENSE/NOTICE。DroidSansFallbackFull 来源/通知、其他打包依赖通知仍需核对。
- **14 个已跟踪 PDF** 和 golden-job 原文/译文提取物缺少逐文件再分发依据。未删除用户 fixture；公开源码与归档前需要来源、权利人、许可证或书面许可。

许可证记录见 [THIRD_PARTY_NOTICES](../../../THIRD_PARTY_NOTICES.md)。本地脱敏明细在 `tmp/paperloom-preflight-20261004`，不上传。

## 截图与交付门禁

- Obsidian HTML Table Math 0.1.2：用户提供真实截图，已原样加入 README，未捆绑第三方插件。
- 新的 AI 对话、解析/任务状态、Zotero 写回截图待补；现有 gallery 未被冒充为本轮实测截图。公开截图还需确认文献摘录的显示权利。
- Windows **NSIS 安装包、便携包与 blockmap 已构建成功**，仅用于本地验证，保留现有 0.1.2 版本号。文件位于 `tmp/paperloom-preflight-20261004/artifacts/`：`PaperLoom-Windows-0.1.2-Setup.exe`、`PaperLoom-Windows-0.1.2.exe`。源码副本保留未提交内容，使用当前 release Rust 二进制；新增许可证通知已进入最终包。候选文件未进行 Authenticode 签名。
- macOS、Linux 产物与各自安装 E2E 未完成；本 Windows 环境没有对应平台运行时。
- **候选 Windows 包内运行时的 MinerU 真实系统代理链路已通过**：使用用户提供的 key、第一方单页 PDF，Electron 实际读取临时 Windows 系统代理，候选 Rust API 验证 key 有效，候选 Rust/jobsd/Python 完成上传、解析、CDN bundle 下载、Markdown 与规范化产物。代理 CONNECT 记录覆盖 `mineru.net`、`mineru.oss-cn-shanghai.aliyuncs.com` 和 `cdn-mineru.openxlab.org.cn`。大小写代理变量一致，loopback 保留直连；结束后恢复原系统设置并移除测试凭据。无凭据值或 signed URL 进入本报告。
- **最终 NSIS 安装版真实系统代理验证已通过**（见下方补记）。原生界面点击与截图验收仍受电脑操控不可用限制。
- 最终文件 SHA-256、源码快照和构建清单保存在本地 artifacts 目录。安装到独立测试目录并使用独立数据；原安装文件、注册项、快捷方式已恢复。原生电脑操控不可用，Zotero 授权撤销、一次性授权、新截图及 macOS/Linux 安装验收未完成。
- 本輪未修改版本号、git index 或 HEAD。最終哈希复核确认原工作树 generated dist **0 项变化**，所有基线文件仍存在。门禁通过前不进入 tag/release 阶段。

## 最终复核补记

- 独立只读复核未发现本轮改动的 Critical/Important 回归。Minor（暂缓）：TLS/DNS/代理错误在上传阶段也可能被归为结果下载错误，提示不够准确。复核发现既有上传错误也保留 signed URL，按用户“不记录 signed URL query”的约束将其升级为本轮必修项；回归先失败再通过。
- MinerU 证书过期与 signed URL 错误脱敏回归 **21/21 通过**。网络识别先于 provider-code 文本正则，避免 URL 中 `-225` 等片段掩盖证书错误；下载、探测、上传的 reqwest 错误均剥离 URL。
- 首次 NSIS 安装与启动已实测，安装器返回 0、网关 200、真实系统代理/key 验证通过；真实 CDN 下载遇到 **证书过期**，不能记作 OCR 成功。证书校验保持开启。该失败暴露的分类/脱敏问题已修复，候选包已重建。
- 初始测试构建混用 `P:` 短路径与 workspace junction，导致两份 React，安装后页面报 `useState` dispatcher 为空。esbuild metafile 复现了两份 React；统一真实路径构建后仅一份。仅调整候选构建方式，不更改仓库现有 dist。
- 安装复验用独立目录和数据，并备份/恢复原安装文件、卸载/protocol 注册项、快捷方式。复验脚本的进程回收与启动等待曾发生时序错误，已修正并再次核对原安装文件哈希。最终重验结果另记下面，未完成的项目仍为门禁。
- **最终 NSIS 安装与真实 MinerU 测试通过**：安装器退出 0；从安装后的 `PaperLoom.exe` 启动（`packaged=true`），网关 200，启动日志无 `Uncaught` / invalid hook 错误。安装程序自身检测到 Windows 系统 HTTP 代理；真实第一方单页 PDF 的 OCR 返回 `succeeded`，规范化文档、报告、Markdown 与 bundle 全部 ready，代理 CONNECT 覆盖上传对象存储和结果 CDN。
- 原安装文件与备份 SHA-256 一致，原卸载/protocol 注册项和快捷方式内容已核对恢复；原文献数据未迁移或替换。临时 Windows 代理值恢复，测试 key 的临时 credential vault 移除。测试后再查日志/数据库/包，未残留用户提供的 key。
- 剩余发布门禁：全量测试失败、历史凭据失效确认、PyMuPDF/字体/fixture 权利与完整通知、Zotero 撤销/一次性授权真实 UI、新截图和非 Windows 平台验收。版本号与发布操作保持未进行。

## MinerU 关闭代理直连问题与最新官方文档核对

用户要求优先解决 MinerU，提供真实 key 并要求核对最新文档。

- 2026-10-04 重新读取 [MinerU 官方 API 文档](https://mineru.net/apiManage/docs)，旧 `/apiDoc` 页面已 404。当前 Precision Extract 仍使用 `POST /api/v4/file-urls/batch`、无 Bearer 的预签名 `PUT`、`GET /api/v4/extract-results/batch/{batch_id}`，结果为 `full_zip_url` ZIP。PaperLoom 当前流程符合这些协议；不切换仅输出 Markdown 的轻量 API。
- 用户系统代理与 PAC 均关闭，进程无代理环境变量。安装版真实直连测试：key 有效，上传/解析完成，CDN 下载失败。Windows curl（Schannel）与 Python（OpenSSL）也复现 `certificate expired`，不是 Rust 独有错误。
- 本机 WLAN DNS 为 `4.2.2.1 / 8.8.8.8`，系统将官方 CDN 解析到 `47.251.5.11 / 47.251.51.149`，两个节点的证书均已过期。AliDNS 查询返回另一组 CDN 地址；实际 HTTPS 验证有效，证书截至 2026-12-16。未关闭证书校验、修改时间、改 hosts 或系统 DNS。
- 最小运行时恢复：只有 `https://cdn-mineru.openxlab.org.cn:443` 的证书过期错误才触发 HTTPS DNS 刷新，解析只包含 CDN 域名；接受公开 IPv4，再以原 URL、原域名/SNI 和完整 TLS 校验重试。非官方域名、HTTP、其他端口与普通 HTTP 错误不触发。上传 token 不传给 DNS/CDN。
- DNS 策略与响应过滤回归先失败再通过；MinerU focused **25/25** 通过。新 debug 后端在用户当前的无代理环境中完成真实 OCR，Markdown、规范化文档、报告与 bundle 均 ready；key 已清除。响应过滤排除私网、loopback、链路本地、CGNAT、benchmark 等非公网地址；判断证书错误只使用异常 source chain，不读取 URL 中的匹配文字。
- 另补实际任务详情的证书下载失败文案：`ocr_result_download_failed`，明确提示检查 DNS/网络与系统代理，保持 TLS 校验。失败分类 focused **27/27** 通过。独立复核指出历史 MinerU 日志可能误判后续渲染失败；回归先复现，再将匹配限制为当前错误，保持渲染阶段恢复。
- **2026-10-05 最终 release 构建和 Windows NSIS/便携包重建成功；已将验证通过的修复更新至用户实际安装目录 `F:\软件安装\Paperloom`，保留原安装备份。**
- **当前安装版无代理实测成功**：安装器退出 0；从该目录 `PaperLoom.exe` 启动，网关 200，无 React 启动错误；Electron 返回直连，系统代理关闭，无代理环境变量。真实 key 有效，真实第一方 PDF 的 OCR 任务 `20261004160329-51d72b` 返回 `succeeded`，规范化文档、报告、Markdown、bundle 全部 ready，测试代理 CONNECT 数为 0。
- 测试使用独立数据目录；之后重启修复后的程序使用原用户数据，书库仍为原来的 6 篇。实际安装的 Rust API/jobsd SHA-256 与最终构建一致；原注册项和快捷方式保持原路径。按用户优先解决 MinerU 的请求保留修复版本，未恢复旧二进制；旧版备份位于本地审计目录的 `original-install-backup`。
- 没有修改系统 DNS、hosts 或禁用 HTTPS 校验；当前系统代理仍关闭。测试凭据已清除，检查日志、测试数据库和 app.asar 后没有残留用户提供的 key。源码的既有 generated dist 仍为 0 项变化，未 commit/push/tag/release/upload。

## 2026-10-05 MinerU 翻译与 Obsidian 真实比较

已完成两篇真实 Zotero 文献的 MinerU VLM → DeepSeek 翻译 → PDF → Obsidian 批量导出，与同文献既有 Paddle 成果比较。发现并修复 MinerU HTML 表格 `<eq>` 公式标记未转为 Obsidian 数学语法的问题；真实截图/DOM 复验通过，表格外文字、图片与图注不变。安装版已更新，临时凭据清除。详见 [真实比较报告](mineru-paddle-obsidian-e2e-20261005.md)。
