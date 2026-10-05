// document.v1 → Markdown。块渲染规则移植自
// backend/pipeline/retainpdf_pipeline/ocr/document_schema/markdown_fallback.py，
// 两边改动需同步；差异：这里跳过页眉/页脚/页码，并可把正文换成译文，行内公式按 Obsidian 的要求收紧。

use std::collections::HashMap;
use std::path::{Component, Path};

use serde_json::{Map, Value};

use super::images::{ImageKind, ImagePlan};

/// 块 id（规范化为 `p001-b0008`）→ 该块应输出的译文。
///
/// 跨栏/跨页的翻译单元（translation_unit_member_ids 多于一个）在首个成员处输出
/// 整段译文、其余成员跳过：按成员各自输出会把一句话切成两段，而每个成员都输出
/// 整组全文（阅读器的取法）又会重复。
#[derive(Default)]
pub(super) struct TranslationIndex {
    texts: HashMap<String, Vec<Segment>>,
}

#[derive(Clone)]
enum Segment {
    Text(String),
    /// 已并入同一翻译单元首块的整段译文。
    Absorbed,
}

pub(super) enum Translated {
    Text(String),
    Absorbed,
}

impl TranslationIndex {
    pub(super) fn from_pages(pages: &[(i64, Vec<Value>)]) -> Self {
        let items: Vec<(&Value, String)> = pages
            .iter()
            .flat_map(|(_, items)| items)
            .filter_map(|item| {
                let item_id = item.get("item_id").and_then(Value::as_str).unwrap_or("");
                // 子条目形如 p001-b008-i000，归到所属块。
                let block_part = item_id.split("-i").next().unwrap_or(item_id);
                (!block_part.is_empty()).then(|| (item, canonical_block_id(block_part)))
            })
            .collect();

        // 同一翻译单元可跨页，而 translation_unit_member_ids 只列本页成员，
        // 所以按 translation_unit_id 汇总：成员数与阅读顺序最靠前的首块。
        let mut units: HashMap<&str, (usize, (i64, i64, usize), &str)> = HashMap::new();
        for (seq, (item, block_id)) in items.iter().enumerate() {
            let Some(unit_id) = unit_id(item) else {
                continue;
            };
            let key = (int(item, "page_idx"), int(item, "reading_order"), seq);
            let entry = units.entry(unit_id).or_insert((0, key, block_id.as_str()));
            entry.0 += 1;
            if key < entry.1 {
                entry.1 = key;
                entry.2 = block_id.as_str();
            }
        }

        let mut texts: HashMap<String, Vec<Segment>> = HashMap::new();
        for (item, block_id) in &items {
            let unit = unit_id(item)
                .and_then(|id| units.get(id))
                .filter(|(members, _, _)| *members > 1);
            let segment = match (unit, unit_translated_text(item)) {
                (Some((_, _, head)), Some(text)) if *head == block_id.as_str() => {
                    Some(Segment::Text(text))
                }
                (Some(_), Some(_)) => Some(Segment::Absorbed),
                _ => member_translated_text(item).map(Segment::Text),
            };
            if let Some(segment) = segment {
                texts.entry(block_id.clone()).or_default().push(segment);
            }
        }
        Self { texts }
    }

    fn translated(&self, block_id: &str) -> Option<Translated> {
        let segments = self.texts.get(&canonical_block_id(block_id))?;
        let texts: Vec<&str> = segments
            .iter()
            .filter_map(|segment| match segment {
                Segment::Text(text) => Some(text.as_str()),
                Segment::Absorbed => None,
            })
            .collect();
        Some(if texts.is_empty() {
            Translated::Absorbed
        } else {
            Translated::Text(texts.join("\n"))
        })
    }
}

fn first_text(item: &Value, plain: &str, protected: &str) -> Option<String> {
    let text = |key: &str| {
        item.get(key)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
    };
    // placeholder 模式下 protected_* 里是 <f1-17a/> 占位符，不能直接输出。
    let placeholder_math = item.get("math_mode").and_then(Value::as_str) == Some("placeholder");
    text(plain).or_else(|| (!placeholder_math).then(|| text(protected)).flatten())
}

fn member_translated_text(item: &Value) -> Option<String> {
    first_text(item, "translated_text", "protected_translated_text")
}

fn unit_translated_text(item: &Value) -> Option<String> {
    first_text(
        item,
        "translation_unit_translated_text",
        "translation_unit_protected_translated_text",
    )
}

fn unit_id(item: &Value) -> Option<&str> {
    item.get("translation_unit_id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|id| !id.is_empty())
}

fn int(item: &Value, key: &str) -> i64 {
    item.get(key).and_then(Value::as_i64).unwrap_or(i64::MAX)
}

/// 与 reader_regions::value_extract::canonical_item_id 相同：块号补零到 4 位。
fn canonical_block_id(value: &str) -> String {
    let Some((page, block)) = value.split_once("-b") else {
        return value.to_string();
    };
    match block.parse::<u32>() {
        Ok(num) => format!("{page}-b{num:04}"),
        Err(_) => value.to_string(),
    }
}

pub(super) struct RenderContext<'a> {
    pub(super) images_dir: Option<&'a Path>,
    /// None 表示渲染原文。
    pub(super) translations: Option<&'a TranslationIndex>,
}

/// 渲染整篇；图片以 `images/<rel>` 形式输出（与 md/full.md 同一种写法），
/// 并按出现顺序登记到 plan，交给统一的链接改写处理。
pub(super) fn render_document(
    document: &Value,
    ctx: &RenderContext<'_>,
    plan: &mut ImagePlan,
) -> String {
    let empty = Map::new();
    let assets = document
        .get("assets")
        .and_then(Value::as_object)
        .unwrap_or(&empty);
    let mut pages: Vec<(usize, &Value)> = document
        .get("pages")
        .and_then(Value::as_array)
        .map(|pages| pages.iter().enumerate().collect())
        .unwrap_or_default();
    pages.sort_by_key(|(index, page)| (page_index(page).unwrap_or(*index as i64), *index));

    let mut rendered = Vec::new();
    for (index, page) in pages {
        let page_idx = page_index(page).unwrap_or(index as i64);
        let mut blocks: Vec<(usize, &Value)> = page
            .get("blocks")
            .and_then(Value::as_array)
            .map(|blocks| blocks.iter().enumerate().collect())
            .unwrap_or_default();
        blocks.sort_by_key(|(index, block)| block_sort_key(block, *index));
        for (_, block) in blocks {
            if let Some(text) = render_block(block, page_idx, assets, ctx, plan) {
                rendered.push(text);
            }
        }
    }
    let body = rendered.join("\n\n");
    let body = body.trim();
    if body.is_empty() {
        String::new()
    } else {
        format!("{body}\n")
    }
}

fn page_index(page: &Value) -> Option<i64> {
    page.get("page_index").and_then(Value::as_i64).or_else(|| {
        page.get("page")
            .and_then(Value::as_i64)
            .map(|p| (p - 1).max(0))
    })
}

fn block_sort_key(block: &Value, index: usize) -> (i64, i64, usize) {
    let int = |key: &str| block.get(key).and_then(Value::as_i64);
    let order = int("order").unwrap_or(index as i64);
    let reading_order = int("reading_order").or(int("order")).unwrap_or(0).max(0);
    (reading_order, order, index)
}

fn lower(block: &Value, key: &str) -> String {
    block
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim()
        .to_lowercase()
}

fn render_block(
    block: &Value,
    page_idx: i64,
    assets: &Map<String, Value>,
    ctx: &RenderContext<'_>,
    plan: &mut ImagePlan,
) -> Option<String> {
    let content = block.get("content");
    let content_str = |key: &str| {
        content
            .and_then(|c| c.get(key))
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim()
            .to_string()
    };
    let kind = content
        .and_then(|c| c.get("kind"))
        .and_then(Value::as_str)
        .unwrap_or("unknown")
        .trim()
        .to_lowercase();
    let layout_role = lower(block, "layout_role");
    let structure_role = lower(block, "structure_role");
    let sub_type = lower(block, "sub_type");

    // 页眉/页脚/页码在笔记里只是噪声。PaddleOCR-VL 的页眉页脚图片（期刊 logo）
    // 标准化后角色是 unknown，只在原始版面标签里留下 header_image / footer_image。
    let raw_label = block
        .pointer("/source/raw_type")
        .or_else(|| block.pointer("/provenance/raw_label"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_lowercase();
    if matches!(layout_role.as_str(), "header" | "footer" | "page_number")
        || matches!(structure_role.as_str(), "header" | "footer" | "page_number")
        || raw_label.starts_with("header")
        || raw_label.starts_with("footer")
    {
        return None;
    }

    let source_text = content_str("text");
    let image_links = |kind: ImageKind, plan: &mut ImagePlan| {
        let alt = image_alt(content);
        let resolve = |asset_id: &String| resolve_asset(ctx.images_dir, assets, asset_id, page_idx);
        // asset_id 是块的主图（与 OCR 自带的 md/full.md 一致）；PaddleOCR-VL 的 asset_ids
        // 还会混入主图内的子图裁切和相邻块的图，只在主图缺失时才回退到它。
        let primary = content
            .and_then(|c| c.get("asset_id"))
            .and_then(Value::as_str)
            .map(|id| id.trim().to_string())
            .filter(|id| !id.is_empty())
            .and_then(|id| resolve(&id));
        let rels = match primary {
            Some(rel) => vec![rel],
            None => asset_ids(content).iter().filter_map(resolve).collect(),
        };
        rels.into_iter()
            .map(|rel| {
                plan.register(&rel, kind, Some(page_idx + 1));
                format!("![{alt}](images/{rel})")
            })
            .collect::<Vec<_>>()
    };

    if kind == "image" || matches!(sub_type.as_str(), "image" | "figure" | "chart") {
        let links = image_links(ImageKind::Figure, plan);
        return non_empty(if links.is_empty() {
            source_text
        } else {
            links.join("\n\n")
        });
    }

    if kind == "formula" || sub_type.contains("formula") {
        if source_text.is_empty() {
            return non_empty(image_links(ImageKind::Equation, plan).join("\n\n"));
        }
        return Some(render_formula(&source_text));
    }

    if kind == "table" || matches!(sub_type.as_str(), "table" | "table_html") {
        let table = content_str("table_html");
        let table = if table.is_empty() { source_text } else { table };
        if table.is_empty() {
            return non_empty(image_links(ImageKind::Table, plan).join("\n\n"));
        }
        return Some(tighten_inline_math(&super::table_math::normalize_table_math(&table)));
    }

    let block_id = block.get("block_id").and_then(Value::as_str).unwrap_or("");
    let text = match ctx.translations.map(|index| index.translated(block_id)) {
        Some(Some(Translated::Text(text))) => text,
        Some(Some(Translated::Absorbed)) => return None,
        // 译文笔记里，未翻译的元数据块（网址、下载声明、版权、单位等）只是噪声；
        // 原文笔记照常保留。参考文献不属于 metadata，不受影响。
        Some(None) if lower(block, "semantic_role") == "metadata" => return None,
        _ => source_text,
    };
    let text = tighten_inline_math(text.trim());
    let text = text.as_str();
    if text.is_empty() {
        return None;
    }
    if layout_role == "title"
        || matches!(structure_role.as_str(), "document_title" | "title")
        || matches!(sub_type.as_str(), "title" | "doc_title")
    {
        return Some(format!("# {}", single_line(text)));
    }
    if layout_role == "heading" || structure_role == "heading" || sub_type == "heading" {
        return Some(format!("## {}", single_line(text)));
    }
    if layout_role == "list_item" {
        return Some(
            text.lines()
                .filter(|line| !line.trim().is_empty())
                .map(|line| format!("- {}", line.trim()))
                .collect::<Vec<_>>()
                .join("\n"),
        );
    }
    Some(text.to_string())
}

fn non_empty(value: String) -> Option<String> {
    (!value.trim().is_empty()).then_some(value)
}

fn single_line(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// PaddleOCR-VL 的行内公式写成 `$ V_{Ni} $`，Obsidian 要求 `$` 内侧紧贴内容，否则不当公式渲染。
/// 只收紧两侧都有空白的一对（金额如 `$5 and $10` 不受影响），跳过 `$$…$$` 与 `\$`。
pub(super) fn tighten_inline_math(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(pos) = find_unescaped_dollar(rest) {
        out.push_str(&rest[..pos]);
        let after = &rest[pos..];
        if let Some(display) = after.strip_prefix("$$") {
            let end = display.find("$$").map_or(after.len(), |end| end + 4);
            out.push_str(&after[..end]);
            rest = &after[end..];
            continue;
        }
        let body = &after[1..];
        match find_unescaped_dollar(body).filter(|&end| !body[..end].contains('\n')) {
            Some(end) => {
                let inner = &body[..end];
                let padded =
                    inner.starts_with(char::is_whitespace) && inner.ends_with(char::is_whitespace);
                out.push('$');
                out.push_str(if padded && !inner.trim().is_empty() {
                    inner.trim()
                } else {
                    inner
                });
                out.push('$');
                rest = &body[end + 1..];
            }
            None => {
                out.push('$');
                rest = body;
            }
        }
    }
    out.push_str(rest);
    out
}

fn find_unescaped_dollar(text: &str) -> Option<usize> {
    text.char_indices()
        .find(|&(i, c)| c == '$' && !text[..i].ends_with('\\'))
        .map(|(i, _)| i)
}

fn render_formula(text: &str) -> String {
    if (text.starts_with("$$") && text.ends_with("$$") && text.len() >= 4)
        || (text.starts_with("\\[") && text.ends_with("\\]"))
    {
        return text.to_string();
    }
    format!("$$\n{text}\n$$")
}

fn asset_ids(content: Option<&Value>) -> Vec<String> {
    let mut ids: Vec<String> = Vec::new();
    let mut push = |value: &str| {
        let value = value.trim();
        if !value.is_empty() && !ids.iter().any(|id| id == value) {
            ids.push(value.to_string());
        }
    };
    if let Some(primary) = content
        .and_then(|c| c.get("asset_id"))
        .and_then(Value::as_str)
    {
        push(primary);
    }
    if let Some(values) = content
        .and_then(|c| c.get("asset_ids"))
        .and_then(Value::as_array)
    {
        for value in values.iter().filter_map(Value::as_str) {
            push(value);
        }
    }
    ids
}

fn image_alt(content: Option<&Value>) -> String {
    for key in ["alt", "title"] {
        if let Some(text) = content
            .and_then(|c| c.get(key))
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|text| !text.is_empty())
        {
            return text
                .replace('[', "\\[")
                .replace(']', "\\]")
                .replace('\n', " ");
        }
    }
    "Image".to_string()
}

/// 资产 → md/images 下真实存在的相对路径。MinerU 的 uri 不带 page-N 目录，
/// Paddle 带；两种都试，只接受目录内的安全路径。
fn resolve_asset(
    images_dir: Option<&Path>,
    assets: &Map<String, Value>,
    asset_id: &str,
    page_idx: i64,
) -> Option<String> {
    let images_dir = images_dir?;
    let uri = assets
        .get(asset_id)
        .and_then(|record| {
            record
                .get("uri")
                .and_then(Value::as_str)
                .or_else(|| record.as_str())
        })
        .unwrap_or("")
        .trim();
    let mut raw = if uri.is_empty() { asset_id } else { uri }.replace('\\', "/");
    if raw.contains("://") || raw.starts_with("data:") || raw.starts_with('/') {
        return None;
    }
    while let Some(rest) = raw.strip_prefix("./") {
        raw = rest.to_string();
    }
    for prefix in ["md/images/", "images/"] {
        if let Some(rest) = raw.strip_prefix(prefix) {
            raw = rest.to_string();
            break;
        }
    }
    let mut candidates = vec![raw.clone()];
    if !raw.starts_with("page-") {
        candidates.push(format!("page-{}/{raw}", page_idx + 1));
    }
    candidates
        .into_iter()
        .find(|candidate| is_safe_relative(candidate) && images_dir.join(candidate).is_file())
}

fn is_safe_relative(path: &str) -> bool {
    !path.is_empty()
        && Path::new(path)
            .components()
            .all(|component| matches!(component, Component::Normal(_) | Component::CurDir))
}
