# BYOA 与 BYOK

PaperLoom 的「设置 → 接口设置 → AI 服务」管理用户已有的本机 Agent，以及使用 API Key 的模型服务。首页问答与阅读器使用输入框底栏的同一套服务／模型菜单，每个会话分别记住服务、模型和 Agent 配置。OCR、翻译默认值保留独立设置。

## 连接自己的 Agent

先安装 Agent CLI、完成它自己的登录，再在 PaperLoom 添加「本机 Agent」。已检测到的 Agent 优先显示，选择品牌后点击「连接」；未安装的条目提供安装与登录说明。启动程序、JSON 参数数组、工作目录和环境变量覆盖收在高级设置；空工作目录使用用户目录。程序通过独立参数启动，不把整个命令交给 shell 解释。

预设按 [Agentero ecf14d84 的目录](https://github.com/poco-ai/Agentero/blob/ecf14d84ab8be59ba54c45f5df83fd015b8ff42f/src-tauri/src/features/agent/registry/templates.rs) 固定，共 16 种：

| Agent | ACP 启动入口 |
| --- | --- |
| Codex | `codex-acp` |
| Claude Code | `claude-agent-acp` |
| OpenCode | `opencode acp` |
| Pi | `pi-acp` |
| Grok Build | `grok agent stdio` |
| CodeBuddy | `codebuddy --acp` |
| Cursor Agent | `cursor-agent acp` |
| Hermes Agent | `hermes acp` |
| Antigravity | `agy_acp_server.exe` / `agy_acp_server.par`；Linux 加 `--uid=` |
| Qoder CLI | `qodercli --acp` |
| Qoder CN | `qodercn --acp` |
| DeepSeek Harness | `dsh --profile acp` |
| Kimi Code | `kimi acp` |
| ZCode | `zcode-acp-server server` |
| MiniMax Code | `mcode acp` |
| MiMo Code | `mimo acp` |

Codex、Claude Code、Pi 分别需要其 ACP 适配器；用户点击连接后，PaperLoom 可自动在 `data/cache/acp-adapters` 准备这些连接组件及 ZCode 连接组件，需要本机 Node.js/npm。不会全局安装或改动用户 CLI。Codex 通过 `CODEX_PATH`、Claude Code 通过 `CLAUDE_CODE_EXECUTABLE` 绑定用户已安装的 CLI，保留原有用户目录和认证环境。Windows npm 启动器会解析到实际的 Node 脚本或原生可执行文件。

Antigravity 使用官方独立 ACP server，其认证与 IDE 登录独立。ZCode 可在环境变量中填写 `ZCODE_BIN` 指向桌面版附带的 CLI。自定义 ACP 可连接 GenericAgent：启动程序填写 Python，参数填写 `frontends/genericagent_acp_bridge.py` 的绝对路径，工作目录填写其仓库目录。

「连接」对 BYOA 执行 ACP v1 初始化及创建会话，返回 Agent 的模型、模式等 `configOptions`；旧 Agent 的 `models` / `modes` 会转换成相同的选择器。模型在对话菜单中选择，其他选项收在「对话设置」。探针成功表示协议与会话可用，模型服务的认证仍由 Agent 自己负责。子进程保留代理环境，并将 loopback 合入 `NO_PROXY`，支持 OpenCode 等使用本地 HTTP 服务的 Agent。

## 模型 API

BYOK 原生支持以下协议，对话与翻译均可使用：

| 协议值 | 请求入口 | 认证 |
| --- | --- | --- |
| `openai` | `/chat/completions` | Bearer API Key |
| `openai_responses` | `/responses` | Bearer API Key |
| `anthropic` | `/v1/messages` | `x-api-key` 与 `anthropic-version` |

对话协议适配器处理文本、工具调用、工具结果与流式完成信号。Responses 的 reasoning 输出与 Anthropic 的签名内容块在同一轮工具往返中保留。截断的原生响应不会作为完整答案使用。

模型 API 先选择服务商，常规界面只需填写 Key 和对话模型；自定义服务还需填写地址，协议与地址覆盖在高级设置中。「读取模型」只请求模型列表；「保存并验证」会发送一次简短模型请求。模型菜单支持搜索和明确确认自定义模型名，输入搜索词不会改动会话配置。修改未保存的服务地址或协议后，不会读取旧配置的模型列表。

翻译设置、各服务商 profile、配置方案、模型列表与连通性检测、创建任务、阶段 spec、Python 翻译传输及 Rust 模型执行器均携带协议。翻译任务的服务列表还可选择已保存的 BYOK 连接：浏览器提交连接 ID，Rust 在提交时解析并固定协议、模型及凭据引用。任务重试沿用已固定的配置；更新连接不会改变已提交的任务。

## 会话、文档与交互

每次发送固定当前连接与配置，生成期间禁用切换。重新生成与分支继续使用 PaperLoom 的消息树；回答保存连接和模型标签，历史回答不会被当前选择器改写。

BYOA 通过本轮专属的文档工具桥接访问检索、引用与 PDF 操作。支持 MCP 的 Agent 获得 stdio MCP 服务；Pi 使用相同工具的 CLI 入口。文档范围由宿主约束，引用带文档、任务、页码与块锚点。PDF 候选、运行与提交仍由原有 Rust 操作流程管理。

Agent 的权限请求和表单问题显示在对话中，通过独立鉴权接口响应。「停止」同时发送运行取消请求，避免仅依赖关闭 SSE 连接。进程退出时清理本轮工具服务和子进程。恢复时先使用 Agent 声明的会话加载能力；可见历史不匹配、切换 Agent 或旧会话失效时，从 PaperLoom 的可见消息恢复上下文。

未指定工作目录时，Agent 在 `data/agent-runtime/byoa/workspaces` 下使用独立的会话目录，继续从原用户目录读取登录和 CLI 配置。自定义工作目录仍按用户设置执行。ACP 会话同时保存引用锚点，追问复用上一轮证据时仍可跳回原文。

BYOA 单轮默认时限为 300 秒，可用 `RETAIN_AI_BYOA_REQUEST_DEADLINE_SECS` 调整；模型 API 的时限由 `RETAIN_AI_REQUEST_DEADLINE_SECS` 控制，默认 90 秒。Agent 的模型、思考强度和本机插件会影响耗时。

## 存储与接口

- 连接存于 `data/secrets/ai-connections.json`，带修订号与原子替换；新连接保存无需重启 AI 服务。
- 新连接列表仅返回 Key 是否已配置及环境变量名称；编辑时留空保留原 Key，另有明确的清除选项。
- 选择记录按会话 ID 存在浏览器本地；请求携带实际选择，生成期间使用固定快照。
- 含凭据的备份包含连接文件；Agent 自己的登录配置由各 CLI 管理。

Rust 对外提供 `/api/v1/ai/connections`，转发至 AI 服务的 `/v1/connections`：

| 操作 | 方法与后缀 |
| --- | --- |
| 连接目录与预设 | `GET /` |
| 保存连接 | `PUT /`，含 `expected_revision`、`connection` |
| 删除 | `DELETE /{id}?expected_revision=N` |
| 检测、准备组件或读取模型 | `POST /{id}/probe`；可选 `prepare` / `fresh` / `models_only` |
| 认证 | `POST /{id}/authenticate` |
| 权限或表单响应 | `POST /interactions/{id}` |
| 取消运行 | `POST /runs/{id}/cancel` |

问答新增 `connection_id`、`connection_model`、`connection_options`、`run_id`；兼容原有 `llm_*` 请求字段，单次覆盖可指定 `llm_api_protocol`。所有连接和控制接口沿用应用的 `X-API-Key` 鉴权。

Web/Docker 的 Agent 程序运行在部署 PaperLoom 服务的设备上。桌面端使用本机已安装的 Agent。

## 验证范围

2026-11-07 已使用本机 Zotero 文献和真实服务完成验证：Codex、Claude Code、OpenCode、Pi 的文献问答、多轮引用和取消，以及三种模型 API 协议的问答与翻译。16 个预设中的其余 12 个在测试机器上未安装，未宣称连接过真实账号。具体结果、使用的模型与环境限制见[实测记录](../../ops/reports/byoa-byok-live-20261107.md)；此前的实现与离线检查见[实现记录](../../ops/reports/byoa-byok-20261107.md)。
