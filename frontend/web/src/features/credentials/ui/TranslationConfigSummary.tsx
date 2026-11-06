import { useEffect, useState } from "react";
import { SERVICE_PROFILES_CHANGED } from "../domain/service-profiles.js";
import { CREDENTIALS_CHANGED_EVENT } from "@/platform/contracts/credentials-contract.js";
import { useOptionalCredentialsServices } from "./credentials-context.js";
import { getTranslationProviderDefinition } from "@/platform/config/providers.js";

export function TranslationConfigSummary() {
  const services = useOptionalCredentialsServices();
  const [, refresh] = useState(0);
  useEffect(() => {
    const onChange = () => refresh((value) => value + 1);
    document.addEventListener(SERVICE_PROFILES_CHANGED, onChange);
    document.addEventListener(CREDENTIALS_CHANGED_EVENT, onChange);
    return () => {
      document.removeEventListener(SERVICE_PROFILES_CHANGED, onChange);
      document.removeEventListener(CREDENTIALS_CHANGED_EVENT, onChange);
    };
  }, []);
  const config = services?.feature?.getTranslationConfig?.() || {};
  const model = `${config.model || ""}`.trim();
  if (!model) return null;
  const providerId = `${config.provider || ""}`.trim();
  const provider = providerId ? getTranslationProviderDefinition(providerId).label : "";
  const workers = Number(config.workers) > 0 ? ` · 并发 ${config.workers}` : "";
  return (
    <span className="translation-config-summary" title={`${config.baseUrl || ""}`}>
      当前模型：{provider ? `${provider} / ` : ""}{model}{workers}
    </span>
  );
}
