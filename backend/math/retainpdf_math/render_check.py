"""公式能不能排进 PDF：交给排版引擎同一套 MathJax（rpr 引擎的 bin/rpr-math-check.js）试渲染。

为什么要问引擎而不是自己判断：「看起来是合法 LaTeX」和「渲染器排得出来」是两回事。真实例子（一本量子化学
教材）：`\\rho_{s}(\\mathbf{r}})` 多了一个 `}`；`\\mathrm{H_aC_aH_b}` 是合法 TeX，但 MathJax 曾经读成双重下标。
只有问同一个渲染器、经过同一套改写，「ok」才等于「PDF 里能显示」。

引擎是 Node 程序：这里起一个常驻子进程（一行一个 JSON），加锁收发、结果缓存。找不到 node、引擎没装依赖、
子进程崩了或超时，都只记一次警告并关掉这项检查——它是锦上添花，绝不能让翻译因此失败。
RETAIN_MATH_RENDER_CHECK=0 关闭。
"""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
import atexit
import json
import logging
import os
from pathlib import Path
import queue
import shutil
import subprocess
import threading

from retainpdf_math.render_prep import prepare_formula_for_render
from retainpdf_math.spans import compact_tex
from retainpdf_math.spans import formula_spans

LOGGER = logging.getLogger(__name__)

ENABLE_ENV_VAR = "RETAIN_MATH_RENDER_CHECK"
ENGINE_DIR_ENV_VAR = "RETAIN_RPR_ENGINE_DIR"  # 和流水线的 rpr 引擎用同一个变量
NODE_ENV_VAR = "RETAINPDF_NODE_BIN"  # 桌面端指向 Electron 本体（配 ELECTRON_RUN_AS_NODE=1）
CHECK_SCRIPT = Path("engine") / "bin" / "rpr-math-check.js"
RUNTIME_PACKAGES = ("mathjax-full",)
_REPO_ENGINE_DIR = Path(__file__).resolve().parents[2] / "rendering-engine"
READY_TIMEOUT_S = 30.0
REPLY_TIMEOUT_S = 20.0
CACHE_LIMIT = 20000


@dataclass(frozen=True)
class RenderResult:
    tex: str
    ok: bool
    error: str = ""


class RenderCheckUnavailable(RuntimeError):
    pass


def resolve_engine_dir() -> Path:
    configured = os.environ.get(ENGINE_DIR_ENV_VAR, "").strip()
    return Path(configured).expanduser() if configured else _REPO_ENGINE_DIR


def default_command() -> tuple[list[str], dict[str, str]]:
    """启动检查服务的命令和环境；缺东西时抛 RenderCheckUnavailable（说明缺什么）。"""
    engine_dir = resolve_engine_dir()
    script = engine_dir / CHECK_SCRIPT
    if not script.is_file():
        raise RenderCheckUnavailable(f"找不到公式检查服务 {script}")
    missing = [name for name in RUNTIME_PACKAGES if not (engine_dir / "node_modules" / name / "package.json").is_file()]
    if missing:
        raise RenderCheckUnavailable(f"引擎缺运行时依赖 {', '.join(missing)}：在 {engine_dir} 下运行 npm ci --omit=dev")
    env = dict(os.environ)
    configured = os.environ.get(NODE_ENV_VAR, "").strip()
    if configured:
        if not Path(configured).is_file():
            raise RenderCheckUnavailable(f"{NODE_ENV_VAR} 指向的文件不存在：{configured}")
        env.setdefault("ELECTRON_RUN_AS_NODE", "1")
        node = configured
    else:
        node = shutil.which("node") or ""
        if not node:
            raise RenderCheckUnavailable("找不到 node")
    return [node, str(script)], env


class FormulaRenderChecker:
    """一个常驻的检查服务子进程。线程安全；不可用时 check() 返回 None。"""

    def __init__(self, command: list[str] | None = None, env: dict[str, str] | None = None) -> None:
        self._command = command
        self._env = env
        self._lock = threading.Lock()
        self._process: subprocess.Popen | None = None
        self._lines: queue.Queue = queue.Queue()
        self._next_id = 0
        self._cache: OrderedDict[tuple[str, bool], RenderResult] = OrderedDict()
        self._disabled_reason = ""

    @property
    def disabled_reason(self) -> str:
        return self._disabled_reason

    def check(self, formulas: list[tuple[str, bool]]) -> list[RenderResult] | None:
        """[(tex, display)] → 每个公式的结果（顺序对应）；检查服务不可用时 None。"""
        if os.environ.get(ENABLE_ENV_VAR, "").strip() == "0":
            return None
        with self._lock:
            if self._disabled_reason:
                return None
            pending = [key for key in dict.fromkeys(formulas) if key not in self._cache]
            if pending:
                try:
                    self._ensure_started()
                    self._ask(pending)
                except Exception as exc:  # noqa: BLE001 - 检查不可用不能影响翻译
                    self._disable(str(exc) or exc.__class__.__name__)
                    return None
            results = []
            for key in formulas:
                result = self._cache[key]
                self._cache.move_to_end(key)
                results.append(result)
            while len(self._cache) > CACHE_LIMIT:
                self._cache.popitem(last=False)
            return results

    def close(self) -> None:
        with self._lock:
            self._stop()

    # ---------------------------------------------------------------- 内部

    def _ensure_started(self) -> None:
        if self._process is not None and self._process.poll() is None:
            return
        command, env = (self._command, self._env) if self._command else default_command()
        self._process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            bufsize=1,
            env=env,
        )
        self._lines = queue.Queue()
        threading.Thread(target=self._pump, args=(self._process, self._lines), daemon=True).start()
        ready = self._next_line(READY_TIMEOUT_S)
        if not ready.get("ready"):
            raise RenderCheckUnavailable(f"检查服务没有就绪：{ready}")

    @staticmethod
    def _pump(process: subprocess.Popen, lines: queue.Queue) -> None:
        assert process.stdout is not None
        for line in process.stdout:
            lines.put(line)
        lines.put(None)  # 子进程退出

    def _next_line(self, timeout: float) -> dict:
        try:
            line = self._lines.get(timeout=timeout)
        except queue.Empty as exc:
            raise RenderCheckUnavailable(f"检查服务 {timeout:.0f}s 没有回应") from exc
        if line is None:
            raise RenderCheckUnavailable("检查服务意外退出")
        return json.loads(line)

    def _ask(self, pending: list[tuple[str, bool]]) -> None:
        assert self._process is not None and self._process.stdin is not None
        ids = []
        for tex, display in pending:
            self._next_id += 1
            ids.append(self._next_id)
            self._process.stdin.write(json.dumps({"id": self._next_id, "tex": tex, "display": display}) + "\n")
        self._process.stdin.flush()
        for request_id, (tex, display) in zip(ids, pending):
            reply = self._next_line(REPLY_TIMEOUT_S)
            if reply.get("id") != request_id:
                raise RenderCheckUnavailable(f"检查服务回复错位：期待 {request_id}，收到 {reply.get('id')}")
            self._cache[(tex, display)] = RenderResult(tex=tex, ok=bool(reply.get("ok")), error=str(reply.get("error") or ""))

    def _disable(self, reason: str) -> None:
        self._disabled_reason = reason
        LOGGER.warning("公式渲染检查已关闭：%s", reason)
        self._stop()

    def _stop(self) -> None:
        process, self._process = self._process, None
        if process is None:
            return
        try:
            if process.stdin:
                process.stdin.close()
            process.wait(timeout=2)
        except Exception:  # noqa: BLE001
            process.kill()


_SHARED: FormulaRenderChecker | None = None
_SHARED_LOCK = threading.Lock()


def shared_checker() -> FormulaRenderChecker:
    """进程里共用一个检查服务（翻译是多线程的，起一个子进程就够）。"""
    global _SHARED
    with _SHARED_LOCK:
        if _SHARED is None:
            _SHARED = FormulaRenderChecker()
            atexit.register(_SHARED.close)
        return _SHARED


def unrenderable_formulas(
    source_text: str,
    translated_text: str,
    *,
    checker: FormulaRenderChecker | None = None,
) -> list[RenderResult] | None:
    """译文里排不出来、而且不是原文带来的公式；检查服务不可用时 None（调用方当作「没查」）。

    先照渲染时的样子改写（render_prep：OCR 修补、`\\AA` → `Å`……），检查的是真正交给渲染器的公式。
    原文里有一模一样的写法、原文那个也排不出来的，算 OCR 或渲染器的问题，不怪模型——不然重试也修不好。
    返回的 tex 是模型写的原样，error 是渲染器的报错。
    """

    def prepared(text: str) -> dict[tuple[str, bool], tuple[str, bool]]:
        out = {}
        for tex, display in dict.fromkeys(formula_spans(text)):
            rendered, still_math = prepare_formula_for_render(tex, display=display)
            if still_math:  # 改写成普通文字的（® 之类）不用问渲染器
                out[(tex, display)] = (rendered, display)
        return out

    translated = prepared(translated_text)
    if not translated:
        return []
    source = prepared(source_text)
    keys = list(dict.fromkeys([*translated.values(), *source.values()]))
    results = (checker or shared_checker()).check(keys)
    if results is None:
        return None
    by_key = dict(zip(keys, results))
    source_broken = {compact_tex(key[0]) for key in source.values() if not by_key[key].ok}
    return [
        RenderResult(tex=original, ok=False, error=by_key[key].error)
        for (original, _display), key in translated.items()
        if not by_key[key].ok and compact_tex(key[0]) not in source_broken
    ]


__all__ = [
    "ENABLE_ENV_VAR",
    "FormulaRenderChecker",
    "RenderCheckUnavailable",
    "RenderResult",
    "default_command",
    "resolve_engine_dir",
    "shared_checker",
    "unrenderable_formulas",
]
