use std::collections::HashSet;

use anyhow::Result;

use crate::db::{Db, PipelineAttemptCursor, PipelineUnitCommit};
use crate::models::domain::JobRuntimeState;

use super::super::stdout_parser::PipelineCheckpointObservation;

pub(super) fn apply_durable_checkpoint(
    db: &Db,
    cursor: &mut PipelineAttemptCursor,
    job: &mut JobRuntimeState,
    observation: PipelineCheckpointObservation,
) -> Result<()> {
    if observation.stage.trim() != cursor.stage_key {
        anyhow::bail!(
            "pipeline checkpoint stage mismatch for job {}: worker={} authoritative={}",
            cursor.job_id,
            observation.stage,
            cursor.stage_key
        );
    }
    let unit_fields = (
        observation.unit_key.as_deref(),
        observation.unit_order,
        observation.page_index,
        observation.page_hash.as_deref(),
    );
    let present_unit_fields = [
        unit_fields.0.is_some(),
        unit_fields.1.is_some(),
        unit_fields.2.is_some(),
        unit_fields.3.is_some(),
    ]
    .into_iter()
    .filter(|present| *present)
    .count();
    if present_unit_fields != 0 && present_unit_fields != 4 {
        anyhow::bail!(
            "pipeline checkpoint has a partial committed-unit identity for job {}",
            cursor.job_id
        );
    }
    if present_unit_fields != 0 && !observation.committed_pages.is_empty() {
        anyhow::bail!(
            "pipeline checkpoint mixes legacy unit fields with committed_pages for job {}",
            cursor.job_id
        );
    }

    let commits = if let (Some(unit_key), Some(unit_order), Some(page_index), Some(page_hash)) =
        unit_fields
    {
        vec![PipelineUnitCommit {
            unit_key: unit_key.to_string(),
            unit_order,
            page_index: Some(page_index),
            page_hash: page_hash.to_string(),
            producer_generation: Some(observation.producer_generation),
            payload: serde_json::json!({
                "phase": observation.phase.clone(),
                "status": observation.status.clone(),
                "progress": observation.progress.clone(),
                "changed_item_ids": [unit_key],
            }),
        }]
    } else {
        batch_commits(cursor, &observation)?
    };

    let mut authoritative_transition = false;
    if !commits.is_empty() {
        let checkpoint = db.commit_pipeline_units(cursor, &commits)?;
        cursor.generation = checkpoint.generation;
        authoritative_transition = true;
    }
    if observation.status == "complete" {
        let checkpoint = db.complete_pipeline_stage(cursor)?;
        cursor.generation = checkpoint.generation;
        authoritative_transition = true;
    }
    // JobRuntimeState is only a compatibility projection. Never let a raw
    // checkpoint line with no accepted durable transition drive public
    // progress; stage observations and committed units own that state.
    if authoritative_transition {
        if let Some(progress) = observation.progress.as_object() {
            let current = progress
                .get("completed_item_count")
                .and_then(serde_json::Value::as_i64);
            let total = progress
                .get("item_count")
                .and_then(serde_json::Value::as_i64);
            job.progress_current = current;
            job.progress_total = total;
            // 数字换了,说明它的那句话也得换。
            //
            // 这里原先只写 progress、不碰 stage_detail,于是随后持久化发出的
            // 事件带着新数字、配着进入该阶段时设下的入场语。实测长这样:
            //
            //     stage_progress | 10/26 | 已完成第 10/26 批翻译（最近页: 1,2）
            //     stage_progress | 35/50 | OCR 完成，开始翻译
            //     stage_progress | 50/50 | OCR 完成，开始翻译
            //
            // 前端取该阶段最后一条,就会显示成「进度 100%,正在开始翻译」。
            //
            // 26 与 50 两个分母不是矛盾,是两种粒度在量同一件事:pipeline 报的
            // 是批次,durable checkpoint 记的是翻译单元(文本块),50 个块分成
            // 26 批,两者的百分比都单调递增。所以不必统一分母,只要每条事件
            // 自己的数字和文字对得上。
            if let (Some(current), Some(total)) = (current, total) {
                job.stage_detail =
                    Some(durable_progress_detail(&observation.stage, current, total));
            }
        }
    }
    Ok(())
}

/// 与 durable 单元进度配套的说明文字。
///
/// 刻意不复用阶段入场语:那句话描述的是「进入这个阶段」,而这里描述的是
/// 「在这个阶段里推进到哪了」,两者会在同一个 stage 内反复交替出现。
///
/// 判据取 `observation.stage`(`translate` / `render`)而不是 `phase`。翻译一段
/// 里 phase 会依次走过 `preparing` → `translating` → `validating` → `committed`,
/// 按 phase 匹配只认得中间那个,最后一次 checkpoint(committed)就落进兜底,把
/// 已经写对的「已完成 59/59 个文本块」又覆盖成「已完成 59/59 项」——真实任务
/// 上就是这么翻车的(事件 seq 111 对、115 被覆盖)。stage 在整段翻译里恒为
/// `translate`,不会漏。
fn durable_progress_detail(stage: &str, current: i64, total: i64) -> String {
    let unit = match stage {
        "translate" | "translating" => "个文本块",
        "render" | "rendering" => "页",
        _ => "项",
    };
    format!("已完成 {current}/{total} {unit}")
}

fn batch_commits(
    cursor: &PipelineAttemptCursor,
    observation: &PipelineCheckpointObservation,
) -> Result<Vec<PipelineUnitCommit>> {
    let mut page_indexes = HashSet::new();
    observation
        .committed_pages
        .iter()
        .map(|page| {
            if !page_indexes.insert(page.page_index) {
                anyhow::bail!(
                    "pipeline checkpoint contains page {} more than once for job {}",
                    page.page_index,
                    cursor.job_id
                );
            }
            let mut changed_item_ids = page
                .changed_item_ids
                .iter()
                .map(|value| value.trim())
                .filter(|value| !value.is_empty())
                .map(str::to_string)
                .collect::<Vec<_>>();
            changed_item_ids.sort();
            changed_item_ids.dedup();
            if changed_item_ids.is_empty() {
                changed_item_ids.push(page.unit_key.clone());
            }
            Ok(PipelineUnitCommit {
                unit_key: page.unit_key.clone(),
                unit_order: page.unit_order,
                page_index: Some(page.page_index),
                page_hash: page.page_hash.clone(),
                producer_generation: Some(observation.producer_generation),
                payload: serde_json::json!({
                    "phase": observation.phase.clone(),
                    "status": observation.status.clone(),
                    "progress": observation.progress.clone(),
                    "changed_item_ids": changed_item_ids,
                }),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;
    use crate::job_runner::stdout_parser::parse_pipeline_checkpoint_line;
    use crate::models::domain::JobSnapshot;
    use crate::models::request::CreateJobInput;

    #[test]
    fn multi_page_checkpoint_becomes_one_atomic_authoritative_transition() {
        let root = std::env::temp_dir().join(format!(
            "retain-multi-page-checkpoint-{}-{}",
            std::process::id(),
            fastrand::u64(..)
        ));
        fs::create_dir_all(&root).expect("fixture root");
        let db = Db::new(root.join("jobs.db"), root.clone());
        db.init().expect("init db");
        let snapshot = JobSnapshot::new(
            "job-1".to_string(),
            CreateJobInput::default(),
            vec!["python".to_string()],
        );
        db.save_job(&snapshot).expect("seed job");
        let mut runtime = snapshot.into_runtime();
        let mut cursor = db
            .acquire_pipeline_attempt("job-1", "worker-a", "translate", 1)
            .expect("translate attempt");
        let observation = parse_pipeline_checkpoint_line(
            r#"{"event_type":"pipeline_checkpoint","payload":{"schema":"pipeline_checkpoint_v1","schema_version":1,"stage":"translate","phase":"translating","status":"in_progress","producer_generation":8,"committed_pages":[{"unit_key":"p001-b2","unit_order":2,"page_index":0,"page_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","changed_item_ids":["p001-b1","p001-b2"]},{"unit_key":"p002-b1","unit_order":3,"page_index":1,"page_hash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","changed_item_ids":["p002-b1"]}],"progress":{"completed_item_count":3,"item_count":10}}}"#,
        )
        .expect("parse checkpoint");

        apply_durable_checkpoint(&db, &mut cursor, &mut runtime, observation)
            .expect("apply checkpoint");

        let units = db
            .list_pipeline_units("job-1", cursor.attempt, "translate")
            .expect("translation units");
        assert_eq!(units.len(), 2);
        assert_eq!(units[0].generation, units[1].generation);
        assert_eq!(runtime.progress_current, Some(3));
        assert_eq!(runtime.progress_total, Some(10));
        // 数字与它的说明文字必须配套。原先这里只写数字,文案留着阶段入场语
        // 「OCR 完成，开始翻译」,于是发出去的事件是「50/50 · 开始翻译」——
        // 前端取最后一条就会显示「进度 100%,正在开始翻译」。
        assert_eq!(
            runtime.stage_detail.as_deref(),
            Some("已完成 3/10 个文本块"),
            "durable 进度更新后,stage_detail 必须描述这个进度,不能留着入场语"
        );
        let events = db
            .list_translation_commit_events_after("job-1", 0, 10)
            .expect("commit events");
        assert_eq!(events.len(), 2);
        assert_eq!(
            events[0].payload["changed_item_ids"],
            serde_json::json!(["p001-b1", "p001-b2"])
        );

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn durable_progress_detail_names_the_unit_each_stage_actually_counts() {
        // 各阶段数的东西不一样:翻译按文本块、渲染按页。文案说错单位比不说
        // 更糟——「已完成 3/10 页」出现在一个 4 页的文档上会让人以为出了问题。
        // 判据是 observation.stage,整段翻译恒为 translate;按 phase 匹配会在
        // committed 那次漏掉,把已经写对的文案覆盖成兜底的「项」。
        assert_eq!(
            durable_progress_detail("translate", 3, 10),
            "已完成 3/10 个文本块"
        );
        assert_eq!(durable_progress_detail("render", 2, 4), "已完成 2/4 页");
        assert_eq!(
            durable_progress_detail("unknown_stage", 1, 2),
            "已完成 1/2 项"
        );
    }
}
