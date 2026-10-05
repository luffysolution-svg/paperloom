# PaperLoom 公开发布前核对 — 2026-10-05

状态：本地 Docker 部署已验收，正式发布尚未批准。当前 `main / 9303483e` 包含未提交修改，不能把当前候选包标记为已存在的 `v0.1.2` 正式产物。

## 本轮已完成

- 记录 5268 个原有工作树文件哈希；保留原有未提交源码和 generated dist，不 reset、checkout、clean 或批量格式化。
- 新增 `docker-compose.build.yml` 和 `init-local.py`，从源码构建，不依赖私有 GHCR。初始化生成随机内部 key，不输出值，也不覆盖现有 `.env`；后端与 NGINX 使用同一 key，浏览器 key 保持为空。
- 三种语言 README、Docker 说明和 CONTRIBUTING 的端口说明同步；可选 Obsidian 插件不捆绑，Docker Zotero 数据目录只读。
- Docker `linux/amd64` app / web 镜像实际构建并以独立项目／数据卷启动。网页书库正常，浏览器无 error／warn；`/health`、`/ready`、同源书库 API 返回 200，直接无 key API 为 401。合成 PDF 上传为 200／1 页；重启后 PDF 哈希未变、API 恢复 200。未重复真实文献 AI／OCR 测试。
- 最终 DTO 修复后的两个镜像再次构建、就绪并复验 API 与数据持久化通过；本地镜像身份单独留档，未推送注册表。
- app / web 镜像补入根许可证、第三方通知和许可文本；后端还保留 VisualTeX 通知。后端源码归档补齐 Docker 构建所需的根 npm 锁文件及 frontend workspace manifests，新回归已复现原遗漏。
- 发布／部署脚本测试最终 **108 通过**。第一次 Windows 默认 GBK 读取造成 15 个失败；使用 UTF-8 后通过，未放宽测试门禁。新增输入通过真实临时 Git fixture 验证 dirty 检查；初次 8 个新用例失败，补齐清单后通过。
- Windows 新安装包已直接解出关键 payload，`app.asar`、AI 修复与三个 Rust binaries 均与候选目录相同；779 个流水线 Python 文件与当前源码相同。候选与已安装版的 410 个前端／桌面文件仅 `package.json` 不同：打包器移除了开发脚本、开发依赖和 build 配置，运行文件相同。
- Windows bundle 验证通过，保留已有 console command 缺少 Python 安装包的 warn-only 记录，当前使用脚本回退。安装包未签名。用户已自行确认桌面 AI 正常，本轮没有重新执行真实 AI 请求。
- GHCR app / web 匿名 token 请求均为 401；预构建镜像不能作为新用户默认入口。
- Zotero 路由的返回 DTO 改为从既有集成应用门面导入同一类型，关闭现有架构检查发现的内部服务路径引用；行为不变，架构脚本与 **39 个用例／147 个 subtests** 通过。
- 当前源码最终密钥扫描零命中；**原历史 962 commits 仍命中 9 条候选凭据**，独立净化副本为零。未重写原历史，也未查询／输出凭据值。
- 限定只读复核闭环通过，无剩余 Critical／Important／Minor。许可证文件路径加入 Docker PR 构建触发清单。
- 起始 5268 个工作树文件全部仍存在；仅本轮核对列出的文件发生变化，HEAD 不变，原 generated dist 和原基线 JSON 未改。

## 最终测试结果

| 门禁 | 结果与范围 |
| --- | --- |
| Rust workspace / API | Linux 最终 **993 通过、0 失败、4 忽略**，DTO 修复后完整复验通过，使用 `--test-threads=1` |
| Python AI | Linux **356 通过** |
| Python pipeline | Linux **2235 通过、23 跳过**；其中两个 Git 上下文用例在无 `.git` 快照跳过，原仓库补验 1 通过、1 因 HEAD 无 release tag 跳过 |
| 无 Typst 隔离测试 | **2153 通过、100 跳过、5 deselected**，保留原 `not needs_typst` 过滤 |
| 独立翻译套件 | 最终串行 **1452 通过**。初轮 CRLF 哈希失败已定位：基线 JSON 内容与 HEAD 相同；只将 Linux 验证副本转换成 HEAD 的 LF 字节，固定该文件的 `.gitattributes`，未改原件或预期哈希。构建并发导致的 300 秒超时单独留档；未放宽门禁，停止重负载后串行复验通过 |
| 发布／部署脚本 | **108 通过** |
| 架构与依赖 | Rust API、pipeline 架构与锁定依赖快照通过；API 架构回归 **39 通过、147 subtests 通过** |
| 前端／桌面 | 沿用前轮最新完整证据：frontend **1875 通过、0 失败、2 跳过**，desktop **45/45**，TypeScript 通过。本轮未修改这些运行代码，不再次重建原 generated dist |

旧 Windows Rust／Python 失败仍保留为平台与环境证据。本轮测试容器先补齐 `kill`、SQLite、Git 和项目 `.venv`，按照 CI 启动方式验证源码，没有为过门禁修改无关实现。原有 unused 和 Python deprecation 警告保留。

## 正式发布前尚未关闭

1. PyMuPDF／MuPDF 的 AGPL 分发与完整对应源码义务：商业许可未确认，已保留许可文本与第一方 MIT 声明，不能据此宣称二进制包已经完成许可审核。
2. 论文 PDF、golden 提取物和旧截图的再分发：部分仍无依据，NC／ND 条款需分别处理；原文件保留，不自动视作根 MIT 许可覆盖。
3. 最终公开历史：原历史仍命中 9 条候选凭据，撤销状态无证据；独立净化副本不等于原仓库已净化，也尚未纳入本轮所有未提交功能。不能直接公开原历史。
4. 版本与产物：已有 `v0.1.2` tag，必须为正式版本另定版本号。旧 `tmp/paperloom-release-artifacts-20261005/` 不再是当前发布集合；最新本地候选统一放在 `tmp/paperloom-publication-candidate-20261005/`，含当前工作树源码、安装包、便携版、blockmap、文件清单与 SHA256。带有 `DO_NOT_PUBLISH.txt`，未批准公开。候选源码中的唯一基线 LF 转换等同 HEAD 原字节，仓库原件保留。
5. 平台范围：本轮验证 Windows 与 Docker linux/amd64；macOS／Linux 桌面安装和 Docker arm64 未完成，不能标为已验收。两个 GHCR 包匿名读取仍为 401；若发布预构建镜像，还需正式上传后设置公开并验证匿名拉取。
6. Zotero 真实撤销后重授权与仅允许一次行为仍未完成；已验证首次 remembered authorization、重复更新同一附件和真实批量写回。
7. 最终版本安装验收：本轮最新 NSIS／便携包已直接解包与最新 binaries 核对，未重复安装或真实文献请求。正式新版本构建后仍需最终安装烟测及候选安装版 MinerU 系统代理场景确认；不能把旧版本证据直接当成新版本安装验收。

## 文件与证据

公开项目文件的归类和正式产物要求见 [发布目录说明](../../../ops/release/README.md)。用户数据、临时测试数据、回滚备份与扫描日志保存在本机，不进入公开交付。

本轮本地证据：`tmp/paperloom-publication-preflight-20261005/`。所有扫描报告脱敏；不记录真实服务商 key、Zotero 授权 key、代理密码或带签名参数的 URL。未 commit、push、创建 tag、发布 Release 或上传任何产物，未写 `zotero.sqlite`。
