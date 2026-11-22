# PaperLoom Agent Skills、CLI、MCP 与科研工作流设计

状态：Phase 0–4 已实现，Phase 5（内嵌 ACP 工作台）暂未实现

更新时间：2026-11-22

相关规划：[Zotero / Obsidian 联动 PRD](./zotero-obsidian-integration.md)

参考项目：[sanmu-skills](https://github.com/luffysolution-svg/sanmu-skills)

## 1. 目标

PaperLoom 为 Codex、Claude Code、Pi、OpenCode、ZCode、DeepSeek Harness、WorkBuddy 等 Agent 提供一套稳定入口，覆盖以下工作：

- 读取和理解 PaperLoom 中的 PDF、OCR、Markdown、公式、表格、图表和翻译结果
- 通过 Agent 对话发起单篇或批量 OCR、翻译、导出和写回任务
- 对论文进行证据可追溯的精读、跨文献比较和文献综述
- 将结果写入 Zotero、Obsidian 或 PaperLoom 的研究产物目录
- 让任务可以查询、取消、续跑、重试和审计

MCP 负责连接 PaperLoom 的数据和动作。Agent 负责理解问题、规划步骤和生成研究文本。OCR、翻译、排版、任务状态和文件写回由 PaperLoom 现有服务负责。

本设计不在 Agent 侧重复实现 OCR、翻译或排版逻辑。

## 2. 当前能力与边界

当前 API 已经提供以下基础能力：

- PDF 上传、文档列表、文档元数据和全文搜索
- OCR、翻译和完整任务创建
- 任务取消、续跑、阶段重试和进度事件
- Reader Markdown、页面元数据、页面区域和单个区域读取
- 质量、翻译、排版和用量报告
- 翻译条目查询、单块修订和修订历史
- Zotero 状态、分类、条目、附件导入和译文 PDF 写回
- Obsidian Vault 发现、单篇导出和批量导出

完整接口目录见 [routes.txt](../../../backend/api/docs/routes.txt)。Reader 的结构化阅读数据约定见 [reader-read-model.md](../../../backend/api/docs/api-spec/reader-read-model.md)。

当前缺少一个面向 Agent 的统一批处理入口。第一版由 CLI 或 MCP 编排多个已有任务，返回每个任务的 job_id，并在本地保存批次状态。后续再根据真实用法增加后端批次接口。

Zotero 和 Obsidian 写入接口目前有 admin 访问范围。MCP 设计必须保留现有权限，或者增加经过明确授权的用户级包装接口。

## 3. 从 sanmu-skills 复用的原则

sanmu-skills 已经形成了三个科研 Skill、统一 CLI、stdio MCP、跨宿主插件和证据链工作流。PaperLoom 复用这些结构原则，不复制其中的学科规则。

### 3.1 单一真源

Skill 目录保存工作流说明、参考资料、脚本入口和验证规则。Claude Code、Codex、Pi、ZCode 和其他宿主只保存挂载配置，不维护另一份业务逻辑。

### 3.2 CLI 与 MCP 共用同一套核心

CLI 适合脚本、批处理和故障排查。MCP 适合 Agent 发现工具、读取资源和发起任务。两者调用同一个 PaperLoom Agent 适配层，避免出现 CLI 和 MCP 行为不一致。

### 3.3 可检查、可恢复、可追溯

每次运行有独立的运行目录、任务清单、事件记录、证据文件和产物索引。doctor 只检查环境和能力。每个写操作支持 dry-run 或确认步骤。

### 3.4 宿主适配层保持很薄

MCP 配置、插件元数据和宿主入口只负责找到 CLI 或 MCP 入口。宿主专属代码不处理 PDF、Zotero 或科研判断。

## 4. Skill 设计

第一阶段提供三个核心 Skill。Zotero 和 Obsidian 作为 paperloom-pdf-ops 的集成工作流，暂不拆成独立业务 Skill。

### 4.1 paperloom-pdf-ops

职责是文件和任务操作：

- 导入 PDF 或 Zotero 附件
- 判断已有 OCR、Markdown 和翻译产物
- 提交 OCR 和翻译
- 查询、取消、续跑和重试任务
- 导出 PDF、Markdown、图片和报告
- 写回 Zotero 或 Obsidian

Skill 应要求 Agent 先读取任务状态，再执行下一步。批处理必须先 dry-run，再提交。

### 4.2 paperloom-paper-reader

职责是证据导向的科研解读：

- 单篇论文精读
- 公式、表格和图表解释
- 方法、数据集、指标和实验条件拆解
- 跨文献比较
- 研究问题、证据缺口和复现准备
- 生成带页码、块 ID 和资源链接的阅读笔记

Skill 中明确区分作者原文、Agent 解读和待验证假设。每个重要论断都要写入证据引用，不能只输出没有定位信息的总结。

### 4.3 paperloom-paper-search

职责是文献检索和语料组织：

- 搜索 PaperLoom 本地文献库
- 搜索 Zotero 分类和条目
- 对接 OpenAlex、Crossref、Semantic Scholar、PubMed / Europe PMC 等外部来源
- DOI、标题、作者和年份去重
- 扩展参考文献、施引文献和相似论文
- 记录成功、零结果、截断和失败来源

第一阶段可以只实现本地库搜索和 Zotero 搜索。外部学术来源作为后续 MCP Provider 接入。

### 4.4 Skill 目录约定

每个 Skill 目录包含以下内容：

    SKILL.md
    README.md
    references/
    scripts/
    examples/
    tests/

SKILL.md 只写触发条件、工作步骤、输入输出和约束。可执行逻辑进入 scripts/，长篇协议和领域检查放入 references/。凭据只从环境或 PaperLoom 配置读取，不写入 Skill 和运行产物。

## 5. 本地 CLI 设计

PaperLoom 已有 paperloom CLI。新增能力放在 paperloom agent 下，不再创建第二个同名命令。

### 5.1 命令分组

    paperloom agent doctor
    paperloom agent capabilities

    paperloom agent document import <file>
    paperloom agent document list
    paperloom agent document search <query>

    paperloom agent ocr submit <document-id>
    paperloom agent translate submit <document-id>
    paperloom agent job status <job-id>
    paperloom agent job events <job-id>
    paperloom agent job cancel <job-id>
    paperloom agent job retry <job-id>

    paperloom agent reader outline <document-id>
    paperloom agent reader page <job-id> <page>
    paperloom agent reader region <job-id> <item-id>
    paperloom agent reader search <job-id> <query>

    paperloom agent zotero list
    paperloom agent zotero import
    paperloom agent zotero writeback

    paperloom agent obsidian export
    paperloom agent workflow run <workflow-file>
    paperloom agent mcp

### 5.2 CLI 输出约定

- --json 输出稳定 JSON 对象
- --events jsonl 输出事件流
- 结果写 stdout，进度和诊断写 stderr
- 每个异步动作返回 job_id 或 operation_id
- 批处理返回逐项结果，不因单项失败丢失其他项
- 写操作支持 --dry-run
- doctor 不上传文件、不调用模型、不显示密钥

### 5.3 运行目录

运行目录建议放在 PaperLoom 数据目录的 Agent 子目录：

    <paperloom-data>/agent-runs/<run-id>/
      manifest.json
      events.jsonl
      evidence.json
      claims.json
      outputs/
      errors.jsonl

manifest.json 记录输入、版本、工具参数、来源文献和产物。events.jsonl 用于恢复和审计。原始 OCR、原始 PDF 和 PaperLoom 任务产物不被运行目录覆盖。

## 6. MCP 设计

第一版使用本地 stdio MCP：

    paperloom agent mcp

Claude Code、Codex、Pi、ZCode 和其他宿主只配置这一入口。远程 Streamable HTTP 作为后续部署模式。

### 6.1 Tools

文献库工具：

- list_documents
- search_documents
- search_scholarly
- get_document
- get_capabilities

导入和任务工具：

- upload_pdf
- import_zotero_attachments
- submit_ocr
- submit_translation
- get_job_status
- get_job_events
- cancel_job
- retry_job

阅读和证据工具：

- get_document_outline
- get_page_context
- get_region_context
- search_document
- get_figure_resource
- validate_evidence

输出和集成工具：

- export_markdown
- export_obsidian
- writeback_zotero

批量工作流单独提供 run_batch_workflow。它接收输入集合、任务类型、dry-run、最大数量、并发数、失败策略和写回策略，返回 run_id，再由 get_run_status 查询逐项状态。

### 6.2 Resources

    paperloom://documents/{document_id}/metadata
    paperloom://documents/{document_id}/outline
    paperloom://jobs/{job_id}/markdown
    paperloom://jobs/{job_id}/regions
    paperloom://jobs/{job_id}/regions/{item_id}
    paperloom://jobs/{job_id}/reports/quality
    paperloom://jobs/{job_id}/reports/translation
    paperloom://jobs/{job_id}/pages/{page}/image
    paperloom://runs/{run_id}/evidence

资源返回结构化 JSON、Markdown、LaTeX、图片或资源链接。每个资源包含 document_id、job_id、页码、item_id、来源类型和版本指纹。

### 6.3 Prompts

- read_paper
- explain_method
- interpret_figure
- compare_papers
- build_evidence_matrix
- draft_literature_review
- prepare_obsidian_note
- review_translation_quality

Prompt 只提供稳定任务模板，不保存用户论文内容和对话历史。

### 6.4 统一返回结构

所有工具使用统一 envelope：

    {
      "ok": true,
      "data": {},
      "warnings": [],
      "references": []
    }

引用对象至少包含 document_id、job_id、page、item_id、quote 和 source_kind。

## 7. 科研工作流

### 7.1 单篇精读

    定位文献
    → 检查 OCR / Markdown
    → 读取目录和页级上下文
    → 按问题检索 blocks
    → 读取公式、表格和图像
    → 生成带证据的回答
    → 生成阅读笔记

产物包括 reading-note.md、claims.json、evidence.json 和 open-questions.md。

### 7.2 Zotero 批量 OCR 与翻译

    读取 collection
    → 筛选 PDF 附件
    → dry-run 显示数量和任务计划
    → 用户确认
    → 导入附件
    → OCR 缺失文献
    → 提交翻译
    → 监控 job 事件
    → 失败重试
    → 写回译文 PDF

每项任务独立记录 job_id、源附件、内容哈希、翻译版本和写回结果。重复运行按文献和附件哈希去重。

### 7.3 Obsidian 知识库同步

导出内容分为 PaperLoom 管理区和用户自由编辑区。重复导出只更新受管区块，保留用户手写内容。冲突策略包括询问、重命名、覆盖和跳过。

### 7.4 文献综述

    输入研究问题
    → 多源检索
    → DOI / 标题 / 作者去重
    → 获取 PDF 和 SI
    → OCR / Markdown 解析
    → 建立证据矩阵
    → 检查矛盾和证据缺口
    → 生成综述与阅读清单

综述必须保存检索来源、检索日期、纳入规则、排除记录、核心证据和不可访问文献。

### 7.5 图表和公式解读

图表资源必须同时提供页面图像、图号、图注、正文引用段落和页码。Agent 可以解释坐标轴、趋势、对照和异常，但数值转录和表格转换应提供原图引用并支持二次校验。

公式解读保留 LaTeX、变量定义、上下文段落和页码。公式编译通过只作为语法检查，不能替代原文核对。

## 8. 证据模型

结论支持等级：

- direct：原文直接支持
- inferred：基于多个原文证据推导
- hypothesis：研究假设或下一步推测
- unsupported：暂时没有定位到证据
- conflicting：文献之间存在冲突

Agent 输出中的作者结论、Agent 解读和新假设分开存储。没有定位到证据的句子不能伪装成文献事实。

## 9. 权限与可恢复性

需要确认的操作：

- 批量 OCR 和翻译
- 可能产生模型费用的任务
- Zotero 写回
- Obsidian 覆盖
- 译文条目修订
- 删除、取消和重试任务

凭据保留在 PaperLoom 配置中。MCP 返回能力状态和任务结果，不返回原始 API Key。批量任务必须支持暂停、恢复、失败项重试和逐项结果。

## 10. 分期与验收

### Phase 0 设计契约

- Skill 名称和目录
- CLI 命令与 JSON schema
- MCP tool、resource、prompt 名称
- 证据对象和运行目录
- 写操作权限策略

### Phase 1 只读能力

- doctor
- 文献列表和搜索
- Markdown、regions、页图
- 任务状态和报告
- 单篇 paperloom-paper-reader

### Phase 2 任务能力

- OCR
- 翻译
- 取消、续跑和重试
- 批量 dry-run
- 事件流和恢复

### Phase 3 外部库集成

- Zotero 导入和写回
- Obsidian 导出
- 冲突策略
- 受管区块增量更新

### Phase 4 科研检索

- OpenAlex、Crossref、Semantic Scholar、PubMed / Europe PMC
- 去重和引文扩展
- 证据矩阵
- 文献综述核验

### Phase 5 可选 ACP 工作台

- 内嵌 Agent 对话
- 流式任务事件
- 权限确认卡片
- 会话恢复

## 11. 参考资料

- [sanmu-skills 项目总览](https://github.com/luffysolution-svg/sanmu-skills)
- [sanmu-skills 的 Claude Code MCP 配置](https://github.com/luffysolution-svg/sanmu-skills/blob/main/.mcp.json)
- [sanmu-skills 的 Codex MCP 配置](https://github.com/luffysolution-svg/sanmu-skills/blob/main/mcp.json)
- [sanmu-skills 的单一真源与跨宿主约定](https://github.com/luffysolution-svg/sanmu-skills/blob/main/AGENTS.md)
- [sanmu-doc2md 文档处理流程](https://github.com/luffysolution-svg/sanmu-skills/blob/main/skills/sanmu-doc2md/README.md)
- [sanmu-paper-reader 证据链工作流](https://github.com/luffysolution-svg/sanmu-skills/blob/main/skills/sanmu-paper-reader/README.md)
- [sanmu-paper-search 检索与去重工作流](https://github.com/luffysolution-svg/sanmu-skills/blob/main/skills/sanmu-paper-search/README.md)

Phase 0–4 的 CLI、stdio MCP、Skills、批量运行记录和外部文献检索已经落地。Phase 5 的内嵌 ACP 工作台仍保留为后续可选工作，不影响 Codex、Claude Code、Pi、OpenCode、ZCode、DeepSeek Harness 和 WorkBuddy 通过 stdio MCP 使用 PaperLoom。
