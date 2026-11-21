"""清洗器有没有在悄悄降级还能渲染的 LaTeX。

编译覆盖已经搬进 test_latex_command_registry.py——那边从登记表
（backend/math/retainpdf_math/latex_commands.json）派生用例，正反两向都钉：说能渲染的必须
真能编译，说渲染不了的必须真的失败。手写一份清单会和登记表漂移，正是规则散在八处
时的老毛病。

这里只留一条断言，管的是另一件事：**送进 mitex 之前，我们自己有没有把命令改掉。**

背景：mitex 0.2.6 吐旧版 Typst 的符号名（`\\hbar` → `planck.reduce`），报的是
`unknown symbol modifier` / `unknown variable`，看上去像「mitex 不认识这个命令」，
实际是「它认识，但翻出来的名字不存在了」。当时按前者理解，长出一批把 LaTeX 降级成
Unicode 的重写规则——`\\mathscr` → `\\mathcal` 更是直接把手写体换成花体（登记表的
像素闸实测两者不同）。

「渲染失败就加一条重写」是最顺手的修法，而每加一条都是一次静默的保真度损失。
"""

from __future__ import annotations

from retainpdf_pipeline.render.layout.inline_content import (
    build_direct_typst_passthrough_markdown,
)


# 这条只检查清洗器的字符串产出，从不调用 typst；以前挂着的
# skipif(not TYPST_BIN) 只会让它在「装 typst 之前」那一步 CI 里白白跳过。
def test_sanitizer_no_longer_degrades_supported_commands() -> None:
    """降级规则删干净了没有——这些命令应当原样送进 mitex。

    钉住它是因为「渲染失败就加一条重写」是最顺手的修法，而每加一条都是一次静默的
    保真度损失。真要加，先确认不是版本脱节。
    """
    markdown = build_direct_typst_passthrough_markdown(
        r"$\hbar$ $\partial$ $\otimes$ $\mathscr{F}$ $\langle x \rangle$ $\varPhi$"
    )
    for command in (r"\hbar", r"\partial", r"\otimes", r"\mathscr", r"\langle", r"\rangle", r"\varPhi"):
        assert command in markdown, f"{command} 被重写掉了"
    for degraded in ("ℏ", "∂", "⊗", "⟨", "⟩"):
        assert degraded not in markdown, f"仍在把 LaTeX 降级成 {degraded}"
