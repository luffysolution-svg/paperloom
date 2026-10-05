# PaperLoom：Zotero / Obsidian 联动（PRD）

更新：2026-10-05。状态：**M1–M5 已实现，Obsidian 批量导出与 Zotero 10 单篇／批量译文写回已实现；发布前验证进行中。**

当前源码 Docker 部署与发布门禁见 [最新发布核对](../reports/paperloom-publication-preflight-20261005.md)；基础 Compose 之外提供源码构建入口，不再要求新用户先取得私有 GHCR 权限。

## 目标与边界

在 PaperLoom 内完成 Zotero → 翻译 → Obsidian 的联动。核心导入、写回和导出不依赖第三方插件，直接使用 Zotero 本地 API / 只读数据目录、Obsidian vault 文件夹与 `obsidian://` URI。HTML 表格内公式推荐可选的 HTML Table Math 0.1.2（`html-table-math`），不捆绑或自动安装。

- 支持 Zotero **8 及以上**；桌面端（Electron）与 Docker 自部署两种形态都要支持。
- 用户 PDF 走 **WebDAV 同步**，因此不采用 Zotero Web API 取附件（Web API 拿不到 WebDAV 上的文件）。
- Zotero 10+ 本地 API 已支持译文 PDF 写回；Docker 数据目录模式保持只读。
- 本期不做：Zotero 原生注释写入（标注功能另行开发）、Obsidian 移动端、Zotero 云端同步。

## 用户故事

1. 在 RetainPDF 里浏览 Zotero 文库/合集，多选文献，每篇文献可勾选一个或多个 PDF 附件，批量提交翻译。
2. 翻译完成后一键导出到选定的 Obsidian 库和目录，并直接拉起 Obsidian 打开该笔记。
3. 笔记正文与 RetainPDF Markdown 视图一致（标题、段落、公式、表格、图片），同时嵌入译文 PDF 保留原版式；原文与译文分为两篇互链的笔记，不做段落交错的双语。
4. 笔记 frontmatter 带 Zotero 元数据、Zotero 跳转链接、RetainPDF 跳转链接；图片按顺序重命名、相对链接、Obsidian 内直接预览。
5. Zotero 中该文献的笔记与高亮一并拉入 Obsidian 笔记；重新导出时不覆盖用户手写内容。

## 初始设计时的现状与缺口（历史记录，M1–M5 已补齐）

| 项 | 现状 | 缺口 |
|---|---|---|
| Markdown 视图 | `marked` + MathJax 渲染 `md/full.md`（`frontend/packages/reader/src/components/react-pdf/useReaderMarkdownDocument.ts`） | 只有**原文** Markdown，无译文/双语 Markdown |
| 段落对照数据 | `GET /api/v1/jobs/{id}/reader/regions`、`translated/page-*.json`（`source_text` / `translated_text` / `translated_markdown`） | 需按阅读顺序拼装成文档 |
| 图片 | `md/images/`，文件名由 OCR provider 决定（MinerU/Paddle 各异） | 需按出现顺序重命名 |
| 文档元数据 | `documents` 表：`title` / `authors_json` / `year` / `doi`（`database/retain-db/src/db/schema.rs`） | 无 Zotero 关联字段，无法去重与回跳 |
| 回跳链接 | 无 | 桌面端无 `paperloom://` 协议 |
| Docker | 仅 `app_data:/data` 卷（`ops/deployment/docker/delivery/docker-compose.yml`） | 需新增 Zotero 数据目录与 vault 挂载 |

## 功能设计

### F1 Zotero 来源（只读）

统一抽象 `ZoteroSource`，两个实现，上层（API / 前端）不感知差异：

| | 桌面端：本地 API | Docker：数据目录挂载 |
|---|---|---|
| 地址 | `http://127.0.0.1:23119/api/users/0/...` | 容器内 `/zotero`（只读挂载 Zotero 数据目录） |
| 前置条件 | Zotero 运行中，且勾选「设置 → 高级 → 允许此电脑上的其他应用与 Zotero 通信」 | 挂载 `zotero.sqlite` 与 `storage/` |
| 元数据/笔记/注释 | 本地 API JSON（items、children、collections） | 读 SQLite **快照**（见下方风险） |
| PDF 文件 | `/items/{key}/file/view/url` 得本机路径，后端直接读取，免上传 | `/zotero/storage/{attachmentKey}/{filename}` |
| Zotero 未运行 | 提示启动 Zotero；可选回退到读数据目录 | 不受影响 |

- 能力：文库列表（个人库 + 群组库）、合集树、条目列表（分页、搜索、按合集筛选）、条目详情（元数据、子附件、子笔记、注释）。
- 只列出 PDF 附件；`linkMode=linked_file` 的附件在 Docker 下需额外挂载附件根目录并做路径映射，未映射时标记「不可用」。
- WebDAV 用户的附件只有在 Zotero 已下载到本地 `storage/` 后才可用；不存在时 UI 标明「未下载，请先在 Zotero 中打开一次」。
- citekey：Zotero 8+ 原生字段优先（**待核实是否存在**）→ 已装 Better BibTeX 时读其 JSON-RPC（`/better-bibtex/json-rpc`，仅桌面端）→ 按 `作者年份-标题首词` 生成。

**风险：Zotero 运行时独占锁定 `zotero.sqlite`。** 官方明确反对关闭 `dbLockExclusive`；`immutable=1` 读取在 Zotero 写入时可能读到半写状态甚至 `SQLITE_CORRUPT`。
Docker 实现须**复制快照再读**：复制 `zotero.sqlite` 到临时目录 → `PRAGMA quick_check` → 失败则重试或回退到 Zotero 自动生成的 `zotero.sqlite.bak` 并提示数据可能滞后。
表结构无兼容承诺，读取层只依赖少量核心表（`items`、`itemData`、`itemDataValues`、`fields`、`itemAttachments`、`itemNotes`、`itemAnnotations`、`collections`、`collectionItems`、`creators`、`libraries`），启动时校验列存在性，不满足则明确报错。

### F2 批量翻译

- 前端新增「从 Zotero 导入」入口：多选文献 → 展开勾选 PDF 附件 → 选择 OCR / 模型 / 术语表 → 批量创建任务（复用 `POST /api/v1/jobs`；桌面端用本地路径，Docker 用挂载路径，均不经上传）。
- 去重：`(library_id, attachment_key, 文件 sha256)` 已有成功任务时默认跳过，可强制重译。
- 创建任务时把 Zotero 元数据写入 `documents`（标题、作者、年份、DOI）和新增的外部关联字段。

### F3 原文 / 译文笔记生成（核心新增，桌面端/Docker 共用）

- **不做原文译文段落交错的双语笔记**：原文、译文各一篇，互相链接；默认两篇都生成，可关闭原文笔记。
- 接口：`GET /api/v1/jobs/{id}/markdown/export[?include_source=false]`，返回 ZIP（M1 已实现）。
- **在 Rust API 中按请求现场生成**，不新增流水线产物：已完成的旧任务无需重跑；M2 写 vault 也在同一处。
- 原文笔记：正文直接取 OCR 服务产出的 `md/full.md`，与 Markdown 视图逐字一致，只改写图片链接；无 `full.md` 时由规范化文档渲染。
- 译文笔记：按阅读顺序遍历规范化文档，正文块换成译文；块渲染规则移植自 `markdown_fallback.py`（标题 `#`/`##`、`$$` 公式、HTML 表格、图片）。
  - 跨栏/跨页翻译单元按 `translation_unit_id` 汇总，在首块输出整段译文、其余成员跳过（`member_ids` 只列本页成员，不能据此判断）。
  - 跳过页眉/页脚/页码，以及未翻译的 `semantic_role=metadata` 块（网址、下载声明、版权、单位）；参考文献保留。
  - 已知局限：上游把版权声明误判为正文或拼进翻译单元时会照样输出，导出层不按文本猜测过滤。
  - 后续：拿到真实任务后测 `full.md` 与翻译条目的对齐率，足够高再改为以 `full.md` 为骨架插入译文，使两篇结构完全一致。
- 公式沿用 `$` / `$$`（Obsidian 同为 MathJax）。
- 译文笔记顶部嵌入译文 PDF：`![[<name>.zh.pdf]]`，用于原版式阅读。

### F4 导出到 Obsidian

- 设置项：vault 列表（桌面端读取 `%APPDATA%/obsidian/obsidian.json` 自动发现，可手动添加；Docker 为挂载到 `/vaults/<name>` 的目录）、默认子目录、目录策略（固定目录 / 按 Zotero 合集建子目录）、文件名模板（默认 `{citekey}`）。
- 目录结构：

  ```
  <vault>/<dir>/
    Smith2024.md                  # 译文主笔记
    Smith2024.en.md               # 原文笔记（可关闭）
    Smith2024.assets/             # 两篇共用
      fig-001-p03.png
      fig-002-p05.png
      Smith2024.zh.pdf
  ```

- 图片：按正文首次出现顺序编号 `fig-NNN-pPP.<ext>`（PP 为页码），表格图、公式图分别用 `tab-` / `eq-` 前缀独立编号；不加笔记名前缀（资源目录已按笔记隔离，链接为相对路径）。同一图片多处引用只存一份；保留原扩展名；文件名仅 ASCII、无空格；未重做 OCR 时编号稳定；重新导出时清理资源目录中不再引用的图片。正文用标准 Markdown 图片语法引用相对路径 `Smith2024.assets/fig-001-p03.png`。
- 文件名：模板默认 `{citekey}`；无 citekey（非 Zotero 来源）时依次退回 `第一作者姓+年份+标题首词` → 标题 → 原文件名。去除 Windows 非法字符 `\ / : * ? " < > |` 及 Obsidian 链接敏感字符 `# ^ [ ] |`。同名时按 frontmatter 中的文档 ID 判断是否同一文献：是则更新，否则追加 `-2`、`-3`。
- 译文 PDF 语言后缀取翻译目标语言（`{name}.{lang}.pdf`，如 `.zh`、`.en`）。
- frontmatter（Obsidian Properties 规范：扁平、链接加引号）：

  ```yaml
  title: "..."
  authors: ["..."]
  year: 2024
  doi: "10.xxxx/..."
  citekey: "Smith2024"
  item_type: "journalArticle"
  publication: "..."
  zotero_item: "zotero://select/library/items/ABCD1234"     # 群组库：zotero://select/groups/<id>/items/<key>
  zotero_pdf: "zotero://open-pdf/library/items/EFGH5678"
  paperloom: "paperloom://open?document=<id>"               # Docker：http://<host>:45001/reader.html?...
  translated_pdf: "[[Smith2024.zh.pdf]]"
  paperloom_role: "translation"                              # 原文笔记为 "source"
  source_note: "[[Smith2024.en]]"                            # 原文笔记中为 translation: "[[Smith2024]]"
  tags: [literature, paperloom]
  ```

  正文首行再放一行同样的跳转链接（Obsidian 属性面板对 `zotero://` 等自定义协议是否可点击**待核实**）。
- Zotero 笔记（HTML → Markdown）与高亮（文本、评论、颜色、页码，附 `zotero://open-pdf/...?page=N&annotation=KEY`）追加在文末受管区块。
- 增量更新：受管内容放在 `%% paperloom:begin <section> %%` / `%% paperloom:end <section> %%` 之间（Obsidian 注释，实时预览不显示；早期导出的 `<!-- paperloom:… -->` 仍能识别并在下次导出时换掉），重新导出只替换受管区块，保留用户手写内容；frontmatter 只更新 RetainPDF 管理的键。
- 冲突策略：同名文件存在且不含受管标记时，不覆盖，改为提示（覆盖 / 另存为 / 跳过）。
- 导出后打开：`obsidian://open?vault=<name>&file=<relative path>`。桌面端用 Electron `shell.openExternal`；Docker 由浏览器前端跳转（浏览器与 Obsidian 在同一台机器时可用）。
- Docker 未挂载 vault 时退化为下载 ZIP（目录结构同上）。

### F5 RetainPDF 回跳

- 桌面端注册 `paperloom://` 协议（Electron `setAsDefaultProtocolClient` + 单实例转发），`open?document=<id>&page=N` 打开阅读器。
- Docker 使用 Web 阅读器 URL；外部访问地址由配置项 `public_base_url` 提供。

## 数据与接口变更

- `documents` 新增外部关联（或独立表 `document_external_refs`，倾向独立表以支持一文多源）：`source`(`zotero`)、`library_id`、`item_key`、`attachment_key`、`citekey`、`file_sha256`、`obsidian_vault`、`obsidian_path`、`last_exported_at`。走 `schema.rs` 迁移阶梯新增版本。
- 新契约（`contracts/*.schema.json` 为唯一真源）：Zotero 浏览响应、批量导入请求、Obsidian 导出请求/结果。
- 新路由组建议：`/api/v1/integrations/zotero/*`、`/api/v1/integrations/obsidian/*`。
- Docker compose 新增可选挂载与环境变量：`ZOTERO_DATA_DIR → /zotero:ro`、`OBSIDIAN_VAULTS → /vaults`、`RETAIN_PUBLIC_BASE_URL`。

## M0 品牌与发布独立（PaperLoom）

独立私有仓库 `luffysolution-svg/paperloom`（非 GitHub fork），保留 git 历史。
远程约定：`origin` = paperloom，`upstream` = `wxyhgk/retain-pdf`（push 已禁用，仅手动 cherry-pick 修复），`fork` = 旧 fork（不再推送）。
仓库 Actions 已关闭，M0 改完工作流后再开启。

**原则：只改对外身份与运行时边界，内部标识不动。** `retainpdf` 出现在约 1450 个文件中（`retainpdf_pipeline`、`retain-*` crate、`@retainpdf/*`、契约、`RETAIN_*` 环境变量），全量改名会让上游修复无法 cherry-pick。

| 项 | 现状 | 改为 |
|---|---|---|
| 显示名 / productName | RetainPDF | PaperLoom（界面文案、窗口标题、安装包名） |
| appId | `com.wxyhgk.retainpdf` | `com.luffysolution.paperloom` |
| 数据目录 | `%APPDATA%/RetainPDF/data`（随 productName） | `%APPDATA%/PaperLoom/data`；首启检测到旧目录时询问是否**复制**导入（不移动、不改旧数据） |
| 应用内更新 | `GITHUB_REPO` 由 `frontend/desktop/package.json` homepage 生成，指向上游 | homepage 改为 paperloom；私有仓库匿名访问 releases API 会 404，更新检查需静默失败或关闭 |
| 桌面端端口 | 网关 40001 / API 41000 / jobsd 41002 / AI 41100 / simple 42000（`frontend/desktop/main.js`） | 45001 / 46000 / 46002 / 46100 / 47000，仅改 main.js 常量，可与上游版本并存 |
| Docker 镜像 | `wxyhgk/retainpdf-app`、`wxyhgk/retainpdf-web`（compose 默认值） | `paperloom-app`、`paperloom-web`（自有仓库），compose 项目名 `paperloom` |
| Docker 宿主端口 | 40001 / 41000 / 42000 | 45001 / 46000 / 47000；容器内端口不变 |
| CI 发布 | `release-docker.yml` 用 Docker Hub secrets 推送 `retainpdf-*` | 改镜像名；私有仓库优先用 GHCR，桌面安装包产物名改 PaperLoom |
| URL 协议 | 无 | `paperloom://`（F5） |
| frontmatter / 受管区块 / CSS | — | 统一前缀 `paperloom`：`paperloom:` 链接键、`%% paperloom:begin … %%` |
| 作者 / 主页 / README | wxyhgk / 上游链接 | 自有信息；README 注明「基于 RetainPDF（MIT）」 |
| LICENSE | `Copyright (c) 2026 RetainPDF contributors` | 保留原声明，追加 `Copyright (c) 2026 PaperLoom contributors` |

不改：开发栈 `ops/development/` 端口、Rust/Python 内部默认端口、测试夹具、上游文档中的历史端口说明。

## 里程碑

| 阶段 | 内容 | 验证 |
|---|---|---|
| M0 | 品牌与发布独立（见上节） | 与上游 RetainPDF 同机安装、同时运行互不影响；`docker compose pull` 不再拉取上游镜像；更新检查不指向上游 |
| M1 ✅ | F3 原文/译文笔记生成 + 图片顺序重命名 + ZIP 导出（产物中心「Obsidian 笔记包」） | 任意已完成任务导出后放入 vault，Obsidian 内公式/表格/图片正常，两篇笔记互链 |
| M2 ✅ | F4 写入 vault + frontmatter + 受管区块增量更新 + `obsidian://` 打开（书籍详情「保存到 Obsidian」） | 重复导出不丢手写内容；桌面端一键打开到笔记 |
| M3 ✅ | F1 桌面端本地 API + F2 批量翻译 + 外部关联表（底部栏「从 Zotero 导入」） | 多选文献/多 PDF 批量建任务，去重生效，frontmatter 带 Zotero 链接可跳回 |
| M4 ✅ | F1 Docker 数据目录快照读取 + compose 挂载（`PAPERLOOM_ZOTERO_DATA_DIR`） | Zotero 运行中读取不报锁、不损坏；WebDAV 附件可用 |
| M5 ✅ | F5 `paperloom://` 回跳；Zotero 笔记/高亮拉取 | Obsidian 中点击回到 RetainPDF 对应文档 |
| M6 已实现 | 书库多选批量导出 Obsidian（最多 200 篇，去重、逐项结果、失败隔离） | API 与前端 focused tests；HTML Table Math 0.1.2 表格公式已获用户真实确认 |
| M7 已实现 | Zotero 10+ 本地 API 译文 PDF 写回，用户授权，按文档标记更新同一附件 | Zotero 10.0.5 首次创建与重复写回已实测，PDF 已获用户确认；撤销与一次性授权、候选安装版验收另行记录 |
| M8 已实现 | 书库多选批量写回 Zotero，最多 200 篇；选择最新实际可用的成功译文 PDF，逐篇创建／更新／失败 | 后端批量回归 3/3，前端 API 与架构 18/18；真实批量验证纳入最终安装版验收 |
| 后续 | 标注功能 | — |

## 待核实

- Obsidian 属性面板对 `zotero://`、`paperloom://` 链接是否可点击。
- `obsidian://open` 对未在 Obsidian 中注册过的 vault 路径的行为（2026 年起 URI 调用可能弹确认框）。

## M3 实现记录（Zotero 9.0.6 实测）

- 条目 JSON 没有 `citationKey` 字段，也没有 Better BibTeX；笔记名只在字段存在时用 citekey，否则按作者年份规则生成。BBT JSON-RPC 未接入。
- 附件 JSON 的 `links.enclosure.href` 直接给出本机 `file:///` 路径，导入走这条，不用 `/file/view/url`。
- 坑：`/items/top` 带 `itemType` 过滤参数时会把子附件也返回（`?itemType=-note` 得到 32 条，其中 20 条是子附件）。改为不带过滤、由后端剔除笔记与带 `parentItem` 的条目。
- 实现与 F2 原设计的差异：
  - 不新建 `POST /jobs` 批量入口。导入接口只把附件登记为书库文档（`document_id` 即 sha256，天然去重），翻译由前端沿用书库「翻译此文档」逐篇提交，复用当前翻译设置与进度跟踪。
  - 去重粒度是「同一文件」。已有成功或进行中的翻译时跳过；要强制重译，在书籍详情里点「重新翻译」。
  - 外部关联表 `document_external_refs` 只存 `source / library_id / item_key / attachment_key / document_id / metadata_json / collection_path`。Obsidian 路径不入库，仍按 frontmatter 识别。

## M4 实现记录（Zotero 9.0.6 数据目录实测）

- 来源切换：设置 `PAPERLOOM_ZOTERO_DATA_DIR` 即读数据目录，否则连本地 API；两者共用同一组接口与返回结构（`ZoteroSource`），前端只多了 `mode`、`notice` 两个字段。桌面端暂不做「Zotero 未运行时回退读目录」。
- 快照：Zotero 运行中直接复制 `zotero.sqlite`（3.6 MB）成功，`quick_check` 通过；快照按大小 + 修改时间缓存，每次刷新换新文件名（Windows 上仍被打开的旧快照不能覆盖），旧快照尽力清理。
- 与本地 API 对照（同一文库）：分类、12 篇顶层条目、标题、年份、附件、大小、搜索、按分类筛选全部一致；导入后导出的笔记 frontmatter 与本地 API 导入时逐字相同。对齐时修正的两处：
  - `creatorSummary` 随 Zotero 界面语言本地化（中文界面为「A 等」「A和B」），数据目录模式按中文格式生成。
  - 子附件默认按修改时间倒序。
- 版本：数据库里没有 Zotero 版本号，`version` 返回 `userdata schema N`（Zotero 9.0.6 为 125），不再按版本拦截。
- 链接文件（linkMode=2）在容器里没有宿主路径，标记不可用；附件根目录映射未做。

## M5 实现记录

- 回跳链接：frontmatter `paperloom` + 正文链接区「在 PaperLoom 中打开」（Zotero 文献另有「在 Zotero 中查看」）。两处都放；Obsidian 属性面板会把 `paperloom://` 渲染成可点链接（首次点击弹「打开外部链接」确认）。
  - 桌面端：`paperloom://open?job=<job_id>&document=<document_id>`。Electron 每次启动把协议登记到当前用户（Windows 安装版实测：首次启动后写入 `HKCU\Software\Classes\paperloom`）；macOS 由 electron-builder `protocols` 写进 Info.plist；冷启动直接打开 `reader.html?job_id=…`，已运行时经 second-instance（Windows / Linux）或 open-url（macOS）转发到主窗口。
  - Docker：设置 `PAPERLOOM_PUBLIC_BASE_URL` 后改为 `<地址>/reader.html?job_id=…`（web 镜像根目录即前端，reader.html 可直达）。
- 批注 / 笔记：导出时实时读取，写进译文笔记正文之后的受管区块 `zotero`。读不到 Zotero 时（未运行 / 未挂载）写库保留上次的区块。
  - 坑：Zotero 9 本地 API 的 `items/<附件>/children` 默认**不返回批注**（Total-Results 0），必须带 `itemType=annotation`。
  - 数据目录读 `itemAnnotations`（type 1 高亮 2 便签 3 图片 4 手绘 5 下划线 6 文字）与 `itemNotes`；与本地 API 导出的区块逐字一致。
  - 笔记 HTML 用 `htmd` 转 Markdown，内嵌图片与空列表项去掉。
- 实测顺带修正：PaddleOCR-VL 的页眉页脚图片（期刊 logo）标准化后角色为 unknown，只在 `source.raw_type` 留下 `header_image` / `footer_image`，导出时据此跳过（一篇 Springer 论文每页多出一张 logo）。
- Docker 容器内实测（本地构建镜像，只读挂载 Windows 上 Zotero 正在使用的数据目录）：浏览结果与本地 API 一致；导入 → PaddleOCR → DeepSeek 翻译 → 排版 PDF → 笔记包全流程成功。
- 端到端实测（Windows，Obsidian 真实库）：
  - 桌面端：启动即登记 `paperloom://`；Obsidian 里点属性或正文链接 → 已运行时经 second-instance 切到该文档的对照阅读器，未运行时冷启动直接打开阅读器。
  - Docker：设 `PAPERLOOM_PUBLIC_BASE_URL` 后笔记链接为 `<地址>/reader.html?job_id=…`，浏览器打开即对照阅读；挂载数据目录读到的批注写进笔记。
  - 重新导出就地更新，手写内容保留。
  - 修正：PaddleOCR-VL 的行内公式写成 `$ V_{Ni} $`（两侧带空格），Obsidian 不认作公式、下划线还被当成斜体。导出时收紧两侧都有空白的 `$…$`（原文笔记直接取 OCR 的 full.md，同样处理）；只有一侧空白的不动，避免误伤金额。

## 2026-10-04 发布前验证记录

- 写回入口：`POST /api/v1/jobs/:job_id/zotero/writeback`。先读取版本与 `Zotero-Server-ID`，请求 `/api/local/authorize`，创建 `imported_file` 子附件，再进行三阶段上传。
- 批量入口：`POST /api/v1/integrations/zotero/writeback-batch`，请求 `document_ids`。修剪、去重后串行调用已有写回协议，单篇失败不中断批次；返回逐项文献标题、任务、附件结果和错误，以及 created／updated／failed 数量。没有 PDF 的新翻译任务不挡住较早的成功 PDF。
- 使用 `paperloom-document:<document_id>` 标记定位附件；新文件使用 `If-None-Match: *`，更新使用既有 MD5 的 `If-Match`。临时上传地址必须与本地 API 同源且位于 `/api/local/uploads/`，不携带 `Zotero-API-Key`。
- 实测发现 Zotero 10.0.5 按 JSON 字段顺序调用 `fromJSON`：若 `filename` 在 `linkMode` 前出现，新附件创建失败。最小修复为创建时不发送文件名，由上传阶段设置；回归测试已先复现失败，再通过。
- 真实 Zotero 导入的 Pan 2024 任务完成首次写回与重复写回，同一附件、无重复，上传文件与 PaperLoom PDF 哈希一致（13 页）；用户确认首次授权和 PDF 显示均正常。
- Obsidian 表格继续保留 HTML 与合并单元格，不全局修改图注。可选插件及真实截图见 [README](../../../README.md#obsidian-批量导出)。
- 完整测试、许可证、夹具权利、密钥扫描与安装版门禁见 [发布前验证报告](../reports/paperloom-pre-release-20261004.md)。

## 参考链接

- Zotero 本地 API：<https://www.zotero.org/support/dev/web_api/v3/local_api>
- Zotero 8 / 10 开发者说明：<https://www.zotero.org/support/dev/zotero_8_for_developers>、<https://www.zotero.org/support/dev/zotero_10_for_developers>
- Zotero 数据库锁说明：<https://forums.zotero.org/discussion/71232/python-sqlite3-access-db-denied>、<https://groups.google.com/g/zotero-dev/c/RHuJNw6JH3k>
- `immutable=1` 读取风险：<https://github.com/matthiaskloft/zotero-fulltext-mcp/issues/91>
- Better BibTeX JSON-RPC：<https://retorque.re/zotero-better-bibtex/exporting/json-rpc/>
- Obsidian URI：<https://obsidian.md/help/Extending+Obsidian/Obsidian+URI>
- Obsidian Properties / Callouts / CSS 片段：<https://obsidian.md/help/properties>、<https://obsidian.md/help/callouts>、<https://obsidian.md/help/snippets>
- 同类实现参考：<https://github.com/guaguastandup/zotero-pdf2zh>、<https://github.com/mgmeyers/obsidian-zotero-integration>
