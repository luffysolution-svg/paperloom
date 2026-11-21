//! 路由源码在哪：接口清单快照和路径参数分类的测试都直接读源码，不启动服务。

use std::path::{Path, PathBuf};

/// 注册路由的全部源文件：`app/router.rs`、`app/router/` 下所有 `.rs`（含子目录，比如按 9 类分的
/// `app/router/jobs/`），加上自带路由的 `routes/model_requests.rs`。按路径排好序。
pub(crate) fn router_source_files() -> Vec<PathBuf> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut routers = Vec::new();
    collect_rs(&root.join("app/router"), &mut routers);
    routers.sort();
    let mut files = vec![root.join("app/router.rs"), root.join("routes/model_requests.rs")];
    files.extend(routers);
    files
}

fn collect_rs(dir: &Path, out: &mut Vec<PathBuf>) {
    for entry in std::fs::read_dir(dir).unwrap() {
        let path = entry.unwrap().path();
        if path.is_dir() {
            collect_rs(&path, out);
        } else if path.extension().is_some_and(|ext| ext == "rs") {
            out.push(path);
        }
    }
}
