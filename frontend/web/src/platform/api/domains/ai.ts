import * as MockAi from "../mocks/ai.js";
import {
  askLibraryAi as _canonAskLibraryAi,
  readAiAskStream as _canonReadAiAskStream,
  AiAskError as _CanonAiAskError,
} from "@retainpdf/api/ai";
import { mockable } from "./_mockable.js";

export const askLibraryAi = mockable(_canonAskLibraryAi, MockAi.askLibraryAi);
export const readAiAskStream = _canonReadAiAskStream;
export const AiAskError = _CanonAiAskError;
export { applyTurnEvent, timelineFromTrace } from "@retainpdf/api";
export type { TurnPart, TurnMetrics } from "@retainpdf/api";
