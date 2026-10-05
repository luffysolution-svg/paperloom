import { FileText } from "lucide-react";
import { type ReactElement } from "react";
import type { FabDownloadAction, FabDownloadUrls } from "./use-reader-fab-downloads.js";
type FabIcon = typeof FileText;
export type ReaderFabMenuHeaderProps = {
    onClose: () => void;
};
export declare function ReaderFabMenuHeader({ onClose }: ReaderFabMenuHeaderProps): ReactElement;
export type ReaderFabToolRowProps = {
    index: number;
    icon: FabIcon;
    title: string;
    sub: string;
    active: boolean;
    disabled: boolean;
    onClick: () => void;
};
export declare function ReaderFabToolRow({ index, icon: Icon, title, sub, active, disabled, onClick, }: ReaderFabToolRowProps): ReactElement;
export type ReaderFabDownloadSectionProps = {
    urls: FabDownloadUrls;
    items: readonly FabDownloadAction[];
    busyActions: ReadonlySet<FabDownloadAction>;
    onDownload: (action: FabDownloadAction) => void;
};
export declare function ReaderFabDownloadSection({ urls, items, busyActions, onDownload, }: ReaderFabDownloadSectionProps): ReactElement;
export {};
//# sourceMappingURL=ReaderFabMenu.d.ts.map