"""stage spec 里的 ``credential_ref``：spec 不存真实 key，只写引用，运行时由环境注入。

翻译、OCR、渲染前精修都按这一种写法解析，所以放在底座包里。
"""

from __future__ import annotations

import os


def resolve_credential_ref(credential_ref: str) -> str:
    ref = (credential_ref or "").strip()
    if not ref:
        return ""
    if ref.startswith("env:"):
        env_name = ref[4:].strip()
        if not env_name:
            raise RuntimeError("invalid credential_ref: missing env var name")
        return os.environ.get(env_name, "").strip()
    raise RuntimeError(f"unsupported credential_ref: {credential_ref}")
