# Zotero 导入

只读，两种来源，接口与返回结构相同：

- **桌面端：本地 API。** 默认 `http://127.0.0.1:23119`，可用 `PAPERLOOM_ZOTERO_API` 覆盖。要求 Zotero 8 及以上，
  并在 Zotero「设置 → 高级」勾选「允许此电脑上的其他应用与 Zotero 通信」。
- **Docker：数据目录。** 设置 `PAPERLOOM_ZOTERO_DATA_DIR`（compose 示例挂载到 `/zotero:ro`）后改读该目录，不再连本地 API。
  - Zotero 运行时独占锁定 `zotero.sqlite`，后端先把它复制成快照、`PRAGMA quick_check` 通过才读；
    连续 3 次失败回退到 Zotero 自动维护的 `zotero.sqlite.bak`，状态里的 `notice` 提示数据可能滞后。
    快照按数据库文件的大小与修改时间缓存，库有改动才重新复制。
  - 附件读 `storage/<附件 key>/<文件名>`。WebDAV 未下载的附件、以及「链接文件」类型附件（宿主路径在容器里不存在）标记为不可用。
  - 读不到 Zotero 版本号，`version` 返回数据库结构版本（如 `userdata schema 125`，对应 Zotero 9）。

```http
GET  /api/v1/integrations/zotero
GET  /api/v1/integrations/zotero/collections?library_id=users/0
GET  /api/v1/integrations/zotero/items?library_id=users/0&collection_key=&q=&start=0&limit=50
POST /api/v1/integrations/zotero/import
```

- `library_id` 只接受 `users/0`（个人文库）或 `groups/<数字>`；条目/附件/分类 key 必须是 8 位大写字母数字。
- `GET /integrations/zotero` 返回 `{ reachable, version, supported, api_base, libraries: [{id, name, kind}], message, mode, notice }`：
  - `mode`：`local_api` 或 `data_dir`；数据目录模式下 `api_base` 是目录路径。
  - 连不上、未开启本地通信、版本过低、数据目录没挂载或数据库不可读时 `supported=false`，`message` 给出原因。
  - `notice`：可用但需要提醒的情况（读的是备份）。
- `GET /items` 返回一页顶层条目 `{ items: [{key, title, creators, year, item_type, attachments}], total }`，按添加时间倒序。
  `attachments` 只含 PDF：`{ key, title, available, size, document_id }`。
  - `available=false`：附件文件不在本机（WebDAV 同步但未下载）。先在 Zotero 中打开一次即可；数据目录模式下链接文件也是 `false`。
  - `document_id` 非空：这份附件已导入过书库。
- `POST /import` 请求体 `{ library_id, collection_key?, attachments: [{item_key, attachment_key}] }`，一次最多 200 个。
  逐个返回 `{ item_key, attachment_key, status, document_id, title, translation_job_id, message }`：
  - `imported`：读本机文件登记为书库文档（与上传相同的校验）。
  - `existing`：书库已有同一文件（sha256 相同），不重复上传。
  - `failed`：`message` 说明原因，不影响其他附件。
  - `translation_job_id` 非空表示该文档已有成功或进行中的翻译任务，无需再提交。
- 导入会记录「附件 → 文档」关联与条目元数据快照（`document_external_refs` 表），并用 Zotero 的标题、作者、年份、DOI 补全书库文档；
  用户手动改过的标题不会被覆盖。之后导出 Obsidian 笔记时：
  - 笔记名优先用条目的 `citationKey`，没有时按 `作者姓 + 年份 + 标题首词` 生成。
  - frontmatter 额外带 `citekey`、`item_type`、`publication`、`url`、`zotero_key`、`zotero`（`zotero://select/...`）、
    `zotero_pdf`（`zotero://open-pdf/...`）、`zotero_tags`。
  - `folder_by_collection=true` 时，笔记写到 `目录/<导入时所在分类路径>/` 下。

导出 Obsidian 笔记时还会实时读取附件的批注和条目的子笔记，写进译文笔记末尾的 `zotero` 受管区块（格式见「产物下载」）。
本地 API 读 `items/<附件>/children` 中的 annotation 与 `items/<条目>/children` 中的 note；数据目录读 `itemAnnotations` / `itemNotes`。

翻译不在导入接口里提交：前端拿到 `document_id` 后沿用书库的「翻译此文档」流程，带上当前的翻译设置。

## Obsidian 笔记与 Zotero 回写

书籍详情的「保存到 Obsidian」支持仅完成 OCR 的文献。此时主笔记是原文。翻译任务可以同时导出译文主笔记和原文副笔记。原 PDF、插图和译文 PDF 使用同一篇笔记的资源目录。导入时可将选中的附件标为主文或补充材料。同一 Zotero 条目下的补充材料 PDF 会写入该目录，主文通过 `has_supplement` 链接 SI，SI 通过 `supplement_to` 链接主文。已解析的 SI 支持由图表编号定位 PDF 页。

要回写，在主笔记属性里编辑 `publication_title`、`date`、`volume`、`issue`、`pages`、`doi`、`url`、`abstract`、`keywords`、`source_language` 或 `title`，并在「阅读笔记」标题下写下读后记录。在同一导出对话框选好 Vault 和目录，点击「将已有笔记回写 Zotero」。PaperLoom 使用 Zotero 10 本地写入授权，按条目版本提交修改并回读。双方对同一字段或同一条阅读笔记作了不同修改时，界面会提示核对。重复操作会更新同一条子笔记，内含返回 Obsidian 的链接。

```http
POST /api/v1/jobs/:job_id/obsidian/zotero-sync
Content-Type: application/json

{"vault_id":"mounted:Research","folder":"Papers","folder_by_collection":false}
```

成功结果的 `fields_written` 列出写回的属性，`note_status` 为 `created`、`updated` 或 `unchanged`。个人库和群组库使用相同入口。数据目录模式支持导入和导出，笔记回写需要连接 Zotero 本地 API。
