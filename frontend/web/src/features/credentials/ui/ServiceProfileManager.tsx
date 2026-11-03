import { useEffect, useState } from "react";
import { ServiceProfileSelect, useServiceProfiles } from "./ServiceProfileSelect.js";

export function ServiceProfileManager({ disabled, onSave }: {
  disabled: boolean;
  onSave: (name: string) => Promise<void>;
}) {
  const { manager, profiles, activeId, busy } = useServiceProfiles();
  const active = profiles.find((profile) => profile.id === activeId);
  const [name, setName] = useState(active?.name || "");
  const [pendingDelete, setPendingDelete] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setName(active?.name || "");
    setPendingDelete(false);
    setError("");
  }, [activeId, active?.name]);
  if (!manager) return null;
  const locked = disabled || busy || working;

  async function run(action: () => Promise<unknown>) {
    setWorking(true);
    setError("");
    try {
      await action();
      setPendingDelete(false);
    } catch (reason) {
      setError((reason as Error).message || "配置方案保存失败，请重试");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="credential-service-profile-manager" aria-label="配置方案管理">
      <h3>配置方案</h3>
      <p>保存 OCR、翻译和 AI Agent 的组合。修改后点「保存设置」更新当前方案，或另存为新方案。</p>
      <ServiceProfileSelect disabled={locked} />
      <div className="credential-service-profile-actions">
        <label>
          <span className="developer-label">方案名称</span>
          <input type="text" value={name} disabled={locked} placeholder="例如：日常翻译"
            onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="button" className="app-button secondary" disabled={locked || !name.trim()}
          onClick={() => void run(() => onSave(name))}>另存为新方案</button>
        <button type="button" className="app-button secondary" disabled={locked || !active || !name.trim()}
          onClick={() => void run(() => manager!.rename(activeId, name))}>重命名</button>
        <button type="button" className="app-button secondary" disabled={locked || !active}
          onClick={() => setPendingDelete(true)}>删除方案</button>
      </div>
      {pendingDelete ? (
        <div className="credential-service-profile-actions" role="group" aria-label="确认删除方案">
          <span>删除「{active?.name}」？当前使用的接口设置会保留。</span>
          <button type="button" className="app-button secondary" disabled={locked}
            onClick={() => void run(() => manager!.remove(activeId))}>确认删除</button>
          <button type="button" className="app-button secondary" disabled={locked}
            onClick={() => setPendingDelete(false)}>取消</button>
        </div>
      ) : null}
      {error ? <p className="credential-validation-error" role="alert">{error}</p> : null}
    </section>
  );
}
