"""LaTeX 命令登记表：关于「某个命令该怎么办」的唯一真值源。

为什么要有这个文件：这些规则原本散在八个地方——渲染期改写（inline_math）、
它在 markdown 层的第二份拷贝（block_renderer）、display 路径的归一化器
（latex_normalizer）、注入提示词的替换表（direct_typst_math）、什么算丢失
（math_safety）、真编译验证过的清单（覆盖测试）、两份提示词里的白名单、以及
前端完全独立的 MathJax 支持集。

三个真实 bug 都不是某张表写错，而是表**之间**矛盾：

- `\\pmb` 在计数时被折叠成 `\\mathbf`，而提示词明令禁止这个替换。两者对「什么算
  损坏」的定义相反。
- `\\textsuperscript` 提示词要求模型产出，mitex 却不支持，覆盖清单里也没有。
- 渲染期把 `\\\\` 合并的规则会让 `\\begin{cases} a \\\\b \\end{cases}` 崩掉，而覆盖
  清单的矩阵用例恰好带空格，测不到。

所以规则集中到 latex_commands.json，下面只做派生和查询，三道闸门
（tests/rendering/test_latex_command_registry.py + 前端同名测试）盯着它不跑偏。

三列状态都是**实测**出来的，不是断言：

- mitex_native —— 裸 `$...$` 交给 cmarker+mitex 能不能编译
- pipeline —— 走完整生产链路（含我们的清洗器）能不能编译
- mathjax —— node 里跑同款配置的 MathJax 能不能渲染

两列分开是有原因的：`\\circled` 原生不支持、但清洗器把它剥成圈内字符，所以页面不
崩。只看一列就会得出「这条清洗规则是死代码」的错误结论——当年正是把「mitex 吐旧
版符号名」误读成「mitex 不支持」，才长出一批降级规则。
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import json
from pathlib import Path


REGISTRY_PATH = Path(__file__).with_name("latex_commands.json")


@dataclass(frozen=True)
class LatexCommand:
    name: str
    sample: str
    mitex_native: str
    pipeline: str
    mathjax: str
    handled_by: str | None
    equivalent_to: str | None
    never_degrade: bool
    drift_expected: bool
    rewrite_hint: str | None
    note: str
    fold_probe: list[str] | None = None

    @property
    def renders(self) -> bool:
        """走完整链路能渲染出来——决定页面崩不崩的就是这一列。"""
        return self.pipeline == "supported"


@lru_cache(maxsize=1)
def latex_commands() -> tuple[LatexCommand, ...]:
    data = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    return tuple(LatexCommand(**entry) for entry in data["commands"])


@lru_cache(maxsize=1)
def command_by_name() -> dict[str, LatexCommand]:
    return {command.name: command for command in latex_commands()}


@lru_cache(maxsize=1)
def expected_to_drift() -> frozenset[str]:
    """这些命令消失是预期的，计入丢失只会淹没真正的信号。"""
    return frozenset(c.name for c in latex_commands() if c.drift_expected)


@lru_cache(maxsize=1)
def command_aliases() -> dict[str, str]:
    """老拼法 → 现代拼法。只收逐像素相同的，由闸门实测把关。"""
    return {c.name: c.equivalent_to for c in latex_commands() if c.equivalent_to}


@lru_cache(maxsize=1)
def mitex_rewrite_database() -> tuple[tuple[str, str], ...]:
    """渲染不了的写法 → 提示给模型，由它在语义层替换。

    正则改写复杂公式必然出错，但「检测某命令出现过」是可靠的，所以这里只做检测。

    被清洗器兜住的（handled_by 非空）**也要**提示。兜底规则是窄正则:`\\circled{R}`
    能救，`\\circled{\\mathbf{R}}` 嵌套一层花括号就救不了，实测仍然整页编译失败。
    让模型在语义层换掉才是可靠的那条路，清洗器只是它没照做时的第二道网。
    """
    return tuple(
        (f"\\{c.name}", c.rewrite_hint)
        for c in latex_commands()
        if c.rewrite_hint and (not c.renders or c.handled_by)
    )


def unsupported_commands() -> tuple[LatexCommand, ...]:
    return tuple(c for c in latex_commands() if not c.renders)


def supported_commands() -> tuple[LatexCommand, ...]:
    return tuple(c for c in latex_commands() if c.renders)


def engine_disagreements() -> tuple[LatexCommand, ...]:
    """后端渲染得出、前端渲染不出（或反过来）的命令。

    这是两套引擎差异的**清单**，而不是踩到才知道的事。
    """
    return tuple(
        c for c in latex_commands()
        if (c.pipeline == "supported") != (c.mathjax == "supported")
    )


__all__ = [
    "LatexCommand",
    "REGISTRY_PATH",
    "command_aliases",
    "command_by_name",
    "engine_disagreements",
    "expected_to_drift",
    "latex_commands",
    "mitex_rewrite_database",
    "supported_commands",
    "unsupported_commands",
]
