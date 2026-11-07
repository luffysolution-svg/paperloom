import type { AiConnection, ApiProtocol } from "@retainpdf/api";
import type { AI_BRAND_MARKS } from "./brand-marks.js";
export type AiBrandKey = keyof typeof AI_BRAND_MARKS;
export type AiProvider = {
    id: string;
    name: string;
    brand: AiBrandKey | "custom";
    baseUrl: string;
    protocol: ApiProtocol;
    keyUrl?: string;
};
export declare const AI_PROVIDERS: AiProvider[];
export declare function connectionProvider(connection: AiConnection): AiProvider;
export declare function aiConnectionBrand(connection: AiConnection): AiBrandKey | "custom";
export declare function agentBrand(preset: string): AiBrandKey | "custom";
export declare function aiConnectionName(connection: AiConnection): string;
export declare function isVisibleAiConnection(connection: AiConnection, legacyBrowserKey?: boolean): boolean;
//# sourceMappingURL=service-presets.d.ts.map