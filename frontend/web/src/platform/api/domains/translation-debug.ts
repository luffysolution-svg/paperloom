import * as MockTranslationDebug from "../mocks/translation-debug.js";
import {
  fetchTranslationDiagnostics as _canonFetchTranslationDiagnostics,
  fetchTranslationItems as _canonFetchTranslationItems,
  fetchTranslationItem as _canonFetchTranslationItem,
  replayTranslationItem as _canonReplayTranslationItem,
} from "@retainpdf/api/translation-debug";
import { mockable } from "./_mockable.js";

export const fetchTranslationDiagnostics = mockable(_canonFetchTranslationDiagnostics, MockTranslationDebug.fetchTranslationDiagnostics);
export const fetchTranslationItems = mockable(_canonFetchTranslationItems, MockTranslationDebug.fetchTranslationItems);
export const fetchTranslationItem = mockable(_canonFetchTranslationItem, MockTranslationDebug.fetchTranslationItem);
export const replayTranslationItem = mockable(_canonReplayTranslationItem, MockTranslationDebug.replayTranslationItem);
