//! 「这个任务的第 i 页，是文档的第几页」。
//!
//! # 为什么需要它
//!
//! 流水线**从头到尾用本地索引**：OCR 只跑第 6-10 页时，MinerU 只返回这 5 页（本地 0-4）；
//! 翻译再从里面挑一段时，`prepare.rs` 把选区改写成 OCR 产物里的本地位置；渲染时
//! `remap_selected_render_pages` 又重映射一次，产出一份**只含这几页**的 PDF。
//!
//! 流水线里到处写着 `page_number = page_idx + 1`（manifest、recovery、batch_translation、
//! policy、review_artifact），那是本地索引 +1，**不是文档页号**。它从没出过错，只因为真实
//! 数据里所有范围任务都从第 1 页开始（查过 21 个 job，`start_page` 全是 0），本地和全局
//! 恰好相等。
//!
//! 合并（同一本书的多个范围任务拼成一本）必须知道每一页对应文档第几页。与其把六七处
//! `page_idx + 1` 全改掉，不如让流水线保持本地索引，在 Rust 边界上把映射显式算出来 ——
//! 这就是这个模块。
//!
//! # 数据从哪来
//!
//! - **OCR 覆盖的文档页**：`ocr_artifact_reuse::source_document_pages`。主路径是
//!   `artifacts.ocr_page_numbers`（`artifacts` 表的 `artifacts_json`），实测 61 个 job 里
//!   **59 个有**，缺的 2 个是取消或失败的任务。重新解析 OCR 请求里 `page_ranges` 字符串
//!   只是罕见兜底，而且**在子集 OCR 上必然失效**：`ocr_flow/transport.rs` 先把源 PDF 裁成
//!   子集、再把 `ocr.page_ranges` 清成空串（`page_subset.rs::provider_page_ranges`），兜底
//!   拿到空串去比裁过的 PDF 页数，对不上就报 `ocr_page_coverage_unknown`。
//!
//!   `ocr_page_numbers` 是 OCR **开跑前**按请求写的，失败的任务里也有值 —— 它表示「打算
//!   覆盖」，必须配合 `status == Succeeded` 用（见 `merge::sources::covered_pages`）。
//!
//!   （这里原先写的是「一个都没持久化」—— 错的。当时只查了 `jobs` 表的几个 JSON 列，
//!   列表名时又按 `'job' in name` 过滤，把 `artifacts` 表滤掉了。）
//! - **翻译挑了 OCR 产物里的哪一段**：job spec 里的 `translation.start_page / end_page`，
//!   已经被 `prepare.rs` 改写成本地位置。

/// 一个翻译任务的输出覆盖了哪些文档页（1 起），按本地顺序排列：
/// 返回值的第 `i` 个元素就是该任务渲染产物第 `i` 页对应的文档页号。
///
/// - `source_document_pages`：OCR 覆盖的文档页，按 OCR 产物的本地顺序（1 起）
/// - `start_page` / `end_page`：翻译在 OCR 产物里选的本地区间（0 起，闭区间）；
///   `end_page < 0` 表示「到最后一页」，和流水线的约定一致
///
/// 区间越界或为空时返回 `None` —— 调用方不该拿一份对不上的映射去拼页，
/// 拼错页比不拼更糟（用户会看到第 7 页的译文出现在第 3 页的位置上）。
pub fn translated_document_pages(
    source_document_pages: &[u32],
    start_page: i64,
    end_page: i64,
) -> Option<Vec<u32>> {
    if source_document_pages.is_empty() {
        return None;
    }
    let last_local = source_document_pages.len() as i64 - 1;
    let start = start_page.max(0);
    let end = if end_page < 0 { last_local } else { end_page };
    if start > end || end > last_local {
        return None;
    }
    Some(source_document_pages[start as usize..=end as usize].to_vec())
}

#[cfg(test)]
mod tests {
    use super::translated_document_pages;

    #[test]
    fn a_full_document_job_maps_local_pages_straight_through() {
        // 正对照：真实数据里全部 21 个 job 都是这种 —— 从第 1 页开始，本地 = 全局 - 1。
        let ocr = [1, 2, 3, 4, 5];
        assert_eq!(translated_document_pages(&ocr, 0, -1), Some(vec![1, 2, 3, 4, 5]));
    }

    #[test]
    fn an_ocr_range_that_starts_mid_document_keeps_its_document_page_numbers() {
        // **从没被跑过的路径**。OCR 只跑了第 6-10 页，产物本地 0-4。
        // 流水线会把这 5 页写成 page_number 1-5 —— 那是错的。
        let ocr = [6, 7, 8, 9, 10];
        assert_eq!(
            translated_document_pages(&ocr, 0, -1),
            Some(vec![6, 7, 8, 9, 10]),
            "从文档中间开始的 OCR 范围，映射回来的不是文档页号"
        );
    }

    #[test]
    fn a_translation_slice_inside_a_mid_document_ocr_range() {
        // OCR 第 6-10 页，翻译挑了本地 1..=3 → 文档第 7、8、9 页。
        // 两层本地索引叠在一起，正是最容易拼错页的情形。
        let ocr = [6, 7, 8, 9, 10];
        assert_eq!(translated_document_pages(&ocr, 1, 3), Some(vec![7, 8, 9]));
    }

    #[test]
    fn a_non_contiguous_ocr_coverage_is_followed_page_by_page() {
        // OCR 跑的是 `1-3,8,12-13`：本地 0..=5 对应文档 1,2,3,8,12,13。
        // 翻译挑本地 2..=4 → 文档 3,8,12 —— 映射必须逐页跟着 OCR 的覆盖走，
        // 不能当成连续区间去算偏移。
        let ocr = [1, 2, 3, 8, 12, 13];
        assert_eq!(translated_document_pages(&ocr, 2, 4), Some(vec![3, 8, 12]));
    }

    #[test]
    fn end_page_minus_one_means_through_the_last_ocr_page() {
        let ocr = [6, 7, 8];
        assert_eq!(translated_document_pages(&ocr, 1, -1), Some(vec![7, 8]));
    }

    #[test]
    fn an_out_of_range_selection_yields_no_mapping_rather_than_a_wrong_one() {
        // 拼错页比不拼更糟：用户会看到第 7 页的译文出现在第 3 页的位置上。
        let ocr = [6, 7, 8];
        assert_eq!(translated_document_pages(&ocr, 0, 5), None, "end 越界");
        assert_eq!(translated_document_pages(&ocr, 2, 1), None, "start > end");
        assert_eq!(translated_document_pages(&[], 0, -1), None, "OCR 一页都没覆盖");
    }

    #[test]
    fn a_negative_start_is_clamped_like_the_pipeline_does() {
        // 流水线 `_int_field(params, "start_page", 0)` 的默认值是 0，负数没有意义。
        let ocr = [6, 7, 8];
        assert_eq!(translated_document_pages(&ocr, -3, 1), Some(vec![6, 7]));
    }
}
