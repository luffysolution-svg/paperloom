//! 「翻译这本书的第 1-3、7、12-13 页」拆成几个任务。
//!
//! 复用已有 OCR 时，一个翻译任务只能翻那份 OCR 产物里**连续**的一段（流水线按本地位置
//! `start..=end` 翻）。混合页码就得拆：按文档页切成若干段连续页，每段单独决定 ——
//!
//! - 有能复用的 OCR **整段覆盖**它：建一个复用那份 OCR 的翻译任务；
//! - 没有：建一个新的 OCR + 翻译任务，只 OCR 这一段（OCR 耗时主要是排队的固定时间，6 页
//!   90 秒、47 页 178 秒，多 OCR 几页几乎不增加等待；而跨两份 OCR 拼一段会让同一段的块编号
//!   来自两次识别，所以宁可整段重新 OCR）。
//!
//! 几个任务完成后由阅读入口的合并拼成一本，每页取最近翻译了它的那个任务。

/// 一段连续的文档页（1 起，闭区间）该怎么翻。
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum SegmentPlan {
    /// 复用 `source_job_id` 的 OCR。
    Reuse { source_job_id: String, first: u32, last: u32 },
    /// 重新 OCR 这一段再翻译。
    FreshOcr { first: u32, last: u32 },
}

/// 去重、排序后切成连续段：`[1,2,3,7,12,13]` → `[(1,3),(7,7),(12,13)]`。
pub(crate) fn contiguous_runs(pages: &[u32]) -> Vec<(u32, u32)> {
    let mut sorted: Vec<u32> = pages.iter().copied().filter(|page| *page > 0).collect();
    sorted.sort_unstable();
    sorted.dedup();
    let mut runs: Vec<(u32, u32)> = Vec::new();
    for page in sorted {
        match runs.last_mut() {
            Some((_, last)) if *last + 1 == page => *last = page,
            _ => runs.push((page, page)),
        }
    }
    runs
}

/// `sources` 按偏好排好：用户选的那份 OCR 在前，其余按新到旧。每段取第一个整段覆盖它的。
pub(crate) fn plan_segments(runs: &[(u32, u32)], sources: &[(String, Vec<u32>)]) -> Vec<SegmentPlan> {
    runs.iter()
        .map(|&(first, last)| {
            sources
                .iter()
                .find(|(_, coverage)| (first..=last).all(|page| coverage.binary_search(&page).is_ok()))
                .map(|(source_job_id, _)| SegmentPlan::Reuse {
                    source_job_id: source_job_id.clone(),
                    first,
                    last,
                })
                .unwrap_or(SegmentPlan::FreshOcr { first, last })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mixed_pages_split_into_contiguous_runs() {
        assert_eq!(contiguous_runs(&[13, 1, 2, 3, 7, 12, 2]), vec![(1, 3), (7, 7), (12, 13)]);
        assert_eq!(contiguous_runs(&[5]), vec![(5, 5)]);
        assert_eq!(contiguous_runs(&[]), vec![]);
        assert_eq!(contiguous_runs(&[0, 1]), vec![(1, 1)], "页号 0 不是合法文档页");
    }

    fn source(id: &str, pages: std::ops::RangeInclusive<u32>) -> (String, Vec<u32>) {
        (id.to_string(), pages.collect())
    }

    #[test]
    fn a_run_covered_by_an_ocr_reuses_it_and_an_uncovered_run_is_ocred_fresh() {
        // 已有 OCR 只到第 10 页：1-3 复用，12-13 重新 OCR。
        let plan = plan_segments(&[(1, 3), (12, 13)], &[source("ocr-a", 1..=10)]);
        assert_eq!(
            plan,
            vec![
                SegmentPlan::Reuse { source_job_id: "ocr-a".into(), first: 1, last: 3 },
                SegmentPlan::FreshOcr { first: 12, last: 13 },
            ]
        );
    }

    #[test]
    fn a_run_straddling_two_ocrs_is_ocred_fresh_rather_than_stitched() {
        // 9-12 跨了 1-10 和 11-20 两份 OCR：同一段的块编号不能来自两次识别。
        let plan = plan_segments(&[(9, 12)], &[source("a", 1..=10), source("b", 11..=20)]);
        assert_eq!(plan, vec![SegmentPlan::FreshOcr { first: 9, last: 12 }]);
    }

    #[test]
    fn the_preferred_source_wins_when_several_cover_a_run() {
        let plan = plan_segments(&[(2, 3)], &[source("chosen", 1..=5), source("other", 1..=50)]);
        assert_eq!(plan, vec![SegmentPlan::Reuse { source_job_id: "chosen".into(), first: 2, last: 3 }]);
    }

    #[test]
    fn a_later_source_covers_what_the_preferred_one_does_not() {
        let plan = plan_segments(&[(1, 2), (30, 31)], &[source("chosen", 1..=5), source("other", 20..=40)]);
        assert_eq!(
            plan,
            vec![
                SegmentPlan::Reuse { source_job_id: "chosen".into(), first: 1, last: 2 },
                SegmentPlan::Reuse { source_job_id: "other".into(), first: 30, last: 31 },
            ]
        );
    }

    #[test]
    fn a_gap_inside_an_ocr_coverage_counts_as_not_covered() {
        // OCR 覆盖 1-3 和 5-8（第 4 页没有）：3-5 这一段不能复用它。
        let gappy = ("g".to_string(), vec![1, 2, 3, 5, 6, 7, 8]);
        assert_eq!(plan_segments(&[(3, 5)], &[gappy]), vec![SegmentPlan::FreshOcr { first: 3, last: 5 }]);
    }
}
