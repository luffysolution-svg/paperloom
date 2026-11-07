import { type ReactNode } from "react";
import { type AgentConfigOption, type AiConnectionCatalog, type AiConnectionSelection } from "@retainpdf/api";
export declare const AiComposerControlProvider: import("react").Provider<ReactNode>;
export declare const useAiComposerControl: () => ReactNode;
export declare function rememberAgentOptions(id: string, options: AgentConfigOption[], capabilities?: Record<string, any>): void;
export declare function useAiConnection(conversationId: string, locked?: boolean): {
    catalog: AiConnectionCatalog;
    connections: import("@retainpdf/api").AiConnection[];
    selection: AiConnectionSelection;
    selected: import("@retainpdf/api").AiConnection;
    options: AgentConfigOption[];
    capabilities: Record<string, any>;
    error: string;
    loading: boolean;
    configured: boolean;
    blocked: boolean;
    change: (next: AiConnectionSelection) => void;
};
export declare function AiConnectionPicker({ controller, disabled, onManage }: {
    controller: ReturnType<typeof useAiConnection>;
    disabled?: boolean;
    onManage?: () => void;
}): import("react").JSX.Element;
//# sourceMappingURL=AiConnectionPicker.d.ts.map