from unittest import mock

import pytest

from retainpdf_translation.llm.providers.deepseek import client


@pytest.mark.parametrize("model,base,expected", [
    ("qwen3.8-flash", "https://dashscope.aliyuncs.com/compatible-mode/v1", {"enable_thinking": False}),
    ("qwen3.8-flash", "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {"enable_thinking": False}),
    ("qwen3.8-flash", "http://127.0.0.1:8000/v1", {}),
    ("qwen3.8-flash", "https://dashscope.aliyuncs.com.example.org/v1", {}),
    ("qwen3.8-max", "https://dashscope.aliyuncs.com/compatible-mode/v1", {}),
    ("deepseek-chat", "https://api.deepseek.com/v1", {}),
    # 智谱 glm-5.3-flash 不能关思考，只能把强度降到 low。
    ("glm-5.3-flash", "https://open.bigmodel.cn/api/paas/v4", {"reasoning_effort": "low"}),
    ("GLM-5.3-Flash", "https://open.bigmodel.cn/api/paas/v4/chat/completions", {"reasoning_effort": "low"}),
    ("glm-5.3-flash", "https://open.bigmodel.cn.example.org/api/paas/v4", {}),
    ("glm-5.3-flash", "http://127.0.0.1:8000/v1", {}),
    ("glm-4.5-air", "https://open.bigmodel.cn/api/paas/v4", {}),
])
def test_request_thinking_fields_are_scoped_to_verified_model_and_provider(model, base, expected):
    session = mock.Mock()
    response = session.post.return_value
    response.status_code = 200
    response.json.return_value = {"choices": [{"message": {"content": "译文"}}]}
    with mock.patch.object(client, "get_session", return_value=session), \
         mock.patch.object(client, "get_active_translation_run_diagnostics", return_value=None), \
         mock.patch.object(client, "_prewarm_dns"), \
         mock.patch.object(client, "should_use_stream_responses", return_value=False):
        assert client.request_chat_content([{"role": "user", "content": "Translate"}], model=model, base_url=base) == "译文"
    body = session.post.call_args.kwargs["json"]
    for field in ("enable_thinking", "reasoning_effort", "thinking"):
        if field in expected:
            assert body[field] == expected[field], field
        else:
            assert field not in body, f"{field} 不该出现在 {model} @ {base} 的请求里"
    assert session.post.call_count == 1

