import { type MutableRefObject } from "react";
import { type ReaderAskTreeItem } from "./reader-ask-tree.js";
export declare function useReaderConversationPersistence(params: {
    jobId: string;
    documentId: string;
    items: readonly ReaderAskTreeItem[];
    headId: string | null;
    activeConversationId: string;
    documentIdRef: MutableRefObject<string>;
    persistReadyRef: MutableRefObject<boolean>;
}): void;
//# sourceMappingURL=use-reader-conversation-persistence.d.ts.map