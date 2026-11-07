import * as MockAi from "../mocks/ai.js";
import {
  askLibraryAi as _canonAskLibraryAi,
  readAiAskStream as _canonReadAiAskStream,
  AiAskError as _CanonAiAskError,
} from "@retainpdf/api/ai";
import { mockable } from "./_mockable.js";
export { saveAiSelection, selectionForRequest } from "@retainpdf/api";

export const askLibraryAi = mockable(_canonAskLibraryAi, MockAi.askLibraryAi);
export const readAiAskStream = _canonReadAiAskStream;
export const AiAskError = _CanonAiAskError;
export { applyTurnEvent, timelineFromTrace, attachmentsFromTrace, fetchActiveAiRuns, cancelAiRun } from "@retainpdf/api";
export type { TurnPart, TurnMetrics, AiImageAttachment } from "@retainpdf/api";
