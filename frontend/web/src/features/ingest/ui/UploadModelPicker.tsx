import { useEffect, useState } from "react";
import { Select } from "radix-ui";
import { Check, ChevronDown, PencilLine, RefreshCw } from "lucide-react";

export function UploadModelPicker({ serviceId, value, models, disabled, loading, canFetch, onChange, onFetch }: {
  serviceId: string;
  value: string;
  models: string[];
  disabled: boolean;
  loading: boolean;
  canFetch: boolean;
  onChange: (value: string) => void;
  onFetch: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  useEffect(() => { setOpen(false); setManual(false); }, [serviceId]);
  const choices = [...new Set([value, ...models].filter((model) => model.trim()))];

  async function fetchModels() {
    if (await onFetch()) {
      setManual(false);
      setOpen(true);
    }
  }

  return (
    <div className="upload-service-model-input">
      {manual ? <>
        <input id="upload-translation-model" aria-label="本次任务翻译模型" type="text" value={value}
          placeholder="输入模型名称" autoFocus disabled={disabled} onChange={(event) => onChange(event.target.value)} />
        <button type="button" className="upload-model-list-toggle" aria-label="从列表选择模型" title="从列表选择模型"
          disabled={disabled} onClick={() => { setManual(false); setOpen(true); }}><ChevronDown aria-hidden="true" /></button>
      </> : (
        <Select.Root value={value} open={open} onOpenChange={setOpen} disabled={disabled} onValueChange={(model) => {
          if (model === "__manual__") setManual(true);
          else onChange(model);
        }}>
          <Select.Trigger id="upload-translation-model" className="upload-model-trigger" aria-label="本次任务翻译模型" title={value}>
            <span className="upload-model-value"><Select.Value placeholder="选择模型" /></span>
            <Select.Icon asChild><ChevronDown aria-hidden="true" /></Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="credential-translation-provider-content upload-model-options" position="popper" sideOffset={6} align="start">
              <Select.Viewport className="credential-translation-provider-viewport upload-model-viewport">
                <Select.Group>
                  <Select.Label className="upload-model-list-label">可选模型 · {choices.length}</Select.Label>
                  {choices.map((model) => (
                    <Select.Item key={model} value={model} className="credential-translation-provider-option upload-model-option">
                      <Select.ItemText>{model}</Select.ItemText>
                      <Select.ItemIndicator className="credential-translation-provider-check"><Check aria-hidden="true" /></Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Group>
                <Select.Separator className="upload-model-separator" />
                <Select.Item value="__manual__" className="credential-translation-provider-option upload-model-option is-manual">
                  <PencilLine aria-hidden="true" /><Select.ItemText>手动输入模型名称</Select.ItemText>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      )}
      <button type="button" className="upload-service-model-refresh" aria-label="拉取本次翻译服务的模型" title="拉取可用模型"
        disabled={disabled || loading || !canFetch} aria-busy={loading} onClick={() => void fetchModels()}>
        <RefreshCw aria-hidden="true" className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
      </button>
    </div>
  );
}
