/// PaddleOCR-VL 的行内公式写成 `$ V_{Ni} $`，Obsidian 要求 `$` 内侧紧贴内容，否则不当公式渲染。
/// 只收紧两侧都有空白的一对（金额如 `$5 and $10` 不受影响），跳过 `$$…$$` 与 `\$`。
/// 模型返回的 `\(…\)`、`\[…\]` 也转成 Obsidian 支持的美元定界符。
pub fn tighten_inline_math(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(pos) = find_math_start(rest) {
        out.push_str(&rest[..pos]);
        let after = &rest[pos..];
        if after.starts_with(['`', '~']) {
            let consumed = text.len() - rest.len();
            let end = code_end(text, consumed + pos) - consumed;
            out.push_str(&rest[pos..end]);
            rest = &rest[end..];
            continue;
        }
        if after.starts_with('\\') {
            let display = after.starts_with(r"\[");
            let closing = if display { r"\]" } else { r"\)" };
            let body = &after[2..];
            if let Some((end, _)) = body
                .match_indices(closing)
                .find(|&(i, _)| !is_escaped(body, i))
            {
                let inner = body[..end].trim();
                if !inner.is_empty() {
                    if display {
                        out.push_str("$$\n");
                        out.push_str(inner);
                        out.push_str("\n$$");
                    } else {
                        out.push('$');
                        out.push_str(&inner.replace(['\r', '\n'], " "));
                        out.push('$');
                    }
                    rest = &body[end + 2..];
                    continue;
                }
            }
            out.push_str(&after[..2]);
            rest = body;
            continue;
        }
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

fn is_escaped(text: &str, index: usize) -> bool {
    text[..index]
        .bytes()
        .rev()
        .take_while(|&b| b == b'\\')
        .count()
        % 2
        == 1
}

fn code_end(text: &str, index: usize) -> usize {
    let marker = text.as_bytes()[index];
    let width = text.as_bytes()[index..]
        .iter()
        .take_while(|&&b| b == marker)
        .count();
    let line_start = text[..index].rfind('\n').map_or(0, |i| i + 1);
    let fenced = width >= 3 && text[line_start..index].trim().is_empty();
    if marker == b'~' && !fenced {
        return index + width;
    }
    let mut cursor = index + width;
    while let Some(offset) = text[cursor..].find(marker as char) {
        let start = cursor + offset;
        let run_width = text.as_bytes()[start..]
            .iter()
            .take_while(|&&b| b == marker)
            .count();
        cursor = start + run_width;
        let line_start = text[..start].rfind('\n').map_or(0, |i| i + 1);
        let line_end = text[cursor..].find('\n').map_or(text.len(), |i| cursor + i);
        if (fenced
            && run_width >= width
            && text[line_start..start].trim().is_empty()
            && text[cursor..line_end].trim().is_empty())
            || (!fenced && run_width == width)
        {
            return cursor;
        }
    }
    if fenced {
        text.len()
    } else {
        index + width
    }
}

fn find_math_start(text: &str) -> Option<usize> {
    text.char_indices()
        .find(|&(i, c)| {
            (matches!(c, '$' | '`' | '~')
                || text[i..].starts_with(r"\(")
                || text[i..].starts_with(r"\["))
                && !is_escaped(text, i)
        })
        .map(|(i, _)| i)
}

fn find_unescaped_dollar(text: &str) -> Option<usize> {
    text.char_indices()
        .find(|&(i, c)| c == '$' && !is_escaped(text, i))
        .map(|(i, _)| i)
}

pub fn render_formula(text: &str) -> String {
    if (text.starts_with("$$") && text.ends_with("$$") && text.len() >= 4)
        || (text.starts_with("\\[") && text.ends_with("\\]"))
    {
        return tighten_inline_math(text);
    }
    let inner = text
        .strip_prefix(r"\(")
        .and_then(|s| s.strip_suffix(r"\)"))
        .or_else(|| text.strip_prefix('$').and_then(|s| s.strip_suffix('$')))
        .unwrap_or(text);
    format!("$$\n{}\n$$", inner.trim())
}

/// Byte ranges already owned by Markdown code or math.
pub(super) fn protected_ranges(text: &str) -> Vec<std::ops::Range<usize>> {
    let mut ranges = Vec::new();
    let mut cursor = 0;
    while let Some(offset) = find_math_start(&text[cursor..]) {
        let start = cursor + offset;
        let rest = &text[start..];
        if rest.starts_with(['~', '`']) {
            cursor = code_end(text, start);
            let marker = rest.as_bytes()[0];
            let width = rest.bytes().take_while(|&b| b == marker).count();
            if cursor > start + width {
                ranges.push(start..cursor);
            }
            continue;
        }
        let (open, close) = if rest.starts_with("$$") {
            ("$$", "$$")
        } else if rest.starts_with(r"\(") {
            (r"\(", r"\)")
        } else if rest.starts_with(r"\[") {
            (r"\[", r"\]")
        } else {
            ("$", "$")
        };
        cursor = start + open.len();
        if let Some((end, _)) = text[cursor..]
            .match_indices(close)
            .take_while(|(end, _)| open != "$" || !text[cursor..cursor + end].contains('\n'))
            .find(|(end, _)| !is_escaped(text, cursor + end))
        {
            cursor += end + close.len();
            ranges.push(start..cursor);
        }
    }
    ranges
}
