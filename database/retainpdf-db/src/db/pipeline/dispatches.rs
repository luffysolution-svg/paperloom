use anyhow::{anyhow, bail, Result};
use rusqlite::{params, OptionalExtension, Transaction, TransactionBehavior};
use serde_json::{json, Value};

use super::events::append_state_event;
use super::queries::dispatch_record_by_identity;
use super::tx::{advance_generation, assert_cursor, validate_identity, validate_sha256};
use super::types::{
    PipelineAttemptCursor, PipelineDispatchBegin, PipelineDispatchIntent, PipelineDispatchRecord,
};
use crate::db::Db;
use crate::models::domain::now_iso;

impl Db {
    /// Persists an external dispatch intent before the request is sent.
    /// A prior receipt is replay-safe; a prior bare intent is not.
    pub fn begin_pipeline_dispatch(
        &self,
        cursor: &PipelineAttemptCursor,
        intent: &PipelineDispatchIntent,
    ) -> Result<PipelineDispatchBegin> {
        validate_identity("dispatch_key", &intent.dispatch_key)?;
        validate_identity("provider", &intent.provider)?;
        validate_identity("operation", &intent.operation)?;
        validate_sha256("request_hash", &intent.request_hash)?;
        let mut conn = self.connect()?;
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        assert_cursor(&tx, cursor)?;
        let existing = dispatch_record(&tx, cursor, &intent.dispatch_key)?;
        if let Some(existing) = existing {
            if existing.request_hash != intent.request_hash
                || existing.provider != intent.provider
                || existing.operation != intent.operation
            {
                bail!(
                    "pipeline dispatch identity changed for job {} key {}",
                    cursor.job_id,
                    intent.dispatch_key
                );
            }
            if existing.status == "receipted" {
                let receipt = existing.receipt.ok_or_else(|| {
                    anyhow!(
                        "receipted pipeline dispatch is missing receipt for job {} key {}",
                        cursor.job_id,
                        intent.dispatch_key
                    )
                })?;
                return Ok(PipelineDispatchBegin::Resume {
                    cursor: cursor.clone(),
                    receipt,
                });
            }
            if existing.status == "ambiguous" {
                return Ok(PipelineDispatchBegin::Ambiguous {
                    cursor: cursor.clone(),
                    reason: existing
                        .ambiguity_reason
                        .unwrap_or_else(|| "dispatch intent has no durable receipt".to_string()),
                });
            }
            let reason =
                "runtime recovered an OCR dispatch intent without a provider receipt".to_string();
            let next = transition_dispatch_status(
                &tx,
                cursor,
                &intent.dispatch_key,
                "ambiguous",
                None,
                Some(&reason),
                "pipeline_dispatch_ambiguous",
            )?;
            tx.commit()?;
            return Ok(PipelineDispatchBegin::Ambiguous {
                cursor: next,
                reason,
            });
        }

        let timestamp = now_iso();
        let next_generation = cursor.generation + 1;
        tx.execute(
            r#"
            INSERT INTO pipeline_dispatches (
                job_id, attempt, stage_key, dispatch_key, generation, provider,
                operation, request_hash, status, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'intent', ?9, ?9)
            "#,
            params![
                cursor.job_id,
                cursor.attempt,
                cursor.stage_key,
                intent.dispatch_key,
                next_generation,
                intent.provider,
                intent.operation,
                intent.request_hash,
                timestamp,
            ],
        )?;
        advance_generation(&tx, cursor, next_generation, &timestamp)?;
        append_state_event(
            &tx,
            &cursor.job_id,
            &cursor.stage_key,
            "pipeline_dispatch_intent",
            &format!("prepared external dispatch {}", intent.dispatch_key),
            json!({
                "attempt": cursor.attempt,
                "generation": next_generation,
                "stage": cursor.stage_key,
                "dispatch_key": intent.dispatch_key,
                "provider": intent.provider,
                "operation": intent.operation,
            }),
        )?;
        tx.commit()?;
        Ok(PipelineDispatchBegin::Send {
            cursor: PipelineAttemptCursor {
                generation: next_generation,
                ..cursor.clone()
            },
        })
    }

    pub fn receipt_pipeline_dispatch(
        &self,
        cursor: &PipelineAttemptCursor,
        dispatch_key: &str,
        receipt: &Value,
    ) -> Result<PipelineAttemptCursor> {
        validate_identity("dispatch_key", dispatch_key)?;
        let mut conn = self.connect()?;
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        assert_cursor(&tx, cursor)?;
        let existing = dispatch_record(&tx, cursor, dispatch_key)?
            .ok_or_else(|| anyhow!("pipeline dispatch intent not found: {dispatch_key}"))?;
        if existing.status == "receipted" {
            if existing.receipt.as_ref() == Some(receipt) {
                return Ok(cursor.clone());
            }
            bail!("pipeline dispatch receipt conflicts for key {dispatch_key}");
        }
        if existing.status != "intent" {
            bail!(
                "pipeline dispatch {dispatch_key} cannot receive receipt from status {}",
                existing.status
            );
        }
        let next = transition_dispatch_status(
            &tx,
            cursor,
            dispatch_key,
            "receipted",
            Some(receipt),
            None,
            "pipeline_dispatch_receipted",
        )?;
        tx.commit()?;
        Ok(next)
    }

    pub fn mark_pipeline_dispatch_ambiguous(
        &self,
        cursor: &PipelineAttemptCursor,
        dispatch_key: &str,
        reason: &str,
    ) -> Result<PipelineAttemptCursor> {
        validate_identity("dispatch_key", dispatch_key)?;
        validate_identity("ambiguity_reason", reason)?;
        let mut conn = self.connect()?;
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        assert_cursor(&tx, cursor)?;
        let existing = dispatch_record(&tx, cursor, dispatch_key)?
            .ok_or_else(|| anyhow!("pipeline dispatch intent not found: {dispatch_key}"))?;
        if existing.status == "ambiguous" {
            return Ok(cursor.clone());
        }
        if existing.status != "intent" {
            bail!(
                "pipeline dispatch {dispatch_key} cannot become ambiguous from status {}",
                existing.status
            );
        }
        let next = transition_dispatch_status(
            &tx,
            cursor,
            dispatch_key,
            "ambiguous",
            None,
            Some(reason),
            "pipeline_dispatch_ambiguous",
        )?;
        tx.commit()?;
        Ok(next)
    }

    /// 确定请求没有离开本进程（连接都没建起来、请求没构造出来）：撤销刚写的 intent，
    /// 免得它以后被当成「结果说不清」。已经不是 intent（有回执、已标 ambiguous）就不动。
    pub fn discard_pipeline_dispatch_intent(
        &self,
        cursor: &PipelineAttemptCursor,
        dispatch_key: &str,
    ) -> Result<bool> {
        validate_identity("dispatch_key", dispatch_key)?;
        let mut conn = self.connect()?;
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        assert_cursor(&tx, cursor)?;
        let removed = tx.execute(
            r#"
            DELETE FROM pipeline_dispatches
            WHERE job_id = ?1 AND attempt = ?2 AND dispatch_key = ?3 AND status = 'intent'
            "#,
            params![cursor.job_id, cursor.attempt, dispatch_key],
        )?;
        if removed == 1 {
            let next_generation = cursor.generation + 1;
            let timestamp = now_iso();
            advance_generation(&tx, cursor, next_generation, &timestamp)?;
            append_state_event(
                &tx,
                &cursor.job_id,
                &cursor.stage_key,
                "pipeline_dispatch_discarded",
                &format!("external dispatch {dispatch_key} never left the process"),
                json!({
                    "attempt": cursor.attempt,
                    "generation": next_generation,
                    "stage": cursor.stage_key,
                    "dispatch_key": dispatch_key,
                }),
            )?;
        }
        tx.commit()?;
        Ok(removed == 1)
    }

    /// 进程在发出请求之后、拿到回执之前死掉（重启对账时用）：这个任务正在跑的 attempt 里
    /// 还停在 intent 的派发，请求有没有送到服务商已经说不清，统一标成 ambiguous，
    /// 让重试、重跑的闸门认得出来。没有正在跑的 attempt 就什么都不做。返回标了几条。
    pub fn mark_open_dispatch_intents_ambiguous(&self, job_id: &str, reason: &str) -> Result<usize> {
        validate_identity("job_id", job_id)?;
        validate_identity("ambiguity_reason", reason)?;
        let mut conn = self.connect()?;
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        let attempt = tx
            .query_row(
                r#"
                SELECT attempt, generation, worker_id
                FROM pipeline_attempts
                WHERE job_id = ?1 AND status = 'running'
                ORDER BY attempt DESC LIMIT 1
                "#,
                params![job_id],
                |row| {
                    Ok((
                        row.get::<_, i64>(0)? as u32,
                        row.get::<_, i64>(1)? as u64,
                        row.get::<_, String>(2)?,
                    ))
                },
            )
            .optional()?;
        let Some((attempt, mut generation, worker_id)) = attempt else {
            return Ok(0);
        };
        let open: Vec<(String, String)> = {
            let mut stmt = tx.prepare(
                r#"
                SELECT dispatch_key, stage_key FROM pipeline_dispatches
                WHERE job_id = ?1 AND attempt = ?2 AND status = 'intent'
                ORDER BY dispatch_key
                "#,
            )?;
            let rows = stmt.query_map(params![job_id, attempt], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })?;
            rows.collect::<std::result::Result<Vec<_>, _>>()?
        };
        for (dispatch_key, stage_key) in &open {
            let cursor = PipelineAttemptCursor {
                job_id: job_id.to_string(),
                attempt,
                generation,
                worker_id: worker_id.clone(),
                stage_key: stage_key.clone(),
            };
            generation = transition_dispatch_status(
                &tx,
                &cursor,
                dispatch_key,
                "ambiguous",
                None,
                Some(reason),
                "pipeline_dispatch_ambiguous",
            )?
            .generation;
        }
        tx.commit()?;
        Ok(open.len())
    }
}

fn dispatch_record(
    tx: &Transaction<'_>,
    cursor: &PipelineAttemptCursor,
    dispatch_key: &str,
) -> Result<Option<PipelineDispatchRecord>> {
    dispatch_record_by_identity(tx, &cursor.job_id, cursor.attempt, dispatch_key)
}

#[allow(clippy::too_many_arguments)]
fn transition_dispatch_status(
    tx: &Transaction<'_>,
    cursor: &PipelineAttemptCursor,
    dispatch_key: &str,
    status: &str,
    receipt: Option<&Value>,
    ambiguity_reason: Option<&str>,
    event: &str,
) -> Result<PipelineAttemptCursor> {
    let next_generation = cursor.generation + 1;
    let timestamp = now_iso();
    let receipt_json = receipt.map(serde_json::to_string).transpose()?;
    tx.execute(
        r#"
        UPDATE pipeline_dispatches
        SET generation = ?1, status = ?2, receipt_json = ?3,
            ambiguity_reason = ?4, updated_at = ?5,
            receipted_at = CASE WHEN ?2 = 'receipted' THEN ?5 ELSE receipted_at END
        WHERE job_id = ?6 AND attempt = ?7 AND dispatch_key = ?8
        "#,
        params![
            next_generation,
            status,
            receipt_json,
            ambiguity_reason,
            timestamp,
            cursor.job_id,
            cursor.attempt,
            dispatch_key,
        ],
    )?;
    advance_generation(tx, cursor, next_generation, &timestamp)?;
    let receipt_fields = receipt
        .and_then(Value::as_object)
        .map(|object| object.keys().cloned().collect::<Vec<_>>())
        .unwrap_or_default();
    append_state_event(
        tx,
        &cursor.job_id,
        &cursor.stage_key,
        event,
        &format!("external dispatch {dispatch_key} {status}"),
        json!({
            "attempt": cursor.attempt,
            "generation": next_generation,
            "stage": cursor.stage_key,
            "dispatch_key": dispatch_key,
            "status": status,
            "receipt_present": receipt.is_some(),
            "receipt_fields": receipt_fields,
            "ambiguity_reason": ambiguity_reason,
        }),
    )?;
    Ok(PipelineAttemptCursor {
        generation: next_generation,
        ..cursor.clone()
    })
}
