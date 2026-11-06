import { useEffect, useState } from "react";
import { SERVICE_PROFILES_CHANGED, type ServiceProfiles } from "../domain/service-profiles.js";
import { useOptionalCredentialsServices } from "./credentials-context.js";

export function useServiceProfiles() {
  const services = useOptionalCredentialsServices();
  const manager: ServiceProfiles | undefined = services?.feature?.serviceProfiles;
  const read = () => manager?.getState() || { profiles: [], activeId: "", busy: false };
  const [state, setState] = useState(read);
  useEffect(() => {
    const refresh = () => setState(read());
    refresh();
    document.addEventListener(SERVICE_PROFILES_CHANGED, refresh);
    return () => document.removeEventListener(SERVICE_PROFILES_CHANGED, refresh);
  }, [manager]);
  return { manager, ...state };
}

export function ServiceProfileSelect({
  disabled = false,
  label = "配置方案",
  showModel = false,
}: { disabled?: boolean; label?: string; showModel?: boolean } = {}) {
  const { manager, profiles, activeId, busy } = useServiceProfiles();
  const [error, setError] = useState("");
  if (!manager || !profiles.length) return null;
  const active = profiles.find((profile) => profile.id === activeId);
  const activeModel = `${active?.translation?.model || ""}`.trim();

  async function change(id: string) {
    setError("");
    try {
      await manager!.apply(id);
    } catch (reason) {
      setError((reason as Error).message || "切换配置方案失败，请重试");
    }
  }

  return (
    <div className="credential-service-profile-picker">
      <label>
        <span>{label}</span>
        <select aria-label="配置方案" value={activeId} disabled={disabled || busy}
          onChange={(event) => void change(event.target.value)}>
          <option value="" disabled>当前设置</option>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        </select>
      </label>
      {showModel && activeModel ? <span className="credential-service-profile-model">模型：{activeModel}</span> : null}
      {busy ? <span role="status">正在切换…</span> : null}
      {error ? <p role="alert" className="credential-validation-error">{error}</p> : null}
    </div>
  );
}
