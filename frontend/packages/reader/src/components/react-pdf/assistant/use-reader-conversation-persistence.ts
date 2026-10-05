// Debounced full-tree persistence, isolated per conversation. A separate hook
// keeps the shell focused on state/lifecycle while preserving the exact
// 280 ms debounce and dependency list.

import { useEffect, type MutableRefObject } from "react";
import {
  clearThreadBranchSnapshot,
  saveThreadBranchSnapshot,
} from "../../../external.js";
import { snapshotFromTree, type ReaderAskTreeItem } from "./reader-ask-tree.js";

export function useReaderConversationPersistence(params: {
  jobId: string;
  documentId: string;
  items: readonly ReaderAskTreeItem[];
  headId: string | null;
  activeConversationId: string;
  documentIdRef: MutableRefObject<string>;
  persistReadyRef: MutableRefObject<boolean>;
}) {
  const {
    jobId,
    documentId,
    items,
    headId,
    activeConversationId,
    documentIdRef,
    persistReadyRef,
  } = params;

  useEffect(() => {
    if (!jobId || !persistReadyRef.current) return;
    const convId = activeConversationId;
    const branchScope = { jobId, documentId: documentId || documentIdRef.current };
    const timer = window.setTimeout(() => {
      if (!items.length) {
        clearThreadBranchSnapshot(branchScope, convId);
        return;
      }
      saveThreadBranchSnapshot(branchScope, snapshotFromTree(items, headId), convId);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [jobId, documentId, items, headId, activeConversationId]);
}
