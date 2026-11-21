use std::cell::RefCell;
use std::collections::HashSet;
use std::env;
use std::path::PathBuf;
use std::sync::Mutex;

static ENV_TEST_LOCK: Mutex<()> = Mutex::new(());

/// Global mutex for tests that mutate process-wide env vars.
/// Acquire before reading/writing `RUST_API_*` env vars to avoid races
/// when `cargo test` runs tests in parallel.
pub fn env_test_lock() -> std::sync::MutexGuard<'static, ()> {
    ENV_TEST_LOCK.lock().unwrap()
}

/// 设了、但解析不了的一个环境变量。
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct InvalidEnvVar {
    pub name: String,
    pub value: String,
    /// 要什么样的值，给人看的。
    pub expected: &'static str,
}

impl std::fmt::Display for InvalidEnvVar {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}={:?}（要{}）", self.name, self.value, self.expected)
    }
}

thread_local! {
    static COLLECTING: RefCell<Option<Vec<InvalidEnvVar>>> = const { RefCell::new(None) };
}

/// 已经在日志里报过的变量名：启动以后才读的变量（每建一个客户端读一次）只报一次。
static WARNED: Mutex<Option<HashSet<String>>> = Mutex::new(None);

/// 在 `f` 里读到的、设了但解析不了的环境变量都收起来交回去，由调用方决定报错不启动
/// （`AppConfig::from_env` 就这么做）。只收当前线程的；嵌套调用各收各的。
pub fn collect_invalid_env<T>(f: impl FnOnce() -> T) -> (T, Vec<InvalidEnvVar>) {
    let outer = COLLECTING.with(|cell| cell.replace(Some(Vec::new())));
    let value = f();
    let invalid = COLLECTING
        .with(|cell| cell.replace(outer))
        .unwrap_or_default();
    (value, invalid)
}

/// 设了但解析不了：在收集范围里就记下来；不在（启动以后才读的）就在 stderr 报一次。两种情况都用默认值。
fn report_invalid(name: &str, value: &str, expected: &'static str) {
    let invalid = InvalidEnvVar {
        name: name.to_string(),
        value: value.to_string(),
        expected,
    };
    let collected = COLLECTING.with(|cell| match cell.borrow_mut().as_mut() {
        Some(list) => {
            if !list.iter().any(|item| item.name == invalid.name) {
                list.push(invalid.clone());
            }
            true
        }
        None => false,
    });
    if collected {
        return;
    }
    let mut warned = WARNED.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    if warned.get_or_insert_with(HashSet::new).insert(name.to_string()) {
        eprintln!("环境变量取值不对，先用默认值：{invalid}");
    }
}

/// 设了且不是空白的值（去掉首尾空白）。空白和没设一样。
fn env_value(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

/// 正整数：没设、空白或 `0` 用 `fallback`；设了但不是整数（`200MB`、`abc`、超出范围）报出来。
fn env_positive<T>(name: &str, fallback: T, expected: &'static str) -> T
where
    T: std::str::FromStr + PartialOrd + Default,
{
    let Some(value) = env_value(name) else {
        return fallback;
    };
    match value.parse::<T>() {
        Ok(parsed) if parsed > T::default() => parsed,
        Ok(_) => fallback,
        Err(_) => {
            report_invalid(name, &value, expected);
            fallback
        }
    }
}

pub fn env_u64(name: &str, fallback: u64) -> u64 {
    env_positive(name, fallback, "一个正整数")
}

pub fn env_u32(name: &str, fallback: u32) -> u32 {
    env_positive(name, fallback, "一个不超过 4294967295 的正整数")
}

pub fn env_u16(name: &str, fallback: u16) -> u16 {
    env_positive(name, fallback, "一个 1–65535 的整数")
}

pub fn env_usize(name: &str, fallback: usize) -> usize {
    env_positive(name, fallback, "一个正整数")
}

/// 和 [`env_u64`] 一样，只是 `0` 有意思（"关掉"、"不等"），不当成没设。
pub fn env_u64_allow_zero(name: &str, fallback: u64) -> u64 {
    let Some(value) = env_value(name) else {
        return fallback;
    };
    value.parse::<u64>().unwrap_or_else(|_| {
        report_invalid(name, &value, "一个非负整数");
        fallback
    })
}

/// 开关：`1/true/yes/on` 是开，`0/false/no/off` 是关（不分大小写）；没设、空白用 `fallback`；别的值报出来。
pub fn env_bool(name: &str, fallback: bool) -> bool {
    let Some(value) = env_value(name) else {
        return fallback;
    };
    match value.to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => true,
        "0" | "false" | "no" | "off" => false,
        _ => {
            report_invalid(name, &value, "1/true/yes/on 或 0/false/no/off");
            fallback
        }
    }
}

/// 取值只能是几个词之一的变量：没设、空白返回 `None`；不在 `allowed` 里报出来，也返回 `None`。
/// 比较前转小写。
pub fn env_choice(name: &str, allowed: &[&str], expected: &'static str) -> Option<String> {
    let value = env_value(name)?;
    let lowered = value.to_ascii_lowercase();
    if allowed.contains(&lowered.as_str()) {
        Some(lowered)
    } else {
        report_invalid(name, &value, expected);
        None
    }
}

pub fn env_string(name: &str, fallback: &str) -> String {
    env::var(name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

pub fn env_optional_string(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

pub fn env_path(name: &str) -> Option<PathBuf> {
    env::var(name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

#[cfg(test)]
mod tests {
    use super::*;

    const NAME: &str = "RUST_API_ENV_VARS_SELF_TEST";

    fn with_value<T>(value: Option<&str>, f: impl FnOnce() -> T) -> T {
        match value {
            Some(value) => env::set_var(NAME, value),
            None => env::remove_var(NAME),
        }
        let result = f();
        env::remove_var(NAME);
        result
    }

    #[test]
    fn unparseable_numbers_are_reported_and_fall_back() {
        let _g = env_test_lock();
        for value in ["200MB", "abc", "-1", "1.5"] {
            let (parsed, invalid) =
                with_value(Some(value), || collect_invalid_env(|| env_u64(NAME, 7)));
            assert_eq!(parsed, 7, "{value}");
            assert_eq!(
                invalid,
                vec![InvalidEnvVar {
                    name: NAME.into(),
                    value: value.into(),
                    expected: "一个正整数",
                }]
            );
        }
        let (port, invalid) = with_value(Some("70000"), || collect_invalid_env(|| env_u16(NAME, 41000)));
        assert_eq!(port, 41000);
        assert_eq!(invalid.len(), 1);
    }

    #[test]
    fn unset_blank_and_zero_are_not_errors() {
        let _g = env_test_lock();
        for value in [None, Some(""), Some("   "), Some("0")] {
            let (parsed, invalid) = with_value(value, || collect_invalid_env(|| env_u64(NAME, 7)));
            assert_eq!(parsed, 7, "{value:?}");
            assert!(invalid.is_empty(), "{value:?}");
        }
        let (parsed, invalid) = with_value(Some(" 42 "), || collect_invalid_env(|| env_u32(NAME, 7)));
        assert_eq!((parsed, invalid.len()), (42, 0));
    }

    #[test]
    fn allow_zero_keeps_zero_and_reports_garbage() {
        let _g = env_test_lock();
        let (parsed, invalid) =
            with_value(Some("0"), || collect_invalid_env(|| env_u64_allow_zero(NAME, 3)));
        assert_eq!((parsed, invalid.len()), (0, 0));
        let (parsed, invalid) =
            with_value(Some("3s"), || collect_invalid_env(|| env_u64_allow_zero(NAME, 3)));
        assert_eq!((parsed, invalid.len()), (3, 1));
    }

    #[test]
    fn bools_know_both_spellings_and_report_the_rest() {
        let _g = env_test_lock();
        for (value, expected) in [("on", true), ("TRUE", true), ("1", true), ("off", false), ("No", false), ("0", false)] {
            let (parsed, invalid) = with_value(Some(value), || collect_invalid_env(|| env_bool(NAME, !expected)));
            assert_eq!(parsed, expected, "{value}");
            assert!(invalid.is_empty(), "{value}");
        }
        // 以前不认识的值一律当成关；现在报出来、用默认值。
        let (parsed, invalid) = with_value(Some("enabled"), || collect_invalid_env(|| env_bool(NAME, true)));
        assert!(parsed);
        assert_eq!(invalid.len(), 1);
    }

    #[test]
    fn choices_are_case_insensitive_and_typos_reported() {
        let _g = env_test_lock();
        let (parsed, invalid) = with_value(Some("Remote"), || {
            collect_invalid_env(|| env_choice(NAME, &["remote", "in_process"], "remote 或 in_process"))
        });
        assert_eq!((parsed.as_deref(), invalid.len()), (Some("remote"), 0));
        let (parsed, invalid) = with_value(Some("remtoe"), || {
            collect_invalid_env(|| env_choice(NAME, &["remote", "in_process"], "remote 或 in_process"))
        });
        assert_eq!((parsed, invalid.len()), (None, 1));
    }

    #[test]
    fn the_same_variable_is_listed_once_and_nested_collections_stay_separate() {
        let _g = env_test_lock();
        let (inner, outer) = with_value(Some("x"), || {
            collect_invalid_env(|| {
                env_u64(NAME, 1);
                env_u64(NAME, 1);
                collect_invalid_env(|| env_u32(NAME, 1)).1
            })
        });
        assert_eq!(inner.len(), 1);
        assert_eq!(outer.len(), 1);
    }
}
