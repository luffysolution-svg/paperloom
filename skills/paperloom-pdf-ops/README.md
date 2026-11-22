# paperloom-pdf-ops

文件操作 Skill。它调用 PaperLoom 已有任务 API，不在 Agent 侧实现 OCR、翻译或 PDF 排版。

批处理采用 `agent-batch-workflow.v1`，运行产物写入 `<data>/agent-runs/<run-id>/`。
