/** RetainPDF host bindings for the package-owned Reader AI runtime. */
import { resolveResourceUrl } from "@retainpdf/domain/job";
import type { ReaderAgentOperationPort, ReaderConversationPort, ReaderAskPort } from "@retainpdf/reader/contracts";
import {
  appendConversationMessage,
  createConversation,
  deleteConversation,
  forkConversationFromPath,
  getConversation,
  listConversations,
  patchConversation,
} from "@/platform/api/index.js";
import {
  cancelAgentOperation,
  commitAgentOperation,
  fetchAgentOperationCandidate,
  fetchAgentRuntimeConfig,
  getAgentOperation,
  listAgentOperations,
  retryAgentOperation,
  runAgentOperation,
} from "@/platform/api/index.js";
import * as readerAi from "@retainpdf/reader/runtime/ai";
import { askLibraryAi } from "@/platform/api/index.js";
import { fetchDocumentByJobId } from "@/platform/api/index.js";
import { API_PREFIX } from "@/platform/config/api-constants.js";
import {
  defaultModelBaseUrl,
  defaultModelName,
} from "@/platform/config/runtime.js";
import {
  loadBrowserStoredConfig,
  loadDeveloperStoredConfig,
} from "@/platform/config/persisted-config.js";
import {
  getDefaultCredentialsStatePort,
} from "@/platform/contracts/credentials-contract.js";
import { defaultReaderDataPort, fetchProtected } from "./data.js";

export const askChatPort: ReaderAskPort = {
  createRemoteAnswerer: ({ jobId, documentId = "" }) => createReaderAskAnswerer({ jobId, documentId }),
  createLocalAnswerer: () => readerAi.createReaderMarkdownAnswerer({
    loadMarkdownPayload: defaultReaderDataPort.loadMarkdownPayload,
  }),
};

export const conversationPort: ReaderConversationPort = {
  create: createConversation,
  list: listConversations,
  get: getConversation,
  delete: deleteConversation,
  patch: patchConversation,
  appendMessage: appendConversationMessage,
  forkFromPath: forkConversationFromPath,
};

export const aiOperationsPort: ReaderAgentOperationPort = {
  list: (conversationId, options) => listAgentOperations({ conversationId, limit: 50, signal: options?.signal }),
  get: (operationId, options) => getAgentOperation(operationId, { signal: options?.signal }),
  run: (operationId, input, options) => runAgentOperation(operationId, input, { signal: options?.signal }),
  cancel: (operationId, input, options) => cancelAgentOperation(operationId, input, { signal: options?.signal }),
  commit: (operationId, input, options) => commitAgentOperation(operationId, input, { signal: options?.signal }),
  retry: (operationId, input, options) => retryAgentOperation(operationId, input, { signal: options?.signal }),
  fetchCandidate: (operationId, options) => fetchAgentOperationCandidate(operationId, { signal: options?.signal }),
  fetchRuntimeConfig: (options) => fetchAgentRuntimeConfig({ fetchImpl: fetch, apiPrefix: API_PREFIX }),
};

// 注册点参数类型直接取自 reader 包公开工厂签名，避免 any 掩盖契约漂移。
type ReaderAiConfigAdapters = NonNullable<
  Parameters<typeof readerAi.setReaderAiConfigAdapters>[0]
>;
type AnswerEnhanceAdapters = NonNullable<
  Parameters<typeof readerAi.setAnswerEnhanceAdapters>[0]
>;
type ReaderAskAnswererOptions = NonNullable<
  Parameters<typeof readerAi.createReaderAskAnswerer>[0]
>;

readerAi.setReaderAiConfigAdapters({
  // 惰性读取 platform 注册表：不直接 import credentials feature，
  // reader 页由 app/reader/adapters 注入真值，home 经注册表拿到默认实现。
  credentialsPort: {
    getCredentials: () => getDefaultCredentialsStatePort()?.getCredentials() ?? null,
  },
  loadBrowserStoredConfig,
  loadDeveloperStoredConfig,
  defaultModelBaseUrl,
  defaultModelName,
} satisfies ReaderAiConfigAdapters);
readerAi.setAnswerEnhanceAdapters({
  fetchProtected,
  resolveResourceUrl,
} satisfies AnswerEnhanceAdapters);

export * from "@retainpdf/reader/runtime/ai";

export const createReaderAskAnswerer = (options: ReaderAskAnswererOptions = {}) =>
  readerAi.createReaderAskAnswerer({
    apiPrefix: API_PREFIX,
    ask: askLibraryAi,
    documentByJobId: fetchDocumentByJobId,
    llmConfig: readerAi.resolveReaderAiConfig,
    ...options,
  });
