"""Paddle 适配器的图表标题与资源绑定：caption 类型判定、与相邻图/表的双向关系、资源 URI 与 ID 去重，以及标题块进翻译。

从 test_paddle_metadata_and_captions.py（现名 test_paddle_metadata_classification.py）整块拆出，用例本身未改。
"""

from retainpdf_pipeline.ocr.document_schema.adapters import adapt_payload_to_document_v1
from retainpdf_pipeline.ocr.document_schema.providers import PROVIDER_PADDLE
from retainpdf_pipeline.ocr.document_schema.provider_adapters.paddle.adapter import build_paddle_document
from retainpdf_pipeline.ocr.document_schema.provider_adapters.paddle.relations import classify_page_blocks
from retainpdf_translation.core.ocr.json_extractor import extract_text_items
from devtools.tests.document_schema.fixtures.registry import PADDLE_FIXTURE_JSON


def test_paddle_figure_title_distinguishes_table_caption() -> None:
    classified = classify_page_blocks(
        [
            {"block_label": "figure_title", "block_content": "Figure 3: Overall pipeline."},
            {"block_label": "figure_title", "block_content": "Table note: Results improve after reranking."},
        ]
    )

    assert classified[0] == ("text", "figure_caption", ["caption", "figure_caption"], {"caption_target": "figure"})
    assert classified[1] == ("text", "table_caption", ["caption", "table_caption"], {"caption_target": "table"})


def test_paddle_html_wrapped_table_title_maps_to_table_caption() -> None:
    classified = classify_page_blocks(
        [
            {
                "block_label": "figure_title",
                "block_content": '<div style="text-align:center">TABLE 5: Results</div>',
            }
        ]
    )

    assert classified[0] == (
        "text",
        "table_caption",
        ["caption", "table_caption"],
        {"caption_target": "table"},
    )


def test_paddle_figure_title_is_translatable() -> None:
    payload = {
        "layoutParsingResults": [
            {
                "prunedResult": {
                    "parsing_res_list": [
                        {"block_label": "figure_title", "block_content": "Figure 1. Example caption."},
                    ]
                },
                "markdown": {"text": "", "images": {}},
            }
        ],
        "dataInfo": {"pages": [{"width": 1200, "height": 1600}], "type": "paddle"},
    }

    from retainpdf_pipeline.ocr.document_schema.provider_adapters.paddle.page_reader import build_page_spec

    block = build_page_spec(page_payload=payload["layoutParsingResults"][0], page_index=0, page_meta={}, preprocessed_image="")["blocks"][0]
    assert block.get("sub_type") == "figure_caption"
    assert block.get("policy", {}).get("translate") is True


def test_paddle_empty_image_block_uses_markdown_image_bbox_as_asset_link() -> None:
    payload = {
        "layoutParsingResults": [
            {
                "prunedResult": {
                    "parsing_res_list": [
                        {
                            "block_label": "image",
                            "block_content": "",
                            "block_bbox": [76, 136, 563, 481],
                        },
                    ]
                },
                "markdown": {
                    "text": "",
                    "images": {
                        "imgs/img_in_chart_box_76_136_563_481.jpg": "https://example.test/chart.jpg"
                    },
                },
            }
        ],
        "dataInfo": {"pages": [{"width": 1200, "height": 1600}], "type": "paddle"},
    }

    document = adapt_payload_to_document_v1(
        payload=payload,
        provider=PROVIDER_PADDLE,
        document_id="image-asset-doc",
        source_json_path=PADDLE_FIXTURE_JSON,
        provider_version="PaddleOCR-VL",
    )

    block = document["pages"][0]["blocks"][0]
    asset_id = "page-1/imgs/img_in_chart_box_76_136_563_481.jpg"
    assert block["content"]["asset_id"] == asset_id
    assert document["assets"][asset_id]["uri"] == (
        "md/images/page-1/imgs/img_in_chart_box_76_136_563_481.jpg"
    )
    assert "asset_url" not in block["metadata"]


def test_paddle_adjacent_figure_caption_has_bidirectional_asset_relation() -> None:
    payload = {
        "layoutParsingResults": [
            {
                "prunedResult": {
                    "parsing_res_list": [
                        {
                            "block_label": "image",
                            "block_content": "",
                            "block_bbox": [100, 200, 900, 700],
                        },
                        {
                            "block_label": "figure_title",
                            "block_content": "Figure 1. Exact adjacent caption.",
                            "block_bbox": [100, 720, 900, 780],
                        },
                    ]
                },
                "markdown": {
                    "text": "",
                    "images": {
                        "imgs/img_in_image_box_100_200_900_700.png": (
                            "https://example.test/figure.png"
                        )
                    },
                },
            }
        ],
        "dataInfo": {"pages": [{"width": 1200, "height": 1600}], "type": "paddle"},
    }
    document = adapt_payload_to_document_v1(
        payload=payload,
        provider=PROVIDER_PADDLE,
        document_id="adjacent-caption-doc",
        source_json_path=PADDLE_FIXTURE_JSON,
        provider_version="PaddleOCR-VL",
    )

    image_block, caption_block = document["pages"][0]["blocks"]
    asset_id = "page-1/imgs/img_in_image_box_100_200_900_700.png"
    assert caption_block["content"]["asset_id"] == asset_id
    assert caption_block["content"]["asset_ids"] == [asset_id]
    assert caption_block["content"]["related_block_ids"] == [image_block["block_id"]]
    assert caption_block["metadata"]["caption_target_block_id"] == image_block["block_id"]
    assert caption_block["metadata"]["caption_target_direction"] == "previous"
    assert image_block["content"]["caption"] == "Figure 1. Exact adjacent caption."
    assert image_block["content"]["caption_block_ids"] == [caption_block["block_id"]]
    assert document["assets"][asset_id]["caption"] == "Figure 1. Exact adjacent caption."
    assert document["assets"][asset_id]["caption_block_ids"] == [caption_block["block_id"]]


def test_paddle_caption_before_asset_table_preserves_asset_uri_and_reverse_caption() -> None:
    image_path = "imgs/structure.png"
    payload = {
        "layoutParsingResults": [
            {
                "prunedResult": {
                    "parsing_res_list": [
                        {
                            "block_label": "figure_title",
                            "block_content": "Table 1. Embedded structure.",
                            "block_bbox": [100, 150, 900, 190],
                        },
                        {
                            "block_label": "table",
                            "block_content": f'<table><tr><td><img src="{image_path}" /></td></tr></table>',
                            "block_bbox": [100, 200, 900, 800],
                        },
                    ]
                },
                "markdown": {
                    "text": "",
                    "images": {image_path: "https://example.test/structure.png"},
                },
            }
        ],
        "dataInfo": {"pages": [{"width": 1200, "height": 1600}], "type": "paddle"},
    }

    document = adapt_payload_to_document_v1(
        payload=payload,
        provider=PROVIDER_PADDLE,
        document_id="table-caption-before-doc",
        source_json_path=PADDLE_FIXTURE_JSON,
        provider_version="PaddleOCR-VL",
    )

    caption_block, table_block = document["pages"][0]["blocks"]
    asset_id = f"page-1/{image_path}"
    assert caption_block["sub_type"] == "table_caption"
    assert caption_block["structure_role"] == "table_caption"
    assert caption_block["policy"] == {
        "translate": True,
        "translate_reason": "provider_caption_whitelist:table_caption",
    }
    assert caption_block["content"]["asset_ids"] == [asset_id]
    assert caption_block["content"]["related_block_ids"] == [table_block["block_id"]]
    assert caption_block["metadata"]["caption_target_direction"] == "next"
    assert table_block["content"]["caption"] == "Table 1. Embedded structure."
    assert document["assets"][asset_id]["uri"] == f"md/images/page-1/{image_path}"
    assert document["assets"][asset_id]["caption"] == "Table 1. Embedded structure."


def test_paddle_caption_between_two_assets_stays_unbound() -> None:
    image_paths = [
        "imgs/img_in_image_box_100_100_400_400.png",
        "imgs/img_in_image_box_600_100_900_400.png",
    ]
    payload = {
        "layoutParsingResults": [
            {
                "prunedResult": {
                    "parsing_res_list": [
                        {"block_label": "image", "block_content": "", "block_bbox": [100, 100, 400, 400]},
                        {
                            "block_label": "figure_title",
                            "block_content": "Figure 2. Ambiguous neighbouring panels.",
                            "block_bbox": [100, 420, 900, 470],
                        },
                        {"block_label": "image", "block_content": "", "block_bbox": [600, 100, 900, 400]},
                    ]
                },
                "markdown": {
                    "text": "",
                    "images": {
                        image_paths[0]: "https://example.test/left.png",
                        image_paths[1]: "https://example.test/right.png",
                    },
                },
            }
        ],
        "dataInfo": {"pages": [{"width": 1200, "height": 1600}], "type": "paddle"},
    }

    document = adapt_payload_to_document_v1(
        payload=payload,
        provider=PROVIDER_PADDLE,
        document_id="ambiguous-caption-doc",
        source_json_path=PADDLE_FIXTURE_JSON,
        provider_version="PaddleOCR-VL",
    )

    left_block, caption_block, right_block = document["pages"][0]["blocks"]
    assert "asset_ids" not in caption_block["content"]
    assert "related_block_ids" not in caption_block["content"]
    assert "caption_target_block_id" not in caption_block["metadata"]
    assert "caption" not in left_block["content"]
    assert "caption" not in right_block["content"]


def test_paddle_table_block_preserves_every_embedded_image_asset() -> None:
    image_paths = [
        "imgs/structure-a.png",
        "imgs/structure-b.png",
        "imgs/structure-c.png",
    ]
    payload = {
        "layoutParsingResults": [
            {
                "prunedResult": {
                    "parsing_res_list": [
                        {
                            "block_label": "table",
                            "block_content": "".join(
                                f'<img src="{path}" />' for path in image_paths
                            ),
                            "block_bbox": [100, 200, 900, 800],
                        },
                    ]
                },
                "markdown": {
                    "text": "",
                    "images": {path: f"https://example.test/{index}.png" for index, path in enumerate(image_paths)},
                },
            }
        ],
        "dataInfo": {"pages": [{"width": 1200, "height": 1600}], "type": "paddle"},
    }

    document = adapt_payload_to_document_v1(
        payload=payload,
        provider=PROVIDER_PADDLE,
        document_id="multi-asset-table-doc",
        source_json_path=PADDLE_FIXTURE_JSON,
        provider_version="PaddleOCR-VL",
    )

    block = document["pages"][0]["blocks"][0]
    asset_ids = [f"page-1/{path}" for path in image_paths]
    assert block["content"]["asset_id"] == asset_ids[0]
    assert block["content"]["asset_ids"] == asset_ids
    assert list(document["assets"]) == asset_ids
    assert [document["assets"][asset_id]["uri"] for asset_id in asset_ids] == [
        f"md/images/page-1/{path}" for path in image_paths
    ]


def test_paddle_outer_image_block_keeps_overlapping_provider_crops() -> None:
    image_paths = [
        "imgs/img_in_image_box_92_217_1387_1113.jpg",
        "imgs/img_in_image_box_1097_177_1386_1116.jpg",
        "imgs/img_in_image_box_128_311_1018_749.jpg",
    ]
    payload = {
        "layoutParsingResults": [
            {
                "prunedResult": {
                    "parsing_res_list": [
                        {
                            "block_label": "image",
                            "block_content": "",
                            "block_bbox": [92, 217, 1387, 1113],
                        }
                    ]
                },
                "markdown": {
                    "text": "",
                    "images": {path: f"https://example.test/{index}.jpg" for index, path in enumerate(image_paths)},
                },
            }
        ],
        "dataInfo": {"pages": [{"width": 1500, "height": 1200}], "type": "paddle"},
    }

    document = adapt_payload_to_document_v1(
        payload=payload,
        provider=PROVIDER_PADDLE,
        document_id="overlapping-assets",
        source_json_path=PADDLE_FIXTURE_JSON,
        provider_version="PaddleOCR-VL",
    )

    expected_ids = [f"page-1/{path}" for path in image_paths]
    assert document["pages"][0]["blocks"][0]["content"]["asset_ids"] == expected_ids
    assert list(document["assets"]) == expected_ids


def test_paddle_repeated_page_local_filename_has_distinct_canonical_asset_ids() -> None:
    image_path = "imgs/repeated-header.png"
    page_payload = {
        "prunedResult": {
            "parsing_res_list": [
                {
                    "block_label": "header_image",
                    "block_content": f'<img src="{image_path}" />',
                    "block_bbox": [100, 10, 300, 80],
                }
            ]
        },
        "markdown": {"text": "", "images": {image_path: "https://example.test/header.png"}},
    }
    payload = {
        "layoutParsingResults": [page_payload, page_payload],
        "dataInfo": {
            "pages": [{"width": 1200, "height": 1600}, {"width": 1200, "height": 1600}],
            "type": "paddle",
        },
    }

    document = adapt_payload_to_document_v1(
        payload=payload,
        provider=PROVIDER_PADDLE,
        document_id="repeated-page-assets",
        source_json_path=PADDLE_FIXTURE_JSON,
        provider_version="PaddleOCR-VL",
    )

    assert list(document["assets"]) == [
        f"page-1/{image_path}",
        f"page-2/{image_path}",
    ]
    assert document["pages"][0]["blocks"][0]["content"]["asset_id"] == f"page-1/{image_path}"
    assert document["pages"][1]["blocks"][0]["content"]["asset_id"] == f"page-2/{image_path}"


def test_paddle_figure_caption_enters_translation_items() -> None:
    payload = {
        "layoutParsingResults": [
            {
                "prunedResult": {
                    "parsing_res_list": [
                        {"block_label": "figure_title", "block_content": "Figure 1. Example caption."},
                    ]
                },
                "markdown": {"text": "", "images": {}},
            }
        ],
        "dataInfo": {"pages": [{"width": 1200, "height": 1600}], "type": "paddle"},
    }

    from retainpdf_pipeline.ocr.document_schema.provider_adapters.paddle.page_reader import build_page_spec
    page_spec = build_page_spec(page_payload=payload["layoutParsingResults"][0], page_index=0, page_meta={}, preprocessed_image="")
    assert page_spec["blocks"][0]["sub_type"] == "figure_caption"
    assert page_spec["blocks"][0]["policy"]["translate"] is True


def test_paddle_doc_title_enters_translation_items_as_optional_title_candidate() -> None:
    payload = {
        "layoutParsingResults": [
            {
                "prunedResult": {
                    "parsing_res_list": [
                        {"block_label": "doc_title", "block_content": "Document Title"},
                    ]
                },
                "markdown": {"text": "", "images": {}},
            }
        ],
        "dataInfo": {"pages": [{"width": 1200, "height": 1600}], "type": "paddle"},
    }

    document = build_paddle_document(
        payload,
        document_id="title-policy-doc",
        source_json_path=PADDLE_FIXTURE_JSON,
        provider_version="PaddleOCR-VL",
    )

    block = document["pages"][0]["blocks"][0]
    assert block["sub_type"] == "title"
    assert block["structure_role"] == "document_title"
    assert block["policy"] == {"translate": True, "translate_reason": "provider_title_candidate"}
    assert [item.text for item in extract_text_items(document, 0)] == ["Document Title"]
