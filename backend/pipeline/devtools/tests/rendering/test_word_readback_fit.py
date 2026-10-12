from pathlib import Path
from types import SimpleNamespace

import fitz
import pytest

from retainpdf_pipeline.foundation.config.fonts import DEFAULT_FONT_PATH
from retainpdf_pipeline.render.output.word import exporter, html_fit
from retainpdf_pipeline.render.output.word.typography_readback import read_page_lines, converged_typography

def block(text, rect, size=12., floor=6., fit=True):
    return SimpleNamespace(block_id='fixture',plain_text=text,content_text=text,content_rect=rect,
        font_size_pt=size,fit_min_font_size_pt=floor,fit_max_height_pt=0.,fit_to_box=fit,
        math_map=[],font_weight='regular',justify_text=False,first_line_indent_pt=0.)

def generate_spec(monkeypatch, tmp_path, b, pdf_lines, pdf_size, step):
    directory = tmp_path / 'job'
    directory.mkdir(exist_ok=True)
    source = directory / 'source.pdf'
    document = fitz.open()
    document.new_page(width=300,height=400)
    document.save(source)
    document.close()
    translated = directory / 'fixture-translated.pdf'
    document = fitz.open()
    page = document.new_page(width=300,height=400)
    page.insert_font(fontname='fixture',fontfile=str(DEFAULT_FONT_PATH))
    for i, text in enumerate(pdf_lines):
        page.insert_text((20,30+i*step),text,fontsize=pdf_size,fontname='fixture')
    document.save(translated)
    document.close()
    with fitz.open(translated) as document:
        observed = converged_typography(read_page_lines(document,0),b.content_rect,len(b.plain_text))
    if pdf_lines:
        assert observed is not None, 'fixture must reach readback branch'
    page_spec = SimpleNamespace(page_index=0,page_width_pt=300,page_height_pt=400,blocks=[b])
    monkeypatch.setattr(exporter,'build_render_page_specs',lambda **kwargs:[page_spec])
    monkeypatch.setattr(exporter,'translated_pages',lambda root:{})
    payload, _base = exporter.build_layout_spec(job_root=directory,dpi=72,source_pdf=source,translated_pdf=translated)
    return payload['pages'][0]['blocks'][0], observed

def test_one_line_metrics_do_not_mix_readback_size_with_smaller_fallback_step(monkeypatch, tmp_path):
    b=block('TITLE',[20,23,100,31])
    output, observed = generate_spec(monkeypatch,tmp_path,b,['TITLE'],12.,0.)
    assert observed.line_step_pt == 0.
    assert output['lineStepPt'] >= output['fontSizePt'], output
    assert output['lineStepPt'] <= 8. and output['fontSizePt'] < 12., output

def test_readback_that_does_not_fit_word_metrics_is_rechecked(monkeypatch, tmp_path):
    text='中文文字测试内容段落' * 5
    b=block(text,[20,20,120,90],size=12.,floor=6.)
    output, observed=generate_spec(monkeypatch,tmp_path,b,['中文文字测试内容段落']*5,12.,14.)
    assert observed.line_step_pt == pytest.approx(14.)
    widths=html_fit.wrap_lines(html_fit.renderable_text(b.plain_text,[]),output['fontSizePt'],100.)
    assert len(widths)*output['lineStepPt'] <= 70.5, output

def test_synthetic_line_step_does_not_overflow_a_single_line_box(monkeypatch, tmp_path):
    b=block('TITLE',[20,20,100,32],size=12.,floor=0.)
    output, observed=generate_spec(monkeypatch,tmp_path,b,['TITLE'],10.,0.)
    assert observed.font_size_pt == 10.
    assert output['fontSizePt'] == 10.
    assert output['fontSizePt'] <= output['lineStepPt'] <= 12., output

def test_western_wrap_model_breaks_long_words_within_box():
    widths=html_fit.wrap_lines('supercalifragilisticexpialidocious',10.,40.)
    assert len(widths)>1 and max(widths)<=40.5, widths


def test_valid_pdf_readback_preserves_font_and_spacing(monkeypatch, tmp_path):
    b = block('中文文字\n测试内容', [20, 20, 120, 80])
    output, observed = generate_spec(monkeypatch, tmp_path, b, ['中文文字', '测试内容'], 10., 14.)
    assert observed.font_size_pt == output['fontSizePt'] == 10.
    assert observed.line_step_pt == output['lineStepPt'] == 14.


def test_non_fitting_block_keeps_observed_size_even_in_small_frame(monkeypatch, tmp_path):
    b = block('TITLE', [20, 23, 100, 31], fit=False)
    output, _observed = generate_spec(monkeypatch, tmp_path, b, ['TITLE'], 12., 0.)
    assert output['fontSizePt'] == 12.
    assert output['lineStepPt'] == pytest.approx(12. * html_fit.LINE_STEP_RATIO, abs=.001)


def test_missing_readback_uses_actual_frame_and_never_clips_glyphs(monkeypatch, tmp_path):
    b = block('TITLE', [20, 23, 100, 27], size=12., floor=6.)
    output, observed = generate_spec(monkeypatch, tmp_path, b, [], 12., 0.)
    assert observed is None
    assert output['fontSizePt'] == 6.  # An impossible configured floor remains explicit.
    assert output['lineStepPt'] >= 6.


def test_character_breaking_uses_remaining_line_extent():
    font = html_fit._font()
    width = font.text_length('alpha be', fontsize=10.)
    lines = html_fit.wrap_lines('alpha beta', 10., width)
    assert len(lines) == 2
    assert lines[0] == pytest.approx(width)
