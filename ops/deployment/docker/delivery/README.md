# 使用 Docker 部署 PaperLoom

默认推荐从源码构建，不需要登录私有 GHCR。适合个人或小组在自己的机器上运行；OCR 和翻译仍调用你配置的服务商 API，容器不需要 GPU。

## 第一次启动

需要 Docker Engine / Docker Desktop、Docker Compose 和 Python 3。建议 4 核、16GB 内存，预留至少 15GB 磁盘空间。Docker Desktop 应切换到 Linux containers。首次构建会下载 Rust、Python、Node、Typst 等依赖，需要能访问 Docker Hub、GitHub、PyPI、npm、crates.io 和 Typst 包站点。

```bash
git clone https://github.com/luffysolution-svg/paperloom.git
cd paperloom/ops/deployment/docker/delivery
python3 init-local.py
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

Windows 使用 `python init-local.py`。初始化会在本目录创建 `.env`，给每个部署生成不同的后端 key；不会显示 key，重复运行不会覆盖现有配置。后端和 NGINX 从同一变量读取它，浏览器不需要填写这个内部 key。不要提交或分享 `.env`。

启动后打开 <http://127.0.0.1:45001>，在页面的 API 配置中填写自己的 MinerU／Paddle 和翻译模型配置。费用与额度由所选服务商决定。

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml ps
docker compose -f docker-compose.yml -f docker-compose.build.yml logs --tail=100 app web
curl http://127.0.0.1:45001/health
```

`app` 的健康检查访问 `/ready`，等待数据库和受监督的 AI 服务就绪；`web` 在它就绪后启动。若提示 `PAPERLOOM_API_KEY` 未配置，先执行初始化；已有 `.env` 缺少该变量时，应保留其他配置并补上随机值。

## 更新、停止与备份

更新源码后，在同一目录重新构建。所有操作都使用两个 Compose 文件，避免意外切回拉取私有镜像的模式。

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.build.yml stop
```

数据保存在 `app_data` 命名卷中，包括数据库、文献、任务产物、用户保存的服务商凭据和缓存。停止容器后备份完整数据卷及 `.env`；单独复制 SQLite 文件无法保留文献和恢复任务所需的产物。`down` 保留卷，`down -v` 会删除卷中的全部数据。

## 常用配置

- `.env`：本机部署的内部 key；可加入 `WEB_PORT=45002` 修改网页端口。若改了端口或访问域名，同时设置 `PAPERLOOM_PUBLIC_BASE_URL`，让 Obsidian 笔记里的链接指向正确地址。
- `docker/app.env`：容器路径、上传上限、并发数和字体。默认最大 200MiB／300 页、4 个并发任务。
- `docker/web.env`：浏览器的 OCR／模型默认选项。`FRONT_*_TOKEN`、`FRONT_MODEL_API_KEY` 会写入浏览器可读的配置；推荐留空，让使用者在页面中填写。`FRONT_X_API_KEY` 保持为空。
- `docker-compose.yml`：持久化、健康检查、端口与可选目录挂载。
- `docker-compose.build.yml`：从本仓库构建 `paperloom-app:local` 和 `paperloom-web:local`，并传入随机内部 key；它覆盖模板 auth 文件中的占位 key。

默认只监听宿主机 `127.0.0.1`，网页为 `45001`，完整 API 为 `46000`，multipart API 为 `47000`。不需要直接调用 API 时，可以删去 `app` 的两个宿主机端口映射；容器之间仍走内部网络。PaperLoom 目前是单工作区服务，面向公网时请在反向代理配置独立访问门禁。示例见 [NGINX 配置](../../nginx/retainpdf.example.conf)。

## Obsidian 与 Zotero

在 `docker-compose.yml` 的 `app.volumes` 下启用需要的挂载，并在 `docker/app.env` 设置相应变量。

```yaml
# 包含多个 Obsidian 库的父目录，每个库内应有 .obsidian
- /path/to/ObsidianVaults:/vaults
# Zotero 数据目录只读，保留 :ro
- /path/to/Zotero:/zotero:ro
```

```dotenv
PAPERLOOM_OBSIDIAN_VAULTS_DIR=/vaults
PAPERLOOM_ZOTERO_DATA_DIR=/zotero
```

Obsidian 可以单篇或批量保存笔记、译文 PDF 和图片，挂载目录需允许容器用户 `10001:10001` 写入。合并单元格继续保留 HTML 表格；如需渲染表格内公式，可自行安装可选社区插件 HTML Table Math 0.1.2（ID `html-table-math`），PaperLoom 不捆绑它。

Docker 的 Zotero 数据目录模式仅用于读取和导入，不写 `zotero.sqlite`，也不提供本机 Zotero 10 授权写回。单篇／批量写回译文 PDF 请使用同机桌面版与 Zotero 10 本地 API。网页内的 `obsidian://` 和 `zotero://` 链接需要浏览器所在电脑安装相应应用。

## 代理与容器网络

Docker 不会继承 Electron 解析的 Windows 系统代理。如宿主机需要代理，可在 `docker/app.env` 配置 `HTTP_PROXY`、`HTTPS_PROXY` 及小写变量，并保留 `NO_PROXY=127.0.0.1,localhost,::1,app`。Docker Desktop 下代理地址通常使用 `host.docker.internal`；容器里的 `127.0.0.1` 指向容器自己。镜像构建拉取依赖的代理应另外在 Docker 设置中配置，不要把代理凭据写入 Dockerfile 或公开配置。

## 使用预构建镜像

基础 Compose 仍保留 `APP_IMAGE`／`WEB_IMAGE`，方便使用自己发布的镜像。但当前 GHCR 包的公开可拉取状态尚未确认，因此不作为新用户的默认入口。

使用这一模式时只传 `docker-compose.yml`，并把 `docker/auth.local.json` 和 `docker/web.env` 中的内部 key 配成同一个随机值，不能沿用模板的占位 key。确认镜像有读取权限后才执行 `docker compose pull`。本地源码构建不需要这一步。

镜像运行用户、目录权限和后端端口详见 [后端容器说明](../backend/README.md)。软件及捆绑运行时的许可说明见 [第三方通知](../../../../THIRD_PARTY_NOTICES.md)。
