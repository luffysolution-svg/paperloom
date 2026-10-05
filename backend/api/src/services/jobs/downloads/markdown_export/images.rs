// 图片按正文首次出现顺序重命名：fig-001-p03.png / tab-001-p05.jpg / eq-001-p07.png。
// 译文笔记与原文笔记共用同一份编号，同一图片只存一份。

use std::collections::HashMap;

use super::super::markdown::{
    normalize_markdown_image_rel, HTML_IMAGE_SRC_DQ_RE, HTML_IMAGE_SRC_SQ_RE,
    MARKDOWN_IMAGE_LINK_RE,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum ImageKind {
    Figure,
    Table,
    Equation,
}

impl ImageKind {
    fn prefix(self) -> &'static str {
        match self {
            Self::Figure => "fig",
            Self::Table => "tab",
            Self::Equation => "eq",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct PlannedImage {
    /// md/images 下的相对路径（`/` 分隔）。
    pub(super) source_rel: String,
    pub(super) file_name: String,
}

#[derive(Default)]
pub(super) struct ImagePlan {
    by_source: HashMap<String, usize>,
    entries: Vec<PlannedImage>,
    counters: HashMap<&'static str, u32>,
}

impl ImagePlan {
    /// 已登记过的直接返回原名（编号以首次出现为准）。
    pub(super) fn register(
        &mut self,
        source_rel: &str,
        kind: ImageKind,
        page: Option<i64>,
    ) -> String {
        if let Some(&index) = self.by_source.get(source_rel) {
            return self.entries[index].file_name.clone();
        }
        let counter = self.counters.entry(kind.prefix()).or_insert(0);
        *counter += 1;
        let page = page
            .filter(|page| *page > 0)
            .map(|page| format!("-p{page:02}"))
            .unwrap_or_default();
        let file_name = format!(
            "{}-{:03}{page}.{}",
            kind.prefix(),
            counter,
            extension(source_rel)
        );
        self.by_source
            .insert(source_rel.to_string(), self.entries.len());
        self.entries.push(PlannedImage {
            source_rel: source_rel.to_string(),
            file_name: file_name.clone(),
        });
        file_name
    }

    pub(super) fn entries(&self) -> &[PlannedImage] {
        &self.entries
    }
}

fn extension(path: &str) -> String {
    let name = path.rsplit('/').next().unwrap_or(path);
    name.rsplit_once('.')
        .map(|(_, ext)| ext.to_ascii_lowercase())
        .filter(|ext| {
            !ext.is_empty() && ext.len() <= 5 && ext.chars().all(|c| c.is_ascii_alphanumeric())
        })
        .unwrap_or_else(|| "png".to_string())
}

/// Paddle 的图片放在 page-N/ 下，可据此补页码；MinerU 没有就不带页码。
fn page_from_rel(rel: &str) -> Option<i64> {
    rel.strip_prefix("page-")?.split('/').next()?.parse().ok()
}

/// 把 `images/<rel>` 形式的图片引用改写成 `<assets_dir>/<新文件名>`。
/// 未登记且磁盘上不存在的引用保持原样；`exists` 决定未登记的图片是否纳入。
pub(super) fn rewrite_image_links(
    content: &str,
    plan: &mut ImagePlan,
    assets_dir: &str,
    exists: &dyn Fn(&str) -> bool,
) -> String {
    let md_re = regex::Regex::new(MARKDOWN_IMAGE_LINK_RE).expect("valid markdown image regex");
    let html_dq = regex::Regex::new(HTML_IMAGE_SRC_DQ_RE).expect("valid html img dq regex");
    let html_sq = regex::Regex::new(HTML_IMAGE_SRC_SQ_RE).expect("valid html img sq regex");
    let mut target = |raw: &str| -> Option<String> {
        let normalized = normalize_markdown_image_rel(raw);
        // full.md 里的链接可能已百分号编码（chart%20a.png），磁盘上是解码后的名字。
        let rel = [Some(normalized.clone()), percent_decode(&normalized)]
            .into_iter()
            .flatten()
            .find(|rel| !rel.is_empty() && (plan.by_source.contains_key(rel) || exists(rel)))?;
        let name = plan.register(&rel, ImageKind::Figure, page_from_rel(&rel));
        Some(format!("{}/{}", link_escape(assets_dir), name))
    };

    let step = md_re.replace_all(content, |caps: &regex::Captures<'_>| {
        match target(&caps[2]) {
            Some(link) => format!("![{}]({link})", &caps[1]),
            None => caps[0].to_string(),
        }
    });
    let step = html_dq
        .replace_all(&step, |caps: &regex::Captures<'_>| match target(&caps[2]) {
            Some(link) => format!("{}{link}{}", &caps[1], &caps[3]),
            None => caps[0].to_string(),
        })
        .into_owned();
    html_sq
        .replace_all(&step, |caps: &regex::Captures<'_>| match target(&caps[2]) {
            Some(link) => format!("{}{link}{}", &caps[1], &caps[3]),
            None => caps[0].to_string(),
        })
        .into_owned()
}

/// 仅在确有 %XX 时返回解码结果；非法序列或非 UTF-8 视为无法解码。
fn percent_decode(value: &str) -> Option<String> {
    if !value.contains('%') {
        return None;
    }
    let bytes = value.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            let hex = value.get(index + 1..index + 3)?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            index += 3;
        } else {
            out.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(out).ok()
}

/// Markdown 链接目标里空格与括号会截断链接；Obsidian 认百分号编码。
pub(super) fn link_escape(path: &str) -> String {
    path.replace('%', "%25")
        .replace(' ', "%20")
        .replace('(', "%28")
        .replace(')', "%29")
        .replace('<', "%3C")
        .replace('>', "%3E")
}
