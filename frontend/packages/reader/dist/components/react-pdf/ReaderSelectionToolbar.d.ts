import { type ReaderSelection } from "../../shared/data/reader-regions.js";
export type ReaderSelectionNoteInput = {
    page: number;
    pane: "source" | "translated";
    quote: string;
};
export type ReaderSelectionToolbarProps = {
    selection: ReaderSelection | null;
    onDismiss: () => void;
    onAskAi?: (selection: ReaderSelection) => void;
    onAddNote?: (input: ReaderSelectionNoteInput) => void;
};
export declare function copyReaderSelectionText(value: string): Promise<void>;
export declare function ReaderSelectionToolbar({ selection, onDismiss, onAskAi, onAddNote, }: ReaderSelectionToolbarProps): import("react").JSX.Element;
//# sourceMappingURL=ReaderSelectionToolbar.d.ts.map