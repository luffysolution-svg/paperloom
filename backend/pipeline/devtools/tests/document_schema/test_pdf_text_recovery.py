import fitz

from retainpdf_pipeline.ocr.document_schema.pdf_text_recovery import recover_corrupted_pdf_text, _line_text, recover_dropped_pdf_digits


def test_recovers_only_matching_corrupted_ocr_text():
    with fitz.open() as pdf:
        page=pdf.new_page(width=500,height=200)
        page.insert_text((20,60),'The parameter beta determines the loss.',fontsize=12)
        damaged=dict(text='The parameter \ufffd determines the loss.',bbox=[15,40,400,70])
        unrelated=dict(text='Unrelated \ufffd text from a different region.',bbox=[15,40,400,70])
        doc={'pages':[{'blocks':[damaged,unrelated]}]}
        assert recover_corrupted_pdf_text(doc,pdf)==1
        assert 'beta' in damaged['text']
        assert '\ufffd' in unrelated['text']


def test_embedded_math_preserves_greek_letters_and_subscript_baseline():
    line={'spans':[dict(text='𝜉',size=10,origin=(0,20)),
                   dict(text='(',size=10,origin=(5,20)),
                   dict(text='𝑙',size=10,origin=(8,20)),
                   dict(text='𝑥',size=7,origin=(12,23)),
                   dict(text=')',size=10,origin=(15,20))]}
    text=_line_text(line)
    assert r'\xi' in text and 'l_{x}' in text


def test_recovers_a_dropped_digit_from_the_embedded_pdf_text_layer():
    with fitz.open() as pdf:
        page = pdf.new_page(width=500, height=200)
        page.insert_text((20, 60), "ChatGPT and Claude users had 164 and 166 responses being collected.", fontsize=12)
        recognized = "ChatGPT and Claude users had 164 and 16 responses being collected."
        block = {
            "type": "text",
            "sub_type": "body",
            "text": recognized,
            "content": {"kind": "text", "text": recognized},
            "bbox": [15, 40, 400, 70],
            "lines": [{"spans": [{"text": recognized}]}],
        }
        assert recover_dropped_pdf_digits({"pages": [{"blocks": [block]}]}, pdf) == 1
        assert "166" in block["text"]
        assert block["content"]["text"] == block["text"] == block["lines"][0]["spans"][0]["text"]


def test_leaves_a_count_alone_when_the_pdf_has_no_matching_context():
    text = "The control group had 16 responses from local students."
    with fitz.open() as pdf:
        page = pdf.new_page(width=500, height=200)
        page.insert_text((20, 60), "The treatment group had 166 responses from local staff.", fontsize=12)
        block = {"sub_type": "body", "text": text, "bbox": [15, 40, 400, 70]}
        assert recover_dropped_pdf_digits({"pages": [{"blocks": [block]}]}, pdf) == 0
        assert block["text"] == text


def test_gap_repair_preserves_recognized_math_in_the_same_line():
    from retainpdf_pipeline.ocr.document_schema.pdf_text_recovery import _recover_prose_gaps
    source = r'后验 q _ { x } 通常为正态分布�(0，I)。'
    block = {'content': {'text': source}, 'text': source, 'segments': [
        {'type': 'text', 'text': '后验'}, {'type': 'inline_formula', 'text': 'q _ { x }'},
        {'type': 'text', 'text': '通常为正态分布�(0，I)。'}]}
    assert _recover_prose_gaps(block, source, '后验qₓ通常为正态分布𝒩(0，I)。')
    assert block['content']['text'] == source.replace('�', '𝒩')
    assert block['segments'][1] == {'type': 'inline_formula', 'text': 'q _ { x }'}
    assert block['segments'][2]['text'].endswith('𝒩(0，I)。')
