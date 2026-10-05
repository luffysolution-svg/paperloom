"""Citation indexing and safe model-visible tool result projection."""

from __future__ import annotations

import re
from typing import Any

from .runtimes.contracts import Citation

CITATION_RE = re.compile(r"\[(\d+)\]")
BLOCK_ID_BRACKET_RE = re.compile(r"\[\s*(p\d+[-_]b\d+)\s*\]", re.IGNORECASE)
BLOCK_ID_BARE_RE = re.compile(r"(?<![\w/])(p\d+[-_]b\d+)(?![\w/])", re.IGNORECASE)
MARKDOWN_ID_BRACKET_RE = re.compile(r"\[\s*(md-\d+)\s*\]", re.IGNORECASE)
MARKDOWN_ID_BARE_RE = re.compile(r"(?<![\w/])(md-\d+)(?![\w/])", re.IGNORECASE)
# 围栏块（含流式末尾未闭合的）与行内 code。
CODE_SEGMENT_RE = re.compile(r"```[\s\S]*?(?:```|$)|`[^`\n]+`")


def _citation_image_urls(entry: dict[str, Any]) -> list[str]:
    candidates: list[Any] = [entry.get("image_url")]
    for key in ("image_urls", "asset_image_urls"):
        values = entry.get(key)
        if isinstance(values, list):
            candidates.extend(values)
    assets = entry.get("assets")
    if isinstance(assets, list):
        candidates.extend(
            asset.get("image_url")
            for asset in assets
            if isinstance(asset, dict)
        )

    urls: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        url = str(candidate or "").strip()
        if (
            not url
            or url in seen
            or not url.startswith("/api/v1/jobs/")
            or "/markdown/images/" not in url
        ):
            continue
        seen.add(url)
        urls.append(url)
    return urls[:8]


def assign_refs(
    result: dict[str, Any],
    citations: dict[int, Citation],
    next_ref: int,
) -> int:
    """Assign public reference numbers to anchored tool results."""
    anchored: list[dict[str, Any]] = []
    anchored.extend(result.get("hits") or [])
    anchored.extend(result.get("favorites") or [])
    blocks = result.get("blocks")
    if isinstance(blocks, list):
        rewritten_blocks: list[dict[str, Any]] = []
        for block in blocks:
            if not isinstance(block, dict):
                continue
            item = dict(block)
            item.setdefault("document_id", result.get("document_id"))
            item.setdefault("job_id", result.get("job_id"))
            item.setdefault("page_idx", result.get("page_idx"))
            rewritten_blocks.append(item)
            anchored.append(item)
        result["blocks"] = rewritten_blocks
    for entry in anchored:
        if not isinstance(entry, dict):
            continue
        document_id = str(entry.get("document_id") or "")
        block_id = str(entry.get("block_id") or "")
        if not document_id or not block_id:
            continue
        entry["ref"] = next_ref
        snippet = str(
            entry.get("translated_snippet")
            or entry.get("translated_text")
            or entry.get("translated_quote_text")
            or entry.get("source_snippet")
            or entry.get("source_text")
            or entry.get("quote_text")
            or ""
        )
        raw_page_idx = entry.get("page_idx")
        try:
            page_idx = int(raw_page_idx) if raw_page_idx is not None else None
        except (TypeError, ValueError):
            page_idx = None
        citations[next_ref] = Citation(
            ref=next_ref,
            document_id=document_id,
            job_id=str(entry.get("job_id") or ""),
            page_idx=page_idx,
            block_id=block_id,
            snippet=snippet[:200],
            image_urls=_citation_image_urls(entry),
        )
        next_ref += 1
    return next_ref


def _public_anchor(entry: dict[str, Any]) -> dict[str, Any] | None:
    """Strip internal IDs while retaining public page and asset anchors."""
    ref = entry.get("ref")
    if ref is None:
        return None
    raw_page_idx = entry.get("page_idx")
    try:
        page_idx = int(raw_page_idx) if raw_page_idx is not None else None
    except (TypeError, ValueError):
        page_idx = None
    # 模型看到的片段取原文——和 blocks 分支同一个理由:原文权威、覆盖完整。
    # 此前优先取译文，而且还会再带上 source_snippet 与 translated_snippet，
    # 同一段文字最多发三份。
    snippet = str(
        entry.get("source_snippet")
        or entry.get("source_text")
        or entry.get("quote_text")
        or entry.get("translated_snippet")
        or entry.get("translated_text")
        or entry.get("translated_quote_text")
        or entry.get("snippet")
        or ""
    )[:280]
    public = {"ref": int(ref), "snippet": snippet}
    if page_idx is not None and page_idx >= 0:
        public["page"] = page_idx + 1
    for key in ("chunk_id", "heading", "source"):
        value = str(entry.get(key) or "").strip()
        if value:
            public[key] = value
    for key in ("char_start", "char_end"):
        value = entry.get(key)
        if isinstance(value, int):
            public[key] = value
    # bbox / bbox_unit / bbox_origin 不投给模型。它没法用像素坐标回答问题,而这三个
    # 键名加值每块约 50 字符,48 块就是 2.4K 字符白占上下文。引用跳转**不受影响**:
    # 前端用的 bbox 来自 assign_refs 处理的原始结果,不是这份模型可见投影。
    block_type = str(entry.get("block_type") or "").strip()
    if block_type:
        public["block_type"] = block_type
    asset_id = str(entry.get("asset_id") or "").strip()
    if asset_id:
        public["asset_id"] = asset_id
    asset_ids = entry.get("asset_ids")
    if isinstance(asset_ids, list):
        # 空列表也要占键名。绝大多数块没有配图,48 块乘下来是白花的上下文。
        values = [str(value) for value in asset_ids if str(value).strip()]
        if values:
            public["asset_ids"] = values
    image_url = str(entry.get("image_url") or "").strip()
    if image_url:
        public["image_url"] = image_url
    asset_image_urls = entry.get("asset_image_urls")
    if isinstance(asset_image_urls, list):
        urls = [str(value) for value in asset_image_urls if str(value).strip()]
        if urls:
            public["asset_image_urls"] = urls
    assets = entry.get("assets")
    if isinstance(assets, list):
        public_assets: list[dict[str, str]] = []
        for asset in assets[:8]:
            if not isinstance(asset, dict):
                continue
            url = str(asset.get("image_url") or "").strip()
            if not url.startswith("/api/v1/jobs/") or "/markdown/images/" not in url:
                continue
            public_assets.append(
                {"image_url": url, "alt": str(asset.get("alt") or "").strip()}
            )
        if public_assets:
            public["assets"] = public_assets
    return public


def public_tool_payload(result: dict[str, Any]) -> dict[str, Any]:
    """Project a raw tool result into the model-visible data contract."""
    if not isinstance(result, dict):
        return {"error": "invalid tool result"}
    if result.get("error"):
        return {"error": str(result.get("error"))}

    public: dict[str, Any] = {}
    if isinstance(result.get("structured_data_available"), bool):
        public["structured_data_available"] = result["structured_data_available"]
    if result.get("hint"):
        public["hint"] = str(result.get("hint"))
    if result.get("document_id"):
        public["scoped"] = True

    hits = result.get("hits")
    if isinstance(hits, list):
        public_hits = []
        for hit in hits:
            if isinstance(hit, dict):
                item = _public_anchor(hit)
                if item:
                    public_hits.append(item)
        if public_hits:
            public["hits"] = public_hits
            public["how_to_cite"] = "回答时只用 hits[].ref 写成 [1] [2]。"

    favorites = result.get("favorites")
    if isinstance(favorites, list):
        public_favs = []
        for favorite in favorites:
            if isinstance(favorite, dict):
                item = _public_anchor(favorite)
                if item:
                    public_favs.append(item)
        if public_favs:
            public["favorites"] = public_favs

    blocks = result.get("blocks")
    if isinstance(blocks, list):
        public_blocks = []
        for block in blocks:
            if isinstance(block, dict):
                item = _public_anchor(block)
                if item:
                    # blocks 分支带完整正文,`snippet` 只是同一段文字的前 280 字符——
                    # 重发一遍纯属白占上下文（实测 12 块里 snippet 占 2040 字符,而
                    # translated_text 也才 2030）。hits 分支不同:那边 snippet 是唯一正文。
                    item.pop("snippet", None)
                    # image_url 是 asset_image_urls 的第一条,同样重复。
                    if item.get("image_url") and item.get("asset_image_urls"):
                        item.pop("image_url", None)
                    # 只发原文，不发译文。
                    #
                    # 不是为了省上下文——实测只省 18%，三个方案里最少（只发译文省 45%）。
                    # 理由是可靠性:
                    #
                    # 1. 原文是权威文本，译文是派生物。让模型拿译文当依据，等于把我们
                    #    自己的翻译缺陷（丢 LaTeX 命令、截断、术语替换）当成文档的主张。
                    # 2. 公式保真:OCR 的原文 LaTeX 比译文里那份更接近原件。
                    # 3. 覆盖完整:实测 140 个块里只有 78 个有译文（55%）——翻译失败的
                    #    那 45% 恰恰是余额不足/限流/超时的块，不是无关紧要的部分。
                    #    只发译文会让模型对它们完全失明。
                    #
                    # 用户看到的仍是中文:引用卡片的 snippet 由 assign_refs 生成，它在
                    # 这份投影**之前**跑、并且优先取译文，不受这里影响。
                    item["source_text"] = str(block.get("source_text") or "")
                    item["char_start"] = int(block.get("char_start") or 0)
                    # 不发 source_text_length / translated_text_length:
                    # *_has_more 已经说明有没有被截断,而长度本身模型用不上。两个键名
                    # 加值每块约 45 字符,48 块就是 2K 字符。
                    item["source_has_more"] = bool(block.get("source_has_more"))
                    public_blocks.append(item)
        if public_blocks:
            public["blocks"] = public_blocks
            public["how_to_cite"] = "回答时用 blocks[].ref 写成 [n]。"

    images = result.get("image_urls")
    if isinstance(images, list) and images:
        public["image_urls"] = [str(url) for url in images[:8]]

    if isinstance(hits, list):
        image_urls: list[str] = []
        for hit in hits:
            if not isinstance(hit, dict):
                continue
            for url in hit.get("image_urls") or []:
                image_urls.append(str(url))
                if len(image_urls) >= 8:
                    break
            if len(image_urls) >= 8:
                break
        if image_urls:
            public["image_urls"] = image_urls

    if not public:
        public["ok"] = True
    return public


def sanitize_answer_text(answer: str, citations: dict[int, Citation]) -> str:
    """Map internal block identifiers to public citations or remove them."""
    if not answer:
        return answer
    by_block = {
        citation.block_id.lower().replace("_", "-"): citation.ref
        for citation in citations.values()
        if citation.block_id
    }

    def replace_bracketed(match: re.Match[str]) -> str:
        """`[p002-b0004]` 明显是引用标记:映射得到就换成 `[n]`,否则删掉。"""
        key = match.group(1).lower().replace("_", "-")
        ref = by_block.get(key)
        return f"[{ref}]" if ref is not None else ""

    def replace_bare(match: re.Match[str]) -> str:
        """裸标识符只在**映射得到**时才动,映射不到就原样留着。

        以前无条件按形状删除,于是正文被吃掉:`机型 MD-11 与 MD-80 的对比` 变成
        `机型 与 的对比`、`引脚 P1-B2 接地` 变成 `引脚 接地`。这两个正则大小写不敏感
        又没有词表,机型号、引脚、料号、图表编号全都撞得上。

        代价是无法映射的内部 id 会留在正文里——看得见,但比静默删掉用户内容好得多。
        """
        key = match.group(1).lower().replace("_", "-")
        ref = by_block.get(key)
        return f"[{ref}]" if ref is not None else match.group(0)

    # 代码段整段抽出后再清洗。空白压缩会把 Python 缩进和表格对齐压平,而这份文本是
    # 落库的权威版本——前端 sanitize-answer.ts 早就加了同样的保护,后端没跟上,前端
    # 再补也晚了。
    code_slots: list[str] = []

    def _stash_code(match: re.Match[str]) -> str:
        code_slots.append(match.group(0))
        return f"\x00CODE{len(code_slots) - 1}\x00"

    cleaned = CODE_SEGMENT_RE.sub(_stash_code, answer)
    cleaned = BLOCK_ID_BRACKET_RE.sub(replace_bracketed, cleaned)
    cleaned = BLOCK_ID_BARE_RE.sub(replace_bare, cleaned)
    cleaned = MARKDOWN_ID_BRACKET_RE.sub(replace_bracketed, cleaned)
    cleaned = MARKDOWN_ID_BARE_RE.sub(replace_bare, cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r" *\n", "\n", cleaned)
    cleaned = cleaned.strip()
    for index, segment in enumerate(code_slots):
        cleaned = cleaned.replace(f"\x00CODE{index}\x00", segment)
    return cleaned


class StreamingAnswerSanitizer:
    """把 sanitize_answer_text 的结果一边流一边推出去。

    要解决的问题:流式路径上已经推给浏览器的文本改不掉（AI SDK 6 没有 reset-step），
    而最终答案是清洗过的——清洗会**重写**文本（`[p002-b0004]` → `[1]`、空白压缩），
    重写之后它不再是已流文本的前缀,前端的 `startsWith` 判据不成立,于是整份清洗结果
    被丢弃,用户看到的是未清洗原文:内部 block id 裸露、行内引用按钮一个都生成不出来。

    做法是让流出去的文本**就是**最终文本。这里不重写一套增量清洗规则——两份实现
    早晚漂移,而漂移的表现正是本类要消灭的那个 bug。取而代之:每收到一段就对**累积
    的原文**跑一次批量清洗,只推送「不会再被后续输入改动」的那一段前缀。

    `_GUARD_CHARS` 就是「不会再被改动」的安全边界:结尾可能是半个标记
    （`...[p002-` 还差 `b0004]`），也可能是等着被压缩的空白。留足尾巴，等下一段到了
    再决定。批量清洗是 O(n)，每段跑一次是 O(n²)，答案只有几 KB、分段上百，可以忽略。
    """

    # 最长的标记形如 `[p0001-b00001]`，再留一倍余量。
    _GUARD_CHARS = 48

    def __init__(self, citations: dict[int, Citation]) -> None:
        self._citations = citations
        self._raw: list[str] = []
        self._emitted = ""
        self._pending = 0
        self.diverged = False

    def _flush_threshold(self) -> int:
        """攒多少新增才值得跑一次清洗。短回答不必攒,长回答攒得多一些。"""
        return max(32, sum(len(part) for part in self._raw) // 64)

    def feed(self, piece: str) -> str:
        """吃进一段原文，返回这次可以安全推送的增量（可能为空）。"""
        if not piece:
            return ""
        self._raw.append(piece)
        self._pending += len(piece)
        # 每段都跑一次批量清洗的话总开销是 O(n²):实测 12000 字的回答按 8 字一段推,
        # 光清洗就要 474ms 的纯 CPU,而且是挡在推流路径上的。
        #
        # 不改算法——「只有一份清洗实现」是这套机制成立的前提。改的是触发频率:攒够
        # 一定新增才跑一次,阈值随总长增长,于是总开销回到线性量级。等价性不受影响,
        # flush 里仍然做一次完整清洗,推送的最终文本逐字不变。
        #
        # 代价是增量粒度变粗:长回答里每次推送几十个字而不是几个字,肉眼仍是流式。
        if self._pending < self._flush_threshold():
            return ""
        self._pending = 0
        cleaned = self._clean()
        safe = cleaned[: max(0, len(cleaned) - self._GUARD_CHARS)]
        return self._advance(safe)

    def flush(self) -> str:
        """流结束:把剩下的推完。返回值加上历次 feed 的结果 == 最终答案。"""
        self._pending = 0
        return self._advance(self._clean())

    def _clean(self) -> str:
        return sanitize_answer_text("".join(self._raw), self._citations)

    def _advance(self, target: str) -> str:
        if self._emitted.startswith(target):
            # 安全窗口回缩了（新输入让 guard 多吃掉几个字符），内容本身一致,
            # 这次没有可推送的增量。不是背离。
            return ""
        if not target.startswith(self._emitted):
            # 清洗结果不再以已推送内容开头。理论上不该发生（留了 guard），真发生了
            # 也不能反悔——已经在用户屏幕上了。停止推送,让前端退回它原有的
            # `startsWith` 分支,表现不比修复前更差,并把这次背离记下来。
            self.diverged = True
            return ""
        delta = target[len(self._emitted) :]
        self._emitted = target
        return delta


def referenced_citations(
    answer: str,
    citations: dict[int, Citation],
) -> list[Citation]:
    """Return referenced citations in reading order, with a page fallback."""
    ordered_refs: list[int] = []
    seen: set[int] = set()
    for match in CITATION_RE.findall(answer):
        ref = int(match)
        if ref in seen or ref not in citations:
            continue
        seen.add(ref)
        ordered_refs.append(ref)
    selected = [citations[ref] for ref in ordered_refs]
    # 「一个标记都没写」和「写了但全是编造的」是两回事,此前混在一起。
    #
    # fallback 是为前者准备的:模型给了回答却忘了标注,按页去重取前几条聊胜于无。
    # 而模型写了 `[42]`、citations 里只有 1–4 时,同一个条件也会命中,于是正文写着
    # `[42]`、脚注却列着三条它根本没引用的块——凭空造出来的依据比没有依据更糟。
    #
    # 正文里那个 `[42]` 不动:学术文档里方括号数字很可能是原文自己的参考文献编号,
    # 按形状删除会破坏内容。
    fabricated_only = bool(CITATION_RE.search(answer)) and not ordered_refs
    if not selected and citations and not fabricated_only:
        picked: list[Citation] = []
        anchors: set[tuple[str, int | str]] = set()
        for ref in sorted(citations):
            item = citations[ref]
            anchor: tuple[str, int | str]
            if item.page_idx is None:
                anchor = ("block", item.block_id)
            else:
                anchor = ("page", item.page_idx)
            if anchor in anchors:
                continue
            anchors.add(anchor)
            picked.append(item)
            if len(picked) >= 3:
                break
        return picked
    return selected


# Compatibility aliases for code that used the former private names.
_assign_refs = assign_refs
_public_tool_payload = public_tool_payload
_referenced_citations = referenced_citations
_sanitize_answer_text = sanitize_answer_text
