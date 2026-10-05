import type { ReactElement } from "react";
export type ReaderReactBootProps = {
    loading: boolean;
    failed: boolean;
    text: string;
    percent: number;
    /** 可选产物失败标记：加载完成后以可关闭 notice 呈现，happy path 不显示。 */
    regionsError?: boolean;
    metadataError?: boolean;
};
export declare function ReaderReactBoot({ loading, failed, text, percent, regionsError, metadataError, }: ReaderReactBootProps): ReactElement | null;
//# sourceMappingURL=ReaderReactBoot.d.ts.map