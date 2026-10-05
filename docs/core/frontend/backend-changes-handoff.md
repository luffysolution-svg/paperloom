# 后端改动交接（给前端）

本文只记**需要前端配合才能落地**的后端改动：新端点、新字段、新错误码，以及
前端具体要改哪个文件。纯后端的加固（事务边界、超时收尾之类）不在这里。

按后端提交倒序排列，最新在上。

---

## 0. 三阶段（OCR / 翻译 / 渲染）展示：数据够用了，但要读对地方

后端提交：`364aaaf9` `b575906e` `c85ff4af` `fce89bcc`

### 必须改代码的只有一处

`JobStageTiming` 新增两个 **required** 字段,生成的 DTO 已同步
(`@retainpdf/contracts` → `contracts/dist/job-status.d.ts`):

```ts
export interface JobStageTiming {
  stage: string; detail: string | null;
  enter_at: string; exit_at: string | null;
  duration_ms: number | null;
  terminal_status: JobStatusKind | null;
  progress_current: number | null;   // ← 新增，required
  progress_total: number | null;     // ← 新增，required
}
```

只读不构造的地方不受影响。**手工构造完整对象的地方**(测试 fixture、mock 数据
最可能)TypeScript 会报缺字段,填 `null` 即可。

同理 `RuntimeInput` 早先加过 `no_output_timeout_seconds`(也是 required,填 `0`)。

### 各读哪里

| 要显示什么 | 读哪里 |
|---|---|
| 现在在哪一段、进行到哪 | `stage_snapshot`(带 `stage` + `substage`)+ `stages.*.state` |
| 实时推送 | `GET /api/v1/jobs/:id/live-events`(SSE 长连接) |
| 细阶段流水 | `GET /api/v1/jobs/:id/events`，按 `display_stage` 分组、过滤 `lane=main` |
| **完成后回顾各段耗时与进度** | `runtime.stage_history`(新的 `progress_current/total`) |

**不要用 `stages.*.progress` 做完成后的回顾**——它只反映当前活跃阶段的瞬时
快照,阶段一结束就回到 null。这是有意为之:`stages` 回答「现在怎么样」,
`stage_history` 回答「当时怎么样」,两个问题两个地方。

另一个做法(终态回填 `stages.*.progress`)被否掉了:那样失败任务会显示
「translation: 30/50」,看上去像还在跑、实际是死在了 60% 处,前端必须同时读
`state` 才能判断这个数是活的还是死的。

### 事件长这样（字段是为三段展示设计的）

```jsonc
{ "display_stage": "ocr",              // 三段归属：ocr / translation / render
  "stage": "ocr_result_ready",         // 细阶段（全流程 15 个）
  "substage": "done",
  "lane": "main",                      // main / diagnostic / background
  "stage_detail": "Paddle 正在解析文件，第 4/4 页",   // 中文，可直接展示
  "provider": "paddle", "provider_stage": "done",
  "progress": { "unit": "step", "current": 4, "total": 4, "percent": 100.0 },
  "elapsed_ms": 0,
  "raw": { "source_kind": "ocr_child" } }              // 子任务事件已并入父流
```

三段各自的细阶段:

| 段 | 细阶段 |
|---|---|
| OCR | `ocr_submitting` → `ocr_upload` → `ocr_processing` → `ocr_result_ready` → `normalizing` |
| 翻译 | `translating` → `translate` → `continuation_review` → `page_policies` → `garbled_repair` |
| 渲染 | `rendering` → `render_prepare` → `render_preprocess` → `render` |

### 不用改代码，但行为变对了

- **`stage_history` 顺序修正**。以前是
  `translating → finished → rendering → failed`——「完成」夹在「渲染中」前面,
  没法按顺序画时间线。现在是 `translating → rendering → finished`。
  若之前为这个乱序写过绕过逻辑,可以删了。
- **进度文案不再自相矛盾**。以前会出现「进度 100% · 正在开始翻译」
  (数字来自 durable checkpoint、文字是阶段入场语),现在两者同源。
- **渲染阶段不再顶着翻译的进度**。归档刚上线时 rendering 和 finished 会带着
  翻译的 `59/59`(那是文本块数,不是页数),已修。

### 一个仍然存在的不一致

`stages.render.progress` 在任务结束后常残留一个 `2/3`,而 ocr / translation
是 null。那是 `background_snapshots` 里的残影,不是渲染的真实进度。**画完成后
的回顾一律走 `stage_history`**,就不会碰到它。

---

## 0.5 阅读视图分段读 markdown：用 HTTP Range，不新增端点

后端提交：`perf(api): markdown 原文改走文件流，直接支持 Range`

### 结论先说

你提案里的 `/markdown/metadata` 和 `/markdown/chunks` 两个端点**都不做**，
改用已有的 `GET /api/v1/jobs/:job_id/markdown?raw=true` + 标准 HTTP `Range`。

后端 API 已经 113 个,markdown 一个资源就占 3 条。加两条自定义端点去做一件
HTTP 本来就定义了的事,不划算。

### 为什么 metadata 端点不做

它的每一个字段,job detail 的 `artifacts.markdown` 里都已经有了:

| 提案的 `MarkdownMetadataView` | 已有的位置 |
|---|---|
| `ready` | `artifacts.markdown.ready` |
| `total_bytes` | `artifacts.markdown.size_bytes` |
| `raw_path` / `raw_url` | `artifacts.markdown.raw_path` / `raw_url` |
| `images_base_path` / `images_base_url` | 同名字段 |
| `chunks_path` | 不再需要 |

而且 `Content-Range: bytes 0-262143/620000` 的分母就是总字节数,第一次请求
就拿到了,连预先查一次都不用。

### 为什么 chunks 端点不做

`stream_file` 早就实现了完整的 Range(解析头、`206`、`Content-Range`、
`Accept-Ranges`、seek + 流式读),只是 markdown 这条路没接上——它原先把整篇
`read_to_string` 进堆再整个返回。现在接上了,顺带修掉了那次整篇读入
(实测最大的 `full.md` 是 620 KB)。

你否掉 Range 的理由是「按字节切会切到行/多字节字符中间,前端拼行更麻烦」。
多字节那半在浏览器里不成立:`TextDecoder(..., { stream: true })` 就是为跨块
序列设计的,是内置能力。行边界那半确实要前端做,但只有几行。

### 前端要怎么用

```js
const res = await fetch(rawUrl, {
  headers: { ...apiHeaders, Range: `bytes=${offset}-${offset + WINDOW - 1}` },
});
// 206；Content-Range: bytes <start>-<end>/<total>
const total = Number(res.headers.get("Content-Range").split("/")[1]);
const etag = res.headers.get("ETag");
```

两件必须自己做的事:

1. **字符边界**：整段读取过程共用**一个** `TextDecoder`,每次
   `decoder.decode(bytes, { stream: true })`。**不要**每段单独解码——那会在
   跨块的多字节字符上出乱码。
2. **行边界**：一段可能停在行中间,会把代码块 / 表格行 / 公式劈开。把最后一个
   `\n` 之后的残余留下,拼到下一段开头再交给渲染。

**版本检测**：比对各段的 `ETag`(size + mtime)。正文由 pipeline 一次性整篇写出,
当前没有任何路径会就地改写它(非 render 的 rerun/retry 都建新 job;render 就地
重跑只清 `rendered/`),所以偏移量在实践中是稳定的——但那是当下 job 生命周期的
性质,不是这个端点给的保证。`ETag` 中途变了就从 0 重来,否则拼出来的是两个版本
的混合,而且是静默的。也可以直接用 `If-Range`。

### 几点提醒

- 图片仍是正文里的原始相对路径(`images/...`),用 `images_base_url` 解析。
  **复用 `frontend/packages/domain/src/job/artifacts.ts` 的
  `resolveMarkdownAssetUrl`,别在新数据层里重写一遍**——它第 281 行那个
  `while (rel.startsWith("images/"))` 是在剥双重前缀(`images_base_url` 已经
  以 `/images/` 结尾,而正文里写的是 `images/x.png`),漏掉就是 404。
- 不带 `Range` 时行为不变:`200` + 整篇,旧调用方不受影响。
- `/markdown/document` 保留。但阅读器迁走后它只剩 job-detail 页在用,而它贵在
  两处:整篇正文返回两份(原文 + 图片链接重写版),外加 `walkdir` 遍历整个 images
  目录逐个 stat + mime_guess。**如果 job-detail 那边也能改用 `?raw=true`,这条
  端点就可以删掉**,markdown 从 3 条端点收敛到 2 条。要不要做由你定,后端这边
  随时可以配合。

---

## 1. 收藏挡住删除 → 结构化 409 + 清空收藏端点

后端提交：`feat(library): 收藏挡住删除时返回结构化 409，并给出清空收藏的端点`

### 变了什么

删除文档 (`DELETE /api/v1/documents/:document_id`) 或删除馆藏图书
(`DELETE /api/v1/library/books/:job_id`) 被收藏锚点挡住时，409 的响应体从
「一句中文 message」变成了带 `error.code` 和 `error.details` 的结构化错误。

同时新增两个端点，用来一次性清空收藏。

### 前端要做什么

**别再从 message 里正则抠数字。** 那句话会随文案改动和多语言而变。

```jsonc
{
  "code": "DELETE_BLOCKED_BY_FAVORITES",
  "message": "document is referenced by 2 favorite(s); remove the favorites first",
  "error": {
    "code": "DELETE_BLOCKED_BY_FAVORITES",
    "http_status": 409,
    "details": {
      "scope": "document",              // 或 "job"
      "document_id": "6f1c…",           // scope=job 时是 job_id
      "favorite_count": 2,
      "clear_favorites_path": "/api/v1/documents/6f1c…/favorites"
    }
  }
}
```

文档级和 run 级**共用同一个错误码**，因为前端要做的事一模一样，只有清空目标
不同，而那个目标已经在 `clear_favorites_path` 里给好了。所以只需要一个分支：

> 读 `favorite_count` → 提示用户「该文档有 N 条收藏，是否一并删除？」
> → 确认后 `DELETE clear_favorites_path` → 重试原来的删除

`DELETE clear_favorites_path` 返回 `{"data": {"deleted_count": N}}`。

几个边界：

- 幂等：目标存在但没有收藏时返回 `deleted_count: 0`，不是错误
- 目标不存在是 **404**，不要和上一条混为一谈
- `force=true` **不绕过**收藏保护，它只绕过「运行中的任务不可删」
- run 级的清空会连 `{job_id}-ocr` 子任务的收藏一起清（因为它解锁的那次删除
  会连着删子任务），所以清一次就够，不会出现「重试又 409」

详见 [图书馆数据层 API](./library-api.md#两个必须处理的边界)。

---

## 2. 新增 `no_output_timeout_seconds`（空闲超时）

后端提交：`fix(jobs): 给 worker 输出收尾加上限…` 之后的空闲超时提交

### 变了什么

任务提交的 `runtime` 块多了一个字段：

```jsonc
"runtime": {
  "timeout_seconds": 1800,
  "no_output_timeout_seconds": 0    // 新增，0 = 关闭（默认）
}
```

`timeout_seconds` 是整段执行的上限，必须按最坏情况给——一本大部头翻译几小时
是正常的，阈值就得设到几小时。于是「打完第一行就卡住不动」这种情况也要等满
那几小时才被发现。

`no_output_timeout_seconds` 独立地盯「还在不在动」：每收到一行 stdout 就重新
计时，只有 worker 彻底不出声才触发。

两者都判为 `failed` / `process_timeout`（处置方式一样），但 `stage_detail` 不同：

| 触发者 | `stage_detail` |
|---|---|
| `timeout_seconds` | `provider timeout`（normalizing 阶段是 `normalization timeout`） |
| `no_output_timeout_seconds` | `no output for {N}s` |

**这个区分是给用户看的**：前者要调阈值或降并发，后者要查上游是不是不回包了。
如果前端有失败原因的展示或文案映射，`no output for {N}s` 需要一条对应的说法。

校验：负数会被 400 拒绝（`no_output_timeout_seconds must be zero (disabled) or
a positive integer`）；`0` 和正数都放行。

### 前端要做什么

**默认关闭，所以不改也不会坏。** 想让用户能设它的话，要改两处字段白名单——
它们是手写的列表，不是从 `@retainpdf/contracts` 的类型生成的：

- `frontend/packages/api/src/jobs-submit.ts` 的 `legacyTopLevelFields`
  （在 `"timeout_seconds"` 旁边加 `"no_output_timeout_seconds"`）
- `frontend/web/src/platform/api/legacy/jobs-submit.ts`：第 33 行附近的字段
  数组，以及第 101 行附近 `appendFormField(form, "timeout_seconds", …)` 那句
  旁边补一句同形的

multipart 提交路径（`/api/v1/translate/bundle` 等）后端已经接受同名的扁平
字段，语义与 JSON 的 `runtime` 块一致。

生成的 DTO 类型 `@retainpdf/contracts` 的 `RuntimeInput` 已经带上这个字段
（`contracts/dist/job-status.d.ts`），是 **required**——如果哪里在手工构造
完整的 `RuntimeInput` 对象，TypeScript 会要求补上，填 `0` 即可。

详见 [任务提交 API](../../../backend/api/docs/api-spec/jobs-submission.md) 的
Timeout note 一节。

---

## 3. 取消语义：normalizing 不再豁免

后端提交：`fix(jobs): 取消一律终止进程，normalizing 不再豁免`

### 变了什么

此前 OCR 任务在 `normalizing` 阶段点取消，后端会**跳过杀进程**，让它跑完。
结果是用户点了取消，任务却继续显示 running 直到自然结束。现在取消一律终止进程。

### 前端要做什么

**不用改代码**，但有一个时序需要知道：

OCR 专用的取消 (`POST /api/v1/ocr/jobs/{job_id}/cancel`) 只在任务还是
`queued` 时由它自己写终态行。过了这个点，它杀进程，终态由 runner 观察到进程
退出后写入。所以**取消后立刻轮询，可能还会读到一次 `running`**。

如果现在的实现是「取消成功 → 立即认定已取消 → 停止轮询」，那会显示不一致；
应该继续轮到状态真的变成 `canceled`。这个时序在改动前后都存在（改动前更糟：
它可能永远不变），只是现在窗口很短。

详见 [任务重试与控制](../../../backend/api/docs/api-spec/jobs-retry-and-control.md#cancel-job)。
