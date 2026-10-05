

# 1. 推荐总体架构

不要按 page 翻译，也不要按裸 block 翻译。推荐用 **translation unit，TU** 作为最小翻译单元。

但这里的 TU 不是简单句子，也不是 OCR block。它应该是一个带结构约束的对象：

```json
{
  "tu_id": "p0123_b0045_u0002",
  "page_idx": 123,
  "block_ids": ["b0045"],
  "source_text": "...",
  "protected_spans": [...],
  "layout_anchor": {
    "bbox": [...],
    "reading_order": 45,
    "block_kind": "text",
    "layout_role": "body"
  },
  "context": {
    "prev_summary": "...",
    "next_hint": "...",
    "section_title": "..."
  },
  "constraints": {
    "must_terms": [...],
    "placeholders": [...]
  }
}
```

推荐流水线改成这样：

```
OCR normalized JSON
→ layout graph construction
→ block cleanup / formula / placeholder protection
→ TU segmentation
→ continuation candidate detection
→ glossary / memory retrieval
→ immutable context snapshot
→ scheduling / batching
→ LLM structured translation
→ deterministic validator
→ targeted retry
→ targeted repair
→ second validator
→ degraded export decision
→ diagnostics / manifest
```

关键变化有三个：

1. **先建 layout graph，再切 TU**

    不要直接按 reading_order 串起来。把 block 当图节点，边包括：

    - 同页相邻
    - 同栏相邻
    - 跨栏候选
    - 跨页候选
    - 标题到正文
    - 图表 caption 到图表
    - footnote 到正文引用
2. **翻译单元和渲染单元分离**

    一个 TU 可以跨多个 block，但回填时仍然要保留原始 block anchor。

    这样 continuation 判断错了，也不会立刻毁掉页面结构。

3. **所有输出都带状态**

    每个 TU 最后应该有：


```json
{
  "status": "ok | repaired | warning | failed | fallback_source",
  "severity": "P0 | P1 | P2 | P3",
  "validator_errors": [...],
  "repair_attempts": 1,
  "exportable": true
}
```

大文档系统最怕一句话：要么全成功，要么全失败。

500 页任务必须允许**局部失败、局部降级、整体导出**。

# 2. block、paragraph、page、TU 怎么选

推荐结论：

| 粒度 | 是否推荐 | 原因 |
| --- | --- | --- |
| --- | ---: | --- |
| page | 不推荐做最小翻译单元 | prompt 太大，页面结构复杂，失败代价高，retry 成本高 |
| block | 不推荐直接翻译 | OCR block 常常切碎句子，术语和上下文不稳 |
| paragraph | 可作为中间层 | 对正文好用，但对表格、caption、脚注、公式附近文本不够稳 |
| TU | 推荐 | 可以按语义和布局动态切分，适合并发、校验、repair、回填 |

TU 的大小建议：

```
普通正文：80 到 300 tokens
复杂科学段落：100 到 500 tokens
表格 cell：一个 cell 或一组同类 cell
caption：完整 caption
标题：单独 TU
公式说明：公式外文本单独 TU，公式本身保护
脚注：单独 TU，但带引用上下文
```

不要追求 TU 越大越好。

大 TU 提升上下文，但会增加空译文、解释泄漏、超时、格式破坏。你们现在的症状已经说明 batch 或 TU 过大、约束过多、retry 策略不够分层。

# 3. continuation detection 放在哪里

我的建议是三段式：

```
LLM 前：规则 + layout graph 生成 continuation candidates
LLM 中：只允许判断低风险语义关系，不允许直接改结构
翻译后：只做局部修复，不做大规模重排
```

## 3.1 LLM 前必须做

continuation 主要是结构问题，应该先用规则做候选判断。信号包括：

1. 几何信号
    - bbox 垂直距离
    - 同栏 x overlap
    - 栏宽
    - 页边距
    - 是否跨页
    - 是否在 header/footer 区域
2. 文本信号
    - 上一个 block 是否以句号、问号、冒号、分号结束
    - 下一个 block 是否小写开头
    - 是否以连字符断词
    - 是否像列表编号
    - 是否像标题
    - 是否包含公式编号
3. 语义角色信号
    - body 接 body 可以候选
    - title 接 body 不应合并
    - caption 接 body 通常不合并
    - footnote 接 body 不合并，只建立引用关系
4. reading_order 信号
    - 同页 order 连续
    - 跨栏 order 是否跳跃
    - 跨页是否从上一页最后正文到下一页第一正文

输出不要直接是 yes/no，而是：

```json
{
  "edge_type": "same_paragraph_candidate",
  "confidence": 0.82,
  "risk": "low | medium | high",
  "reasons": ["no_terminal_punctuation", "same_column", "small_vertical_gap"]
}
```

## 3.2 LLM 只能处理低置信度候选

不要让 LLM 自由决定跨页合并。

它可以回答：

```json
{
  "is_continuation": true,
  "confidence": 0.67,
  "reason_code": "sentence_continues"
}
```

但不能直接把两个 block 合并成新结构。结构写入必须由你们的规则层执行。

## 3.3 降低灾难性误判的方法

最关键的一条：**不做破坏性合并**。

也就是说，即使判断两个 block 是 continuation，也不要把原始 block 消灭。用虚拟 paragraph group：

```json
{
  "paragraph_group_id": "pg_123",
  "members": ["b10", "b11"],
  "merge_mode": "virtual",
  "render_split": "preserve_original_blocks"
}
```

翻译时可以把它们作为一个 TU 或相邻 TU，但回填仍然按 block anchor 切回去。

如果切回困难，就让一个 TU 对多个 block 产生 translated_segments：

```json
{
  "tu_id": "tu_123",
  "segments": [
    {"block_id": "b10", "translated_text": "..."},
    {"block_id": "b11", "translated_text": "..."}
  ]
}
```

高风险 continuation 的策略：

```
高置信度：允许虚拟合并翻译
中置信度：分开翻译，但提供 read-only neighbor context
低置信度：完全分开，只进入 diagnostics
```

这样误判不会把上下文泄漏扩大成页面级事故。

# 4. quality gate 分级

你们不应该只有 pass/fail。推荐四级。

## 4.1 P0，必须阻断该 TU 导出

这些问题不能放过：

| 类型 | 例子 | 处理 |
| --- | --- | --- |
| 空译文 | source 非空但 target 为空 | retry 或 repair，失败则 fallback_source 并标红 |
| schema 错误 | JSON parse 失败、字段缺失、id 对不上 | retry |
| item 数量错误 | 输入 10 个 TU，输出 9 个或 11 个 | retry |
| placeholder 丢失 | `⟦PH_001⟧` 缺失、重复、改写 | repair，失败则失败 |
| 公式破坏 | LaTeX token 丢失、公式编号错 | repair 或回滚 |
| 解释泄漏 | 出现“这段可以翻译为”“Here is the translation” | repair |
| 明显未翻译 | 整段英文残留，且目标是中文 | retry/repair |
| 严重截断 | target 长度异常短，语义明显不完整 | retry |
| 错页/错 id | target 写到另一个 tu_id | 阻断 |
| 保护 span 顺序错误 | 引用、脚注、公式顺序错乱 | repair |

P0 是**局部阻断**，不是整个 PDF 阻断。

除非 P0 超过阈值，比如：

```
P0 TU ratio > 0.5%
或 P0 page ratio > 2%
或连续 3 页存在 P0
```

才阻断整本文档导出。

## 4.2 P1，必须尝试 repair，但可降级导出

| 类型 | 例子 | 处理 |
| --- | --- | --- |
| 术语硬约束未命中 | 用户 glossary 指定 A 必须译为 B | repair |
| 中等英文残留 | 有英文短语残留，但不是公式/缩写 | repair |
| 格式轻微错 | 列表符号、换行、标点不一致 | repair |
| 长度比例异常 | target/source 比例异常 | repair |
| 重复输出 | 同一句重复两遍 | repair |
| 风格明显跑偏 | 变成摘要、解释、改写 | repair |

P1 repair 失败后可以导出，但必须进入 manifest。

## 4.3 P2，只进 diagnostics

| 类型 | 例子 |
| --- | --- |
| 软术语偏好未命中 | domain glossary 推荐词没用 |
| 少量英文残留 | DNA、HOMO、Gaussian 这种可能本来不翻 |
| continuation 低置信度 | 结构不确定但未造成格式错误 |
| 译文略长 | 可能影响排版，但不破坏内容 |
| 风格轻微不统一 | “计算结果表明” vs “计算结果显示” |

## 4.4 P3，统计指标

例如：

```
平均长度膨胀率
术语命中率
repair 成功率
tail retry 次数
每页 warning 数
```

P3 不影响导出，只用于健康度和回归测试。

# 5. repair pipeline 怎么设计

repair 不能是再翻译一遍。

repair 应该是**针对 validator error 的局部修复**。

推荐状态机：

```
translate
→ validate
→ if P0/P1: targeted retry
→ validate
→ if still failed: targeted repair
→ validate again
→ if still failed: fallback policy
→ manifest
```

LLM repair 后必须再次 validator。

这个边界不要模糊。只要 LLM 参与生成，结果就必须过 validator。Structured output 和 validator 是生产系统的核心防线，不是 prompt 的附属品。结构化输出能降低解析和格式漂移风险，但仍然需要 schema validation 和业务规则校验。[Cohere, Validating Outputs, https://cohere.com/llmu/validating-llm-outputs, 访问日期 2026-05-27][[1]](https://cohere.com/llmu/validating-llm-outputs)

## 5.1 repair 输入应该很小

不要把整页塞给 repair。给它：

```json
{
  "source_text": "...",
  "bad_translation": "...",
  "validator_errors": [
    {
      "code": "PLACEHOLDER_MISSING",
      "missing": ["⟦MATH_003⟧"]
    }
  ],
  "constraints": {
    "must_keep_placeholders": ["⟦MATH_003⟧"]
  }
}
```

让它只输出：

```json
{
  "tu_id": "...",
  "repaired_translation": "..."
}
```

## 5.2 repair 分类

| 错误 | 推荐 repair 方式 |
| --- | --- |
| placeholder 丢失 | 先规则修，如果能确定位置；不能确定再 LLM |
| 公式破坏 | 优先规则回填，不让 LLM 重写公式 |
| 空译文 | 重新翻译，不叫 repair |
| 英文残留 | LLM repair |
| 解释泄漏 | 规则剥离 + validator，必要时 LLM repair |
| 术语未命中 | LLM repair，但给 hard glossary |
| 重复输出 | 规则去重优先，语义不确定再 LLM |
| continuation 合并错 | 不建议 repair 硬修，应该回到 TU segmentation 重跑局部区域 |

## 5.3 repair 失败后怎么办

不要静默保留坏译文。推荐策略：

```
P0 repair 失败：
  fallback_source，标记 failed_exportable=false 或 true 取决于业务
  manifest 中记录
  UI 中提示人工复核

P1 repair 失败：
  保留 best candidate
  status=warning
  diagnostics 记录

P2：
  不 repair，只记录
```

是否允许 fallback 到原文？

可以，但必须显式标记：

```json
{
  "status": "fallback_source",
  "reason": "EMPTY_TRANSLATION_REPAIR_FAILED",
  "display_text": "原文...",
  "needs_review": true
}
```

不要把 fallback_source 伪装成成功翻译。这个坑很大。

# 6. tail latency 怎么处理

你们最后几个 batch 慢，通常来自四类原因：

1. batch 内有超长 item
2. 某些请求触发模型慢路径
3. 429 后退避导致排队
4. 主队列快结束时，只剩 straggler

推荐用三队列：

```
main_queue：首次翻译
retry_queue：429 / 5xx / timeout 后重试
tail_queue：慢 item、疑难 item、repair item
```

不要在主队列里无限 retry。主队列应该只跑首次尝试和极少量快速 retry。

## 6.1 timeout 策略

按 token 长度设动态 timeout：

```
timeout = base + α * input_tokens + β * expected_output_tokens
```

不要所有 item 一个 timeout。长段落和短标题不该同等待遇。

## 6.2 429

429 必须尊重 `Retry-After`。没有这个 header 时，用 exponential backoff + jitter。429 的常见处理就是限速、排队、按服务端提示等待、指数退避。[Postman, HTTP Error 429 Too Many Requests, https://blog.postman.com/http-error-429/, 访问日期 2026-05-27][[2]](https://blog.postman.com/http-error-429/)

策略：

```
429：
  放入 throttle_retry_queue
  按 provider/model 维度限流
  不占 main_queue worker
```

## 6.3 5xx

```
5xx：
  retry 1 到 2 次
  exponential backoff + jitter
  超过次数进入 tail_queue
```

## 6.4 单个慢 item

推荐：

```
超过当前模型 p95 latency：
  标记 slow_candidate

超过 p99 或 hard deadline：
  cancel or hedge
  放入 tail_queue
```

hedged request 可以降低尾延迟，但要谨慎。请求对 LLM 来说成本高，不能乱复制。只对：

```
高价值任务
已接近截止时间
队列剩余少
429 率低
可用 token budget 足够
```

才 hedge。

## 6.5 tail retry 什么时候开始

两个触发条件：

```
main_queue remaining < 10% 到 20%
或
某 item age > p95_latency * 1.5
```

资源分配建议：

```
main_queue：80% worker
retry_queue：15% worker
tail_queue：5% worker
```

当 main_queue 低于 20% 时：

```
main_queue：50%
retry_queue：25%
tail_queue：25%
```

这样 tail 不会抢占正常任务。

## 6.6 batch 策略

不要用固定 batch size。用 token bucket batching：

```
每个 batch 限制：
  max_items
  max_input_tokens
  max_expected_output_tokens
  max_layout_complexity
```

并且按复杂度分桶：

```
short_title
normal_paragraph
long_paragraph
table_cell
caption
formula_heavy
repair
```

不要把 formula-heavy item 和普通正文混在一个 batch。一个坏 item 会拖慢整个 batch。

# 7. glossary / memory / context 怎么设计

术语一致性不要靠把所有 glossary 塞进 prompt。

应该做**分层 + 检索 + 硬软约束区分**。

Translation memory 和 glossary 是两种东西：TM 复用已翻译片段，glossary 管术语和指定译法，二者都能提升一致性，但作用不同。[Language Scientific, What’s The Difference Between Translation Memory and Glossary, https://www.languagescientific.com/whats-the-difference-between-translation-memory-tm-and-a-glossary/, 访问日期 2026-05-27][[3]](https://www.languagescientific.com/whats-the-difference-between-translation-memory-tm-and-a-glossary/)

CAT/TMS 工具也通常把 glossary、translation memory、tag 或 placeholder QA 分开处理。[Smartcat, Translation memories glossaries, https://help.smartcat.com/6987550190610-leveraging-smartcat-linguistic-assets/, 访问日期 2026-05-27][[4]](https://help.smartcat.com/6987550190610-leveraging-smartcat-linguistic-assets/)

## 7.1 推荐优先级

```
L0 用户强制 glossary
L1 项目 glossary
L2 文档内术语表
L3 自动抽取 memory
L4 领域词表
L5 模型默认知识
```

冲突时：

```
用户强制 glossary > 项目 glossary > 文档术语 > memory > 领域词表
```

每个术语要带属性：

```json
{
  "source": "oscillator strength",
  "target": "振子强度",
  "priority": "hard | preferred | hint",
  "domain": "computational_chemistry",
  "case_sensitive": false,
  "allowed_variants": ["振子强度"],
  "do_not_translate": false
}
```

## 7.2 每个 item 按命中注入，不要全文档全局注入

推荐 prompt 里放：

```
全局：翻译风格、目标语言、少量最高优先级术语
局部：当前 TU 命中的 hard/preferred terms
检索：top-K 相似 TM examples
上下文：上一段摘要，不放大量原文
```

局部 glossary retrieval：

```
source_text exact match
+ lemma/stem match
+ phrase match
+ domain match
+ section match
```

每个 TU 注入术语数量建议：

```
hard terms：不限，但通常不会多
preferred terms：top 10 到 30
hint terms：top 5 到 10
TM examples：top 1 到 3
```

不要超过这个量。prompt 越大，速度和稳定性越差，你们已经遇到了。

## 7.3 术语 validator

术语一致性不要只靠 prompt。要做 validator：

```
如果 source 出现 hard term：
  target 必须出现指定译法
否则 P1 repair

如果 source 出现 preferred term：
  target 未命中则 P2 diagnostics
```

术语 QA、placeholder QA 是翻译质量检查里的常见项。[Phrase, Quality Assurance Strings, https://support.phrase.com/hc/en-us/articles/5820046486684-Quality-Assurance-Strings, 访问日期 2026-05-27][[5]](https://support.phrase.com/hc/en-us/articles/5820046486684-Quality-Assurance-Strings)

# 8. translation memory 并发更新

不要边翻边让所有 worker 实时读写同一个 memory。

这会造成不稳定：

```
worker A 先翻译 term X 为 甲
worker B 同时翻译 term X 为 乙
worker C 读到甲
worker D 读到乙
最后全书漂移
```

推荐 **snapshot + epoch merge**。

## 8.1 文档级任务开始前

```
读取 user glossary
读取 project glossary
读取 domain glossary
读取历史 TM
构造 memory_snapshot_v1
```

所有 worker 在同一轮只读 snapshot。

## 8.2 每章或每 N 页合并一次

例如：

```
每 20 页一个 epoch
或每一章一个 epoch
```

epoch 结束后：

```
收集通过 validator 的高置信翻译
抽取术语候选
检测冲突
更新 document_memory_v2
下一 epoch 使用新 snapshot
```

这样长文档一致性更好，也不会完全牺牲前文对后文的帮助。

## 8.3 哪些内容可以进 TM

只允许这些进：

```
status=ok
或 status=repaired 且 second_validator_pass=true
且无 P0/P1
且 source/target 长度比例正常
且无明显英文残留
```

不要把 fallback_source、warning、未确认 repair 写进 TM。否则坏译文会扩散。

# 9. 防模型解释泄漏，哪个最关键

排序如下：

```
structured output / constrained decoding
> validator
> retry / repair
> prompt 约束
```

prompt 只是一层软约束。

生产系统不能指望一句“只输出译文”解决问题。

推荐输出 schema：

```json
{
  "items": [
    {
      "tu_id": "string",
      "translation": "string",
      "status": "translated"
    }
  ]
}
```

严格要求：

```
additionalProperties=false
items 数量必须等于输入
tu_id 必须完全匹配
translation 不得为空
translation 不得包含解释性模板
```

解释泄漏检测可以用规则：

```
"Here is the translation"
"Sure,"
"这段话的意思是"
"可以翻译为"
"译文如下"
"我会"
"作为一个"
```

但不要只靠关键词。再加两个检查：

```
target 是否包含 source 大段复制
target 是否包含 instruction/prompt 片段
```

如果 structured output 仍然泄漏，直接 P0/P1：

```
第一次：retry with stricter error message
第二次：repair strip/extract
第三次：failed or fallback_source
```

# 10. 公式、placeholder、inline math 怎么保护

科学论文/教材类 PDF，公式保护必须依赖规则占位符。

不要相信模型按格式保留公式。

原因很简单：公式是精确对象，不是自然语言。数学公式翻译对符号精度要求极高，和普通文本翻译不一样。[Petersen et al., Neural Machine Translation for Mathematical Formulae, ACL 2023, https://aclanthology.org/2023.acl-long.645.pdf][[6]](https://aclanthology.org/2023.acl-long.645.pdf)

## 10.1 保护对象

建议保护：

```
display math
inline math
LaTeX command
公式编号
引用编号 [1], (3.2), Eq. (5)
变量名
单位
化学式
DOI / URL / email
占位符
图表引用
脚注 marker
```

比如：

```
The oscillator strength $f$ is defined by Eq. (3).
```

先变成：

```
The oscillator strength ⟦MATH_001⟧ is defined by ⟦REF_001⟧.
```

翻译后：

```
振子强度 ⟦MATH_001⟧ 由 ⟦REF_001⟧ 定义。
```

再 restore：

```
振子强度 $f$ 由 Eq. (3) 定义。
```

如果你们希望 “Eq. (3)” 也汉化为“式 (3)”，那就不要整体保护 `Eq. (3)`，而是拆成：

```
Eq. ⟦REFNUM_001⟧
```

让模型翻译 Eq.，保护编号。

## 10.2 placeholder token 设计

token 要满足：

```
模型不容易改写
正则容易识别
不会和正文冲突
能保留顺序
能做 multiset check
```

推荐：

```
⟦MATH_000001⟧
⟦PH_000002⟧
⟦REF_000003⟧
⟦CHEM_000004⟧
```

validator 检查：

```
输入 placeholder multiset == 输出 placeholder multiset
顺序是否允许变化
是否有未知 placeholder
是否重复
是否丢失
```

公式不建议让 LLM 修。

能规则修就规则修，不能规则修就重翻该 TU。

# 11. 哪些问题放主翻译前、翻译后、diagnostics

## 11.1 主翻译前必须解决

| 问题 | 原因 |
| --- | --- |
| OCR block 清洗 | 脏输入会放大 LLM 错误 |
| header/footer/page number 识别 | 否则污染上下文 |
| formula / placeholder 保护 | 这是硬约束 |
| TU segmentation | 决定并发粒度和失败边界 |
| continuation candidate detection | 结构问题要先做 |
| glossary 冲突消解 | 不然前后译法漂移 |
| memory snapshot | 并发一致性依赖它 |
| batch 分桶 | 避免长 item 拖慢短 item |
| export policy | 先定义什么叫可导出 |

## 11.2 翻译后 repair

| 问题 | repair 方式 |
| --- | --- |
| 空译文 | 重翻，不是修补 |
| 英文残留 | LLM repair |
| 解释泄漏 | 规则剥离 + LLM repair |
| 术语未命中 | LLM repair |
| placeholder 少量错位 | 规则优先 |
| 重复输出 | 规则去重或 LLM repair |
| 长度异常 | 重翻或 LLM repair |
| 风格跑偏 | LLM repair |

## 11.3 只做 diagnostics

| 问题 | 原因 |
| --- | --- |
| soft glossary 未命中 | 不应阻断长文档 |
| 轻微英文缩写残留 | 科学文本常见 |
| 低置信 continuation | 记录给人工看 |
| 轻微长度膨胀 | 交给渲染或人工复核 |
| 风格小波动 | 大文档很难完全消除 |
| 疑似术语冲突 | 可以在下一轮 glossary 更新解决 |

## 11.4 不应该用规则硬修的地方

| 场景 | 为什么 |
| --- | --- |
| 复杂语义重译 | 规则不懂语义 |
| continuation 大范围重排 | 容易破坏版面 |
| 术语引起的语法调整 | 需要 LLM |
| 长句中英文残留 | 规则替换容易造病句 |
| 表格语义归一 | 需要上下文 |
| 段落合并后的衔接 | 需要 LLM |

规则适合保护、检测、回滚、局部恢复。

LLM 适合语义翻译、术语融入、病句修复。

# 12. 500+ 页推荐 metrics

你们要看三类指标：吞吐、质量、结构风险。

## 12.1 性能指标

```
per_item_latency_p50 / p90 / p95 / p99
per_batch_latency_p50 / p95 / p99
queue_wait_time
tokens_per_second
items_per_minute
pages_per_hour
main_queue_remaining
retry_queue_size
tail_queue_size
tail_queue_oldest_age
timeout_count
429_count
5xx_count
hedged_request_count
cancelled_request_count
```

重点看 p95/p99，不要只看平均值。尾延迟本来就是分布问题，少量 straggler 就能拖垮整体完成时间。[Tail Latency Study, https://accelazh.github.io/storage/Tail-Latency-Study, 访问日期 2026-05-27][[7]](https://accelazh.github.io/storage/Tail-Latency-Study)

## 12.2 翻译质量指标

```
empty_translation_count
schema_error_count
explanation_leak_count
source_copy_ratio
english_residual_ratio
length_ratio_outlier_count
duplicate_output_count
truncation_count
retry_success_rate
repair_success_rate
second_validator_fail_rate
fallback_source_count
```

## 12.3 结构保护指标

```
placeholder_mismatch_count
formula_mismatch_count
unknown_placeholder_count
placeholder_order_error_count
inline_math_restore_fail_count
citation_marker_error_count
table_cell_count_mismatch
list_marker_damage_count
```

## 12.4 术语一致性指标

```
hard_glossary_hit_rate
preferred_glossary_hit_rate
glossary_conflict_count
term_translation_variants_per_doc
term_drift_by_chapter
TM_reuse_rate
TM_conflict_rate
memory_update_rejected_count
```

## 12.5 continuation 风险指标

```
continuation_candidate_count
high_confidence_merge_count
medium_confidence_context_only_count
cross_page_merge_count
cross_column_merge_count
continuation_repair_count
context_bleed_suspected_count
paragraph_split_error_count
```

## 12.6 文档级导出指标

```
P0_count
P1_count
P2_count
P0_page_count
P1_page_count
failed_TU_ratio
fallback_TU_ratio
review_required_page_count
export_blocked_reason
```

建议定义健康阈值：

```
green:
  P0 ratio < 0.1%
  fallback ratio < 0.2%
  hard glossary hit rate > 99%
  placeholder mismatch = 0 after repair

yellow:
  P0 ratio < 0.5%
  fallback ratio < 1%
  P1 ratio < 3%

red:
  P0 ratio >= 0.5%
  fallback ratio >= 1%
  placeholder mismatch unresolved > 0
  formula restore fail > 0
```

# 13. 推荐的最终策略

如果让我给你们定一版工程方案，我会这样做：

## 13.1 主翻译前

```
1. 建 layout graph
2. 清理 header/footer/page number
3. 保护公式、placeholder、引用、化学式、单位
4. 切 TU，不直接按 block 或 page
5. continuation 只生成候选和置信度
6. glossary 先消冲突，再分层
7. TM 使用 snapshot
8. batch 按 token 和复杂度分桶
```

## 13.2 翻译中

```
1. structured output
2. 每个 output 必须带 tu_id
3. 禁止自由文本输出
4. 小 batch，多 worker
5. 主队列不做重 retry
6. 429 / 5xx / timeout 分队列处理
```

## 13.3 翻译后

```
1. deterministic validator 先跑
2. P0/P1 才 repair
3. repair 后必须二次 validator
4. repair 不通过就 fallback_source 或 failed
5. 不让少量坏 TU 阻断整本书
```

## 13.4 glossary / memory

```
1. 用户 glossary 最高优先级
2. 每个 TU 只注入命中的术语
3. 文档级只放少量全局规则
4. TM 并发只读 snapshot
5. 每章或每 20 页合并一次 memory
6. 只有 validator 通过的译文才能进 memory
```

## 13.5 export

```
1. P0 unresolved：该 TU 标 failed 或 fallback_source
2. 文档是否导出看阈值，不看单点失败
3. manifest 记录所有降级
4. diagnostics 给人工 review
```

一句话总结：

> 大 PDF 翻译系统的核心不是让每个 item 第一次都翻对，而是让每个 item 都能被隔离、校验、修复、降级和追踪。
>

> page 是渲染单位，block 是版面单位，TU 才是翻译单位。
>

> continuation、公式、placeholder、glossary 冲突要在翻译前控住；英文残留、解释泄漏、术语未命中放到翻译后 repair；soft glossary 和低置信结构风险进入 diagnostics。
>