"""测试里现造 PDF 的共享 helper。

「开一个空文档 → 加一页 → 可选写一行字 → 存盘」这四五行，以前在十几个测试文件里
各抄了三十多遍，只是页面尺寸和那行字不同。收拢到这里之后，测试正文只需写清楚
「这一页多大、上面写了什么」，读的人不必再逐行确认每一份拷贝有没有悄悄多做点事。

需要图片、矢量路径、多页不同内容之类特殊结构的，仍旧在测试里自己用 fitz 画——
那部分本身就是测试意图，不该藏进 helper。
"""

from __future__ import annotations

from pathlib import Path

import fitz


def write_pdf(
    path: Path,
    *,
    width: float,
    height: float,
    text: str | None = None,
    at: tuple[float, float] = (72, 72),
    fontsize: float | None = None,
) -> Path:
    """写一个单页 PDF；给了 `text` 就在 `at` 处用 insert_text 写一行。

    `fontsize` 不传就沿用 fitz 的默认字号（11），与原先各处直接调用
    `page.insert_text(...)` 不带字号时的产物一致。
    """
    doc = fitz.open()
    page = doc.new_page(width=width, height=height)
    if text is not None:
        if fontsize is None:
            page.insert_text(at, text)
        else:
            page.insert_text(at, text, fontsize=fontsize)
    doc.save(path)
    doc.close()
    return Path(path)
