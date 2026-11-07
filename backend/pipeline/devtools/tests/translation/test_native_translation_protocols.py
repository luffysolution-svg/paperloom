"""Offline completion validation for native translation provider protocols."""
import json

import pytest

from retainpdf_pipeline.translate.llm.shared import model_wire as wire


@pytest.mark.parametrize("protocol", ["openai_responses", "anthropic"])
def test_native_translation_stream_cannot_return_a_partial_document(protocol):
    line = {"type": "response.output_text.delta", "delta": "partial"} if protocol == "openai_responses" else {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "partial"}}
    with pytest.raises(ValueError):
        wire.read_text_stream(["data: " + json.dumps(line)], protocol)
