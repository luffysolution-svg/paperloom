"""启动入口:python -m retainpdf_ai"""

from __future__ import annotations

import uvicorn

from .app import build_app
from .config import load_settings


def main() -> None:
    settings = load_settings()
    uvicorn.run(
        build_app(settings),
        host=settings.host,
        port=settings.port,
        log_level="info",
        # 见 Settings.keep_alive_timeout_s:uvicorn 默认的 5 秒与 rust_api 的
        # 默认探测间隔一模一样,是那条 health probe failed/recovered 反复横跳
        # 日志的成因。
        timeout_keep_alive=settings.keep_alive_timeout_s,
    )


if __name__ == "__main__":
    main()
