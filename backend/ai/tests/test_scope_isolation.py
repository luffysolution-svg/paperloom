"""模型给的标识符不许越过文档/会话边界。

两条独立的口子，都通过「模型在 tool_call 里自带一个 id」触发——而提示注入面恰恰就是
文档正文本身。

一、`read_blocks` 从不校验 job 归属。它只做 `_safe_job_root` 的路径白名单，于是
document scope 下带一个别的 job_id 就能读出那个文档的正文;更糟的是 `assign_refs`
会把 result 的 document_id 贴到 block 上，生成「本文档 id + 外部 job id」的引用，
而前端点引用是用 `citation.job_id` 拼 reader URL——点一下跳到另一个文档。
同一个仓库里 `document_artifact_scope` 早就做对了（用 get_document_by_job 反查归属、
拒绝不匹配、同时允许同一文档的历史 run），只有这条读取路径没用它。

二、`rust_client` 用 f-string 拼路径，而 `document_id` 在全库会话里是模型可控的
（`scope_tool_arguments` 在没有 document scope 时原样透传）。httpx 会规范化 `..`，
于是可以把本服务的全权 key 打到 `/api/v1/internal/...` 或别人的会话上。只能读不能写，
但会话与文档的隔离边界就此失效。`job_id` 早有格式白名单，`document_id` 漏了。
修的是「没编码」这件事本身，所以用百分号编码而不是加白名单——编码不会拒绝任何合法 id。
"""

from __future__ import annotations

import inspect
import sys
from pathlib import Path

import httpx

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from retainpdf_ai import rust_client as rust_client_module  # noqa: E402
from retainpdf_ai.config import Settings  # noqa: E402


def _client_with_transport(recorder: list[str]):
    def handler(request: httpx.Request) -> httpx.Response:
        recorder.append(request.url.raw_path.decode())
        return httpx.Response(200, json={"documents": []})

    cls = next(
        value
        for name, value in vars(rust_client_module).items()
        if inspect.isclass(value) and "Rust" in name
    )
    settings = Settings()
    client = cls(settings)
    for attribute in ("_client", "_http", "client", "http"):
        if hasattr(client, attribute):
            setattr(
                client,
                attribute,
                httpx.Client(
                    transport=httpx.MockTransport(handler),
                    base_url=settings.rust_api_base,
                ),
            )
            break
    return client


def test_a_document_id_cannot_reach_another_endpoint() -> None:
    """路径段编码之后，值再怎么写也跳不出自己那一段。"""
    recorder: list[str] = []
    client = _client_with_transport(recorder)

    for document_id in (
        "../ai/conversations/OTHER",
        "../internal/agent/runtime-sessions/X",
        "x?limit=1",
        "..%2F..%2Fadmin",
    ):
        try:
            client.get_document(document_id)
        except Exception:  # noqa: BLE001 - 这里只关心发出去的路径
            pass

    assert recorder, "一个请求都没发出去"
    for path in recorder:
        assert path.startswith("/api/v1/documents/"), f"越过了 documents 前缀：{path}"
        segment = path[len("/api/v1/documents/") :]
        assert "/" not in segment, f"值跳出了自己那一段：{path}"
        assert "?" not in segment, f"值注入了查询串：{path}"


def test_a_normal_document_id_is_untouched() -> None:
    """编码不能把合法 id 改坏。"""
    recorder: list[str] = []
    client = _client_with_transport(recorder)
    try:
        client.get_document("20260918064608-f1bb05")
    except Exception:  # noqa: BLE001
        pass

    assert recorder == ["/api/v1/documents/20260918064608-f1bb05"]


def test_read_blocks_rejects_a_job_from_another_document() -> None:
    """模型自带的 job_id 必须属于它声称的 document_id。"""
    from retainpdf_ai.tools import build_default_registry

    class _Rust:
        def get_document(self, document_id: str) -> dict:
            return {"document_id": document_id, "active_job_id": "job-mine"}

        def get_document_by_job(self, job_id: str) -> dict | None:
            # job-secret 属于另一个文档。
            owner = "doc-other" if job_id == "job-secret" else "doc-mine"
            return {"document_id": owner, "active_job_id": job_id}

    registry = build_default_registry(Settings(), _Rust())
    result = registry.invoke(
        "read_blocks",
        {"document_id": "doc-mine", "job_id": "job-secret", "page_idx": 0},
    )

    assert result.get("error"), f"跨文档读取没有被拒绝：{result}"
    assert "same document" in str(result["error"]) or "belong" in str(result["error"])
