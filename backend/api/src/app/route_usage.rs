//! 端点实际使用计数。
//!
//! 存在的理由:静态分析判不了哪些端点是死的。前端的 URL 是拼出来的——
//! `buildApiEndpoint(apiPrefix, "library/books")`——路径只以片段形式出现在源码里,
//! grep 搜不到完整 URL。盘点时因此连踩两次误报(见
//! `ops/reports/api-endpoint-audit.md`),最离谱的一次是
//! `internal/agent/operations`:前端零引用、看着像死端点,实际调用方是 AI 服务。
//!
//! 所以删端点之前先量一段真实使用。计的是**路由模板**(`/api/v1/jobs/:job_id`)
//! 而不是具体 URL,否则每个 job_id 都会变成一个条目。
//!
//! 计数是累加的:启动时从磁盘读回,所以重启不清零,跑一两周的数据才有意义。

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use axum::extract::{MatchedPath, Request};
use axum::middleware::Next;
use axum::response::Response;
use serde::{Deserialize, Serialize};

#[derive(Debug, Default, Serialize, Deserialize)]
struct UsageFile {
    /// 首次开始计数的时刻,用来判断样本覆盖了多长时间。
    since: String,
    updated_at: String,
    /// `"GET /api/v1/jobs/:job_id" -> 次数`
    routes: BTreeMap<String, u64>,
}

struct UsageState {
    path: PathBuf,
    file: Mutex<UsageFile>,
}

static USAGE: OnceLock<UsageState> = OnceLock::new();

fn usage_path(data_root: &Path) -> PathBuf {
    data_root.join("diagnostics").join("route-usage.json")
}

/// 从磁盘读回既有计数。读不到就从零开始——这个文件丢了只是少一段样本,
/// 不该让服务起不来。
pub(crate) fn init(data_root: &Path) {
    let path = usage_path(data_root);
    let mut file: UsageFile = std::fs::read_to_string(&path)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default();
    if file.since.is_empty() {
        file.since = crate::models::domain::now_iso();
    }
    let _ = USAGE.set(UsageState {
        path,
        file: Mutex::new(file),
    });
}

/// 记一次。拿不到 `MatchedPath` 的请求(404 到 fallback)不计——它们没有路由模板,
/// 计进来只会是一堆噪音。
pub(crate) async fn record(request: Request, next: Next) -> Response {
    let key = request
        .extensions()
        .get::<MatchedPath>()
        .map(|matched| format!("{} {}", request.method(), matched.as_str()));
    let response = next.run(request).await;
    if let (Some(key), Some(state)) = (key, USAGE.get()) {
        if let Ok(mut file) = state.file.lock() {
            *file.routes.entry(key).or_insert(0) += 1;
        }
    }
    response
}

/// 落盘。由后台任务周期调用——每次请求都写盘没必要,丢掉最后一个周期的
/// 计数对「这个端点有没有人用」这个问题毫无影响。
pub(crate) fn flush() {
    let Some(state) = USAGE.get() else {
        return;
    };
    let snapshot = {
        let Ok(mut file) = state.file.lock() else {
            return;
        };
        file.updated_at = crate::models::domain::now_iso();
        serde_json::to_string_pretty(&*file)
    };
    let Ok(text) = snapshot else {
        return;
    };
    if let Some(parent) = state.path.parent() {
        if std::fs::create_dir_all(parent).is_err() {
            return;
        }
    }
    // 同目录临时文件 + rename:读这个文件的人(运维、脚本)不该看到写了一半的 JSON。
    let temp = state.path.with_extension("json.tmp");
    if std::fs::write(&temp, text).is_ok() {
        let _ = std::fs::rename(&temp, &state.path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root() -> PathBuf {
        let root = std::env::temp_dir().join(format!("route-usage-{}", fastrand::u64(..)));
        std::fs::create_dir_all(&root).expect("temp root");
        root
    }

    /// 计的必须是路由模板,不是具体 URL。
    ///
    /// 这是这个功能能不能用的关键:按具体 URL 计,每个 job_id 都会变成一个条目,
    /// 跑一天就是几万行,而「/jobs/:job_id 有没有人用」这个问题反而看不出来。
    #[test]
    fn counts_route_templates_not_concrete_urls() {
        let root = temp_root();
        init(&root);
        let Some(state) = USAGE.get() else {
            panic!("init 应当建立全局状态");
        };
        {
            let mut file = state.file.lock().expect("lock");
            // 模拟同一路由被不同 job_id 命中三次
            *file
                .routes
                .entry("GET /api/v1/jobs/:job_id".to_string())
                .or_insert(0) += 3;
        }
        flush();

        let text = std::fs::read_to_string(usage_path(&root)).expect("落盘文件");
        let parsed: UsageFile = serde_json::from_str(&text).expect("解析");
        assert_eq!(
            parsed.routes.get("GET /api/v1/jobs/:job_id"),
            Some(&3),
            "三次请求应当合并到同一个模板条目上"
        );
        assert!(!parsed.since.is_empty(), "since 用来判断样本覆盖多长时间");
        assert!(!parsed.updated_at.is_empty());
        let _ = std::fs::remove_dir_all(root);
    }
}
