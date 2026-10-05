import * as MockConversations from "../mocks/conversations.js";
import {
  deleteConversation as _canonDeleteConversation,
  getConversation as _canonGetConversation,
  listConversations as _canonListConversations,
  patchConversation as _canonPatchConversation,
  createConversation as _canonCreateConversation,
  appendConversationMessage as _canonAppendConversationMessage,
  forkConversationFromPath as _canonForkConversationFromPath,
} from "@retainpdf/api/conversations";
import { mockable } from "./_mockable.js";

export const deleteConversation = mockable(_canonDeleteConversation, MockConversations.deleteConversation);
export const getConversation = mockable(_canonGetConversation, MockConversations.getConversation);
export const listConversations = mockable(_canonListConversations, MockConversations.listConversations);
export const patchConversation = mockable(_canonPatchConversation, MockConversations.patchConversation);
export const createConversation = mockable(_canonCreateConversation, MockConversations.createConversation);
export const appendConversationMessage = mockable(_canonAppendConversationMessage, MockConversations.appendConversationMessage);
export const forkConversationFromPath = mockable(_canonForkConversationFromPath, MockConversations.forkConversationFromPath);
export { baseConversationTitle, nextForkConversationTitle, messagesToBranchItems } from "@retainpdf/api/conversations";
export type { ConversationRecord, MessageRecord, ConversationDetail } from "@retainpdf/api/conversations";
