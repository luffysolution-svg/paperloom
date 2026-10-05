"""OCR 产物里对 LaTeX 源文的定点修补。

和降级重写的区别：这里修的是**原文本来就坏了**（OCR 扫错、把一个命令拆开或粘连），
不是「渲染器不支持、所以换个写法」。后者属于登记表（latex_commands.json）。

这个区分不是洁癖。降级重写每加一条都是一次静默的保真度损失，而且多半是版本脱节
的误诊；OCR 修补则是在恢复原意。两者混在一起，清理时就会连对的一起删掉，或者把
错的一起留下。
"""

from __future__ import annotations

import re


# `\\` 在这些环境里是**换行符**，不是被 OCR 写重了的反斜杠。
_ROW_SEPARATOR_CONTEXT_RE = re.compile(r"\\(?:begin|substack|atop|matrix|cases|array)\b")

# 至少两个字母才算命令名。单个字母（`\\b`、`\\c`）在数学里基本不是命令，
# 而 `\begin{cases} a \\b & ...` 里的 `b` 恰恰是个变量。
_DOUBLED_COMMAND_RE = re.compile(r"\\{2,}(?=[A-Za-z]{2,})")


def collapse_doubled_command_backslashes(expr: str) -> str:
    """把 OCR 写重的 `\\\\mu` 还原成 `\\mu`——但别碰当换行符用的 `\\\\`。

    这条规则原本是无条件的 `\\\\{2,}(?=[A-Za-z]) → \\\\`,于是自己制造了崩溃:

        \\begin{cases} a & x>0 \\\\b & x<0 \\end{cases}
                              ^^^ 换行符 + 变量 b
        → \\begin{cases} a & x>0 \\b & x<0 \\end{cases}
        → error: plugin errored with: error: unknown command: \\b

    实测 pmatrix / bmatrix / cases / aligned / substack 全中,整块因此降级。矩阵
    行分隔后面**不带空格**就会触发,而覆盖测试里的矩阵用例恰好带空格,测不到。

    这和上游把 `\\` 和 `E` 拆开造成 `unknown command: \\E` 是同一种故障,只是方向
    相反——那次是别人拆开,这次是我们自己合并。

    所以加两道约束:表达式里出现换行符环境时整体不碰,以及只认两个字母以上的命令名。
    """
    text = str(expr or "")
    if _ROW_SEPARATOR_CONTEXT_RE.search(text):
        return text
    return _DOUBLED_COMMAND_RE.sub(r"\\", text)


__all__ = ["collapse_doubled_command_backslashes"]
