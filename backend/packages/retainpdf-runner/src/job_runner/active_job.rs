//! 任务成功后，`documents.active_job_id` 要不要换成它。
//!
//! # 这个指针现在是什么意思
//!
//! 「书卡该展示哪个任务」—— 进度转圈、书籍详情里的「当前任务」。它**不再**决定读哪份译文：
//! 阅读器、全文搜索、AI、合集都改成按整本书挑（每页取最新翻译了它的任务，见 api 的
//! `merge::reading` 和 retainpdf-db 的 `rebuild_document_fts`）。
//!
//! 提交时它被设成新提交的任务（用户刚发起的，要立刻看到进度），那条路不在这里。
//!
//! # 为什么成功时不能无条件覆盖
//!
//! 原来是无条件覆盖，注释写着「非 OCR 仍优先」但代码没做。两个实际后果：
//!
//! - 两个任务同时在跑，**旧的先完成**，就把正在跑的新任务从书卡上顶掉，进度转圈消失；
//! - **纯 OCR 任务成功**（包括自动补 OCR）顶掉已经翻译好的任务，书卡上这本书像是没翻译。

use crate::models::domain::{JobStatusKind, WorkflowKind};

/// 决策需要的一个任务的事实。
#[derive(Debug, Clone, Copy)]
pub(crate) struct ActiveCandidate<'a> {
    pub job_id: &'a str,
    pub created_at: &'a str,
    pub workflow: &'a WorkflowKind,
    pub status: &'a JobStatusKind,
}

impl ActiveCandidate<'_> {
    fn is_ocr(&self) -> bool {
        *self.workflow == WorkflowKind::Ocr
    }

    fn in_progress(&self) -> bool {
        matches!(self.status, JobStatusKind::Queued | JobStatusKind::Running)
    }

    /// 和合并计划同一个方向：提交时间，同一秒按 job_id。
    fn rank(&self) -> (&str, &str) {
        (self.created_at, self.job_id)
    }
}

/// 返回新的 active_job_id；`None` 表示不改。
///
/// - `current`：文档当前指向的任务；`None` 表示指针为空或悬空（指向的任务已不存在）。
/// - `finished`：刚成功的任务。
/// - `newest_translation`：这本书最新的成功翻译任务（非 OCR），可能就是 `finished`。
pub(crate) fn active_job_after_success(
    current: Option<ActiveCandidate<'_>>,
    finished: ActiveCandidate<'_>,
    newest_translation: Option<ActiveCandidate<'_>>,
) -> Option<String> {
    let change_to = |job_id: &str| {
        (current.map(|c| c.job_id) != Some(job_id)).then(|| job_id.to_string())
    };
    // 别的任务还在排队或运行：书卡正展示它的进度，不抢。
    if let Some(current) = current {
        if current.job_id != finished.job_id && current.in_progress() {
            return None;
        }
    }
    // 纯 OCR 成功了，而这本书有翻译好的任务：书卡展示翻译。
    if finished.is_ocr() {
        if let Some(translation) = newest_translation {
            return change_to(translation.job_id);
        }
    }
    let Some(current) = current else {
        return Some(finished.job_id.to_string());
    };
    if current.job_id == finished.job_id {
        return None;
    }
    // 当前指着一个纯 OCR、刚完成的是翻译：翻译优先，不管谁先提交。
    if current.is_ocr() && !finished.is_ocr() {
        return change_to(finished.job_id);
    }
    // 当前指着一个失败 / 取消的任务：成功的优先，不管谁先提交。新提交的被取消了、更早的那个
    // 后跑完，书卡不能还停在「已取消」上。
    if matches!(current.status, JobStatusKind::Failed | JobStatusKind::Canceled) {
        return change_to(finished.job_id);
    }
    // 其余：刚完成的更新才换。旧任务后完成，不能把新提交的那个顶掉。
    (finished.rank() > current.rank()).then(|| finished.job_id.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    const BOOK: WorkflowKind = WorkflowKind::Book;
    const OCR: WorkflowKind = WorkflowKind::Ocr;
    const OK: JobStatusKind = JobStatusKind::Succeeded;
    const RUNNING: JobStatusKind = JobStatusKind::Running;
    const QUEUED: JobStatusKind = JobStatusKind::Queued;
    const FAILED: JobStatusKind = JobStatusKind::Failed;
    const CANCELED: JobStatusKind = JobStatusKind::Canceled;

    fn job<'a>(id: &'a str, at: &'a str, workflow: &'a WorkflowKind, status: &'a JobStatusKind) -> ActiveCandidate<'a> {
        ActiveCandidate { job_id: id, created_at: at, workflow, status }
    }

    const T1: &str = "2026-10-01T00:00:00";
    const T2: &str = "2026-10-02T00:00:00";
    const T3: &str = "2026-10-03T00:00:00";

    #[test]
    fn the_usual_case_is_a_no_op_because_submit_already_pointed_at_it() {
        let finished = job("a", T1, &BOOK, &OK);
        assert_eq!(active_job_after_success(Some(finished), finished, Some(finished)), None);
    }

    #[test]
    fn an_empty_or_dangling_pointer_takes_the_finished_job() {
        let finished = job("a", T1, &BOOK, &OK);
        assert_eq!(active_job_after_success(None, finished, Some(finished)), Some("a".into()));
    }

    #[test]
    fn an_older_job_finishing_late_does_not_steal_a_running_newer_job() {
        // 先提交 1-5 页（old），再提交 6-10 页（new，正在跑），old 先完成。
        let old = job("old", T1, &BOOK, &OK);
        for status in [&RUNNING, &QUEUED] {
            let new = job("new", T2, &BOOK, status);
            assert_eq!(active_job_after_success(Some(new), old, Some(old)), None, "{status:?}");
        }
    }

    #[test]
    fn a_running_job_keeps_the_card_even_when_it_is_older_than_the_finished_one() {
        // 原地重新排版（rerun.rs）保留原来的提交时间、把任务改回排队。这时一个更新的任务先
        // 完成 —— 只比新旧的话会把重新排版的进度从书卡上顶掉。
        let relayout = job("relayout", T1, &BOOK, &RUNNING);
        let newer = job("newer", T2, &BOOK, &OK);
        assert_eq!(active_job_after_success(Some(relayout), newer, Some(newer)), None);
    }

    #[test]
    fn an_older_job_finishing_late_does_not_replace_a_newer_finished_one() {
        let new = job("new", T2, &BOOK, &OK);
        let old = job("old", T1, &BOOK, &OK);
        assert_eq!(active_job_after_success(Some(new), old, Some(new)), None);
    }

    #[test]
    fn a_newer_job_replaces_an_older_terminal_one() {
        let finished = job("new", T2, &BOOK, &OK);
        for status in [&OK, &FAILED] {
            let old = job("old", T1, &BOOK, status);
            assert_eq!(active_job_after_success(Some(old), finished, Some(finished)), Some("new".into()));
        }
    }

    #[test]
    fn an_ocr_job_does_not_displace_a_finished_translation() {
        // 自动补 OCR / 用户重新 OCR：书已经翻译好了，书卡继续展示翻译。
        let translation = job("t", T1, &BOOK, &OK);
        let ocr = job("ocr", T2, &OCR, &OK);
        assert_eq!(active_job_after_success(Some(translation), ocr, Some(translation)), None);
    }

    #[test]
    fn an_ocr_job_that_held_the_pointer_hands_it_back_to_the_translation_when_done() {
        // 用户在已翻译的书上提交了 OCR：提交时指针给了 OCR（显示进度），完成后还给翻译。
        let translation = job("t", T1, &BOOK, &OK);
        let ocr = job("ocr", T2, &OCR, &OK);
        assert_eq!(active_job_after_success(Some(ocr), ocr, Some(translation)), Some("t".into()));
    }

    #[test]
    fn an_ocr_job_on_an_untranslated_book_does_take_the_pointer() {
        // 只做了 OCR 的书：没有别的可展示，OCR 任务就是书卡的内容（原来「OCR 后刷新消失」的修复）。
        let ocr = job("ocr", T2, &OCR, &OK);
        assert_eq!(active_job_after_success(None, ocr, None), Some("ocr".into()));
        let failed_older = job("f", T1, &BOOK, &FAILED);
        assert_eq!(active_job_after_success(Some(failed_older), ocr, None), Some("ocr".into()));
    }

    #[test]
    fn a_translation_replaces_an_ocr_pointer_even_if_submitted_earlier() {
        let ocr = job("ocr", T3, &OCR, &OK);
        let translation = job("t", T2, &BOOK, &OK);
        assert_eq!(active_job_after_success(Some(ocr), translation, Some(translation)), Some("t".into()));
    }

    #[test]
    fn same_second_submissions_are_ordered_by_job_id() {
        let a = job("job-a", T1, &BOOK, &OK);
        let b = job("job-b", T1, &BOOK, &OK);
        assert_eq!(active_job_after_success(Some(a), b, Some(b)), Some("job-b".into()));
        assert_eq!(active_job_after_success(Some(b), a, Some(b)), None);
    }

    #[test]
    fn an_older_job_succeeding_replaces_a_newer_canceled_or_failed_one() {
        // 43505a（先提交）还在跑时提交了 b13ad5 又取消；43505a 后跑完，书卡要回到它。
        let old = job("old", T1, &BOOK, &OK);
        for status in [&CANCELED, &FAILED] {
            let new = job("new", T2, &BOOK, status);
            assert_eq!(active_job_after_success(Some(new), old, Some(old)), Some("old".into()), "{status:?}");
        }
    }
}
