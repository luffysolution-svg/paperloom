use serde::{Deserialize, Serialize};

use crate::models::defaults::default_timeout_seconds;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct RuntimeInput {
    #[serde(default)]
    pub job_id: String,
    #[serde(default = "default_timeout_seconds")]
    pub timeout_seconds: i64,
    /// 多久没有任何 stdout 输出就判定 worker 卡死(秒),`0` 表示关闭。
    ///
    /// `timeout_seconds` 是整段执行的上限,要按最坏情况给——一本大部头翻译
    /// 几个小时是正常的,阈值就得设到几个小时。于是"第一页之后再没动静"
    /// 这种卡死也要等满那几个小时才被发现。这个字段独立地盯"还在不在动",
    /// 与总时长无关。
    ///
    /// 默认关闭:各阶段的正常静默时长差别很大(等 provider 响应、单页 OCR),
    /// 一个统一的默认值会误杀。由调用方按工作流显式设定。
    #[serde(default)]
    pub no_output_timeout_seconds: i64,
    /// Internal execution policy used by the document translation endpoint.
    /// The public `translate` workflow normally stops after translation, while
    /// a document-scoped translation must also produce a rendered candidate.
    #[serde(default)]
    pub render_after_translation: bool,
}

impl Default for RuntimeInput {
    fn default() -> Self {
        Self {
            job_id: String::new(),
            timeout_seconds: default_timeout_seconds(),
            no_output_timeout_seconds: 0,
            render_after_translation: false,
        }
    }
}
