// 管理后台 · 平台设置：多用户模式下所有任务统一用的翻译模型和 OCR。
// 状态卡（能不能提交任务、缺哪项、来源、最近修改）+ 翻译 / OCR 两张表单卡（各自能先检测）+ 保存。
// 密钥只写不读：输入框留空就保留原值，读回只显示「已配置 末几位」。
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  fetchPlatformSettings,
  savePlatformSettings,
  testPlatformSettings,
  type PlatformSettingsInput,
  type PlatformSettingsView,
  type PlatformTestInput,
  type PlatformTestResult,
  type PlatformTestTarget,
} from "@retainpdf/api/admin-platform";
import { authErrorText } from "@/features/auth/index.js";
import {
  OCR_PROVIDER_DEFINITIONS,
  TRANSLATION_PROVIDER_OPTIONS,
  inferTranslationProvider,
} from "@/platform/config/providers.js";
import {
  applyTranslationProvider,
  formFromView,
  isPlatformFormDirty,
  missingLabel,
  ocrProviderChanged,
  ocrProviderLabel,
  ocrTokenLabel,
  platformFormProblem,
  platformInput,
  platformTestInput,
  protocolLabel,
  secretPlaceholder,
  thinkingLabel,
  type PlatformForm,
} from "../domain/platform-settings.js";
import { formatWhen } from "./admin-shared.jsx";

export type PlatformApi = {
  get: () => Promise<PlatformSettingsView>;
  save: (input: PlatformSettingsInput) => Promise<PlatformSettingsView>;
  test: (target: PlatformTestTarget, values: PlatformTestInput) => Promise<PlatformTestResult>;
};

const defaultPlatformApi: PlatformApi = {
  get: () => fetchPlatformSettings(),
  save: (input) => savePlatformSettings(input),
  test: (target, values) => testPlatformSettings(target, values),
};

type TestState = { busy: boolean; result: PlatformTestResult | null; error: string };
const IDLE_TEST: TestState = { busy: false, result: null, error: "" };

function TestLine({ state }: { state: TestState }) {
  if (state.busy) return <span className="admin-sub" role="status">正在检测…</span>;
  if (state.error) return <span className="auth-error" role="alert">{state.error}</span>;
  if (!state.result) return null;
  const hint = `${state.result.hint || ""}`.trim();
  return (
    <>
      <span className={state.result.ok ? "admin-test-ok" : "auth-error"} role="status" data-admin-test={state.result.ok ? "ok" : "fail"}>
        {state.result.summary || (state.result.ok ? "连接成功" : "连接失败")}
      </span>
      {/* 补充说明（如「没有收到服务商的回复，和 Key 无关。底层错误：…」），排查时用。 */}
      {hint ? <span className="admin-test-hint" data-admin-test-hint="true">{hint}</span> : null}
    </>
  );
}

export function AdminPlatformView({ api = defaultPlatformApi }: { api?: PlatformApi }) {
  const [view, setView] = useState<PlatformSettingsView | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<PlatformForm>(() => formFromView(null));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState("");
  const [tests, setTests] = useState<Record<PlatformTestTarget, TestState>>({ translation: IDLE_TEST, ocr: IDLE_TEST });

  const load = useCallback(async () => {
    try {
      const next = await api.get();
      setView(next);
      setForm(formFromView(next));
      setLoadError("");
    } catch (err) {
      setLoadError(authErrorText(err, "读取平台设置失败。"));
    }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  // 一改表单就清掉上一次保存的结果和报错，免得红字挂着误导。
  const touch = () => {
    setSaved("");
    setSaveError("");
  };
  const update = (patch: Partial<PlatformForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    touch();
  };

  async function runTest(target: PlatformTestTarget) {
    setTests((prev) => ({ ...prev, [target]: { busy: true, result: null, error: "" } }));
    try {
      const result = await api.test(target, platformTestInput(form, target));
      setTests((prev) => ({ ...prev, [target]: { busy: false, result, error: "" } }));
    } catch (err) {
      setTests((prev) => ({ ...prev, [target]: { busy: false, result: null, error: authErrorText(err, "检测失败。") } }));
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaved("");
    const problem = platformFormProblem(form, view);
    if (problem) {
      setSaveError(problem);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const next = await api.save(platformInput(form));
      setView(next);
      setForm(formFromView(next));
      setSaved(next.ready ? "已保存，立即生效。" : "已保存，但平台还不能用，见上方缺的项。");
    } catch (err) {
      setSaveError(authErrorText(err, "保存失败。"));
    } finally {
      setSaving(false);
    }
  }

  if (loadError && !view) {
    return (
      <section className="admin-section" data-admin-platform="true">
        <header className="admin-section-head"><div><h1>平台设置</h1></div></header>
        <p className="auth-error" role="alert">{loadError}</p>
        <p><button type="button" className="auth-secondary" onClick={() => void load()}>重试</button></p>
      </section>
    );
  }

  const dirty = isPlatformFormDirty(form, view);
  const ocrDef = OCR_PROVIDER_DEFINITIONS.find((d) => d.id === form.ocrProvider);
  const providerDef = TRANSLATION_PROVIDER_OPTIONS.find((p) => p.id === form.provider);
  const options = view?.options;
  const protocols = options?.api_protocols?.length ? options.api_protocols : ["openai", "openai_responses", "anthropic"];
  const thinkingLevels = ["", ...(options?.thinking_levels || []).filter(Boolean)];
  const ocrProviders = options?.ocr_providers?.length ? options.ocr_providers : OCR_PROVIDER_DEFINITIONS.map((d) => d.id);
  const workersLimit = options?.max_workers_limit ?? 64;
  const ocrChanged = ocrProviderChanged(form, view);

  return (
    <section className="admin-section" data-admin-platform="true">
      <header className="admin-section-head">
        <div>
          <h1>平台设置</h1>
          <p className="admin-sub">多用户模式下所有任务统一用这里的翻译模型和 OCR，用户自己填的接口不生效。保存后立即生效，已经在跑的任务不受影响。</p>
        </div>
      </header>

      {view === null ? <p className="admin-sub">正在读取平台设置…</p> : (
        <div className="admin-platform-status" data-ready={view.ready ? "true" : "false"} role="status">
          <strong>{view.ready ? "平台可用：用户现在可以提交任务。" : "平台还不能用：用户提交任务会失败。"}</strong>
          {!view.ready && view.missing.length ? <span>还缺：{view.missing.map(missingLabel).join("、")}。</span> : null}
          <small>
            {view.source === "environment" ? "当前用的是部署时的环境变量；在这里保存后以这里为准。" : "当前用的是这里保存的设置。"}
            {view.updated_at ? ` 最近修改：${formatWhen(view.updated_at)}${view.updated_by?.username ? `（${view.updated_by.username}）` : ""}。` : ""}
          </small>
        </div>
      )}

      <form className="admin-platform-form" data-admin-form="platform" onSubmit={onSave}>
        <section className="admin-card">
          <h2>翻译模型</h2>
          <div className="admin-fields">
            <label className="admin-field">
              <span>服务</span>
              <select value={form.provider} onChange={(e) => { setForm((prev) => applyTranslationProvider(prev, e.target.value)); touch(); }}>
                {TRANSLATION_PROVIDER_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span>接口协议</span>
              <select value={form.apiProtocol} onChange={(e) => update({ apiProtocol: e.target.value })}>
                {protocols.map((id) => <option key={id} value={id}>{protocolLabel(id)}</option>)}
              </select>
            </label>
            <label className="admin-field admin-field-wide">
              <span>接口地址</span>
              <input value={form.baseUrl} placeholder="https://…/v1" onChange={(e) => update({ baseUrl: e.target.value, provider: inferTranslationProvider(e.target.value) })} />
            </label>
            <label className="admin-field">
              <span>模型</span>
              <input value={form.model} placeholder={providerDef?.defaultModel || "模型名"} onChange={(e) => update({ model: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>API Key</span>
              <input
                type="password"
                autoComplete="new-password"
                value={form.apiKey}
                placeholder={secretPlaceholder(view?.translation.api_key_configured, view?.translation.api_key_hint, "翻译 API Key")}
                onChange={(e) => update({ apiKey: e.target.value })}
              />
            </label>
            <label className="admin-field">
              <span>思考深度</span>
              <select value={form.thinking} onChange={(e) => update({ thinking: e.target.value })}>
                {thinkingLevels.map((id) => <option key={id || "default"} value={id}>{thinkingLabel(id)}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span>单个任务的并发上限（0 = 不限，最多 {workersLimit}）</span>
              <input inputMode="numeric" value={form.maxWorkers} onChange={(e) => update({ maxWorkers: e.target.value })} />
            </label>
          </div>
          <p className="admin-sub">思考深度和并发上限由平台统一定：用户提交时填的思考深度不生效，并发数超过上限的按上限跑，防止平台的 Key 被限流。</p>
          <div className="admin-card-foot">
            <button type="button" className="auth-secondary" data-admin-test-target="translation" disabled={tests.translation.busy} onClick={() => void runTest("translation")}>检测翻译接口</button>
            <TestLine state={tests.translation} />
          </div>
        </section>

        <section className="admin-card">
          <h2>OCR</h2>
          <div className="admin-fields">
            <label className="admin-field">
              <span>服务</span>
              <select value={form.ocrProvider} onChange={(e) => update({ ocrProvider: e.target.value, ocrToken: "" })}>
                {ocrProviders.map((id) => <option key={id} value={id}>{ocrProviderLabel(id)}</option>)}
              </select>
            </label>
            <label className="admin-field admin-field-wide">
              <span>{ocrTokenLabel(form.ocrProvider)}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={form.ocrToken}
                placeholder={ocrChanged ? `换了服务，要填新的 ${ocrTokenLabel(form.ocrProvider)}` : secretPlaceholder(view?.ocr.token_configured, view?.ocr.token_hint, ocrTokenLabel(form.ocrProvider))}
                onChange={(e) => update({ ocrToken: e.target.value })}
              />
            </label>
          </div>
          {ocrChanged ? <p className="admin-sub admin-warn-text" data-admin-ocr-changed="true">换了 OCR 服务：旧的 token 在新服务下用不了，保存前要填新的。</p> : null}
          <div className="admin-card-foot">
            <button type="button" className="auth-secondary" data-admin-test-target="ocr" disabled={tests.ocr.busy} onClick={() => void runTest("ocr")}>检测 OCR</button>
            <TestLine state={tests.ocr} />
            {ocrDef?.docsUrl ? <a className="auth-link admin-docs-link" href={ocrDef.docsUrl} target="_blank" rel="noopener noreferrer">{ocrDef.docsLabel}</a> : null}
          </div>
        </section>

        <div className="admin-savebar">
          <button type="submit" className="auth-primary" disabled={saving || !dirty}>{saving ? "正在保存…" : "保存"}</button>
          <button type="button" className="auth-secondary" disabled={saving || !dirty} onClick={() => { setForm(formFromView(view)); setSaveError(""); }}>放弃修改</button>
          {dirty && !saving ? <span className="admin-sub">有未保存的修改</span> : null}
          {saveError ? <span className="auth-error" role="alert">{saveError}</span> : null}
          {saved ? <span className="auth-ok" role="status">{saved}</span> : null}
        </div>
      </form>
    </section>
  );
}
