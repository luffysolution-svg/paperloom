use super::{AppError, ZoteroWriteClient, WRITE_LOCK};
use crate::services::integrations::zotero::ZoteroClient;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;

pub(crate) type Fields = BTreeMap<String, Value>;
pub(crate) const MAPPING: &[(&str, &str)] = &[
    ("title", "title"),
    ("publication_title", "publicationTitle"),
    ("date", "date"),
    ("volume", "volume"),
    ("issue", "issue"),
    ("pages", "pages"),
    ("abstract", "abstractNote"),
    ("doi", "DOI"),
    ("url", "url"),
    ("source_language", "language"),
    ("keywords", "tags"),
];

fn remote_field<'a>(data: &Value, key: &'a str) -> &'a str {
    if key == "publicationTitle" {
        let alternatives = [
            "publicationTitle",
            "bookTitle",
            "proceedingsTitle",
            "university",
            "publisher",
        ];
        if let Some(field) = alternatives
            .iter()
            .find(|&&f| data[f].as_str().is_some_and(|s| !s.is_empty()))
            .or_else(|| alternatives.iter().find(|&&f| data.get(f).is_some()))
        {
            return field;
        }
    }
    key
}

fn scalar(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub(crate) fn bibliography(data: &Value) -> Fields {
    MAPPING
        .iter()
        .map(|&(key, remote)| {
            let remote = remote_field(data, remote);
            let value = if key == "keywords" {
                let mut tags: Vec<_> = data[remote]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter_map(|t| t["tag"].as_str())
                    .collect();
                tags.sort_unstable();
                tags.dedup();
                json!(tags)
            } else if key == "title" {
                json!(scalar(&retainpdf_jobs::paper_markdown::plain_title(
                    data[remote].as_str().unwrap_or("")
                )))
            } else {
                json!(scalar(data[remote].as_str().unwrap_or("")))
            };
            (key.to_owned(), value)
        })
        .collect()
}

const PREFIX: &str = "%% paperloom:bibliography ";
pub(crate) fn marker(fields: &Fields) -> String {
    format!(
        "{PREFIX}{} %%",
        URL_SAFE_NO_PAD.encode(serde_json::to_vec(fields).unwrap())
    )
}
pub(crate) fn saved_fields(note: &str) -> Option<Fields> {
    let encoded = note
        .lines()
        .find_map(|l| l.strip_prefix(PREFIX)?.strip_suffix(" %%"))?;
    serde_json::from_slice(&URL_SAFE_NO_PAD.decode(encoded).ok()?).ok()
}

pub(crate) fn note_fields(yaml: &Value) -> Result<Fields, AppError> {
    let mut fields = Fields::new();
    for &(key, _) in MAPPING {
        let alias = match key {
            "publication_title" => Some("publication"),
            "keywords" => Some("zotero_tags"),
            _ => None,
        };
        let value = yaml
            .get(key)
            .or_else(|| alias.and_then(|name| yaml.get(name)));
        let Some(value) = value.filter(|v| !v.is_null()) else {
            continue;
        };
        let parsed = if key == "keywords" {
            let values = value
                .as_array()
                .ok_or_else(|| AppError::bad_request("keywords 需要是标签列表"))?;
            let mut tags = Vec::new();
            for value in values {
                tags.push(
                    value
                        .as_str()
                        .ok_or_else(|| AppError::bad_request("标签需要是文本"))?
                        .trim(),
                );
            }
            tags.retain(|s| !s.is_empty());
            tags.sort_unstable();
            tags.dedup();
            json!(tags)
        } else if let Some(s) = value.as_str() {
            json!(scalar(s))
        } else if value.is_number() {
            json!(value.to_string())
        } else {
            return Err(AppError::bad_request(format!(
                "属性 {key} 需要是文本或数字"
            )));
        };
        fields.insert(key.into(), parsed);
    }
    Ok(fields)
}

pub(crate) fn read_note(note: &str) -> Result<(Value, String), AppError> {
    let (yaml, body) = note
        .strip_prefix("---\n")
        .and_then(|s| s.split_once("\n---\n"))
        .ok_or_else(|| AppError::bad_request("笔记缺少 YAML 属性"))?;
    let fields = serde_yaml::from_str(yaml)
        .map_err(|e| AppError::bad_request(format!("笔记 YAML 属性无效：{e}")))?;
    let mut managed = false;
    let mut reading = false;
    let mut fence = None;
    let mut lines = Vec::new();
    for line in body.lines() {
        let trimmed = line.trim();
        if fence.is_none() {
            if trimmed.starts_with("%% paperloom:begin ")
                || trimmed.starts_with("<!-- paperloom:begin ")
            {
                managed = true;
                continue;
            }
            if trimmed.starts_with("%% paperloom:end ")
                || trimmed.starts_with("<!-- paperloom:end ")
            {
                managed = false;
                continue;
            }
            if managed {
                continue;
            }
            if trimmed.starts_with("# ") || trimmed.starts_with("## ") {
                reading = matches!(
                    trimmed.to_lowercase().as_str(),
                    "## 阅读笔记" | "## 我的笔记" | "## notes" | "## reading notes"
                );
                continue;
            }
        }
        if reading {
            lines.push(line);
        }
        let n = trimmed
            .chars()
            .take_while(|&c| Some(c) == trimmed.chars().next())
            .count();
        if n >= 3 && trimmed.starts_with([char::from(96u8), '~']) {
            let c = trimmed.chars().next().unwrap();
            if fence.is_some_and(|(f, k)| c == f && n >= k) {
                fence = None;
            } else if fence.is_none() {
                fence = Some((c, n));
            }
        }
    }
    Ok((fields, lines.join("\n").trim().to_string()))
}

fn escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn reading_html(markdown: &str, backlink: &str) -> String {
    use pulldown_cmark::{html, Event, LinkType, Options, Parser, Tag};
    let options = Options::ENABLE_MATH
        | Options::ENABLE_TABLES
        | Options::ENABLE_STRIKETHROUGH
        | Options::ENABLE_WIKILINKS;
    let mut body = String::new();
    let events = Parser::new_ext(markdown, options).map(|event| match event {
        Event::InlineMath(tex) => Event::InlineHtml(
            ["<span class=\"math\">$", &escape(&tex), "$</span>"]
                .concat()
                .into(),
        ),
        Event::DisplayMath(tex) => Event::Html(
            ["<pre class=\"math\">$$", &escape(&tex), "$$</pre>"]
                .concat()
                .into(),
        ),
        Event::Start(Tag::Link {
            link_type: link_type @ LinkType::WikiLink { .. },
            dest_url,
            title,
            id,
        }) => {
            let encoded =
                url::form_urlencoded::byte_serialize(dest_url.as_bytes()).collect::<String>();
            let target = if dest_url.starts_with('#') {
                format!("{backlink}{encoded}")
            } else {
                format!(
                    "{}&file={encoded}",
                    backlink.split("&file=").next().unwrap_or(backlink)
                )
            };
            Event::Start(Tag::Link {
                link_type,
                dest_url: target.into(),
                title,
                id,
            })
        }
        Event::Html(raw) | Event::InlineHtml(raw)
            if !matches!(
                raw.trim(),
                "<sub>" | "</sub>" | "<sup>" | "</sup>" | "<br>" | "<br/>"
            ) =>
        {
            Event::Text(raw)
        }
        other => other,
    });
    html::push_html(&mut body, events);
    body
}

#[derive(Default, Debug, Deserialize, Serialize)]
pub(crate) struct Baseline {
    pub local: Fields,
    pub remote: Fields,
    pub reading: String,
    pub remote_note: String,
    pub export: String,
}
#[derive(Serialize)]
pub(crate) struct SyncResult {
    pub fields_written: Vec<String>,
    pub note_status: &'static str,
}

fn field_changes(
    local: &Fields,
    base_local: &Fields,
    remote: &Fields,
    base_remote: &Fields,
    data: &Value,
) -> Result<(serde_json::Map<String, Value>, Vec<String>), AppError> {
    let mut patch = serde_json::Map::new();
    let mut changed = Vec::new();
    for &(field, zkey) in MAPPING {
        let Some(value) = local.get(field) else {
            continue;
        };
        if value.as_str() == Some("")
            || Some(value) == base_local.get(field)
            || Some(value) == remote.get(field)
        {
            continue;
        }
        if remote.get(field) != base_remote.get(field) {
            return Err(AppError::conflict(format!(
                "Obsidian 和 Zotero 都改过 {field}，请先核对该字段"
            )));
        }
        let value = if field == "keywords" {
            let tags = value.as_array().unwrap();
            let mut entries = Vec::new();
            for t in data["tags"].as_array().into_iter().flatten() {
                if t["type"] == 1 && !tags.contains(&t["tag"]) {
                    return Err(AppError::conflict(
                        "keywords 缺少 Zotero 自动标签，请先核对标签",
                    ));
                }
                if tags.contains(&t["tag"]) {
                    entries.push(t.clone());
                }
            }
            for tag in tags {
                if !entries.iter().any(|t| t["tag"] == *tag) {
                    entries.push(json!({"tag":tag}));
                }
            }
            Value::Array(entries)
        } else {
            value.clone()
        };
        patch.insert(remote_field(data, zkey).to_string(), value);
        changed.push(field.to_string());
    }
    Ok((patch, changed))
}

impl ZoteroWriteClient {
    pub(crate) async fn sync_reading(
        &self,
        external: &crate::db::external_refs::ExternalRefRecord,
        local: Fields,
        reading: &str,
        export: &Fields,
        previous: Option<Baseline>,
        backlink: &str,
    ) -> Result<(SyncResult, Baseline, Value), AppError> {
        let _guard = WRITE_LOCK
            .get_or_init(|| tokio::sync::Mutex::new(()))
            .lock()
            .await;
        let library = super::validate_library_id(&external.library_id)?;
        let key = super::validate_key(&external.item_key)?;
        let api = ZoteroClient::new(self.base.clone())?;
        let url = format!("{library}/items/{key}");
        let (item, _) = api.get(&url, &[]).await?;
        if item["key"] != key {
            return Err(AppError::conflict("Zotero 返回了其他条目"));
        }
        let remote = bibliography(&item["data"]);
        let export_marker = marker(export);
        let previous = previous.unwrap_or_default();
        let (base_local, base_remote) = if previous.export == export_marker {
            (&previous.local, &previous.remote)
        } else {
            (export, export)
        };
        let (patch, changed) =
            field_changes(&local, base_local, &remote, base_remote, &item["data"])?;
        let note_id = format!("paperloom-reading:{}", external.document_id);
        let reading_hash = if reading.is_empty() {
            String::new()
        } else {
            format!("{:x}", md5::compute(reading))
        };
        let wants_note = !reading.is_empty() && reading_hash != previous.reading;
        let mut note_status = "unchanged";
        let mut note_hash = previous.remote_note.clone();
        let mut auth = None;
        let mut server = None;
        let mut pending_note = None;
        if wants_note {
            let children = api.children(library, key, "note").await?;
            let owned: Vec<_> = children
                .iter()
                .filter(|n| {
                    n["data"]["note"]
                        .as_str()
                        .is_some_and(|s| s.contains(&note_id))
                })
                .collect();
            if owned.len() > 1 {
                return Err(AppError::conflict(
                    "同一正文有多条 PaperLoom 阅读笔记，请核对 Zotero 子笔记",
                ));
            }
            let body = reading_html(reading, backlink);
            let html=format!("<div data-schema-version=\"9\"><h1>阅读笔记</h1>{body}<p><a href=\"{}\">在 Obsidian 中打开</a></p><p>{note_id}</p></div>",escape(backlink));
            let existing = owned.first().copied();
            let existing_html = existing
                .and_then(|n| n["data"]["note"].as_str())
                .unwrap_or("");
            let want_text = htmd::convert(&html).unwrap_or_else(|_| html.clone());
            if existing.is_some() && htmd::convert(existing_html).unwrap_or_default() == want_text {
                note_hash = format!("{:x}", md5::compute(existing_html));
            } else {
                if existing.is_some()
                    && format!("{:x}", md5::compute(existing_html)) != previous.remote_note
                {
                    return Err(AppError::conflict(
                        "Zotero 中的阅读笔记也已修改，请先核对两边内容",
                    ));
                }
                pending_note = Some((existing.cloned(), html, want_text));
            }
        }
        if !patch.is_empty() || pending_note.is_some() {
            let info = self.server_info().await?;
            auth = self.load_authorization(&info.server_id);
            server = Some(info);
        }
        if !patch.is_empty() {
            let info = server.as_ref().unwrap();
            let version = item["version"]
                .as_u64()
                .ok_or_else(|| AppError::bad_gateway("Zotero 条目缺少版本号"))?;
            self.authenticated_write(&info.server_id, &mut auth, |token| {
                self.http
                    .patch(format!("{}/api/{url}", self.base))
                    .header("Zotero-API-Key", token)
                    .header("If-Unmodified-Since-Version", version)
                    .json(&patch)
            })
            .await?;
        }
        if let Some((existing, html, want_text)) = pending_note {
            let info = server.as_ref().unwrap();
            let note_key = if let Some(entry) = existing {
                let id = super::validate_key(entry["key"].as_str().unwrap_or(""))?;
                let version = entry["version"]
                    .as_u64()
                    .ok_or_else(|| AppError::bad_gateway("Zotero 笔记缺少版本号"))?;
                self.authenticated_write(&info.server_id, &mut auth, |token| {
                    self.http
                        .patch(format!("{}/api/{library}/items/{id}", self.base))
                        .header("Zotero-API-Key", token)
                        .header("If-Unmodified-Since-Version", version)
                        .json(&json!({"note":html}))
                })
                .await?;
                note_status = "updated";
                id.to_owned()
            } else {
                let response = self
                    .authenticated_write(&info.server_id, &mut auth, |token| {
                        self.http
                            .post(format!("{}/api/{library}/items", self.base))
                            .header("Zotero-API-Key", token)
                            .json(&json!([{"itemType":"note","parentItem":key,"note":html}]))
                    })
                    .await?;
                let result: Value = response
                    .json()
                    .await
                    .map_err(|e| AppError::bad_gateway(e.to_string()))?;
                note_status = "created";
                result
                    .pointer("/success/0")
                    .or_else(|| result.pointer("/successful/0/key"))
                    .and_then(Value::as_str)
                    .ok_or_else(|| AppError::conflict("Zotero 未创建阅读笔记"))?
                    .to_owned()
            };
            let (check, _) = api
                .get(
                    &format!("{library}/items/{}", super::validate_key(&note_key)?),
                    &[],
                )
                .await?;
            let actual = check["data"]["note"].as_str().unwrap_or("");
            if check["data"]["parentItem"] != key
                || htmd::convert(actual).unwrap_or_default() != want_text
            {
                return Err(AppError::conflict("Zotero 阅读笔记回读核对失败"));
            }
            note_hash = format!("{:x}", md5::compute(actual));
        }
        let verified = if changed.is_empty() {
            item
        } else {
            api.get(&url, &[]).await?.0
        };
        let remote = bibliography(&verified["data"]);
        if changed.iter().any(|k| local.get(k) != remote.get(k)) {
            return Err(AppError::conflict("Zotero 书目信息回读核对失败"));
        }
        Ok((
            SyncResult {
                fields_written: changed,
                note_status,
            },
            Baseline {
                local,
                remote,
                reading: reading_hash,
                remote_note: note_hash,
                export: export_marker,
            },
            verified,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_user_section_and_preserves_scientific_markup() {
        let (_,text)=read_note("---\ntitle: sample\n---\n%% paperloom:begin body %%\n## 阅读笔记\nGenerated\n%% paperloom:end body %%\n## 阅读笔记\n**Result** H<sub>2</sub> and $x^2$.\n\n- first\n\n[[#^ref-3|3]]\n\n## Other\nIgnored").unwrap();
        let html = reading_html(&text, "obsidian://open?vault=Test&file=Paper");
        assert!(html.contains("<strong>Result</strong>") && html.contains("H<sub>2</sub>"));
        assert!(
            html.contains("<span class=\"math\">$x^2$</span>") && html.contains("<li>first</li>")
        );
        assert!(
            html.contains("Paper%23%5Eref-3")
                && !html.contains("Generated")
                && !html.contains("Ignored")
        );
    }

    #[test]
    fn changes_only_local_edits_and_reports_concurrent_field_edits() {
        let data = json!({"title":"Original","volume":"3","tags":[{"tag":"auto","type":1}]});
        let baseline = bibliography(&data);
        let mut local = baseline.clone();
        local.insert("volume".into(), json!("4"));
        let mut remote = baseline.clone();
        remote.insert("title".into(), json!("Edited remotely"));
        let (patch, keys) = field_changes(&local, &baseline, &remote, &baseline, &data).unwrap();
        assert_eq!(keys, ["volume"]);
        assert_eq!(Value::Object(patch), json!({"volume":"4"}));
        remote.insert("volume".into(), json!("5"));
        assert!(field_changes(&local, &baseline, &remote, &baseline, &data).is_err());
        local.insert("keywords".into(), json!(["manual"]));
        assert!(field_changes(&local, &baseline, &baseline, &baseline, &data).is_err());
    }
}
