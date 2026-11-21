//! 核心包里只留各领域都要用的：事件在库里存的记录（`JobEventRecord` 和它的两个字段类型，数据库层和事件流都用）和拼绝对地址的
//! `to_absolute_url`。接口的返回类型按领域放在各自的包里：任务的在 retainpdf-jobs 的 `views`，
//! 产物和操作链接在 retainpdf-files，书库、术语表、平台各在自己的包（2026-10-18 拆开）。

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JobEventRecord {
    pub job_id: String,
    pub seq: i64,
    pub ts: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub created_at: String,
    pub level: String,
    #[serde(default, skip_serializing)]
    pub user_stage: Option<String>,
    #[serde(default)]
    pub lane: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_stage: Option<String>,
    pub stage: Option<String>,
    #[serde(default)]
    pub substage: Option<String>,
    #[serde(default)]
    pub stage_detail: Option<String>,
    #[serde(default)]
    pub provider: Option<String>,
    #[serde(default)]
    pub provider_stage: Option<String>,
    pub event: String,
    #[serde(default)]
    pub event_type: Option<String>,
    #[serde(default)]
    pub raw_event_type: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub raw: Option<JobEventRawView>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub progress: Option<JobEventProgressView>,
    pub message: String,
    #[serde(default, skip_serializing)]
    pub progress_current: Option<i64>,
    #[serde(default, skip_serializing)]
    pub progress_total: Option<i64>,
    #[serde(default, skip_serializing)]
    pub progress_unit: Option<String>,
    #[serde(default)]
    pub retry_count: Option<u32>,
    #[serde(default)]
    pub elapsed_ms: Option<i64>,
    pub payload: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct JobEventProgressView {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub current: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub percent: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct JobEventRawView {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_kind: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_seq: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stage: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_stage: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub event_type: Option<String>,
}

pub fn to_absolute_url(base_url: &str, path: &str) -> String {
    format!("{}{}", base_url.trim_end_matches('/'), path)
}
