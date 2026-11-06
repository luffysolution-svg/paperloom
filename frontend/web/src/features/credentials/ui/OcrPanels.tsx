import {
  credentialTokenInputId,
  credentialValidateButtonId,
  credentialValidationId,
} from "./credentials-dom-ids.js";
import { useCredentialsController } from "./useCredentialsController.js";
import { useCredentialSave } from "./useCredentialSave.js";
import { OCR_PROVIDER_DEFINITIONS } from "@/platform/config/providers.js";
import { validationIcon } from "../domain/validation-icon.js";
import { ExternalLink, PlugZap, Save } from "lucide-react";
import { SecretInput } from "./SecretInput.js";
import {
  resetHandlerFor,
} from "./provider-panel-shared.js";

export function OcrPanels({ disabled = false }: { disabled?: boolean } = {}) {
  const { credentials, view, handlers, tokenInputRef, elementsRef } = useCredentialsController();
  const activeProvider = credentials.ocrProvider;
  const { saving, save } = useCredentialSave(handlers?.saveOcr, "OCR 设置已保存");
  const locked = disabled || saving || view.dialogStatus?.tone === "pending";

  return (
    <div className="credential-provider-panels">
      {OCR_PROVIDER_DEFINITIONS.map((provider) => {
        const active = provider.id === activeProvider;
        const validation = view.validations[provider.id] || { message: "", tone: "" };
        const content = `${validation.message || ""}`.trim();
        const badgeClasses = [
          "token-inline-status",
          content ? "" : "hidden",
          validation.tone === "valid" ? "is-valid" : "",
          validation.tone === "error" ? "is-error" : "",
          content && validation.tone === "pending" ? "is-pending" : "",
        ].filter(Boolean).join(" ");

        return (
          <section
            key={provider.id}
            className={`credential-panel credential-provider-panel${active ? " is-active" : ""}`}
            data-ocr-provider-panel={provider.id}
            hidden={!active}
          >
            <div className="credential-token-field">
              <label htmlFor={credentialTokenInputId(provider.id)} className="developer-label">{provider.tokenLabel}</label>
              <div className="credential-secret-input-row">
              <SecretInput
                id={credentialTokenInputId(provider.id)}
                secretLabel={provider.tokenLabel}
                autoComplete="off"
                placeholder={provider.tokenPlaceholder}
                defaultValue=""
                ref={tokenInputRef(provider.id)}
                disabled={locked}
                onInput={() => {
                  if (elementsRef.tokenInputs[provider.id]) delete elementsRef.tokenInputs[provider.id]!.dataset.clearCredential;
                  handlers?.markDirty?.();
                  resetHandlerFor(handlers)?.();
                }}
              />
              <button
                type="button"
                className="credential-inline-clear"
                disabled={locked}
                onClick={() => {
                  const input = elementsRef.tokenInputs[provider.id];
                  if (!input) return;
                  input.value = "";
                  input.dataset.clearCredential = "1";
                  handlers?.markDirty?.();
                  resetHandlerFor(handlers)?.();
                }}
              >
                清除
              </button>
              </div>
            </div>
            {!provider.supportsValidation ? (
              <p className="credential-ocr-hint">{provider.validationUnavailableMessage}</p>
            ) : null}
            <div className="credential-card-footer">
              <div className="credential-card-actions">
                <button type="button" className="app-button secondary" disabled={locked}
                  aria-busy={saving} onClick={() => void save()}>
                  <Save aria-hidden="true" />{saving ? "正在保存…" : "保存 OCR"}
                </button>
                {provider.supportsValidation ? (
                  <button
                    id={credentialValidateButtonId(provider.id)}
                    type="button"
                    className="app-button secondary"
                    disabled={locked || validation.tone === "pending"}
                    onClick={() => handlers?.validateOcr?.()}
                  >
                    <PlugZap aria-hidden="true" />
                    {provider.validationButtonLabel}
                  </button>
                ) : null}
                <span
                  id={credentialValidationId(provider.id)}
                  className={badgeClasses}
                  title={content || provider.validationIdleMessage}
                  aria-label={content || provider.validationIdleMessage}
                  role="status"
                  aria-live="polite"
                >
                  {validationIcon(validation.tone, content)}
                </span>
                <a className="credential-card-link" href={provider.docsUrl} target="_blank" rel="noopener noreferrer">
                  {provider.docsLabel}
                  <ExternalLink aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
