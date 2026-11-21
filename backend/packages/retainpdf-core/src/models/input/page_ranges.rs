//! OCR 的页范围（`ocr.page_ranges`，例如 `"1, 3-5"`，页号从 1 起）。
//!
//! 只有这一份实现：OCR 选页（retainpdf-runner 的 page_subset）和按页计费（rust_api 的 page_quota）都用它，
//! 保证扣的页就是跑的页。

use std::collections::BTreeSet;

use anyhow::{anyhow, Context, Result};

/// 解析成升序去重的页号；空串 = 全部页。页号越界、格式不对、起止颠倒都报错。
pub fn parse_page_ranges(spec: &str, total_pages: u32) -> Result<Vec<u32>> {
    if total_pages == 0 {
        return Err(anyhow!("source pdf has no pages"));
    }
    if spec.trim().is_empty() {
        return Ok((1..=total_pages).collect());
    }

    let mut pages = BTreeSet::new();
    for raw_part in spec.split(',') {
        let part = raw_part.trim();
        if part.is_empty() {
            continue;
        }
        if let Some((start_raw, end_raw)) = part.split_once('-') {
            let start = parse_page_number(start_raw, total_pages, spec)?;
            let end = parse_page_number(end_raw, total_pages, spec)?;
            if start > end {
                return Err(anyhow!(
                    "invalid page range '{part}' in '{spec}': start > end"
                ));
            }
            for page in start..=end {
                pages.insert(page);
            }
            continue;
        }
        pages.insert(parse_page_number(part, total_pages, spec)?);
    }

    if pages.is_empty() {
        return Err(anyhow!("page_ranges '{spec}' did not resolve to any page"));
    }
    Ok(pages.into_iter().collect())
}

fn parse_page_number(raw: &str, total_pages: u32, spec: &str) -> Result<u32> {
    let value = raw
        .trim()
        .parse::<u32>()
        .with_context(|| format!("invalid page number '{raw}' in '{spec}'"))?;
    if value == 0 || value > total_pages {
        return Err(anyhow!(
            "page number '{value}' is out of bounds for total_pages={total_pages}"
        ));
    }
    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_page_ranges_supports_singletons_and_ranges() {
        assert_eq!(
            parse_page_ranges("1, 3-5, 7", 8).expect("parse"),
            vec![1, 3, 4, 5, 7]
        );
    }

    #[test]
    fn parse_page_ranges_rejects_out_of_bounds_pages() {
        let err = parse_page_ranges("1-9", 5).expect_err("should fail");
        assert!(err.to_string().contains("out of bounds"));
    }

    #[test]
    fn empty_spec_means_every_page() {
        assert_eq!(parse_page_ranges("  ", 3).unwrap(), vec![1, 2, 3]);
        assert!(parse_page_ranges("", 0).is_err());
    }
}
