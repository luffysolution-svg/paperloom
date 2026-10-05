# 后端 API 盘点报告

> 生成于 2026-09-11。方法与局限见文末「这份报告测不准的地方」。
> 这是第 1 步：只调查，不改代码。删除提案是第 2 步。

## 结论速览

- 端点总数 **113**，分布严重不均：`jobs` 一个模块占 35 个（30%）
- **确认无任何已知消费方：4 个**（下面逐个列出，各有各的情况）
- **结构性冗余两处**：OCR 镜像端点 7 个、产物下载与通用端点重复若干
- 静态扫描测不准的：59 个（路径末段是通用词，grep 无法区分）

「像微服务」这个感觉的来源不是服务拆分，而是**同一份资源开了多条取法**。

## 一、端点分布

| 模块 | 端点数 |
|---|---|
| `jobs` | 35 |
| `ai` | 18 |
| `documents` | 15 |
| `ingestion` | 10 |
| `internal_agent` | 10 |
| `library` | 6 |
| `providers` | 5 |
| `glossaries` | 5 |
| `collections` | 4 |
| `credentials` | 2 |
| `fonts` | 2 |
| `simple` | 1 |
| **合计** | **113** |

## 二、无任何已知消费方（4 个）

已覆盖的消费方：前端源码、`frontend/packages`、桌面端、smoke 脚本、ops、CI、
**AI 服务（`backend/ai`）**、后端内部调用。四个端点在全部范围内均为零引用。

| 端点 | 情况 | 建议 |
|---|---|---|
| `POST /api/v1/providers/mineru/validate-token` | 前端 `providers.ts` 只封装了 paddle 与 deepseek，**独独漏了 mineru** | 二选一：补前端封装，或删端点。倾向补——另两个 provider 都有 |
| `POST /api/v1/library/books/delete`（批量删除） | 前端只用单个删除 `DELETE /library/books/:job_id` | 删；真需要批量时前端循环单删即可 |
| `POST /api/v1/glossaries/import` | 前端走 `parse-csv` + 逐条创建 | 确认无外部脚本后删 |
| `GET /api/v1/documents/:id/agent-versions` | Agent 版本历史，前端未接 | 若 Agent 功能仍在规划中则保留，否则删 |

## 三、结构性冗余

### 3.1 OCR 镜像端点（7 个）

`/api/v1/ocr/jobs/:job_id/*` 与 `/api/v1/jobs/:job_id/*` 路径逐字对应：

```
/ocr/jobs/:job_id/artifacts
/ocr/jobs/:job_id/artifacts-manifest
/ocr/jobs/:job_id/artifacts/:artifact_key
/ocr/jobs/:job_id/cancel
/ocr/jobs/:job_id/events
/ocr/jobs/:job_id/normalization-report
/ocr/jobs/:job_id/normalized-document
```

**它们与普通版共用同一批 handler**，唯一区别是一个 `ocr_only: bool` 参数，
作用是校验该 job 确实是 OCR 类型、否则 404（`load_supported_job_snapshot`，
`services/jobs/facade/query/listing.rs:93`）。

也就是说这 7 个端点提供的不是新能力，而是**一层类型断言**——而 job 类型本来
就在记录里，`/jobs/:id/events` 对 OCR job 一样能用。

代价不只是端点数：每加一个 job 端点，都要考虑「OCR 版要不要也加一个」。

### 3.2 产物下载与通用端点重复

`GET /jobs/:id/artifacts/:artifact_key` 是通用产物端点，registry 注册了 21 个 key。
其中至少四个另有专用端点：

| 专用端点 | 等价 artifact key | 前端引用 |
|---|---|---|
| `/normalized-document` | `normalized_document_json` | 0 |
| `/normalization-report` | `normalization_report_json` | 1 |
| `/pdf` | `translated_pdf` | 多处（保留） |
| `/markdown?raw=true` | `markdown_raw` | 多处（刚加 Range，保留） |

前两个可以合并到通用端点。后两个虽然也重复，但已是既定入口且用得多，
合并的收益不抵破坏成本。

## 四、这份报告测不准的地方

**静态 grep 无法可靠判定死端点**，原因是前端 URL 是拼接构造的：

```js
fetch(`${buildApiEndpoint(apiPrefix, "library/books")}?${params}`)
```

路径以片段形式出现，没有完整 URL 字面量。调查中因此踩过两次误报：

1. 特征用 `api/v1/glossaries`（带前缀）→ 4 个核心端点被误判为死
2. 特征用 `/library/books`（带前导斜杠）→ 又误判，前端写的是不带斜杠的 `library/books`

最终只对**末段足够独特**（≥2 段，或含连字符）的 54 个端点给出结论；
另外 59 个端点的末段是 `/events`、`/cancel`、`/assets` 这类通用词，
grep 会匹配到大量无关文本，本报告**不对它们下结论**。

还有一层不确定：`grep` 覆盖不到桌面端旧版本、用户自己的脚本、外部集成。

### 建议的下一步

**先量，再删。** 给端点加访问计数（或复用已有的 tracing），跑一到两周真实使用，
再按实测流量决定。静态分析只能提供候选名单，不能作为删除依据——尤其
`internal/agent/operations` 这个例子：它在前端零引用，看着像死端点，实际消费方是
AI 服务（`backend/ai/retainpdf_ai/rust_client.py:95`），差点就误判了。

