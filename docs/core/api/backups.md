# 数据备份与迁移

入口：设置 → 数据与备份。适用于 PaperLoom 导出的资料库 ZIP；不接受上游 RetainPDF 的单独数据库备份。

## 换机迁移

1. 等待任务结束，或取消排队/运行中的任务。
2. 在旧设备创建迁移包，并点击“下载”。需要携带模型密钥时，勾选“同时包含 OCR、翻译模型密钥与 Agent 配置”。包含 Paddle/MinerU Token、翻译 API Key、各翻译服务商 profile、模型名与接口地址。密钥在 ZIP 中是明文；WebDAV 密码不导出。
3. 新设备安装相同或更新版本的 PaperLoom，选择迁移包，勾选替换确认，点击“校验并暂存恢复”。
4. 退出并重新启动应用。网页部署需重启后端；应用监督的子服务会在恢复后启动。
5. 检查书库和原文/译文，以及目标设备的模型选择、接口地址、主题、Zotero/Obsidian 本地路径。

恢复会替换资料库，恢复前的文件和数据库保留在 `DATA_ROOT/backups/before-restore/<编号>/`。页面会显示保留位置。在重启之前，可点击“取消待恢复操作”继续使用原资料库。

## WebDAV

填写专用文件夹 URL、账号及密码/应用专用密码，保存设置，再测试连接。文件夹不存在时会尝试通过 MKCOL 创建，父文件夹需已存在。连接测试检查文件夹可读性，实际文件写入权限在备份上传时检查。

坚果云填写 `https://dav.jianguoyun.com/dav` 即可，应用会使用 `https://dav.jianguoyun.com/dav/PaperLoom/` 并在需要时创建此文件夹。保存后的表单和“云端备份位置”会显示实际使用的文件夹地址。

“立即备份”会创建一个独立 ZIP，通过 PUT 上传，并保留本机副本；“查看云端备份”通过 PROPFIND 列出该文件夹中的 PaperLoom 备份。确认替换后，可下载任一云端备份并暂存恢复。

云端文件旁的“同步到本地”只下载并校验 ZIP，成功后加入本地备份列表，无需确认替换，也不会暂存恢复。已有本地副本时显示“已在本地”；损坏或未完成的下载不会加入列表。

打包和校验显示已处理/总文件数，WebDAV 上传、下载及导入显示已传输字节数，有总大小时显示进度比例。服务器未提供总大小时显示活动进度条。设置面板关闭后重新打开可继续查看后端传输状态。

上传失败时，本地迁移包仍会出现在本地列表中。错误提示会区分密码、权限、文件不存在、单文件大小、限流和云端空间不足等情况。

密码只保存在后端 `DATA_ROOT/backups/webdav.json`，不写入浏览器存储或接口响应。密码框留空保留已保存的密码。Unix 上备份、暂存文件及配置使用 `0600` 权限。WebDAV 支持 HTTP(S) Basic 认证，不跟随重定向；文件夹地址须直接指向目标服务。

## 备份位置与删除

本地列表上方显示后端设备的备份目录。桌面版可点击“打开备份文件夹”，或在单个备份旁点击“位置”选中文件；恢复前保留的数据也可打开其所在文件夹。网页部署显示的是服务端路径，需在运行后端的设备上打开。

WebDAV 区域显示实际备份文件夹地址，可复制文件夹或单个云端备份的完整地址。地址不包含账号密码。

本地和云端备份分别提供“删除”，需再次确认。只删除所选位置的 ZIP；本地删除同时移除其列表元数据。另一位置的副本、当前资料库以及恢复前保留的数据均不会删除。有待恢复操作时，需要先完成或取消恢复再删除备份。

## 迁移范围

| 数据 | 范围 |
| --- | --- |
| SQLite 数据库 | 全部现有表，包含已提交 WAL 数据 |
| uploads、jobs | 原文 PDF、译文 PDF、OCR/翻译产物、任务日志 |
| documents、assets、operations | 文献文件、收藏资源、文档版本/操作产物 |
| fonts、integrations、agent-runtime | 用户字体、集成设置、Agent 本地状态 |
| secrets | 可选：credentials.json、ai-runtime.json、zotero-local-auth.json、frontend-config.json（OCR/翻译密钥及模型配置） |
| backups、downloads、程序和运行环境 | 不导出 |
| 主题、窗口/连接偏好、外部 Zotero/Obsidian 库 | 不导出，目标设备保留自己的连接和偏好设置 |

当前提供手动备份及整库替换；不提供定时任务、增量上传或双向合并。不会自动删除远端、本机备份或恢复前数据。

要求数据库和文件使用 `DATA_ROOT` 内的标准 db/jobs/uploads/downloads 路径。独立且不受应用监督的远端 jobsd 需要先调整为 supervised 或 in_process 模式，再重启全部服务，避免另一进程在换库时写入。页面会显示不支持恢复的具体原因。

单个 ZIP 上限 64 GiB，展开数据上限 256 GiB，最多 100000 个文件；较大文件建议使用支持直接写入磁盘的 Chromium 浏览器下载。迁移包和旧资料会占用额外磁盘空间。

## API

所有接口使用现有 API key / capability 鉴权。响应沿用 `{code,message,data}` 信封；下载返回 ZIP。

| 方法 | 地址 | 请求/返回 |
| --- | --- | --- |
| GET | `/api/v1/backups` | 本机备份、待恢复状态、恢复记录、任务数量、脱敏 WebDAV 配置与 operation 进度 |
| POST | `/api/v1/backups` | `{include_credentials:false,frontend_config?:{browser_config,developer_config}}`，仅勾选时归档前端配置 |
| GET | `/api/v1/backups/restored-config` | 最近恢复的前端接口配置及 restored_at，无前端配置时返回 null；`Cache-Control: no-store` |
| GET | `/api/v1/backups/download/:name` | 鉴权下载，支持 Range，`Cache-Control: no-store` |
| DELETE | `/api/v1/backups/files/:name` | 删除指定本地 ZIP 及其列表元数据 |
| POST | `/api/v1/backups/import` | ZIP 原始文件流；需 `X-Confirm-Replace: true` |
| POST | `/api/v1/backups/restore` | `{name,confirm_replace:true}`，暂存本机备份 |
| DELETE | `/api/v1/backups/pending` | 取消待恢复操作 |
| PUT | `/api/v1/backups/webdav/settings` | `{url,username,password?}`，省略 password 保留原密码 |
| POST | `/api/v1/backups/webdav/test` | 同配置请求，测试当前表单，未保存也可测试 |
| GET | `/api/v1/backups/webdav/files` | 云端备份文件名、大小和修改时间 |
| POST | `/api/v1/backups/webdav/files/:name/sync` | 下载、校验并加入本地列表，返回 BackupItem，不替换资料库 |
| DELETE | `/api/v1/backups/webdav/files/:name` | 删除指定云端 ZIP，本机副本保留 |
| POST | `/api/v1/backups/webdav/backup` | `{include_credentials:false}`，本机快照并上传 |
| POST | `/api/v1/backups/webdav/restore` | `{name,confirm_replace:true}`，下载、校验并暂存 |

恢复暂存成功返回 `restart_required:true`。暂存后普通写接口返回 503，备份状态、只读接口与取消恢复仍可访问。非法路径/损坏包返回 400，任务运行、布局/运行时不支持或重复暂存返回 409。WebDAV 请求失败以 502 和不含密码的提示返回。

前端在首页启动时读取恢复的接口配置，写入浏览器存储及桌面配置，按接口地址和 restored_at 记录已应用标记，后续启动保留用户的新修改。普通备份状态响应不包含这些密钥。旧版迁移包若没有 frontend-config.json，无法补回原来未导出的 OCR/翻译密钥，需要重新导出。

## 文献批量导出

书库 → 批量 → 勾选文献 → 批量导出，选择仅译文 PDF、对照 PDF、原始 PDF、OCR Markdown 或 Obsidian 笔记包。每次 1–100 篇；原文不要求翻译，Markdown 要求已有 OCR 结果，其他格式要求已完成译文。Obsidian 包可关闭“同时包含原文笔记”。

`POST /api/v1/documents/export-batch` 接收 `{document_ids,format,include_source?:true}`，format 为 `translated/comparison/source/markdown/obsidian`，返回 `{name,exported,failed,items}`。每个 item 含 document_id、title、folder 和失败 message；重复文献会去重。只要有成功项就生成 ZIP，通过 `GET /api/v1/documents/export-batch/:name` 下载；全部失败时 name 为 null。ZIP 内的 export-result.json 记录逐篇结果。

每篇独立子目录保留 Markdown 的 images 相对路径。Obsidian 笔记和 .assets 目录使用唯一名称，包内展开为可直接使用的笔记与附件，避免多篇文献标题或图片重名后关联错误。

## 验证记录

v0.1.13 的真实坚果云与备份管理验收见[修复报告](../../ops/reports/webdav-backup-v0.1.13.md)。以下为 v0.1.12 初始开发时的记录。

- 新增备份 API/服务测试：10 项通过，覆盖鉴权、确认替换、维护状态、不同数据根目录迁移、凭据选择、损坏/新版本/路径越界包、交换中断回退，以及本地 WebDAV 测试服务的上传/列出/下载恢复。
- 数据库测试：90 项通过，包含新增的 WAL 快照独立性验证。
- 全量 Web 测试最终复测：1922 项通过、0 失败、2 跳过。首次并行编译时遇到的凭据/问答计时失败已单独复核通过；补齐当前 Playwright 所需的浏览器后完成最终串行复测。
- Web TypeScript 检查、生产构建、Rust API 架构检查通过。修改的 Rust 文件已格式化；全工作区 `cargo fmt --check` 仍报告原有 Markdown 导出测试、Zotero 外部引用等未格式化文件，未改动这些文件。
- 桌面测试 65 项通过；桌面首次启动、前端资源同步与 bundle 检查通过。
- 全量 Rust 工作区：1000 项通过、16 失败、4 忽略；16 个失败名称均在 [2026-10-25 既有失败记录](../../superpowers/plans/2026-10-25-upstream-backports.md) 中，集中在 Windows 路径/Python worker/真实 PDF 集成测试。本次备份测试与完整数据库测试全部通过。
- 使用隔离数据目录的真实 Rust 服务与生产前端，浏览器跑通创建、鉴权下载 ZIP、上传导入、校验暂存和取消恢复；1440px 桌面及 390px 窄屏检查通过，窄屏页面宽度 390px、内容窗格宽度与滚动宽度均为 364px。
- 现有 `visual:check` 脚本在本 Windows 环境未能启动它的 40151 静态服务，返回连接拒绝；上述实际页面截图与浏览器流程作为本次界面的视觉验证。WebDAV 已在本地协议测试服务验证，尚未使用用户的远端账号测试。
- 独立界面复核结论为 `ship`：列出的 WebDAV 按钮可见性问题经等待滚动重绘后补拍，确认为截图时机问题，单项复核已解决。
