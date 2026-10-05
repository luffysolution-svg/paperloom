# 本地启动与配置

## 后端

从仓库根目录启动：

```bash
python3 ops/development/dev_stack.py --runtime python
```

该入口准备锁定的 Python 环境及 Rust 二进制，再由 Rust 监督 jobsd 和 AI。
默认只监听回环。需要局域网访问时，先设置强随机的 `RUST_API_KEYS`，再传
`--host 0.0.0.0`；启动器和 Rust 都拒绝非回环监听使用默认开发 key。

默认监听：

- 完整 API：`http://127.0.0.1:41000`
- multipart 异步提交 API：`http://127.0.0.1:42000`

## 前端

```bash
cd /path/to/retain-pdf/frontend
python3 -m http.server 40001 --bind 0.0.0.0
```

前端 API base 规则：

- 优先读取 `window.__FRONT_RUNTIME_CONFIG__.apiBase`。
- 如果没有配置，回落到当前 host 的 `41000`。
- Docker 交付默认 `FRONT_API_BASE=` 为空，由 Nginx 同源 `/api/` 代理到后端。

## 鉴权

除 `GET /health` 外，其余 API 默认需要：

```http
X-API-Key: your-rust-api-key
```

`X-API-Key` 是访问 Rust API 的后端白名单 key，不是 DeepSeek / MinerU / Paddle 的模型或 OCR key。

本地 key 来源：

- 显式环境变量 `RUST_API_KEYS` 优先；值为空会报错。
- 未设置环境变量时读取 `backend/api/auth.local.json`（可由 `RUST_API_ROOT` 改变位置）。
- 开发启动器会显式设置 key：未提供 `RUST_API_KEYS` 时，在回环使用开发默认值。

`RUST_API_SIMPLE_PORT`、`RUST_API_MAX_RUNNING_JOBS` 同样以显式环境变量优先，
不再被本地文件覆盖。损坏的本地文件仍会阻止启动，不静默忽略配置错误。

Docker 中 `ops/deployment/docker/delivery/docker/auth.local.json` 的 `api_keys` 必须和 `ops/deployment/docker/delivery/docker/web.env` 里的 `FRONT_X_API_KEY` 对上。

## 常用环境变量

- `RUST_API_ROOT`：Rust API 根目录。
- `RUST_API_PROJECT_ROOT`：项目根目录。
- `RUST_API_BIND_HOST`：监听 IP 地址，默认 `127.0.0.1`。
- `RUST_API_PORT`：完整 API 端口，默认 `41000`。
- `RUST_API_SIMPLE_PORT`：multipart 异步提交端口，默认 `42000`。
- `RUST_API_DATA_ROOT`：运行时数据根目录。
- `RUST_API_DATA_DIR`：旧别名，仅在 `RUST_API_DATA_ROOT` 未设置时使用。
- `RUST_API_SCRIPTS_DIR`：pipeline 包根目录，保留给运行路径和辅助工具配置。
- `RUST_API_PYTHON_ENTRYPOINT_MODE`：已废弃，不再选择 worker 模式；开发启动器不再传递该变量。
- `RUST_API_PIPELINE_COMMAND`：辅助任务（如 document-operation）使用的 `retainpdf-pipeline` 命令路径。OCR、翻译、渲染主阶段固定使用 `PYTHON_BIN -m retainpdf_pipeline.ocr|translate|render --spec ...`，不再回退到旧脚本。
- `PYTHON_BIN`：Python 可执行文件。
- `RUST_API_UPLOAD_MAX_BYTES`：普通上传大小限制，`0` 表示不限制。
- `RUST_API_UPLOAD_MAX_PAGES`：普通上传页数限制，`0` 表示不限制。
- `RUST_API_MAX_RUNNING_JOBS`：最大并发任务数。

## Docker 配置位置

Compose 实际读取的是：

- `ops/deployment/docker/delivery/docker/app.env`
- `ops/deployment/docker/delivery/docker/web.env`
- `ops/deployment/docker/delivery/docker/auth.local.json`

不是仓库根目录下的 `docker/*.env`。
