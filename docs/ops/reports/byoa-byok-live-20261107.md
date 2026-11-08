> 历史记录：本文描述的通用 BYOA／ACP 连接功能已撤回，不代表当前功能。翻译仍支持三种 API 协议。

# BYOA / BYOK 真实验收记录

日期：2026-11-07，Windows。候选版本：0.2.0；实现基线：`76e191d11`。本轮使用本机 Zotero 附件、有效 API 凭据及已经安装的 CLI，实际调用模型和云端 OCR。

## 文献与 OCR

| 样本 | DOI | 完整页数 | 结果 |
| --- | --- | ---: | --- |
| Crystal Graph Convolutional Neural Networks for an Accurate and Interpretable Prediction of Material Properties | 10.1103/PhysRevLett.120.145301 | 15 | MinerU 成功 |
| AI驱动的材料发现：生成式模型与晶体逆向设计进展 | 10.14062/j.issn.0454-5648.20250845 | 16 | MinerU 成功 |
| Unraveling Ni Single-Atom/Nanoparticle Synergy on CdS… 的 Supporting Information | 10.1021/acscatal.5c06713 | 29 | MinerU 成功 |

三篇均从 Zotero 界面导入，保留题录与原始附件。补充材料先测前 3 页，再补跑完整 29 页；完整样本共 60 页。测试机器保存的 Paddle Token 返回 Unauthorized，后续使用有效 MinerU 凭据。

## 真实问答

对英文论文核对了晶体图输入、Materials Project 数据来源、46,744 个材料、9,350 个测试晶体及 `0.039 eV/atom`。追问将最佳误差换算为 `39 meV/atom`。结果中的引用必须属于该文献，页码落在其有效范围内。

下表为选取的完整问答及引用连续性检查的耗时，受用户模型、插件和上游负载影响，不作为性能保证。

| 连接 | 实际模型／配置 | 问答 | 追问 | 引用 |
| --- | --- | ---: | ---: | --- |
| DeepSeek API | deepseek-flash | 18.12 s | 15.86 s | 通过 |
| Chat Completions 网关 | auto/deepseek-v4.1-flash | 16.33 s | 17.42 s | 通过 |
| Responses 网关 | codex/gpt-6.1-sol | 36.00 s | 38.64 s | 通过 |
| Anthropic Messages 网关 | zed/claude-sonnet-5-5 | 32.59 s | 39.58 s | 通过 |
| Codex ACP | gpt-6.1-sol，medium | 39.97 s | 9.27 s | 通过 |
| Claude Code ACP | 已配置的 sonnet | 59.98 s | 23.25 s | 通过 |
| OpenCode ACP | opencode/big-pickle | 139.14 s | 215.36 s | 通过 |
| Pi ACP | magpie/codex/gpt-6.1-sol | 37.78 s | 13.01 s | 通过 |

Codex / Claude / Pi 的适配器分别为 2.5.0、0.101.0、0.0.34。四个 Agent 均复用原 CLI 登录配置。其余 12 个目录预设未在测试机器安装，未标记为真实账号测试通过。

中文综述问答核对了文本、几何图与图像三类表示及其可逆性／对称性取舍。补充材料问答区分了 ESR、荧光表征条件和光催化重整条件；缺少可核实证据时保留“未找到”，不以表征参数代替反应条件。

## 翻译与产物

三种协议分别真实翻译 CGCNN 前 3 页，覆盖正文、跨栏续段、公式与表格附近内容。每份 PDF 保留原文献 15 页，其中所选 3 页为译文；本次没有请求翻译其余 12 页。

| 协议 | 任务 | 状态 | 未解决／死信 | 内容检查 |
| --- | --- | --- | --- | --- |
| OpenAI Chat Completions | `20261107100454-301037` | succeeded | 0 / 0 | 无错误 |
| OpenAI Responses | `20261107100454-fda224` | succeeded | 0 / 0 | 无错误 |
| Anthropic Messages | `20261107100454-c0a120` | succeeded | 0 / 0 | 无错误 |

下载后的 PDF 使用 PyMuPDF 实际打开，核对页数、中文文本并渲染检查。作者、单位、公式等按策略保留的原文块计入正常结果。测试文献、API 凭据及原始调用记录保留在本地运行数据中，不进入公开源码或 Release。

浏览器实际验证了首页从 DeepSeek Pro 切换到 Codex、同一对话保留各轮来源、阅读器同时使用 DeepSeek Flash，以及生成时禁用选择器。主动停止显示“已中断”；重载阅读器后仍恢复该对话，点击真实引用由第 1 页跳到第 3 页。两个窗口的首次对话选择互不覆盖。

## 本轮发现并修复

- Rust 规范化的 Windows `\\?\` 路径无法直接作为 Node 入口或 npm 安装前缀，导致应用内连接失败；在 CLI 边界转换路径。
- Anthropic 的无参数工具会发送空 `input_json_delta`；保留初始 `{}`，不再误报不完整响应。
- 搜索短摘要不足以核对数字；明确要求读取原文块，阅读工具预算调整为默认 6 轮、最多 8 轮。
- Agent 默认使用独立会话工作目录，BYOA 默认时限调整为 300 秒。对相同问题，Codex 在用户目录曾触及 300 秒，独立工作目录下约 60 秒完成。
- Pi 的启动清单根据适配器返回的 startupInfo 单独识别，避免混入正文。
- 真实取消曾被 SSE 的唤醒信号误报为响应中断；四个 Agent 和 DeepSeek 均已验证 `AI_RESPONSE_CANCELLED` 终态。
- ACP 会话保存引用锚点及后续编号；Claude / OpenCode 沿用历史编号时，追问仍能返回对应引用。
- 将可核实的连续引用编号规范成独立引用，同时保护代码、公式和 Markdown 链接。
- 跨栏续段分配回版面块后，按对应块的原文检查长度，消除错误的“译文截断”告警。
- 按未解决内容数生成任务提示，避免把作者等正常保留内容误报为余额／限流故障。
- 首次对话的选择在异步加载前固定；草稿按页面隔离，服务器回传会话 ID 时绑定快照，不覆盖用户的新选择。生成中保持选择器显示稳定。
- 服务目录尚未加载时，不再闪现缺少 API Key 的设置提示。

## 检查与边界

Web 全量回归为 **1990 通过、1 跳过、0 失败**；桌面单元测试 **66 通过**。Web / Reader 类型检查、生产构建、桌面首次配置与前端同步检查通过。三协议翻译、续段检查的聚焦测试 **24 通过**；Rust 完成状态检查 **4 通过**。协议、ACP、取消和引用的聚焦回归通过；新增窗口隔离和异步快照回归通过。

发布门禁进一步检查了翻译的公共导入边界、检查点中的连接快照及块级源文本读取；相关聚焦回归 **79 通过**，架构检查通过，未放宽原有依赖或源文本读取白名单。

Windows 全量 AI 为 367 通过、20 失败、2 跳过；翻译与阶段 spec 为 1162 通过、10 失败。失败仍属于已有的 POSIX 权限、Unix socket、fork、SIGALRM、并发文件替换及冻结 fixture 问题，已在前一阶段的原始基线复现；见[实现记录](byoa-byok-20261107.md)。本轮真实 Windows 流程和新增聚焦用例单独通过。正式产物仍需经过 GitHub 的完整测试门禁与各平台安装包 smoke。

Claude 默认的 Opus 线路在测试中触及额度限制，后续选择其现有 Sonnet 配置；本机 claude-mem 插件登录失效的额外提示来自用户 CLI 配置，PaperLoom 的对话历史及模型调用独立验证。OpenCode 免费模型耗时较长，界面提供过程状态和停止操作。

对标依据为 [Agentero 设置说明](https://docs.agentero.app/frontend/settings/#_4) 与其 16 个 Agent 目录。核心的登录复用、模型／模式选择、问答和取消已实测；本轮没有把 Agentero 的完整应用、全套 CLI 安装／升级管理或未安装 Agent 的账号能力宣称为已验证。
