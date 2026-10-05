import { defaultReaderDialogConfigPort } from "./config-port.js";

export function buildReaderPageUrl(jobId, anchor = null) {
  return defaultReaderDialogConfigPort.buildReaderPageUrl(jobId, anchor);
}

export function buildReaderDocumentPageUrl(documentId, anchor = null) {
  return defaultReaderDialogConfigPort.buildReaderDocumentPageUrl(documentId, anchor);
}

export function buildReaderRouteUrl(jobId) {
  return defaultReaderDialogConfigPort.buildReaderRouteUrl(jobId);
}

export function requestedReaderJobIdFromLocation() {
  return defaultReaderDialogConfigPort.requestedReaderJobIdFromLocation();
}
