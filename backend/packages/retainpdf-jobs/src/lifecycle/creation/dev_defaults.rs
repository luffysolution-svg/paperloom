//! 本机开发栈的翻译默认值：请求里没写的模型 / 地址 / key / 并发，用 `.env.local` 补。
//!
//! 只为直接调后端接口测试（curl、脚本）省事：不用每次在请求里写一遍模型配置。只有开发栈
//! （`ops/development/dev_stack.py`）会从 `.env.local` 读出这几个环境变量传给后端；桌面版和
//! 部署环境没有它们，这里就是空操作。
//!
//! # 什么时候补
//!
//! - 请求里**完全没带翻译凭据**（没有 `api_key`、`credential_ref`、执行器连接）时，补模型、
//!   地址、key 里空着的。请求带了凭据就一律不动 —— 否则可能把 `.env.local` 的 key 配到请求
//!   指定的另一个模型上。
//! - `workers` 为 0（= 没写）时补并发。

use retainpdf_core::models::request::CreateJobInput;

pub(crate) const MODEL_ENV: &str = "RETAIN_TEST_TRANSLATION_MODEL";
pub(crate) const BASE_URL_ENV: &str = "RETAIN_TEST_TRANSLATION_BASE_URL";
pub(crate) const API_KEY_ENV: &str = "RETAIN_TEST_TRANSLATION_API_KEY";
pub(crate) const WORKERS_ENV: &str = "RETAIN_TEST_TRANSLATION_WORKERS";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DevTranslationDefaults {
    pub model: String,
    pub base_url: String,
    pub api_key: String,
    pub workers: Option<i64>,
}

impl DevTranslationDefaults {
    /// 模型、地址、key 三样齐了才算配置了；缺一样就当没有，免得补出一个半残的请求。
    pub(crate) fn from_env(get: impl Fn(&str) -> Option<String>) -> Option<Self> {
        let read = |name: &str| get(name).map(|value| value.trim().to_string()).filter(|value| !value.is_empty());
        Some(Self {
            model: read(MODEL_ENV)?,
            base_url: read(BASE_URL_ENV)?,
            api_key: read(API_KEY_ENV)?,
            workers: read(WORKERS_ENV).and_then(|value| value.parse::<i64>().ok()).filter(|workers| *workers > 0),
        })
    }

    pub(crate) fn apply(&self, input: &mut CreateJobInput) {
        let translation = &mut input.translation;
        let has_credentials = !translation.api_key.trim().is_empty()
            || !translation.credential_ref.trim().is_empty()
            || translation.execution_connection.is_some();
        if !has_credentials {
            if translation.model.trim().is_empty() {
                translation.model = self.model.clone();
            }
            if translation.base_url.trim().is_empty() {
                translation.base_url = self.base_url.clone();
            }
            translation.api_key = self.api_key.clone();
        }
        if translation.workers <= 0 {
            if let Some(workers) = self.workers {
                translation.workers = workers;
            }
        }
    }
}

/// 进程环境里有开发默认值就补上，没有就原样返回。
pub fn with_dev_translation_defaults(input: &CreateJobInput) -> CreateJobInput {
    let mut input = input.clone();
    #[cfg(any(test, feature = "test-fixtures"))]
    let defaults = TEST_OVERRIDE.with(|cell| cell.borrow().clone()).or_else(|| DevTranslationDefaults::from_env(|name| std::env::var(name).ok()));
    #[cfg(not(any(test, feature = "test-fixtures")))]
    let defaults = DevTranslationDefaults::from_env(|name| std::env::var(name).ok());
    if let Some(defaults) = defaults {
        defaults.apply(&mut input);
    }
    input
}

// 测试里不能设进程环境变量：它是全局的，会让同时在跑的「缺 base_url 要报错」之类的测试
// 莫名其妙地变绿或变红。按线程隔离的覆盖值只影响设置它的那个测试。
#[cfg(any(test, feature = "test-fixtures"))]
thread_local! {
    static TEST_OVERRIDE: std::cell::RefCell<Option<DevTranslationDefaults>> = const { std::cell::RefCell::new(None) };
}

#[cfg(any(test, feature = "test-fixtures"))]
pub struct DevDefaultsGuard;

#[cfg(any(test, feature = "test-fixtures"))]
impl DevDefaultsGuard {
    pub fn set(defaults: DevTranslationDefaults) -> Self {
        TEST_OVERRIDE.with(|cell| *cell.borrow_mut() = Some(defaults));
        Self
    }
}

/// 把当前线程的覆盖值带到执行 `work` 的那个线程：rust_api 的处理函数把建任务放进阻塞线程做
/// （`run_state_blocking`），按线程隔离的覆盖值不带过去，那边就看不到。
#[cfg(any(test, feature = "test-fixtures"))]
pub fn carry_dev_defaults_override<T>(work: impl FnOnce() -> T) -> impl FnOnce() -> T {
    let carried = TEST_OVERRIDE.with(|cell| cell.borrow().clone());
    move || {
        let _guard = carried.map(DevDefaultsGuard::set);
        work()
    }
}

#[cfg(any(test, feature = "test-fixtures"))]
impl Drop for DevDefaultsGuard {
    fn drop(&mut self) {
        TEST_OVERRIDE.with(|cell| *cell.borrow_mut() = None);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn env<'a>(pairs: &'a [(&'a str, &'a str)]) -> impl Fn(&str) -> Option<String> + 'a {
        move |name| pairs.iter().find(|(key, _)| *key == name).map(|(_, value)| value.to_string())
    }

    fn full() -> Vec<(&'static str, &'static str)> {
        vec![
            (MODEL_ENV, "glm-5.3-flash"),
            (BASE_URL_ENV, "https://open.bigmodel.cn/api/paas/v4"),
            (API_KEY_ENV, "dev-key"),
            (WORKERS_ENV, "20"),
        ]
    }

    #[test]
    fn a_request_without_credentials_gets_the_whole_dev_model_config() {
        let pairs = full();
        let defaults = DevTranslationDefaults::from_env(env(&pairs)).unwrap();
        let mut input = CreateJobInput::default();
        defaults.apply(&mut input);
        assert_eq!(input.translation.model, "glm-5.3-flash");
        assert_eq!(input.translation.base_url, "https://open.bigmodel.cn/api/paas/v4");
        assert_eq!(input.translation.api_key, "dev-key");
        assert_eq!(input.translation.workers, 20);
    }

    #[test]
    fn a_request_with_its_own_credentials_keeps_its_model_and_key() {
        // 带了凭据 = 调用方指定了模型；不能把开发 key 配到别的模型上。
        let pairs = full();
        let defaults = DevTranslationDefaults::from_env(env(&pairs)).unwrap();
        for setup in [
            |input: &mut CreateJobInput| input.translation.api_key = "caller-key".into(),
            |input: &mut CreateJobInput| input.translation.credential_ref = "cred-1".into(),
        ] {
            let mut input = CreateJobInput::default();
            setup(&mut input);
            input.translation.model = "deepseek-flash".into();
            defaults.apply(&mut input);
            assert_eq!(input.translation.model, "deepseek-flash");
            assert_eq!(input.translation.base_url, "", "带了凭据的请求不该被补地址");
            assert_ne!(input.translation.api_key, "dev-key");
        }
    }

    #[test]
    fn explicit_fields_win_over_dev_defaults() {
        let pairs = full();
        let defaults = DevTranslationDefaults::from_env(env(&pairs)).unwrap();
        let mut input = CreateJobInput::default();
        input.translation.model = "glm-4.5-air".into();
        input.translation.workers = 3;
        defaults.apply(&mut input);
        assert_eq!(input.translation.model, "glm-4.5-air");
        assert_eq!(input.translation.workers, 3);
        assert_eq!(input.translation.api_key, "dev-key", "没带凭据，key 仍要补上");
    }

    #[test]
    fn an_incomplete_dev_config_counts_as_none() {
        // 缺 key：补出来的请求必然失败，不如当没配置，让原来的「缺凭据」报错说清楚。
        let pairs = vec![(MODEL_ENV, "glm-5.3-flash"), (BASE_URL_ENV, "https://open.bigmodel.cn/api/paas/v4")];
        assert_eq!(DevTranslationDefaults::from_env(env(&pairs)), None);
        let blank = vec![(MODEL_ENV, "glm-5.3-flash"), (BASE_URL_ENV, "x"), (API_KEY_ENV, "   ")];
        assert_eq!(DevTranslationDefaults::from_env(env(&blank)), None);
    }

    #[test]
    fn an_unusable_workers_value_is_ignored() {
        for workers in ["0", "-3", "forty", ""] {
            let mut pairs = full();
            pairs[3] = (WORKERS_ENV, workers);
            let defaults = DevTranslationDefaults::from_env(env(&pairs)).unwrap();
            assert_eq!(defaults.workers, None, "{workers:?}");
        }
    }
}
