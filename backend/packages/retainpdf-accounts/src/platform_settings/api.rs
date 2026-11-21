//! 平台设置的应用接口：路由只经这里（不直接碰库、配置）。规则见上一级模块。

use std::path::PathBuf;
use std::sync::Arc;

use retainpdf_core::config::{DeepSeekRuntimeConfig, MineruRuntimeConfig, PaddleRuntimeConfig, PlatformModels};
use retainpdf_data::db::Db;
use retainpdf_api_base::error::AppError;

pub use super::{PlatformSettingsView, PlatformTestView, SavePlatformSettingsInput, TestPlatformInput};

/// 路由边界装配好的依赖（见 routes/common/platform_settings.rs）。
pub struct PlatformSettingsApiDeps {
    db: Arc<Db>,
    data_root: PathBuf,
    env: PlatformModels,
    runtimes: super::ProbeRuntimes,
}

impl PlatformSettingsApiDeps {
    pub fn new(
        db: Arc<Db>,
        data_root: PathBuf,
        env: PlatformModels,
        deepseek: DeepSeekRuntimeConfig,
        mineru: MineruRuntimeConfig,
        paddle: PaddleRuntimeConfig,
    ) -> Self {
        Self { db, data_root, env, runtimes: super::ProbeRuntimes { deepseek, mineru, paddle } }
    }

    pub fn view(&self) -> Result<PlatformSettingsView, AppError> {
        super::view(&self.db, &self.data_root, &self.env)
    }

    pub fn save(&self, actor_user_id: &str, input: SavePlatformSettingsInput) -> Result<PlatformSettingsView, AppError> {
        super::save(&self.db, &self.data_root, &self.env, &self.runtimes.deepseek, actor_user_id, input)
    }

    pub async fn test(&self, input: TestPlatformInput) -> Result<PlatformTestView, AppError> {
        super::test(&self.db, &self.data_root, &self.env, &self.runtimes, input).await
    }
}
