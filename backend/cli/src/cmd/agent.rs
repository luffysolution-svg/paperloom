//! Agent-facing CLI.  The CLI deliberately stays thin and delegates document,
//! job and integration behaviour to the running PaperLoom API.

use std::path::PathBuf;
use std::process::{Command, ExitCode, Stdio};

use anyhow::{Context, Result};
use clap::{Args, Subcommand};
use serde_json::{json, Value};

use crate::context::Ctx;
use crate::ui;

#[derive(Subcommand)]
pub enum AgentCommand {
    Doctor,
    Capabilities,
    /// Resolve only the request on stdin for the local stdio bridge.
    #[command(hide = true)]
    PrepareJobOptions {
        #[arg(value_parser = ["ocr", "translate"])]
        action: String,
        #[arg(long)]
        with_secrets: bool,
    },
    Document {
        #[command(subcommand)]
        action: DocumentCommand,
    },
    Ocr {
        #[command(subcommand)]
        action: OcrCommand,
    },
    Translate {
        #[command(subcommand)]
        action: TranslateCommand,
    },
    Job {
        #[command(subcommand)]
        action: JobCommand,
    },
    Reader {
        #[command(subcommand)]
        action: ReaderCommand,
    },
    Zotero {
        #[command(subcommand)]
        action: ZoteroCommand,
    },
    Obsidian {
        #[command(subcommand)]
        action: ObsidianCommand,
    },
    Workflow {
        #[command(subcommand)]
        action: WorkflowCommand,
    },
    /// Start the stdio MCP server. The MCP implementation is provided by the
    /// companion binary when installed, so this command gives hosts a stable
    /// discovery point without duplicating API logic.
    Mcp,
}

#[derive(Subcommand)]
pub enum DocumentCommand {
    Import {
        file: PathBuf,
    },
    List {
        #[arg(long)]
        limit: Option<u32>,
        #[arg(long)]
        offset: Option<u32>,
    },
    Search {
        query: String,
        #[arg(long)]
        limit: Option<u32>,
    },
}

#[derive(Subcommand)]
pub enum OcrCommand {
    Submit(JobSubmitArgs),
}

#[derive(Subcommand)]
pub enum TranslateCommand {
    Submit(JobSubmitArgs),
}

#[derive(Args, Clone)]
pub struct JobSubmitArgs {
    pub document_id: String,
    /// JSON request fields such as provider, model, page_ranges and glossary.
    #[arg(long, default_value = "{}")]
    pub payload: String,
    /// Read the JSON request body from a file so secrets do not need to appear in shell history.
    #[arg(long)]
    pub payload_file: Option<PathBuf>,
}

#[derive(Subcommand)]
pub enum JobCommand {
    Status {
        job_id: String,
    },
    Events {
        job_id: String,
        #[arg(long, default_value_t = 100)]
        limit: u32,
    },
    Cancel {
        job_id: String,
    },
    Retry {
        job_id: String,
        stage: String,
        #[arg(long, default_value = "{}")]
        payload: String,
    },
}

#[derive(Subcommand)]
pub enum ReaderCommand {
    Outline { job_id: String },
    Page { job_id: String, page: u32 },
    Region { job_id: String, item_id: String },
    Search { job_id: String, query: String },
    /// Export source Markdown with bibliographic properties and citation links.
    Markdown {
        job_id: String,
        /// Return the original OCR Markdown instead.
        #[arg(long)]
        raw: bool,
        #[arg(long)]
        output: Option<PathBuf>,
    },
}

#[derive(Subcommand)]
pub enum ZoteroCommand {
    Status,
    Collections {
        library_id: String,
    },
    Items {
        library_id: String,
        #[arg(long)]
        collection_key: Option<String>,
        #[arg(long)]
        query: Option<String>,
        #[arg(long)]
        limit: Option<u32>,
    },
    Import {
        library_id: String,
        #[arg(long)]
        collection_key: Option<String>,
        /// ITEM:ATTACHMENT or ITEM:ATTACHMENT:main / ITEM:ATTACHMENT:si.
        #[arg(long, required = true, value_delimiter = ',', value_parser = parse_zotero_attachment)]
        attachments: Vec<Value>,
        #[arg(long)]
        confirm: bool,
    },
    Writeback {
        #[arg(long, value_delimiter = ',')]
        document_ids: Vec<String>,
        #[arg(long)]
        confirm: bool,
    },
}

#[derive(Subcommand)]
pub enum ObsidianCommand {
    Status,
    Export(ObsidianExportArgs),
    /// Download the vault-ready notes, images and available PDFs as a ZIP.
    Bundle {
        job_id: String,
        #[arg(long)]
        output: PathBuf,
        #[arg(long, default_value_t = true, num_args = 0..=1, default_missing_value = "true", action = clap::ArgAction::Set)]
        include_source: bool,
    },
    /// Sync edits from the existing vault note to its Zotero parent item.
    SyncZotero {
        job_id: String,
        #[command(flatten)]
        target: ObsidianTarget,
        #[arg(long)]
        confirm: bool,
    },
}

#[derive(Args)]
pub struct ObsidianTarget {
    #[arg(long)]
    vault_id: String,
    #[arg(long)]
    folder: Option<String>,
    #[arg(long, num_args = 0..=1, default_missing_value = "true")]
    folder_by_collection: Option<bool>,
}

impl ObsidianTarget {
    fn payload(&self) -> Value {
        json!({"vault_id": self.vault_id, "folder": self.folder, "folder_by_collection": self.folder_by_collection})
    }
}

#[derive(Args)]
pub struct ObsidianExportArgs {
    #[command(flatten)]
    target: ObsidianTarget,
    #[arg(long, required_unless_present = "document_ids", conflicts_with = "document_ids")]
    job_id: Option<String>,
    #[arg(long, required_unless_present = "job_id", value_delimiter = ',')]
    document_ids: Vec<String>,
    #[arg(long, default_value_t = true, num_args = 0..=1, default_missing_value = "true", action = clap::ArgAction::Set)]
    include_source: bool,
    #[arg(long, default_value = "ask", value_parser = ["ask", "rename", "overwrite", "skip"])]
    on_conflict: String,
    #[arg(long)]
    confirm: bool,
}

fn parse_zotero_attachment(value: &str) -> Result<Value, String> {
    let mut fields = value.split(':');
    let item = fields.next().unwrap_or_default();
    let attachment = fields.next().unwrap_or_default();
    if item.is_empty() || attachment.is_empty() {
        return Err("附件需要 ITEM:ATTACHMENT 或 ITEM:ATTACHMENT:main/si".to_owned());
    }
    let mut entry = json!({"item_key": item, "attachment_key": attachment});
    match (fields.next(), fields.next()) {
        (None, None) => {}
        (Some(role @ ("main" | "si")), None) => entry["supplement"] = json!(role == "si"),
        _ => return Err("附件类型需要 main 或 si".to_owned()),
    }
    Ok(entry)
}

#[derive(Subcommand)]
pub enum WorkflowCommand {
    Validate {
        file: PathBuf,
    },
    Run {
        file: PathBuf,
        #[arg(long)]
        dry_run: bool,
        #[arg(long)]
        confirm: bool,
    },
}

fn backend(ctx: &Ctx) -> Result<&crate::context::Backend> {
    ctx.writer()?
        .ok_or_else(|| anyhow::anyhow!("PaperLoom 后端未运行，请先打开桌面端或启动 API"))
}

fn payload(raw: &str, file: Option<&PathBuf>) -> Result<Value> {
    if let Some(file) = file {
        let raw = std::fs::read_to_string(file)
            .with_context(|| format!("无法读取 payload 文件 {}", file.display()))?;
        return serde_json::from_str(&raw).with_context(|| "payload 文件必须是有效 JSON");
    }
    serde_json::from_str(raw).with_context(|| "--payload 必须是有效 JSON")
}

mod job_options;
use job_options::prepare_job_options;

fn read_workflow(file: &PathBuf) -> Result<Value> {
    let text = std::fs::read_to_string(file)
        .with_context(|| format!("无法读取工作流 {}", file.display()))?;
    let is_yaml = matches!(
        file.extension().and_then(|ext| ext.to_str()),
        Some("yml" | "yaml")
    );
    if is_yaml {
        let yaml: serde_yaml::Value =
            serde_yaml::from_str(&text).with_context(|| "工作流 YAML 格式无效")?;
        serde_json::to_value(yaml).with_context(|| "工作流无法转换为 JSON")
    } else {
        serde_json::from_str(&text).with_context(|| "工作流 JSON 格式无效")
    }
}

fn validate_workflow(spec: &Value) -> Result<()> {
    let object = spec
        .as_object()
        .ok_or_else(|| anyhow::anyhow!("工作流根节点必须是对象"))?;
    if object.get("schema_version").and_then(Value::as_str) != Some("agent-batch-workflow.v1") {
        anyhow::bail!("schema_version 必须是 agent-batch-workflow.v1");
    }
    if object.get("name").and_then(Value::as_str).is_none() {
        anyhow::bail!("工作流缺少 name");
    }
    let sources = object
        .get("inputs")
        .and_then(Value::as_object)
        .and_then(|inputs| inputs.get("sources"))
        .and_then(Value::as_array)
        .ok_or_else(|| anyhow::anyhow!("工作流缺少 inputs.sources"))?;
    if sources.is_empty() {
        anyhow::bail!("inputs.sources 不能为空");
    }
    for (index, source) in sources.iter().enumerate() {
        if !matches!(source["kind"].as_str(), Some("document_id" | "path")) {
            anyhow::bail!("inputs.sources[{index}].kind 需要 path 或 document_id。先用 agent zotero import 导入附件，再填写返回的 document_id");
        }
        if !source["value"].as_str().is_some_and(|value| !value.trim().is_empty()) {
            anyhow::bail!("inputs.sources[{index}].value 不能为空");
        }
    }
    let steps = object
        .get("steps")
        .and_then(Value::as_array)
        .ok_or_else(|| anyhow::anyhow!("工作流缺少 steps"))?;
    if steps.is_empty() {
        anyhow::bail!("steps 不能为空");
    }
    for (index, step) in steps.iter().enumerate() {
        if !matches!(step["action"].as_str(), Some("import" | "ocr" | "translate")) {
            anyhow::bail!("steps[{index}].action 需要 import、ocr 或 translate");
        }
    }
    let execution = object
        .get("execution")
        .and_then(Value::as_object)
        .ok_or_else(|| anyhow::anyhow!("工作流缺少 execution"))?;
    if !execution.get("dry_run").is_some_and(Value::is_boolean) {
        anyhow::bail!("execution.dry_run 必须是布尔值");
    }
    if !matches!(execution.get("max_items").and_then(Value::as_u64), Some(1..=10000)) {
        anyhow::bail!("execution.max_items 必须是 1 到 10000 之间的整数");
    }
    if !matches!(execution.get("concurrency").and_then(Value::as_u64), Some(1..=32)) {
        anyhow::bail!("execution.concurrency 必须是 1 到 32 之间的整数");
    }
    if !matches!(execution.get("failure_policy").and_then(Value::as_str), Some("continue" | "stop")) {
        anyhow::bail!("execution.failure_policy 必须是 continue 或 stop");
    }
    Ok(())
}

fn run_workflow(ctx: &Ctx, file: &PathBuf, dry_run: bool, confirm: bool) -> Result<Value> {
    let spec = read_workflow(file)?;
    validate_workflow(&spec)?;
    if !dry_run && !confirm {
        anyhow::bail!("批量工作流会上传或提交任务，请先用 --dry-run 检查，再用 --confirm 执行");
    }
    let sources = spec
        .pointer("/inputs/sources")
        .and_then(Value::as_array)
        .expect("validated sources");
    let execution = spec
        .get("execution")
        .and_then(Value::as_object)
        .expect("validated execution");
    let max_items = execution
        .get("max_items")
        .and_then(Value::as_u64)
        .unwrap_or(sources.len() as u64) as usize;
    let step = spec
        .get("steps")
        .and_then(Value::as_array)
        .and_then(|steps| {
            steps.iter().rev().find(|step| {
                step.get("action")
                    .and_then(Value::as_str)
                    .is_some_and(|action| matches!(action, "ocr" | "translate"))
            })
        });
    let action = step.and_then(|step| step["action"].as_str()).unwrap_or("import");
    let (options, configuration_checked) = match step {
        Some(step) => prepare_job_options(
            ctx,
            step.get("options").cloned().unwrap_or_else(|| json!({})),
            action,
        )?,
        None => (json!({}), true),
    };
    let created_at = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Nanos, true);
    let run_id = format!("local-{}", uuid_like(&format!("{created_at}-{}", std::process::id())));
    let run_dir = ctx.data_dir.join("agent-runs").join(&run_id);
    std::fs::create_dir_all(run_dir.join("outputs"))?;
    let mut items = Vec::new();
    let mut stopped = false;
    for (index, source) in sources.iter().take(max_items).enumerate() {
        let kind = source.get("kind").and_then(Value::as_str).unwrap_or("");
        let value = source.get("value").and_then(Value::as_str).unwrap_or("");
        let mut item = json!({"item_id": index.to_string(), "source": value, "status": if dry_run { "planned" } else { "running" }});
        if stopped {
            item["status"] = json!("skipped");
            items.push(item);
            continue;
        }
        let result = (|| -> Result<()> {
            if dry_run && kind == "document_id" {
                if let Some(api) = ctx.writer()? {
                    api.get(&format!("/api/v1/documents/{}", encode(value)))?;
                }
            }
            let path = std::path::Path::new(value);
            if kind == "path" && (!path.is_file() || !path.extension().and_then(|ext| ext.to_str())
                .is_some_and(|ext| ext.eq_ignore_ascii_case("pdf"))) {
                anyhow::bail!("inputs.sources[{index}] 需要存在的 PDF 文件");
            }
            if !dry_run {
                let document_id = match kind {
                    "path" => {
                        let uploaded = ctx
                            .writer()?
                            .ok_or_else(|| anyhow::anyhow!("PaperLoom 后端未运行"))?
                            .upload_pdf(&PathBuf::from(value))?;
                        uploaded
                            .get("document_id")
                            .or_else(|| uploaded.get("id"))
                            .and_then(Value::as_str)
                            .ok_or_else(|| anyhow::anyhow!("上传响应缺少 document_id"))?
                            .to_string()
                    }
                    _ => value.to_string(), // validate_workflow already restricted the source kinds.
                };
                item["document_id"] = json!(document_id);
                if matches!(action, "ocr" | "translate") {
                    let job = ctx
                        .writer()?
                        .ok_or_else(|| anyhow::anyhow!("PaperLoom 后端未运行"))?
                        .post(
                            &format!("/api/v1/documents/{}/{}", encode(&document_id), action),
                            Some(&options),
                        )?;
                    item["job_id"] = job.get("job_id").or_else(|| job.get("id"))
                        .filter(|id| id.as_str().is_some_and(|id| !id.is_empty()))
                        .context("任务提交响应没有 job_id")?.clone();
                    if let Some(siblings) = job.get("sibling_job_ids").and_then(Value::as_array).filter(|ids| !ids.is_empty()) {
                        item["sibling_job_ids"] = json!(siblings);
                    }
                    item["status"] = json!("queued");
                } else {
                    item["status"] = json!("succeeded");
                }
            }
            Ok(())
        })();
        if let Err(error) = result {
            item["status"] = json!("failed");
            item["error"] = json!(format!("{error:#}"));
            stopped = execution.get("failure_policy").and_then(Value::as_str) == Some("stop");
        }
        items.push(item);
    }
    let failed = items.iter().filter(|item| item["status"] == "failed").count();
    let status = if failed > 0 {
        if dry_run { "blocked" }
        else if items.iter().any(|item| item["status"] == "queued" || item["status"] == "succeeded") { "partial" }
        else { "failed" }
    } else if dry_run { "planned" } else if action == "import" { "succeeded" } else { "submitted" };
    let mut manifest_options = execution.clone();
    manifest_options.insert("action".into(), json!(action));
    manifest_options.insert("dry_run".into(), json!(dry_run));
    let manifest = json!({
        "schema_version": "agent-run-manifest.v1",
        "run_id": run_id,
        "created_at": created_at,
        "updated_at": chrono::Utc::now().to_rfc3339(),
        "command": "workflow run",
        "paperloom_version": env!("CARGO_PKG_VERSION"),
        "inputs": sources.iter().take(max_items).cloned().collect::<Vec<_>>(),
        "options": manifest_options,
        "items": items,
        "outputs": ["manifest.json", "events.jsonl", "results.json", "evidence.json", "claims.json"],
    });
    std::fs::write(
        run_dir.join("manifest.json"),
        serde_json::to_vec_pretty(&manifest)?,
    )?;
    std::fs::write(
        run_dir.join("events.jsonl"),
        format!(
            "{}\n",
            serde_json::json!({"event":"run_finished","run_id":run_id})
        ),
    )?;
    std::fs::write(run_dir.join("evidence.json"), b"[]\n")?;
    std::fs::write(run_dir.join("claims.json"), b"[]\n")?;
    std::fs::write(run_dir.join("results.json"), serde_json::to_vec_pretty(&manifest["items"])?)?;
    Ok(
        json!({"run_id": run_id, "status": status, "action": action, "dry_run": dry_run, "configuration_checked": configuration_checked, "items": manifest["items"], "run_dir": run_dir}),
    )
}

fn query_path(path: &str, values: &[(&str, String)]) -> String {
    let mut url =
        reqwest::Url::parse(&format!("http://paperloom.invalid{path}")).expect("static URL");
    {
        let mut pairs = url.query_pairs_mut();
        for (key, value) in values {
            if !value.is_empty() {
                pairs.append_pair(key, value);
            }
        }
    }
    let full = url.path().to_string()
        + url
            .query()
            .map(|q| format!("?{q}"))
            .unwrap_or_default()
            .as_str();
    full
}

fn output(ctx: &Ctx, value: &Value) {
    let value = match value {
        Value::Object(object)
            if object.contains_key("ok")
                && object.contains_key("data")
                && object.contains_key("warnings")
                && object.contains_key("references") =>
        {
            value.clone()
        }
        _ => json!({"ok": true, "data": value, "warnings": [], "references": []}),
    };
    if ctx.json {
        ui::print_json(&value);
    } else {
        println!(
            "{}",
            serde_json::to_string_pretty(&value).unwrap_or_default()
        );
    }
}

pub fn run(ctx: &Ctx, action: AgentCommand) -> Result<ExitCode> {
    if matches!(&action, AgentCommand::Mcp) {
        return launch_mcp(ctx);
    }
    let result = match action {
        AgentCommand::Doctor => {
            let settings = ctx.settings().ok();
            json!({
                "cli": {"version": env!("CARGO_PKG_VERSION")},
                "data_dir": ctx.data_dir,
                "backend": match &ctx.backend { crate::context::BackendState::Running(b) => json!({"state":"running","api_base":b.runtime.api_base}), crate::context::BackendState::Stopped => json!({"state":"stopped"}), crate::context::BackendState::Unreachable(r) => json!({"state":"unreachable","api_base":r.api_base}) },
                "credentials": {"translation": settings.as_ref().and_then(|s| s.translation.api_key.as_ref()).is_some(), "ocr": settings.as_ref().and_then(|s| s.ocr_token.as_ref()).is_some()},
            })
        }
        AgentCommand::Capabilities => json!({
            "version": env!("CARGO_PKG_VERSION"),
            "transport": ["cli", "stdio-mcp"],
            "features": ["pdf-upload", "ocr", "translation", "jobs", "reader-context", "reader.markdown", "zotero", "obsidian", "obsidian.bundle", "obsidian.sync-zotero", "batch-workflow"],
            "writes_require_confirmation": ["zotero.import", "zotero.writeback", "obsidian.export", "obsidian.sync-zotero", "workflow.run"],
        }),
        AgentCommand::Mcp => unreachable!("MCP handled before command dispatch"),
        AgentCommand::PrepareJobOptions { action, with_secrets } => {
            if !with_secrets {
                anyhow::bail!("内部 MCP 调用需要显式指定 --with-secrets");
            }
            let input = serde_json::from_reader(std::io::stdin().lock()).context("任务参数需要 JSON 对象")?;
            let (options, checked) = prepare_job_options(ctx, input, &action)?;
            json!({"options": options, "configuration_checked": checked})
        }
        AgentCommand::Document { action } => match action {
            DocumentCommand::Import { file } => backend(ctx)?.upload_pdf(&file)?,
            DocumentCommand::List { limit, offset } => backend(ctx)?.get(&query_path(
                "/api/v1/documents",
                &[
                    ("limit", limit.unwrap_or(50).to_string()),
                    ("offset", offset.unwrap_or(0).to_string()),
                ],
            ))?,
            DocumentCommand::Search { query, limit } => backend(ctx)?.get(&query_path(
                "/api/v1/search",
                &[("q", query), ("limit", limit.unwrap_or(20).to_string())],
            ))?,
        },
        AgentCommand::Ocr {
            action: OcrCommand::Submit(args),
        } => backend(ctx)?.post(
            &format!("/api/v1/documents/{}/ocr", encode(&args.document_id)),
            Some(&prepare_job_options(ctx, payload(&args.payload, args.payload_file.as_ref())?, "ocr")?.0),
        )?,
        AgentCommand::Translate {
            action: TranslateCommand::Submit(args),
        } => backend(ctx)?.post(
            &format!("/api/v1/documents/{}/translate", encode(&args.document_id)),
            Some(&prepare_job_options(ctx, payload(&args.payload, args.payload_file.as_ref())?, "translate")?.0),
        )?,
        AgentCommand::Job { action } => match action {
            JobCommand::Status { job_id } => {
                backend(ctx)?.get(&format!("/api/v1/jobs/{}", encode(&job_id)))?
            }
            JobCommand::Events { job_id, limit } => backend(ctx)?.get(&query_path(
                &format!("/api/v1/jobs/{}/progress/events", encode(&job_id)),
                &[("limit", limit.to_string()), ("start", "head".into())],
            ))?,
            JobCommand::Cancel { job_id } => backend(ctx)?.post(
                &format!("/api/v1/jobs/{}/actions/cancel", encode(&job_id)),
                Some(&json!({})),
            )?,
            JobCommand::Retry {
                job_id,
                stage,
                payload: raw,
            } => {
                let mut body = payload(&raw, None)?;
                body["stage"] = json!(stage);
                backend(ctx)?.post(
                    &format!("/api/v1/jobs/{}/actions/retry-stage", encode(&job_id)),
                    Some(&body),
                )?
            }
        },
        AgentCommand::Reader { action } => match action {
            ReaderCommand::Markdown { job_id, raw, output } => {
                let query = if raw { "" } else { "?obsidian=true" };
                let data = backend(ctx)?.get(&format!("/api/v1/jobs/{}/reader/markdown{query}", encode(&job_id)))?;
                if let Some(path) = output {
                    let key = if raw { "content" } else { "content_with_absolute_image_urls" };
                    let content = data[key].as_str().context("任务没有可导出的 Markdown 正文")?;
                    std::fs::write(&path, content).with_context(|| format!("无法写入 {}", path.display()))?;
                    json!({"job_id": job_id, "output": path, "bytes": content.len()})
                } else {
                    data
                }
            }
            ReaderCommand::Outline { job_id } => {
                json!({ "metadata": backend(ctx)?.get(&format!("/api/v1/jobs/{}/reader/metadata", encode(&job_id)))?, "regions": backend(ctx)?.get(&format!("/api/v1/jobs/{}/reader/regions", encode(&job_id)))? })
            }
            ReaderCommand::Page { job_id, page } => {
                if page == 0 {
                    anyhow::bail!("page 从 1 起算");
                }
                let regions = backend(ctx)?.get(&format!("/api/v1/jobs/{}/reader/regions", encode(&job_id)))?;
                let items: Vec<&Value> = reader_items(&regions)?
                    .iter().filter(|item| item.pointer("/source/page").and_then(Value::as_u64) == Some(u64::from(page)))
                    .collect();
                json!({ "page": page, "items": items })
            }
            ReaderCommand::Region { job_id, item_id } => {
                let regions = backend(ctx)?.get(&format!("/api/v1/jobs/{}/reader/regions", encode(&job_id)))?;
                reader_items(&regions)?.iter().find(|item| item["item_id"] == item_id)
                    .with_context(|| format!("未找到 Reader 区域 {item_id}"))?.clone()
            }
            ReaderCommand::Search { job_id, query } => {
                let regions = backend(ctx)?
                    .get(&format!("/api/v1/jobs/{}/reader/regions", encode(&job_id)))?;
                search_value(&regions, &query)
            }
        },
        AgentCommand::Zotero { action } => match action {
            ZoteroCommand::Status => backend(ctx)?.get("/api/v1/integrations/zotero")?,
            ZoteroCommand::Collections { library_id } => backend(ctx)?.get(&query_path(
                "/api/v1/integrations/zotero/collections",
                &[("library_id", library_id)],
            ))?,
            ZoteroCommand::Items {
                library_id,
                collection_key,
                query,
                limit,
            } => backend(ctx)?.get(&query_path(
                "/api/v1/integrations/zotero/items",
                &[
                    ("library_id", library_id),
                    ("collection_key", collection_key.unwrap_or_default()),
                    ("q", query.unwrap_or_default()),
                    ("limit", limit.unwrap_or(50).to_string()),
                ],
            ))?,
            ZoteroCommand::Import {
                library_id,
                collection_key,
                attachments,
                confirm,
            } => {
                if !confirm {
                    anyhow::bail!("Zotero 导入会写入 PaperLoom 书库，请加 --confirm 执行")
                }
                backend(ctx)?.post("/api/v1/integrations/zotero/import", Some(&json!({"library_id": library_id, "collection_key": collection_key, "attachments": attachments})))?
            }
            ZoteroCommand::Writeback {
                document_ids,
                confirm,
            } => {
                if !confirm {
                    anyhow::bail!("Zotero 写回会修改外部库，请加 --confirm 执行")
                }
                backend(ctx)?.post(
                    "/api/v1/integrations/zotero/writeback-batch",
                    Some(&json!({"document_ids":document_ids})),
                )?
            }
        },
        AgentCommand::Obsidian { action } => match action {
            ObsidianCommand::Status => backend(ctx)?.get("/api/v1/integrations/obsidian")?,
            ObsidianCommand::Export(args) => {
                if !args.confirm {
                    anyhow::bail!("Obsidian 导出会写入笔记，请加 --confirm 执行")
                }
                let mut body = args.target.payload();
                body["include_source"] = json!(args.include_source);
                body["on_conflict"] = json!(args.on_conflict);
                if let Some(id) = args.job_id {
                    backend(ctx)?.post(&format!("/api/v1/jobs/{}/obsidian/export", encode(&id)), Some(&body))?
                } else {
                    body["document_ids"] = json!(args.document_ids);
                    backend(ctx)?.post("/api/v1/integrations/obsidian/export-batch", Some(&body))?
                }
            }
            ObsidianCommand::Bundle { job_id, output, include_source } => {
                let path = format!("/api/v1/jobs/{}/markdown/export?include_source={include_source}", encode(&job_id));
                let bytes = backend(ctx)?.download(&path, &output)?;
                json!({"job_id": job_id, "output": output, "bytes": bytes})
            }
            ObsidianCommand::SyncZotero { job_id, target, confirm } => {
                if !confirm {
                    anyhow::bail!("回写书目字段和阅读笔记会修改 Zotero 条目，请加 --confirm 执行")
                }
                let path = format!("/api/v1/jobs/{}/obsidian/zotero-sync", encode(&job_id));
                backend(ctx)?.post(&path, Some(&target.payload()))?
            }
        },
        AgentCommand::Workflow {
            action: WorkflowCommand::Validate { file },
        } => {
            let spec = read_workflow(&file)?;
            validate_workflow(&spec)?;
            json!({"valid": true, "workflow": retainpdf_core::models::redact_json_value(&spec, &[])})
        }
        AgentCommand::Workflow {
            action:
                WorkflowCommand::Run {
                    file,
                    dry_run,
                    confirm,
                },
        } => {
            let run = run_workflow(ctx, &file, dry_run, confirm)?;
            if matches!(run["status"].as_str(), Some("failed" | "partial" | "blocked")) {
                output(ctx, &json!({"ok": false, "data": run, "warnings": [], "references": []}));
                return Ok(ExitCode::FAILURE);
            }
            run
        }
    };
    output(ctx, &result);
    Ok(ExitCode::SUCCESS)
}

fn launch_mcp(ctx: &Ctx) -> Result<ExitCode> {
    let executable = std::env::current_exe().context("无法定位 PaperLoom CLI")?;
    let mut script_candidates = Vec::new();
    if let Some(path) = std::env::var_os("PAPERLOOM_MCP_SCRIPT") {
        script_candidates.push(PathBuf::from(path));
    }
    if let Some(bin_dir) = executable.parent() {
        script_candidates.push(bin_dir.join("../agent-mcp/paperloom_mcp.py"));
    }
    script_candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("agent-mcp")
            .join("paperloom_mcp.py"),
    );
    let script = script_candidates
        .into_iter()
        .map(|path| path.canonicalize().unwrap_or(path))
        .find(|path| path.is_file())
        .ok_or_else(|| anyhow::anyhow!("MCP bridge script not found"))?;
    let mut python_candidates = Vec::new();
    if let Some(path) = std::env::var_os("PAPERLOOM_MCP_PYTHON") {
        python_candidates.push(PathBuf::from(path));
    }
    if let Some(bin_dir) = executable.parent() {
        python_candidates.push(bin_dir.join("../python/python.exe"));
        python_candidates.push(bin_dir.join("../python/bin/python3"));
    }
    let repo_venv = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join(".venv");
    python_candidates.push(repo_venv.join("Scripts").join("python.exe"));
    python_candidates.push(repo_venv.join("bin").join("python3"));
    python_candidates.push(PathBuf::from("python"));
    python_candidates.push(PathBuf::from("python3"));
    let python = python_candidates
        .into_iter()
        .find(|path| {
            path.to_string_lossy() == "python"
                || path.to_string_lossy() == "python3"
                || path.is_file()
        })
        .unwrap_or_else(|| PathBuf::from("python"));
    let mut command = Command::new(&python);
    command
        .arg(&script)
        .env("PAPERLOOM_DATA_DIR", &ctx.data_dir)
        .env("PAPERLOOM_CONFIG_CLI", &executable)
        .env("PYTHONUTF8", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUNBUFFERED", "1")
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());
    let status = match command.status() {
        Ok(status) => status,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Command::new("python3")
            .arg(&script)
            .env("PAPERLOOM_DATA_DIR", &ctx.data_dir)
            .env("PAPERLOOM_CONFIG_CLI", &executable)
            .env("PYTHONUTF8", "1")
            .env("PYTHONIOENCODING", "utf-8")
            .env("PYTHONUNBUFFERED", "1")
            .stdin(Stdio::inherit())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status()
            .with_context(|| "找不到 Python 解释器，请安装 Python 3 或设置 PAPERLOOM_MCP_SCRIPT")?,
        Err(error) => return Err(error).with_context(|| "启动 PaperLoom MCP bridge 失败"),
    };
    Ok(ExitCode::from(
        status.code().unwrap_or(1).clamp(0, 255) as u8
    ))
}

fn encode(value: &str) -> String {
    value
        .replace('%', "%25")
        .replace('/', "%2F")
        .replace('?', "%3F")
        .replace('#', "%23")
}

fn reader_items(regions: &Value) -> Result<&[Value]> {
    regions["items"].as_array().map(Vec::as_slice).context("Reader 没有返回区块列表")
}

fn search_value(value: &Value, query: &str) -> Value {
    let q = query.to_ascii_lowercase();
    match value {
        Value::Array(items) => Value::Array(
            items
                .iter()
                .filter(|item| item.to_string().to_ascii_lowercase().contains(&q))
                .cloned()
                .collect(),
        ),
        Value::Object(map) => {
            let mut out = map.clone();
            if let Some(items) = map.get("items") {
                out.insert("items".into(), search_value(items, query));
            }
            Value::Object(out)
        }
        _ => value.clone(),
    }
}

fn uuid_like(text: &str) -> String {
    let mut hash: u64 = 14695981039346656037;
    for byte in text.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(1099511628211);
    }
    format!("{hash:016x}")
}
