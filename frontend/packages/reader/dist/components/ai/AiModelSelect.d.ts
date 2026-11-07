export type AiModelItem = {
    value: string;
    name: string;
    group?: string;
};
export declare function AiModelList({ items, value, onSelect, allowCustom, defaultLabel, defaultValue, loading, error, onRefresh }: {
    items: AiModelItem[];
    value: string;
    onSelect: (value: string) => void;
    allowCustom?: boolean;
    defaultLabel?: string;
    defaultValue?: string;
    loading?: boolean;
    error?: string;
    onRefresh?: () => void;
}): import("react").JSX.Element;
export declare function AiModelSelect({ value, items, onChange, disabled, loading, error, onRefresh }: {
    value: string;
    items: string[];
    onChange: (value: string) => void;
    disabled?: boolean;
    loading?: boolean;
    error?: string;
    onRefresh?: () => void;
}): import("react").JSX.Element;
//# sourceMappingURL=AiModelSelect.d.ts.map