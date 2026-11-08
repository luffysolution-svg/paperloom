# 翻译模型协议

翻译使用独立的服务配置，不读取问答连接目录，也不启动本机 Agent。

在「设置 → 接口设置 → 翻译」填写服务地址、API Key 和模型，选择服务商实际支持的协议：

| 配置值 | 协议 | 请求入口 |
| --- | --- | --- |
| `openai` | OpenAI Chat Completions | `/chat/completions` |
| `openai_responses` | OpenAI Responses | `/responses` |
| `anthropic` | Anthropic Messages | `/v1/messages` |

默认使用 `openai`。Anthropic 使用 `x-api-key` 和版本请求头；其余协议使用 Bearer 认证。
模型列表和连接检测使用当前翻译配置的协议、地址和凭据。修改协议或地址后重新检测。

上传时可为本次任务单独选择 OCR 服务、翻译服务和模型，不修改默认方案或问答运行时。
`api_protocol` 和 `thinking` 随任务写入阶段配置及检查点；重试使用任务中固定的配置。
`thinking` 默认为 `auto`，具体档位是否生效由模型和服务商支持情况决定。

翻译传输位于 `backend/pipeline/retainpdf_pipeline/translate/llm/shared/model_wire.py`。
原生协议只有收到完整终态才接受结果，断流和被截断的输出不会作为完成的译文。

问答继续使用原有运行时配置和 OpenAI 兼容模型调用，见 [AI_RUNTIME.md](AI_RUNTIME.md)。
