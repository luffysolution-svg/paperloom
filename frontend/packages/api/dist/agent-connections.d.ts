export type ApiProtocol = "openai" | "openai_responses" | "anthropic";
export declare const API_PROTOCOL_LABELS: Record<ApiProtocol, string>;
export type AiConnection = {
    id: string;
    name: string;
    kind: "byok" | "byoa";
    api_protocol: ApiProtocol;
    base_url: string;
    model: string;
    models: string[];
    api_key_configured?: boolean;
    api_key?: string | null;
    preset: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
    env_names?: string[];
    cwd: string;
    legacy_inherited?: boolean;
    provider?: string;
};
export type AgentPreset = {
    id: string;
    name: string;
    command: string;
    args: string[];
    host: string;
    install: string;
    hint: string;
    installed: boolean;
    host_installed: boolean;
    can_prepare?: boolean;
};
export type AgentConfigOption = {
    id: string;
    name: string;
    description?: string;
    category?: string;
    currentValue: string;
    type: string;
    options: ({
        value: string;
        name: string;
    } | {
        group: string;
        name: string;
        options: {
            value: string;
            name: string;
        }[];
    })[];
};
export type AiConnectionCatalog = {
    revision: number;
    connections: AiConnection[];
    presets: AgentPreset[];
};
export type AiConnectionProbe = {
    ready: boolean;
    status: string;
    message: string;
    models?: string[];
    config_options?: AgentConfigOption[];
    capabilities?: Record<string, any>;
    auth_methods?: {
        id: string;
        name: string;
        description?: string;
        type?: string;
        args?: string[];
        env?: Record<string, string>;
    }[];
};
export type AiConnectionSelection = {
    connectionId: string;
    model: string;
    options: Record<string, string>;
};
export declare const AI_CONNECTIONS_CHANGED = "paperloom:ai-connections-changed";
export declare const AI_SELECTION_CHANGED = "paperloom:ai-selection-changed";
export declare const AI_AGENT_EVENT = "paperloom:agent-event";
export declare function loadAiSelection(conversationId?: string): AiConnectionSelection;
export declare function saveAiSelection(conversationId: string, value: AiConnectionSelection, { updateDraft }?: {
    updateDraft?: boolean;
}): void;
export declare function selectionForRequest(conversationId: string): AiConnectionSelection;
export declare const cachedAiConnections: () => AiConnection[];
export declare function fetchAiConnections(): Promise<AiConnectionCatalog>;
export declare function saveAiConnection(connection: AiConnection, revision: number): Promise<AiConnectionCatalog>;
export declare function removeAiConnection(id: string, revision: number): Promise<AiConnectionCatalog>;
export declare const probeAiConnection: (id: string, options?: {
    prepare?: boolean;
    fresh?: boolean;
    models_only?: boolean;
}) => Promise<AiConnectionProbe>;
export declare const authenticateAiConnection: (id: string, method: string) => Promise<AiConnectionProbe>;
export declare const fetchAiAuthentication: (id: string) => Promise<AiConnectionProbe>;
export declare const cancelAiAuthentication: (id: string) => Promise<AiConnectionProbe>;
export declare const fetchAgentInteractions: (id: string) => Promise<any[]>;
export declare const fetchActiveAiRuns: (id: string) => Promise<{
    run_id: string;
    elapsed_ms: number;
}[]>;
export declare const cancelAiRun: (id: string) => Promise<unknown>;
export declare const answerAgentInteraction: (id: string, answer: Record<string, unknown>) => Promise<unknown>;
export declare function emitAgentEvent(event: Record<string, unknown>): void;
