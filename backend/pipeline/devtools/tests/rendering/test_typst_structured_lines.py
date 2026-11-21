


from retainpdf_pipeline.render.layout.payload.blocks import build_render_blocks
from retainpdf_pipeline.render.layout.payload.line_structure import maybe_preserve_structured_line_breaks
from retainpdf_pipeline.render.output.typst.block_renderer import build_typst_block


def test_regular_structured_lines_preserve_source_line_structure() -> None:
    item = {
        "item_id": "p014-b001",
        "block_type": "text",
        "block_kind": "text",
        "normalized_sub_type": "body",
        "bbox": [48.989, 221.367, 351.92, 594.643],
        "source_text": (
            "ALDA adiabatic local density approximation AF antiferromagnetic ASA atomic sphere approximation "
            "B86 Becke 86 GGA for exchange energy B88 Becke 88 GGA for exchange energy B3LYP hybrid "
            "constructed on basis of Becke-Lee-Yang-Parr GGA BLYP Becke-Lee-Yang-Parr GGA bcc "
            "body-centered cubic BO Born-Oppenheimer C Coulomb CDFT current density functional theory "
            "CS Colle-Salvetti CSDFT current spin density functional theory DC Dirac-Coulomb DCB "
            "Dirac-Coulomb-Breit DFT density functional theory DIR direct matrix element EA electron "
            "affinity ext external EXX exact exchange fcc face-centered cubic FP full potential GE "
            "gradient expansion GGA generalized gradient approximation GKS generalized Kohn-Sham GK "
            "Gross-Kohn H Hartree HDL high-density limit HEG homogeneous electron gas HF Hartree-Fock "
            "HK Hohenberg-Kohn"
        ),
        "lines": [
            {"bbox": [48.989, 221.367, 351.92, 240.031], "spans": [{"content": "ALDA adiabatic local density approximation"}]},
            {"bbox": [48.989, 240.031, 351.92, 258.695], "spans": [{"content": "AF antiferromagnetic ASA atomic sphere"}]},
            {"bbox": [48.989, 258.695, 351.92, 277.358], "spans": [{"content": "approximation B86 Becke 86 GGA for"}]},
            {"bbox": [48.989, 277.358, 351.92, 296.022], "spans": [{"content": "exchange energy B88 Becke 88 GGA for"}]},
            {"bbox": [48.989, 296.022, 351.92, 314.686], "spans": [{"content": "exchange energy B3LYP hybrid constructed"}]},
            {"bbox": [48.989, 314.686, 351.92, 333.35], "spans": [{"content": "on basis of Becke-Lee-Yang-Parr GGA"}]},
            {"bbox": [48.989, 333.35, 351.92, 352.014], "spans": [{"content": "BLYP Becke-Lee-Yang-Parr GGA bcc body-centered"}]},
            {"bbox": [48.989, 352.014, 351.92, 370.677], "spans": [{"content": "cubic BO Born-Oppenheimer C Coulomb"}]},
        ],
    }
    translated = (
        "ALDA 绝热局域密度近似 AF 反铁磁 ASA 原子球近似 B86 Becke 86 交换能GGA "
        "B88 Becke 88 交换能GGA B3LYP 基于Becke-Lee-Yang-Parr GGA的混合泛函 "
        "BLYP Becke-Lee-Yang-Parr GGA bcc 体心立方 BO Born-Oppenheimer C 库仑 "
        "CDFT 流密度泛函理论 CS Colle-Salvetti CSDFT 流自旋密度泛函理论"
    )

    structured = maybe_preserve_structured_line_breaks(item, translated)

    assert item["_render_preserve_line_breaks"] is True
    assert item["_render_line_structure"] == "structured_lines"
    assert structured.count("\n") == len(item["lines"]) - 1
    assert "ALDA 绝热局域密度近似" in structured.splitlines()[0]
    assert "CSDFT" in structured.splitlines()[-1]


def test_long_caption_lines_do_not_use_single_line_preserve_fit() -> None:
    item = {
        "item_id": "p008-b003",
        "block_type": "text",
        "block_kind": "text",
        "layout_role": "caption",
        "semantic_role": "metadata",
        "structure_role": "figure_caption",
        "normalized_sub_type": "figure_caption",
        "text_flow": "preserve_lines",
        "bbox": [49.5, 314.5, 561.5, 408.0],
        "source_text": (
            "FIG. 7: Dy2Be2GeO7\n"
            "a: The specific heat capacity of Dy2Be2GeO7 in both zero and 500 mT applied fields. "
            "The solid black line in the ZF data is a visual guide."
        ),
        "lines": [
            {"bbox": [49.5, 314.5, 561.5, 361.25], "spans": [{"content": "FIG. 7: Dy2Be2GeO7"}]},
            {
                "bbox": [49.5, 361.25, 561.5, 408.0],
                "spans": [{"content": "a: The specific heat capacity of Dy2Be2GeO7 in both zero and 500 mT applied fields."}],
            },
        ],
    }
    translated = (
        "FIG. 7: Dy2Be2GeO7\n"
        "a: Dy2Be2GeO7在零场和500 mT外加磁场下的比热容。零场数据中的黑色实线为视觉辅助线。"
        "使用La2Be2GeO7作为非磁类比扣除声子贡献。"
    )

    rendered = maybe_preserve_structured_line_breaks(item, translated)

    assert "\n" not in rendered
    assert "_render_preserve_line_breaks" not in item
    assert "FIG. 7: Dy2Be2GeO7 a:" in rendered


def test_structured_line_render_block_keeps_hard_line_breaks() -> None:
    blocks = build_render_blocks(
        [
            {
                "item_id": "p014-b001",
                "page_idx": 13,
                "block_type": "text",
                "block_kind": "text",
                "normalized_sub_type": "body",
                "bbox": [48.989, 221.367, 351.92, 594.643],
                "source_text": (
                    "ALDA adiabatic local density approximation AF antiferromagnetic ASA atomic sphere approximation "
                    "B86 Becke 86 GGA for exchange energy B88 Becke 88 GGA for exchange energy B3LYP hybrid "
                    "constructed on basis of Becke-Lee-Yang-Parr GGA BLYP Becke-Lee-Yang-Parr GGA bcc "
                    "body-centered cubic BO Born-Oppenheimer C Coulomb CDFT current density functional theory "
                    "CS Colle-Salvetti CSDFT current spin density functional theory"
                ),
                "protected_source_text": (
                    "ALDA adiabatic local density approximation AF antiferromagnetic ASA atomic sphere approximation "
                    "B86 Becke 86 GGA for exchange energy B88 Becke 88 GGA for exchange energy B3LYP hybrid "
                    "constructed on basis of Becke-Lee-Yang-Parr GGA BLYP Becke-Lee-Yang-Parr GGA bcc "
                    "body-centered cubic BO Born-Oppenheimer C Coulomb CDFT current density functional theory "
                    "CS Colle-Salvetti CSDFT current spin density functional theory"
                ),
                "protected_translated_text": (
                    "ALDA 绝热局域密度近似 AF 反铁磁 ASA 原子球近似 B86 Becke 86 交换能GGA "
                    "B88 Becke 88 交换能GGA B3LYP 基于Becke-Lee-Yang-Parr GGA的混合泛函 "
                    "BLYP Becke-Lee-Yang-Parr GGA bcc 体心立方 BO Born-Oppenheimer C 库仑 "
                    "CDFT 流密度泛函理论 CS Colle-Salvetti CSDFT 流自旋密度泛函理论"
                ),
                "lines": [
                    {"bbox": [48.989, 221.367, 351.92, 240.031], "spans": [{"content": "ALDA adiabatic local density approximation"}]},
                    {"bbox": [48.989, 240.031, 351.92, 258.695], "spans": [{"content": "AF antiferromagnetic ASA atomic sphere"}]},
                    {"bbox": [48.989, 258.695, 351.92, 277.358], "spans": [{"content": "approximation B86 Becke 86 GGA for"}]},
                    {"bbox": [48.989, 277.358, 351.92, 296.022], "spans": [{"content": "exchange energy B88 Becke 88 GGA for"}]},
                    {"bbox": [48.989, 296.022, 351.92, 314.686], "spans": [{"content": "exchange energy B3LYP hybrid constructed"}]},
                    {"bbox": [48.989, 314.686, 351.92, 333.35], "spans": [{"content": "on basis of Becke-Lee-Yang-Parr GGA"}]},
                ],
            }
        ],
        page_width=595.0,
        page_height=842.0,
    )

    assert len(blocks) == 1
    assert "\n" in blocks[0].markdown_text
    assert blocks[0].fit_to_box is False
    assert blocks[0].preserved_line_boxes


def test_body_preserve_lines_contract_keeps_numbered_list_breaks() -> None:
    item = {
        "item_id": "p017-b001",
        "block_type": "text",
        "block_kind": "text",
        "semantic_role": "body",
        "structure_role": "body",
        "text_flow": "preserve_lines",
        "source_text": "1. University of California, Berkeley\n2. Independent Contributor\n3. Stanford University",
        "lines": [
            {"bbox": [104.0, 104.5, 280.5, 113.989], "text": "1. University of California, Berkeley"},
            {"bbox": [104.0, 113.989, 280.5, 123.477], "text": "2. Independent Contributor"},
            {"bbox": [104.0, 123.477, 280.5, 132.966], "text": "3. Stanford University"},
        ],
    }
    translated = "1. 加州大学伯克利分校\n2. 独立贡献者\n3. 斯坦福大学"

    rendered = maybe_preserve_structured_line_breaks(item, translated)

    assert rendered == translated
    assert item["_render_preserve_line_breaks"] is True
    assert item["_render_line_structure"] == "structured_lines"


def test_body_preserve_lines_contract_flows_unmarked_regular_body() -> None:
    item = {
        "item_id": "p005-b002",
        "block_type": "text",
        "block_kind": "text",
        "semantic_role": "body",
        "structure_role": "body",
        "text_flow": "preserve_lines",
        "source_text": (
            "The EHT-type term in GFN2-xTB is mostly responsible for\n"
            "covalent binding. Via the coordination number dependence\n"
            "of the valence energy levels, these obtain additional flexibility"
        ),
        "lines": [
            {
                "bbox": [104.0, 104.5, 380.5, 113.989],
                "text": "The EHT-type term in GFN2-xTB is mostly responsible for",
            },
            {
                "bbox": [104.0, 113.989, 380.5, 123.477],
                "text": "covalent binding. Via the coordination number dependence",
            },
            {
                "bbox": [104.0, 123.477, 380.5, 132.966],
                "text": "of the valence energy levels, these obtain additional flexibility",
            },
        ],
    }
    translated = "GFN2-xTB中的EHT型项主要负责\n共价键合。通过配位数依赖性\n价能级获得额外灵活性。"

    rendered = maybe_preserve_structured_line_breaks(item, translated)

    assert rendered == "GFN2-xTB中的EHT型项主要负责 共价键合。通过配位数依赖性 价能级获得额外灵活性。"
    assert "_render_preserve_line_breaks" not in item


def test_body_preserve_lines_contract_flows_poms_paragraph_with_acronyms() -> None:
    item = {
        "item_id": "p001-b019",
        "block_type": "text",
        "block_kind": "text",
        "layout_role": "paragraph",
        "semantic_role": "body",
        "structure_role": "body",
        "text_flow": "preserve_lines",
        "source_text": (
            "With advances in science and medical technology, therapies\n"
            "based on POMs have come a long way [36]. A plenary of POMs-based\n"
            "anticancer agents was reported in recent years, which have\n"
            "shown excellent therapeutic effects on the growth, spread\n"
            "and metastasis of malignant tumors through CDT, PTT or combination\n"
            "therapies [37]. Herein, we have summarized the latest progress\n"
            "of POM-based materials for cancer treatments, and reveal\n"
            "the roles of POMs in various therapeutic"
        ),
        "source_line_texts": [
            "With advances in science and medical technology, therapies",
            "based on POMs have come a long way [36]. A plenary of POMs-based",
            "anticancer agents was reported in recent years, which have",
            "shown excellent therapeutic effects on the growth, spread",
            "and metastasis of malignant tumors through CDT, PTT or combination",
            "therapies [37]. Herein, we have summarized the latest progress",
            "of POM-based materials for cancer treatments, and reveal",
            "the roles of POMs in various therapeutic",
        ],
    }
    translated = (
        "随着科学和医疗技术的进步，基于多金属氧酸盐（POMs）的疗法取得了长足发展 [36]。近年来，"
        "多种基于POMs的抗癌药物被报道，这些药物通过化学动力学疗法（CDT）、光热疗法（PTT）或联合疗法，"
        "在抑制恶性肿瘤的生长、扩散和转移方面表现出优异的治疗效果 [37]。"
    )

    rendered = maybe_preserve_structured_line_breaks(item, translated)

    assert "\n" not in rendered
    assert "_render_preserve_line_breaks" not in item


def test_body_preserve_lines_contract_keeps_glossary_short_lines() -> None:
    item = {
        "item_id": "p014-b001",
        "block_type": "text",
        "block_kind": "text",
        "semantic_role": "body",
        "structure_role": "body",
        "text_flow": "preserve_lines",
        "source_text": "ALDA adiabatic local density approximation\nAF antiferromagnetic\nASA atomic sphere approximation",
        "lines": [
            {"bbox": [48.989, 221.367, 351.92, 233.408], "text": "ALDA adiabatic local density approximation"},
            {"bbox": [48.989, 233.408, 351.92, 245.449], "text": "AF antiferromagnetic"},
            {"bbox": [48.989, 245.449, 351.92, 257.49], "text": "ASA atomic sphere approximation"},
        ],
    }
    translated = "ALDA 绝热局域密度近似\nAF 反铁磁性\nASA 原子球近似"

    rendered = maybe_preserve_structured_line_breaks(item, translated)

    assert rendered == translated
    assert item["_render_preserve_line_breaks"] is True


def test_body_without_preserve_lines_contract_still_flows_visual_lines() -> None:
    item = {
        "item_id": "p005-b001",
        "block_type": "text",
        "block_kind": "text",
        "semantic_role": "body",
        "structure_role": "body",
        "source_text": "The first visual line\ncontinues into the same sentence\nand should flow.",
        "lines": [
            {"bbox": [104.0, 104.5, 280.5, 113.989], "text": "The first visual line"},
            {"bbox": [104.0, 113.989, 280.5, 123.477], "text": "continues into the same sentence"},
            {"bbox": [104.0, 123.477, 280.5, 132.966], "text": "and should flow."},
        ],
    }
    translated = "第一行视觉文本\n继续同一句话\n因此应该流式排版。"

    rendered = maybe_preserve_structured_line_breaks(item, translated)

    assert rendered == "第一行视觉文本 继续同一句话 因此应该流式排版。"
    assert "_render_preserve_line_breaks" not in item


def test_structured_line_typst_uses_source_line_boxes() -> None:
    blocks = build_render_blocks(
        [
            {
                "item_id": "p014-b001",
                "page_idx": 13,
                "block_type": "text",
                "block_kind": "text",
                "normalized_sub_type": "body",
                "bbox": [48.989, 221.367, 351.92, 594.643],
                "text_flow": "preserve_lines",
                "source_text": "ALDA adiabatic local density approximation\nAF antiferromagnetic\nASA atomic sphere approximation",
                "protected_source_text": "ALDA adiabatic local density approximation\nAF antiferromagnetic\nASA atomic sphere approximation",
                "protected_translated_text": "ALDA 绝热局域密度近似\nAF 反铁磁性\nASA 原子球近似",
                "lines": [
                    {"bbox": [48.989, 221.367, 351.92, 233.408], "spans": [{"content": "ALDA adiabatic local density approximation"}]},
                    {"bbox": [48.989, 233.408, 351.92, 245.449], "spans": [{"content": "AF antiferromagnetic"}]},
                    {"bbox": [48.989, 245.449, 351.92, 257.49], "spans": [{"content": "ASA atomic sphere approximation"}]},
                ],
            }
        ],
        page_width=595.0,
        page_height=842.0,
    )

    typst = build_typst_block("rp13_item_p014_b001_1", blocks[0])

    assert "stack(dir: ttb" not in typst
    assert "rp13_item_p014_b001_1_line_0_md" in typst
    assert "dy: 221.367pt" in typst
    assert "dy: 233.408pt" in typst
    assert "dy: 245.449pt" in typst
