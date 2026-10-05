"""keep-alive 配置的守卫。"""
from __future__ import annotations

import pytest

from retainpdf_ai.config import Settings, load_settings
from retainpdf_ai import __main__ as ai_main


def test_keep_alive_default_is_well_clear_of_the_probe_interval() -> None:
    # rust_api 的 RUST_API_AI_HEALTH_INTERVAL_SECS 默认 5 秒。uvicorn 自己的
    # timeout_keep_alive 默认也是 5 秒——两个默认值撞在一起,服务端到点关连接、
    # 客户端正好复用那一条,就是 health probe failed/recovered 反复横跳的成因。
    # 探测侧已经改成不留空闲连接,但 AiGateway(用户请求)仍然用连接池,所以
    # 服务端这个阈值必须离 5 秒足够远。
    assert Settings().keep_alive_timeout_s >= 60


def test_keep_alive_is_configurable_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RETAIN_AI_KEEP_ALIVE_TIMEOUT_S", "123")
    monkeypatch.setenv("RETAIN_API_KEYS", "test-key")
    assert load_settings().keep_alive_timeout_s == 123


def test_entrypoint_actually_passes_keep_alive_to_uvicorn(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # 光有配置字段不算数:必须真的传给 uvicorn.run。这条守的就是"配置存在
    # 但没接上"——那种情况下上面两条断言照样绿,而线上行为一点没变。
    captured: dict[str, object] = {}

    def fake_run(app: object, **kwargs: object) -> None:
        captured.update(kwargs)

    monkeypatch.setattr(ai_main, "uvicorn", type("U", (), {"run": staticmethod(fake_run)}))
    monkeypatch.setattr(ai_main, "build_app", lambda settings: object())
    monkeypatch.setattr(
        ai_main, "load_settings", lambda: Settings(keep_alive_timeout_s=99)
    )

    ai_main.main()
    assert captured["timeout_keep_alive"] == 99
