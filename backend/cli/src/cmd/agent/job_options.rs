use anyhow::{bail, Context, Result};
use serde_json::{json, Map, Value};

use crate::context::{BackendState, Ctx};

/// Return the API payload and whether the local credential preflight was conclusive.
pub(super) fn prepare_job_options(
    ctx: &Ctx,
    options: Value,
    action: &str,
) -> Result<(Value, bool)> {
    let backend = match &ctx.backend {
        BackendState::Running(backend) => Some(&backend.runtime),
        BackendState::Unreachable(runtime) => Some(runtime),
        BackendState::Stopped => None,
    };
    if let Some(runtime) = backend {
        let url = reqwest::Url::parse(&runtime.api_base)?;
        if !matches!(url.host_str(), Some("127.0.0.1" | "[::1]" | "localhost")) {
            return Ok((options, false));
        }
    }
    resolve(options, action, &ctx.home.export(true)?)
}

fn field<'a>(object: &'a Map<String, Value>, key: &str) -> Option<&'a str> {
    object
        .get(key)?
        .as_str()
        .map(str::trim)
        .filter(|s| !s.is_empty())
}

fn same_endpoint(left: &str, right: &str) -> bool {
    fn normalized(raw: &str) -> Option<reqwest::Url> {
        let mut url = reqwest::Url::parse(raw).ok()?;
        let path = url.path().trim_end_matches('/').to_owned();
        url.set_path(&path);
        Some(url)
    }
    matches!((normalized(left), normalized(right)), (Some(a), Some(b)) if a == b)
}

fn section<'a>(
    object: &'a mut Map<String, Value>,
    name: &str,
) -> Result<&'a mut Map<String, Value>> {
    object
        .entry(name)
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .with_context(|| format!("{name} 参数必须是对象"))
}

fn resolve(mut options: Value, action: &str, config: &Value) -> Result<(Value, bool)> {
    let request = options.as_object_mut().context("任务参数必须是对象")?;
    let reuses_ocr = request
        .get("source")
        .and_then(Value::as_object)
        .and_then(|source| field(source, "artifact_job_id"))
        .is_some();
    let mut checked = true;
    if !reuses_ocr || request.contains_key("ocr") {
        checked = prepare_ocr(section(request, "ocr")?, &config["ocr"], reuses_ocr)?;
    }
    if action == "translate" {
        checked &= prepare_translation(section(request, "translation")?, &config["translation"])?;
    }
    Ok((options, checked))
}

fn prepare_ocr(ocr: &mut Map<String, Value>, defaults: &Value, reuses_ocr: bool) -> Result<bool> {
    let provider = field(ocr, "provider")
        .unwrap_or_else(|| {
            if field(ocr, "mineru_token").is_some() {
                "mineru"
            } else if field(ocr, "paddle_token").is_some() || field(ocr, "paddle_api_url").is_some()
            {
                "paddle"
            } else {
                defaults["provider"].as_str().unwrap_or_default()
            }
        })
        .to_ascii_lowercase();
    ocr.insert("provider".into(), json!(provider));
    let reference = field(ocr, "credential_ref").is_some();
    let local_token = if defaults["provider"] == provider {
        defaults["token"]
            .as_str()
            .or_else(|| defaults["tokens"][&provider].as_str())
    } else {
        defaults["tokens"][&provider].as_str()
    }
    .filter(|s| !s.trim().is_empty());

    let token_field = match provider.as_str() {
        "mineru" => "mineru_token",
        "paddle" => "paddle_token",
        "glm_ocr" => {
            let params = section(ocr, "options")?;
            if ["credential", "token", "api_key"]
                .iter()
                .any(|key| field(params, key).is_some())
            {
                anyhow::ensure!(
                    !reference,
                    "OCR 凭据请使用内联 token 或 credential_ref 之一"
                );
            } else if !reference {
                let Some(token) = local_token else {
                    return Ok(false);
                };
                params.insert("credential".into(), json!(token));
            }
            return Ok(true);
        }
        // Other command providers may rely on the backend configuration.
        _ => return Ok(provider == "local"),
    };
    if field(ocr, token_field).is_some() {
        anyhow::ensure!(
            !reference,
            "OCR 凭据请使用内联 token 或 credential_ref 之一"
        );
        return Ok(true);
    }
    if reference {
        return Ok(true);
    }
    if provider == "paddle"
        && field(ocr, "paddle_api_url").is_some_and(|url| {
            !same_endpoint(
                url,
                &retainpdf_core::config::PaddleRuntimeConfig::from_env().default_base_url,
            )
        })
    {
        bail!("自定义 paddle_api_url 需要显式的 paddle_token 或 credential_ref");
    }
    if let Some(token) = local_token {
        ocr.insert(token_field.into(), json!(token));
        return Ok(true);
    }
    if reuses_ocr {
        return Ok(false); // Only the server knows whether it must OCR additional pages.
    }
    bail!("OCR 未配置 {provider} 凭据，请在 PaperLoom 设置中补齐或指定 OCR 连接");
}

fn prepare_translation(translation: &mut Map<String, Value>, defaults: &Value) -> Result<bool> {
    let caller_key = field(translation, "api_key").is_some();
    let vault_ref = field(translation, "credential_ref").is_some();
    anyhow::ensure!(
        !(caller_key && vault_ref),
        "翻译凭据请使用 api_key 或 credential_ref 之一"
    );
    if translation
        .get("execution_connection")
        .is_some_and(Value::is_object)
    {
        return Ok(false); // The backend validates the executor connection as a whole.
    }
    if field(translation, "base_url")
        .is_some_and(|url| !same_endpoint(url, defaults["base_url"].as_str().unwrap_or("")))
    {
        anyhow::ensure!(
            caller_key || vault_ref,
            "自定义翻译 base_url 需要显式的 api_key 或 credential_ref"
        );
        anyhow::ensure!(
            field(translation, "model").is_some(),
            "自定义翻译 base_url 需要指定 model"
        );
        return Ok(true);
    }
    if !(caller_key || vault_ref) {
        let Some(key) = defaults["api_key"]
            .as_str()
            .filter(|s| !s.trim().is_empty())
        else {
            // Preserve the original request: the dev backend can supply all three connection fields.
            return Ok(false);
        };
        translation.insert("api_key".into(), json!(key));
    }
    for (target, source) in [
        ("model", "model"),
        ("base_url", "base_url"),
        ("api_protocol", "protocol"),
        ("thinking", "thinking"),
        ("workers", "workers"),
        ("batch_size", "batch_size"),
    ] {
        if !defaults[source].is_null() {
            translation
                .entry(target)
                .or_insert_with(|| defaults[source].clone());
        }
    }
    anyhow::ensure!(
        field(translation, "model").is_some() && field(translation, "base_url").is_some(),
        "翻译连接需要指定 model 和 base_url"
    );
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> Value {
        json!({
            "translation": {
                "model": "base-model", "base_url": "https://models.example/v1",
                "api_key": "test-model-key", "protocol": "openai", "workers": 4, "thinking":"off",
            },
            "ocr": {"provider":"paddle", "token":"test-paddle-key", "tokens":{"mineru":"test-mineru-key"}},
        })
    }

    #[test]
    fn overrides_the_model_on_the_same_endpoint_and_keeps_ocr_options() {
        let input = json!({"ocr":{"options":{"transport":"official_http"}}, "translation":{
            "base_url":"https://models.example/v1/", "model":"other-model", "workers":2,
        }});
        let (body, checked) = resolve(input, "translate", &config()).unwrap();
        assert!(checked);
        assert_eq!(
            body["ocr"],
            json!({
                "provider":"paddle", "paddle_token":"test-paddle-key", "options":{"transport":"official_http"},
            })
        );
        assert_eq!(
            body["translation"],
            json!({
                "base_url":"https://models.example/v1/", "api_key":"test-model-key", "model":"other-model",
                "workers":2, "api_protocol":"openai", "thinking":"off",
            })
        );
    }

    #[test]
    fn never_supplies_local_model_keys_to_another_endpoint() {
        assert!(!same_endpoint(
            "https://models.example/v1?tenant=a/",
            "https://models.example/v1?tenant=a"
        ));
        for base in [
            "https://models.example/other",
            "https://another.example/v1",
            "http://models.example/v1",
        ] {
            let mut input = json!({"source":{"artifact_job_id":"cached"}, "translation":{"base_url":base,"model":"different"}});
            let error = resolve(input.clone(), "translate", &config())
                .unwrap_err()
                .to_string();
            assert!(error.contains("credential_ref"));
            assert!(!error.contains("test-model-key"));
            input["translation"]["credential_ref"] = json!("custom-key");
            assert_eq!(
                resolve(input.clone(), "translate", &config()).unwrap(),
                (input, true)
            );
        }
    }

    #[test]
    fn custom_paddle_address_requires_its_own_credential() {
        let mut input =
            json!({"ocr":{"paddle_api_url":"https://ocr.example/parse","page_ranges":"2"}});
        assert!(resolve(input.clone(), "ocr", &config()).is_err());
        input["ocr"]["credential_ref"] = json!("custom-key");
        let (body, checked) = resolve(input, "ocr", &config()).unwrap();
        assert!(checked);
        assert_eq!(body["ocr"]["provider"], "paddle");
        assert!(body["ocr"].get("paddle_token").is_none());
    }

    #[test]
    fn plain_ocr_options_do_not_suppress_credential_checks() {
        let mut missing = config();
        missing["ocr"]["token"] = Value::Null;
        let error = resolve(
            json!({"ocr":{"options":{"transport":"official_http"}}}),
            "ocr",
            &missing,
        )
        .unwrap_err();
        assert!(error.to_string().contains("paddle"));
        let (body, checked) =
            resolve(json!({"ocr":{"provider":"mineru"}}), "ocr", &missing).unwrap();
        assert!(checked);
        assert_eq!(body["ocr"]["mineru_token"], "test-mineru-key");
    }

    #[test]
    fn preserves_server_translation_defaults_when_no_local_key_is_configured() {
        let mut missing = config();
        missing["translation"]["api_key"] = Value::Null;
        let input =
            json!({"source":{"artifact_job_id":"cached"}, "translation":{"page_ranges":[2]}});
        assert_eq!(
            resolve(input.clone(), "translate", &missing).unwrap(),
            (input, false)
        );
    }
}
