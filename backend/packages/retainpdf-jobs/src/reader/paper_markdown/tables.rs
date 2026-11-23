use super::tighten_inline_math;
use html5ever::{
    parse_document,
    serialize::{serialize, SerializeOpts},
    tendril::TendrilSink,
};
use markup5ever_rcdom::{Handle, NodeData, RcDom, SerializableHandle};
use regex::{Captures, Regex};
use std::sync::LazyLock;

static TABLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?is)<table\b[^>]*>.*?</table\s*>").unwrap());
static EQ: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?is)<eq\b[^>]*>(.*?)</eq\s*>").unwrap());

fn tagged_equation(c: &Captures<'_>) -> String {
    static SCRIPT: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"(?is)<(sub|sup)>([^<]*)</(?:sub|sup)>").unwrap());
    let body = c[1].trim();
    if body.is_empty() || body.starts_with('$') && body.ends_with('$') {
        body.to_string()
    } else {
        let tex = SCRIPT.replace_all(body, |s: &Captures<'_>| {
            format!(
                "{}{{{}}}",
                if s[1].eq_ignore_ascii_case("sub") {
                    "_"
                } else {
                    "^"
                },
                &s[2]
            )
        });
        ["$", &tex.replace('<', "&lt;").replace('>', "&gt;"), "$"].concat()
    }
}

/// Obsidian's native MathJax runs in Markdown cells. Keep the publisher's
/// merged layout with native MathML and retain the editable TeX in its annotation.
pub fn normalize_table_math(markdown: &str) -> String {
    static SEPARATOR: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$").unwrap()
    });
    let protected = super::math::protected_ranges(markdown);
    let mut lines: Vec<_> = markdown.split_inclusive('\n').map(str::to_owned).collect();
    let mut offset = 0;
    let mut in_table = false;
    for i in 0..lines.len() {
        let length = lines[i].len();
        if !lines[i].contains('|') || protected.iter().any(|r| r.contains(&offset)) {
            in_table = false;
        } else if in_table
            || lines
                .get(i + 1)
                .is_some_and(|l| SEPARATOR.is_match(l.trim_end()))
        {
            in_table = true;
            let row = EQ.replace_all(&lines[i], tagged_equation);
            lines[i] = super::heading_text(&row);
        }
        offset += length;
    }
    let markdown = lines.concat();
    let protected = super::math::protected_ranges(&markdown);
    TABLE
        .replace_all(&markdown, |table: &Captures<'_>| {
            if protected
                .iter()
                .any(|r| r.contains(&table.get(0).unwrap().start()))
            {
                return table[0].to_owned();
            }
            static TEXT: LazyLock<Regex> = LazyLock::new(|| Regex::new(r">([^<>]+)<").unwrap());
            let html = EQ.replace_all(&table[0], tagged_equation);
            let html = TEXT.replace_all(&html, |c: &Captures<'_>| {
                format!(">{}<", super::heading_text(&c[1]))
            });
            let html = tighten_inline_math(&html);
            if !html.contains('$') {
                return html;
            }
            let doc = parse_document(RcDom::default(), Default::default()).one(html.clone());
            let mut rows = Vec::new();
            collect_rows(&doc.document, &mut rows);
            let mut grid = vec![Vec::<String>::new(); rows.len()];
            let mut merged = false;
            for (r, row) in rows.iter().enumerate() {
                let mut column = 0;
                for node in row.children.borrow().iter() {
                    let NodeData::Element { name, attrs, .. } = &node.data else {
                        continue;
                    };
                    if !matches!(name.local.as_ref(), "th" | "td") {
                        continue;
                    }
                    while grid[r].get(column).is_some_and(|s| !s.is_empty()) {
                        column += 1;
                    }
                    let span = |key: &str| {
                        attrs
                            .borrow()
                            .iter()
                            .find(|a| a.name.local.as_ref() == key)
                            .and_then(|a| a.value.parse::<usize>().ok())
                            .unwrap_or(1)
                    };
                    let width = span("colspan").clamp(1, 1000);
                    let h = span("rowspan");
                    let height = if h == 0 {
                        rows.len() - r
                    } else {
                        h.min(rows.len() - r)
                    };
                    merged |= width > 1 || height > 1;
                    let mut bytes = Vec::new();
                    serialize(
                        &mut bytes,
                        &SerializableHandle::from(node.clone()),
                        SerializeOpts::default(),
                    )
                    .unwrap();
                    let cell = String::from_utf8(bytes).unwrap();
                    let cell = cell.trim();
                    let mut body = String::new();
                    let mut copied = 0;
                    for range in super::math::protected_ranges(&cell) {
                        body.push_str(
                            &cell[copied..range.start]
                                .replace('\n', "<br>")
                                .replace('|', r"\|"),
                        );
                        body.push_str(
                            &cell[range.clone()]
                                .replace("&lt;", "<")
                                .replace("&gt;", ">")
                                .replace("&amp;", "&")
                                .replace(r"\|", r"\Vert ")
                                .replace('|', r"\vert ")
                                .replace(['\n', '\r'], " "),
                        );
                        copied = range.end;
                    }
                    body.push_str(&cell[copied..].replace('\n', "<br>").replace('|', r"\|"));
                    for target in grid.iter_mut().skip(r).take(height) {
                        target.resize(target.len().max(column + width), String::new());
                        for (i, col) in target[column..column + width].iter_mut().enumerate() {
                            *col = if i == 0 && !body.is_empty() {
                                body.clone()
                            } else {
                                " ".to_owned()
                            };
                        }
                    }
                    column += width;
                }
            }
            let width = grid.iter().map(Vec::len).max().unwrap_or(0);
            if width == 0 {
                return html;
            }
            let mut lines = Vec::new();
            for (i, mut row) in grid.into_iter().enumerate() {
                row.resize(width, String::new());
                lines.push(format!("| {} |", row.join(" | ")));
                if i == 0 {
                    lines.push(format!("| {} |", vec!["---"; width].join(" | ")));
                }
            }
            if merged {
                // HTML cells do not invoke Obsidian MathJax. Chromium renders MathML
                // directly in both reading and editing views, including merged cells.
                let converter = math_core::LatexToMathML::new(math_core::MathCoreConfig {
                    xml_namespace: true,
                    annotation: true,
                    ..Default::default()
                })
                .expect("built-in MathML configuration");
                let mut result = String::new();
                let mut start = 0;
                for range in super::math::protected_ranges(&html) {
                    if html[..range.start].rfind('<') > html[..range.start].rfind('>') {
                        continue;
                    }
                    let raw = &html[range.clone()];
                    let Some(tex) = raw.strip_prefix('$').and_then(|v| v.strip_suffix('$')) else {
                        continue;
                    };
                    let tex = tex
                        .trim_matches('$')
                        .replace("&lt;", "<")
                        .replace("&gt;", ">")
                        .replace("&amp;", "&");
                    let Ok(math) =
                        converter.convert_with_local_counter(&tex, math_core::MathDisplay::Inline)
                    else {
                        // Preserve unfamiliar provider macros for Obsidian's own MathJax.
                        return lines.join("\n");
                    };
                    result.push_str(&html[start..range.start]);
                    result.push_str(&math);
                    start = range.end;
                }
                result.push_str(&html[start..]);
                return result;
            }
            lines.join("\n")
        })
        .into_owned()
}

fn collect_rows(node: &Handle, rows: &mut Vec<Handle>) {
    if let NodeData::Element { name, .. } = &node.data {
        if name.local.as_ref() == "tr" {
            rows.push(node.clone());
            return;
        }
    }
    for child in node.children.borrow().iter() {
        collect_rows(child, rows);
    }
}
