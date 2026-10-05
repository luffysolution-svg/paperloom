// HomeAskComposer 已选范围 chips

import { BookOpen, FolderOpen, X } from "lucide-react";
import type { HomeAskScope } from "../domain/types.js";
import { scopeKey } from "../domain/types.js";

export type HomeAskComposerChipsProps = {
  scopes: HomeAskScope[];
  disabled: boolean;
  isRunning: boolean;
  onScopesChange: (next: HomeAskScope[]) => void;
};

export function HomeAskComposerChips({
  scopes,
  disabled,
  isRunning,
  onScopesChange,
}: HomeAskComposerChipsProps) {
  return (
    <div className="home-ask-chips" aria-label="提问范围">
      {scopes.map((s) => (
        <span
          key={scopeKey(s)}
          className={`home-ask-chip${s.kind === "collection" ? " is-collection" : ""}`}
        >
          {s.kind === "collection" ? (
            <FolderOpen size={12} strokeWidth={2.2} aria-hidden />
          ) : (
            <BookOpen size={12} strokeWidth={2.2} aria-hidden />
          )}
          <span className="home-ask-chip-label" title={s.title}>
            {s.kind === "collection" ? `合集 · ${s.title}` : s.title}
          </span>
          <button
            type="button"
            className="home-ask-chip-remove"
            aria-label={`移除 ${s.title}`}
            disabled={disabled || isRunning}
            onClick={() => onScopesChange(scopes.filter((x) => scopeKey(x) !== scopeKey(s)))}
          >
            <X size={12} strokeWidth={2.4} aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}
