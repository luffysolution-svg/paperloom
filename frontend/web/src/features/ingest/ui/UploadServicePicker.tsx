import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createTranslationModelListFlow, useOptionalCredentialsServices, type TaskServiceCatalog, type TaskServiceSelection } from "@/features/credentials/index.js";
import { API_PREFIX } from "@/platform/config/api-constants.js";
import { listModels } from "@/platform/api/index.js";
import { CREDENTIALS_CHANGED_EVENT } from "@/platform/contracts/credentials-contract.js";
import { useHomeFeatures, useHomeSettingsHub, useHomeWorkflowDialog, useHomeWorkflowViewActions, useHomeWorkflowViewStore } from "@/ui/context/home-services-context.js";
import { useStoreSnapshot } from "@/ui/hooks/use-store.js";

export function UploadServicePicker() {
  const services = useOptionalCredentialsServices();
  const workflow = useStoreSnapshot(useHomeWorkflowViewStore());
  const actions = useHomeWorkflowViewActions();
  const features = useHomeFeatures();
  const settings = useHomeSettingsHub();
  const dialog = useHomeWorkflowDialog();
  const [, refresh] = useState(0);
  const [models, setModels] = useState<{ items?: string[]; loading?: boolean; tone?: string; message?: string }>({});
  const catalog: TaskServiceCatalog | undefined = services?.feature?.getTaskServiceCatalog?.();
  const selection: TaskServiceSelection = workflow.taskServiceSelection || {};
  const selected = catalog?.resolve(selection);
  const translationRef = useRef(selected?.translation);
  translationRef.current = selected?.translation;
  const modelFlow = useMemo(() => createTranslationModelListFlow({
    apiPrefix: API_PREFIX,
    currentProvider: () => translationRef.current?.provider || "custom",
    dialogElementsPort: { elements: () => ({
      apiKeyInput: { value: translationRef.current?.apiKey || "" },
      modelBaseUrlInput: { value: translationRef.current?.baseUrl || "" },
    }) },
    listModels,
    viewPort: { setTranslationModels: setModels },
  }), []);

  useEffect(() => {
    const onChange = () => refresh((value) => value + 1);
    document.addEventListener(CREDENTIALS_CHANGED_EVENT, onChange);
    return () => document.removeEventListener(CREDENTIALS_CHANGED_EVENT, onChange);
  }, []);
  useEffect(() => { modelFlow.clear(); }, [modelFlow, selected?.translation.id, selected?.translation.apiKey, selected?.translation.baseUrl]);
  useEffect(() => () => modelFlow.clear(), [modelFlow]);
  if (!catalog || !selected) return null;
  const locked = Boolean(workflow.submitBusy);
  const ocrOnly = Boolean(workflow.ocrOnly);
  const modelOptions = [...new Set([...selected.translation.models, ...(models.items || [])])];

  function change(patch: TaskServiceSelection) {
    actions.setTaskServiceSelection({
      profileId: "",
      ocrId: selected!.ocr.id,
      translationId: selected!.translation.id,
      model: selected!.model,
      ...patch,
    });
    features.workflowFeature?.applyWorkflowMode?.();
  }

  function chooseProfile(id: string) {
    if (id === "__default") actions.setTaskServiceSelection(null);
    else {
      const profile = catalog!.profiles.find((item) => item.id === id);
      if (profile) actions.setTaskServiceSelection({ profileId: id, ocrId: profile.ocrId, translationId: profile.translationId, model: profile.model });
    }
    features.workflowFeature?.applyWorkflowMode?.();
  }

  return (
    <section className="upload-service-picker" aria-label="本次任务接口">
      <div className="upload-service-presets">
        {catalog.profiles.length ? (
          <label>
            <span>配置方案</span>
            <select aria-label="本次任务配置方案" value={selection.profileId || (workflow.taskServiceSelection ? "__custom" : "__default")} disabled={locked} onChange={(event) => chooseProfile(event.target.value)}>
              <option value="__default">当前默认配置</option>
              {workflow.taskServiceSelection && !selection.profileId ? <option value="__custom" disabled>自定义组合</option> : null}
              {catalog.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </label>
        ) : null}
        <span className="upload-service-scope">仅本次任务生效</span>
        <button type="button" className="upload-service-manage" disabled={locked} onClick={() => {
          dialog.requestClose();
          settings.dialogStore.open({ tab: "api" });
        }}>管理接口</button>
      </div>
      <div className={`upload-service-fields${ocrOnly ? " is-ocr-only" : ""}`}>
        <label>
          <span>OCR 服务</span>
          <select aria-label="本次任务 OCR 服务" value={selected.ocr.id} disabled={locked} onChange={(event) => change({ ocrId: event.target.value })}>
            {catalog.ocr.map((item) => <option key={item.id} value={item.id} disabled={!item.configured}>{item.label}</option>)}
          </select>
        </label>
        {!ocrOnly ? <>
          <label>
            <span>翻译服务</span>
            <select aria-label="本次任务翻译服务" value={selected.translation.id} disabled={locked} onChange={(event) => {
              const service = catalog.translations.find((item) => item.id === event.target.value)!;
              change({ translationId: service.id, model: service.model });
            }}>
              {catalog.translations.map((item) => <option key={item.id} value={item.id} disabled={!item.configured}>{item.label}{item.configured ? "" : "（未配置）"}</option>)}
            </select>
          </label>
          <div className="upload-service-model">
            <label htmlFor="upload-translation-model">翻译模型</label>
            <div className="upload-service-model-input">
              <input id="upload-translation-model" aria-label="本次任务翻译模型" type="text" list="upload-translation-models" value={selected.model} placeholder="选择或输入模型" disabled={locked} onChange={(event) => change({ model: event.target.value })} />
              <datalist id="upload-translation-models">{modelOptions.map((model) => <option key={model} value={model} />)}</datalist>
              <button type="button" aria-label="拉取本次翻译服务的模型" title="拉取可用模型" disabled={locked || models.loading || !selected.translation.apiKey} aria-busy={Boolean(models.loading)} onClick={() => void modelFlow.fetchModels()}>
                <RefreshCw aria-hidden="true" className={models.loading ? "animate-spin motion-reduce:animate-none" : ""} />
              </button>
            </div>
          </div>
        </> : null}
      </div>
      {!selected.ocr.configured || (!ocrOnly && !selected.translation.configured)
        ? <p className="upload-service-message is-error" role="alert">所选服务尚未配置，请先在「管理接口」中保存凭据。</p>
        : !ocrOnly && !selected.model.trim()
          ? <p className="upload-service-message is-error" role="alert">请选择或输入翻译模型。</p>
          : !ocrOnly && models.message ? <p className={`upload-service-message${models.tone === "error" ? " is-error" : ""}`} role="status">{models.message}{models.tone === "error" ? " 可手动输入模型名称。" : ""}</p> : null}
    </section>
  );
}
