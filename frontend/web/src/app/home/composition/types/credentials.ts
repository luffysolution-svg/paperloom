// credentials：凭据/术语表/更新域。
import type { DialogStore } from "@/platform/store/dialog-store.js";
import type { AppUpdateReadOnlyStore } from "@/features/app-update/index.js";
import type {
  GlossariesFeature,
  GlossariesViewFeature as GlossariesViewBag,
} from "@/features/glossaries/index.js";
import type { HandlersBag, ReadOnlyStore } from "./common.js";
import type { AppUpdateFeature, BrowserCredentialsFeature } from "./features.js";

export type { GlossariesFeature, GlossariesViewBag };

export type CredentialsElementsRef = {
  apiKeyInput: HTMLInputElement | null;
  modelBaseUrlInput: HTMLInputElement | null;
  modelNameInput: HTMLInputElement | null;
  translationWorkersInput: HTMLInputElement | null;
  mathModeSelect: HTMLSelectElement | null;
  tokenInputs: Record<string, HTMLInputElement | null | undefined>;
};

export type CredentialsViewBag = {
  store: ReadOnlyStore;
  handlersRef: { current: HandlersBag | null };
  tokenInputRef: (providerId: string) => (node: HTMLInputElement | null) => void;
  elementsRef: CredentialsElementsRef;
  elementsPort?: unknown;
  viewPort?: unknown;
};

export type HomeCredentials = {
  feature: BrowserCredentialsFeature | undefined;
  view: CredentialsViewBag;
};

export type HomeSettingsHub = {
  /**
   * payload.tab 选中哪个 tab；payload.setupMode 表示这次是首次配置门。
   * 首配不再另开外壳，就是本弹窗停在 api tab（见 SettingsDialog 的注释）。
   */
  dialogStore: DialogStore<{ tab?: string; setupMode?: boolean } | null>;
};

export type HomeGlossaries = {
  feature: GlossariesFeature | undefined;
  view: GlossariesViewBag;
  dialogStore: DialogStore;
};

export type AppUpdateViewBag = {
  store: AppUpdateReadOnlyStore;
  viewPort?: unknown;
  handlersRef: { current: HandlersBag | null };
};

export type HomeAppUpdate = {
  feature: AppUpdateFeature | undefined;
  view: AppUpdateViewBag;
  handlersRef: AppUpdateViewBag["handlersRef"];
};
