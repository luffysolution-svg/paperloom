import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ReaderAskTreeItem } from "./reader-ask-tree.js";
import type { ReaderConversationTreePort } from "./reader-conversation-ports.js";
export declare function createReaderConversationTreePort(input: {
    setItems: Dispatch<SetStateAction<ReaderAskTreeItem[]>>;
    setHeadId: Dispatch<SetStateAction<string | null>>;
    itemsRef: MutableRefObject<ReaderAskTreeItem[]>;
    headIdRef: MutableRefObject<string | null>;
}): ReaderConversationTreePort;
//# sourceMappingURL=reader-conversation-tree.d.ts.map